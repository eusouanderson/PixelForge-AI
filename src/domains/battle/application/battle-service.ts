import type { WalletState } from '@/domains/economy/types';
import type {
  BattleHistoryRecord,
  BattleP2PMessage,
  BattleParticipant,
  BattleSessionState,
  BattleTransportPort
} from '../types';
import { BATTLE_PROTOCOL_VERSION } from '../infrastructure/battle-p2p-adapter';
import { simulateBattle } from '../domain/battle-engine';
import { processWagerDeduction, settleBattleOutcome } from '../domain/wager-settlement-engine';

export class BattleService {
  private state: BattleSessionState;
  private listeners: Array<(state: BattleSessionState) => void> = [];
  private unsubscribeMsg: (() => void) | null = null;
  private unsubscribeErr: (() => void) | null = null;

  // Sementes criptográficas para commit-reveal determinístico
  private localSecretSeed: string | null = null;
  private remoteSecretSeed: string | null = null;
  private sequenceCounter = 0;

  constructor(
    public readonly transport: BattleTransportPort,
    initialSessionId?: string
  ) {
    const sessionId =
      initialSessionId ?? `battle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    this.state = {
      sessionId,
      phase: 'idle',
      localPeerId: transport.localPeerId,
      remotePeerId: null,
      remotePlayerName: null,
      localParticipant: null,
      remoteParticipant: null,
      wagerAmount: 50,
      sharedSeed: null,
      simulationResult: null,
      historyRecord: null,
      errorMessage: null
    };

    this.bindTransport();
  }

  public getState(): BattleSessionState {
    return this.state;
  }

  public subscribe(listener: (state: BattleSessionState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private updateState(updater: (prev: BattleSessionState) => Partial<BattleSessionState>): void {
    const partial = updater(this.state);
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public async startDiscovery(channelId: string): Promise<void> {
    this.updateState(() => ({
      phase: 'discovering',
      errorMessage: null
    }));
    await this.transport.connect(channelId);
  }

  public sendBattleInvite(
    localParticipant: BattleParticipant,
    wagerAmount: number,
    targetPeerId?: string
  ): void {
    this.localSecretSeed = `seed-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
    this.updateState(() => ({
      phase: 'awaiting_confirmation',
      localParticipant,
      wagerAmount,
      remotePeerId: targetPeerId ?? this.state.remotePeerId
    }));

    this.sendMessage('BATTLE_INVITE', {
      wagerAmount,
      participant: localParticipant,
      secretSeed: this.localSecretSeed
    });
  }

  public acceptBattleInvite(localParticipant: BattleParticipant): void {
    this.localSecretSeed = `seed-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
    this.updateState(() => ({
      phase: 'syncing_seed',
      localParticipant
    }));

    this.sendMessage('BATTLE_INVITE_ACCEPT', {
      participant: localParticipant,
      secretSeed: this.localSecretSeed
    });

    this.checkAndExecuteSimulation();
  }

  public rejectBattleInvite(): void {
    this.sendMessage('BATTLE_INVITE_REJECT', {});
    this.updateState(() => ({
      phase: 'idle',
      remoteParticipant: null
    }));
  }

  public cancelOrForfeit(): void {
    this.sendMessage('BATTLE_CANCEL', {});
    this.updateState(() => ({
      phase: 'cancelled',
      errorMessage: 'Batalha cancelada.'
    }));
  }

  public reset(): void {
    this.localSecretSeed = null;
    this.remoteSecretSeed = null;
    this.updateState(() => ({
      phase: 'idle',
      errorMessage: null,
      remotePeerId: null,
      remotePlayerName: null,
      remoteParticipant: null,
      simulationResult: null,
      historyRecord: null
    }));
  }

  public claimReward(
    currentWallet: WalletState,
    settledBattleIds: ReadonlySet<string>
  ): { readonly success: boolean; readonly nextWallet: WalletState; readonly history: BattleHistoryRecord | null } {
    if (!this.state.simulationResult || !this.state.localParticipant || !this.state.remoteParticipant) {
      return { success: false, nextWallet: currentWallet, history: null };
    }

    const sim = this.state.simulationResult;
    const isWinner = sim.winnerPeerId === this.state.localPeerId;
    const outcome = sim.isDraw ? 'draw' : isWinner ? 'victory' : 'defeat';

    const deductRes = processWagerDeduction(currentWallet, this.state.wagerAmount);
    const walletAfterDeduct = deductRes.success ? deductRes.wallet : currentWallet;

    const settlement = settleBattleOutcome(
      walletAfterDeduct,
      this.state.wagerAmount,
      outcome,
      sim.battleId,
      settledBattleIds
    );

    const xpGained = isWinner ? 120 : sim.isDraw ? 40 : 25;

    const historyRecord: BattleHistoryRecord = {
      id: `hist-${sim.battleId}`,
      timestampMs: Date.now(),
      battleId: sim.battleId,
      localPlayerId: this.state.localPeerId,
      opponentPlayerId: this.state.remoteParticipant.peerId,
      opponentName: this.state.remoteParticipant.playerName,
      localCreatureSpecies: this.state.localParticipant.speciesId,
      localCreatureNickname: this.state.localParticipant.customNickname,
      opponentCreatureSpecies: this.state.remoteParticipant.speciesId,
      opponentCreatureNickname: this.state.remoteParticipant.customNickname,
      result: outcome,
      wagerAmount: this.state.wagerAmount,
      rewardCoins: settlement.rewardCoins,
      combatXpGained: xpGained,
      roundsCount: sim.durationTicks
    };

    this.updateState(() => ({
      phase: 'reward_claimed',
      historyRecord
    }));

    return {
      success: settlement.success,
      nextWallet: settlement.wallet,
      history: historyRecord
    };
  }

  private checkAndExecuteSimulation(): void {
    if (!this.state.localParticipant || !this.state.remoteParticipant || !this.localSecretSeed || !this.remoteSecretSeed) {
      return;
    }

    // Ordena deterministicamente os lutadores por peerId para que ambos os aparelhos
    // executem a simulação com a mesma ordem canônica e semente
    const [p1, p2] =
      this.state.localParticipant.peerId < this.state.remoteParticipant.peerId
        ? [this.state.localParticipant, this.state.remoteParticipant]
        : [this.state.remoteParticipant, this.state.localParticipant];

    const combinedSeed = [this.localSecretSeed, this.remoteSecretSeed].sort().join(':');
    const simulationResult = simulateBattle(p1, p2, combinedSeed);

    this.updateState(() => ({
      phase: 'battle_running',
      sharedSeed: combinedSeed,
      simulationResult
    }));
  }

  private sendMessage(type: BattleP2PMessage['type'], payload: unknown): void {
    const message: BattleP2PMessage = {
      protocolVersion: BATTLE_PROTOCOL_VERSION,
      messageId: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      senderId: this.state.localPeerId,
      sessionId: this.state.sessionId,
      sequence: this.sequenceCounter++,
      payload,
      timestampMs: Date.now()
    };
    this.transport.sendBattleMessage(message);
  }

  private bindTransport(): void {
    this.unsubscribeMsg = this.transport.onBattleMessage((msg) => {
      this.handleIncomingMessage(msg);
    });

    this.unsubscribeErr = this.transport.onError((err) => {
      this.updateState(() => ({
        phase: 'failed',
        errorMessage: err.message
      }));
    });
  }

  private handleIncomingMessage(msg: BattleP2PMessage): void {
    if (msg.senderId === this.state.localPeerId) return;

    if (msg.type === 'BATTLE_INVITE') {
      const payload = msg.payload as {
        wagerAmount: number;
        participant: BattleParticipant;
        secretSeed: string;
      };
      this.remoteSecretSeed = payload.secretSeed;
      this.updateState(() => ({
        phase: 'selecting_creature',
        remotePeerId: msg.senderId,
        remotePlayerName: payload.participant.playerName,
        remoteParticipant: payload.participant,
        wagerAmount: payload.wagerAmount
      }));
      return;
    }

    if (msg.type === 'BATTLE_INVITE_ACCEPT') {
      const payload = msg.payload as {
        participant: BattleParticipant;
        secretSeed: string;
      };
      this.remoteSecretSeed = payload.secretSeed;
      this.updateState(() => ({
        phase: 'syncing_seed',
        remotePeerId: msg.senderId,
        remotePlayerName: payload.participant.playerName,
        remoteParticipant: payload.participant
      }));
      this.checkAndExecuteSimulation();
      return;
    }

    if (msg.type === 'BATTLE_INVITE_REJECT') {
      this.updateState(() => ({
        phase: 'idle',
        errorMessage: 'Oponente recusou o convite de batalha.'
      }));
      return;
    }

    if (msg.type === 'BATTLE_CANCEL') {
      this.updateState(() => ({
        phase: 'cancelled',
        errorMessage: 'Oponente cancelou ou desconectou da partida.'
      }));
    }
  }

  public dispose(): void {
    if (this.unsubscribeMsg) {
      this.unsubscribeMsg();
      this.unsubscribeMsg = null;
    }
    if (this.unsubscribeErr) {
      this.unsubscribeErr();
      this.unsubscribeErr = null;
    }
    this.transport.disconnect();
  }
}
