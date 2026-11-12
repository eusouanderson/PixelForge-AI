import type { CharacterId } from '@/domains/characters/types';
import type { CreatureGenome } from '@/domains/genetics/types';
import { evaluateBreedingCompatibility } from '@/domains/genetics/domain/compatibility-engine';
import { crossGenomes } from '@/domains/genetics/domain/inheritance-engine';
import {
  createSharedRandomSource,
  deterministicUuidFromSeed,
  generateCommitment,
  generateCryptoSeed,
  resolveFairOwnership,
  verifyCommitment
} from '../domain/consensus-engine';
import { transitionBreedingPhase } from '../domain/breeding-state-machine';
import type {
  BredEggRecord,
  BreedingHistoryRecord,
  BreedingParticipant,
  BreedingPhase,
  BreedingSessionState,
  CommitmentPayload,
  P2PMessage,
  P2PTransportPort,
  RevealPayload
} from '../types';

export const BRED_EGG_INCUBATION_HOURS = 0.05; // 3 real minutes of incubation

export class BreedingService {
  private state: BreedingSessionState;
  private listeners: Array<(state: BreedingSessionState) => void> = [];
  private unsubscribeTransportMsg: (() => void) | null = null;
  private unsubscribeTransportErr: (() => void) | null = null;

  // Cryptographic commit-reveal state
  private localSeed = '';
  private localSalt = '';
  private hasSentCommitment = false;
  private remoteCommitment: CommitmentPayload | null = null;
  private lastAutoSyncedPeerId: string | null = null;

  constructor(
    public readonly transport: P2PTransportPort,
    initialSessionId?: string
  ) {
    const sessionId = initialSessionId ?? `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.state = {
      sessionId,
      phase: 'idle',
      localPeerId: transport.localPeerId,
      remotePeerId: null,
      localParticipant: null,
      remoteParticipant: null,
      compatibility: null,
      animationSceneIndex: 0,
      producedEgg: null,
      ownership: null,
      historyRecord: null,
      errorMessage: null
    };

    this.bindTransportEvents();
  }

  public getState(): BreedingSessionState {
    return this.state;
  }

  public subscribe(listener: (state: BreedingSessionState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private updateState(updater: (prev: BreedingSessionState) => Partial<BreedingSessionState>): void {
    const partial = updater(this.state);
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private setPhase(nextPhase: BreedingPhase): void {
    const validNext = transitionBreedingPhase(this.state.phase, nextPhase);
    this.updateState(() => ({ phase: validNext }));
  }

  private bindTransportEvents(): void {
    this.unsubscribeTransportMsg = this.transport.onMessage((msg) => {
      this.handleIncomingMessage(msg);
    });
    this.unsubscribeTransportErr = this.transport.onError((err) => {
      this.updateState(() => ({
        phase: 'failed',
        errorMessage: err.message
      }));
    });
  }

  public async openDiscovery(channelCode: string): Promise<void> {
    if (this.state.phase === 'failed') {
      this.setPhase('idle');
    }
    this.localSeed = '';
    this.localSalt = '';
    this.hasSentCommitment = false;
    this.remoteCommitment = null;
    this.lastAutoSyncedPeerId = null;
    this.updateState((prev) => ({
      remotePeerId: null,
      remoteParticipant: null,
      compatibility: null,
      producedEgg: null,
      ownership: null,
      historyRecord: null,
      errorMessage: null,
      localParticipant: prev.localParticipant
        ? { ...prev.localParticipant, isReady: false }
        : null
    }));

    await this.transport.connect(channelCode);
    if (this.state.phase === 'failed') {
      return;
    }
    this.setPhase('discovering');
    this.transport.send({
      type: 'HANDSHAKE',
      senderId: this.state.localPeerId,
      sessionId: this.state.sessionId,
      payload: { action: 'DISCOVERY_PING' },
      timestampMs: Date.now()
    });
  }

  public syncLocalParticipant(): void {
    if (!this.state.localParticipant) return;
    this.transport.send({
      type: 'CHARACTER_SELECT',
      senderId: this.state.localPeerId,
      sessionId: this.state.sessionId,
      payload: this.state.localParticipant,
      timestampMs: Date.now()
    });
  }

  private autoSyncLocalParticipantForPeer(peerId: string): void {
    if (this.lastAutoSyncedPeerId === peerId || !this.state.localParticipant) return;
    this.lastAutoSyncedPeerId = peerId;
    this.syncLocalParticipant();
  }

  public selectLocalCreature(
    characterId: CharacterId,
    genome: CreatureGenome,
    playerName = 'Jogador Local'
  ): void {
    if (this.state.phase === 'idle' || this.state.phase === 'discovering') {
      this.setPhase('pairing');
    }
    if (this.state.phase === 'pairing') {
      this.setPhase('character_selection');
    }

    const participant: BreedingParticipant = {
      peerId: this.state.localPeerId,
      playerName,
      characterId,
      genome,
      isReady: false
    };

    this.updateState(() => ({ localParticipant: participant }));
    this.syncLocalParticipant();
    this.recalculateCompatibility();
  }

  public setLocalReady(ready: boolean): void {
    if (!this.state.localParticipant) return;
    const updated: BreedingParticipant = {
      ...this.state.localParticipant,
      isReady: ready
    };
    this.updateState(() => ({ localParticipant: updated }));

    this.transport.send({
      type: 'CONFIRM_BREEDING',
      senderId: this.state.localPeerId,
      sessionId: this.state.sessionId,
      payload: { isReady: ready },
      timestampMs: Date.now()
    });

    this.checkBothReadyAndProceed();
  }

  public async executeCommitment(): Promise<void> {
    this.localSeed = generateCryptoSeed();
    this.localSalt = generateCryptoSeed();
    const commitHash = await generateCommitment(this.localSeed, this.localSalt);

    const payload: CommitmentPayload = {
      peerId: this.state.localPeerId,
      commitHash
    };

    this.hasSentCommitment = true;
    this.transport.send({
      type: 'COMMITMENT',
      senderId: this.state.localPeerId,
      sessionId: this.state.sessionId,
      payload,
      timestampMs: Date.now()
    });

    if (this.remoteCommitment) {
      await this.revealSeed();
    }
  }

  public async revealSeed(): Promise<void> {
    const payload: RevealPayload = {
      peerId: this.state.localPeerId,
      secretSeed: this.localSeed,
      salt: this.localSalt
    };

    this.transport.send({
      type: 'REVEAL',
      senderId: this.state.localPeerId,
      sessionId: this.state.sessionId,
      payload,
      timestampMs: Date.now()
    });
  }

  public setAnimationScene(sceneIndex: number): void {
    this.updateState(() => ({ animationSceneIndex: sceneIndex }));
    this.transport.send({
      type: 'ANIMATION_SYNC',
      senderId: this.state.localPeerId,
      sessionId: this.state.sessionId,
      payload: { sceneIndex },
      timestampMs: Date.now()
    });
  }

  public cancel(reason = 'Reprodução cancelada pelo usuário.'): void {
    this.transport.send({
      type: 'CANCEL',
      senderId: this.state.localPeerId,
      sessionId: this.state.sessionId,
      payload: { reason },
      timestampMs: Date.now()
    });
    this.updateState(() => ({
      phase: 'cancelled',
      errorMessage: reason
    }));
  }

  public dispose(): void {
    if (this.unsubscribeTransportMsg) {
      this.unsubscribeTransportMsg();
      this.unsubscribeTransportMsg = null;
    }
    if (this.unsubscribeTransportErr) {
      this.unsubscribeTransportErr();
      this.unsubscribeTransportErr = null;
    }
    this.transport.disconnect();
  }

  private handleIncomingMessage(msg: P2PMessage): void {
    switch (msg.type) {
      case 'HANDSHAKE':
        if (!this.state.remotePeerId) {
          this.updateState(() => ({ remotePeerId: msg.senderId }));
          if (this.state.phase === 'discovering') {
            this.setPhase('pairing');
          }
          this.autoSyncLocalParticipantForPeer(msg.senderId);
        }
        break;

      case 'CHARACTER_SELECT': {
        const participant = msg.payload as BreedingParticipant;
        this.updateState(() => ({
          remotePeerId: msg.senderId,
          remoteParticipant: participant
        }));
        if (this.state.phase === 'pairing' || this.state.phase === 'discovering') {
          this.setPhase('character_selection');
        }
        this.recalculateCompatibility();
        this.autoSyncLocalParticipantForPeer(msg.senderId);
        break;
      }

      case 'CONFIRM_BREEDING': {
        const payload = msg.payload as { isReady: boolean };
        if (this.state.remoteParticipant) {
          this.updateState(() => ({
            remoteParticipant: {
              ...this.state.remoteParticipant!,
              isReady: payload.isReady
            }
          }));
        }
        this.checkBothReadyAndProceed();
        break;
      }

      case 'COMMITMENT': {
        this.remoteCommitment = msg.payload as CommitmentPayload;
        if (this.hasSentCommitment) {
          void this.revealSeed();
        }
        break;
      }

      case 'REVEAL': {
        void this.handleRevealFromRemote(msg.payload as RevealPayload);
        break;
      }

      case 'ANIMATION_SYNC': {
        const payload = msg.payload as { sceneIndex: number };
        this.updateState(() => ({ animationSceneIndex: payload.sceneIndex }));
        break;
      }

      case 'CANCEL': {
        const payload = msg.payload as { reason?: string };
        this.updateState(() => ({
          phase: 'cancelled',
          errorMessage: payload.reason ?? 'A outra ponta cancelou a reprodução.'
        }));
        break;
      }
    }
  }

  private recalculateCompatibility(): void {
    const local = this.state.localParticipant;
    const remote = this.state.remoteParticipant;
    if (!local || !remote) return;

    const result = evaluateBreedingCompatibility({
      genomeA: local.genome,
      stageA: 'adulto',
      healthA: 'healthy',
      genomeB: remote.genome,
      stageB: 'adulto',
      healthB: 'healthy'
    });

    this.updateState(() => ({ compatibility: result }));
    if (this.state.phase === 'character_selection') {
      this.setPhase('compatibility_check');
    }
    if (result.compatible && this.state.phase === 'compatibility_check') {
      this.setPhase('awaiting_confirmation');
    } else if (!result.compatible && this.state.phase === 'awaiting_confirmation') {
      this.setPhase('compatibility_check');
    }
  }

  private checkBothReadyAndProceed(): void {
    const local = this.state.localParticipant;
    const remote = this.state.remoteParticipant;
    if (
      this.state.phase === 'awaiting_confirmation' &&
      local?.isReady &&
      remote?.isReady &&
      this.state.compatibility?.compatible
    ) {
      this.setPhase('breeding_started');
      this.setPhase('animation_running');
      void this.executeCommitment();
    }
  }

  private async handleRevealFromRemote(payload: RevealPayload): Promise<void> {
    if (!this.remoteCommitment) {
      this.updateState(() => ({
        phase: 'failed',
        errorMessage: 'Compromisso remoto não encontrado antes da revelação.'
      }));
      return;
    }

    const isValid = await verifyCommitment(
      this.remoteCommitment.commitHash,
      payload.secretSeed,
      payload.salt
    );

    if (!isValid) {
      this.updateState(() => ({
        phase: 'failed',
        errorMessage: 'Falha de validação criptográfica: compromisso adulterado.'
      }));
      return;
    }

    this.setPhase('genetics_calculation');
    this.setPhase('ownership_selection');

    const resolution = await resolveFairOwnership(
      this.state.localPeerId,
      this.localSeed,
      payload.peerId,
      payload.secretSeed,
      this.state.localPeerId
    );

    this.setPhase('result_validation');

    // Identify Sire and Dam based on biological sex
    const local = this.state.localParticipant!;
    const remote = this.state.remoteParticipant!;
    const sireGenome = local.genome.sex === 'male' ? local.genome : remote.genome;
    const damGenome = local.genome.sex === 'female' ? local.genome : remote.genome;

    const sharedRandom = createSharedRandomSource(resolution.combinedSeedHash);
    const childGenomeId = deterministicUuidFromSeed(resolution.combinedSeedHash);
    const childGenome = crossGenomes(sireGenome, damGenome, Date.now(), sharedRandom, childGenomeId);

    this.setPhase('egg_creation');

    let producedEgg: BredEggRecord | null = null;
    if (resolution.isLocalWinner) {
      producedEgg = {
        id: `egg-${childGenome.genomeId}`,
        ownerId: this.state.localPeerId,
        genome: childGenome,
        targetSpecies: childGenome.species,
        status: 'available',
        incubationProgress: 0,
        maxIncubationHours: BRED_EGG_INCUBATION_HOURS,
        isWarm: true,
        createdAtMs: Date.now(),
        isReadyToHatch: false
      };
    }

    const historyRecord: BreedingHistoryRecord = {
      sessionId: this.state.sessionId,
      timestampMs: Date.now(),
      sireGenomeId: sireGenome.genomeId,
      damGenomeId: damGenome.genomeId,
      sireSpecies: sireGenome.species,
      damSpecies: damGenome.species,
      offspringGenomeId: childGenome.genomeId,
      offspringSpecies: childGenome.species,
      winnerPeerId: resolution.winningPeerId,
      isLocalWinner: resolution.isLocalWinner,
      mutationCount: childGenome.mutations.length
    };

    this.updateState(() => ({
      producedEgg,
      ownership: resolution,
      historyRecord
    }));

    this.setPhase('completed');
  }
}
