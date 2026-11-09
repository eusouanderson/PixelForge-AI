import type { CharacterId } from '@/domains/characters/types';
import type {
  BreedingCompatibilityResult,
  CreatureGenome
} from '@/domains/genetics/types';

export type BreedingPhase =
  | 'idle'
  | 'discovering'
  | 'pairing'
  | 'character_selection'
  | 'compatibility_check'
  | 'awaiting_confirmation'
  | 'breeding_started'
  | 'animation_running'
  | 'genetics_calculation'
  | 'ownership_selection'
  | 'result_validation'
  | 'egg_creation'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface CommitmentPayload {
  readonly peerId: string;
  readonly commitHash: string;
}

export interface RevealPayload {
  readonly peerId: string;
  readonly secretSeed: string;
  readonly salt: string;
}

export interface OwnershipResolution {
  readonly winningPeerId: string;
  readonly losingPeerId: string;
  readonly combinedSeedHash: string;
  readonly isLocalWinner: boolean;
}

export interface BreedingParticipant {
  readonly peerId: string;
  readonly playerName: string;
  readonly characterId: CharacterId;
  readonly genome: CreatureGenome;
  readonly isReady: boolean;
}

export interface BredEggRecord {
  readonly id: string;
  readonly genome: CreatureGenome;
  readonly targetSpecies: CharacterId;
  readonly incubationProgress: number;
  readonly maxIncubationHours: number;
  readonly isWarm: boolean;
  readonly createdAtMs: number;
  readonly isReadyToHatch: boolean;
}

export interface BreedingHistoryRecord {
  readonly sessionId: string;
  readonly timestampMs: number;
  readonly sireGenomeId: string;
  readonly damGenomeId: string;
  readonly sireSpecies: CharacterId;
  readonly damSpecies: CharacterId;
  readonly offspringGenomeId: string;
  readonly offspringSpecies: CharacterId;
  readonly winnerPeerId: string;
  readonly isLocalWinner: boolean;
  readonly mutationCount: number;
}

export type P2PMessageType =
  | 'HANDSHAKE'
  | 'CHARACTER_SELECT'
  | 'CONFIRM_BREEDING'
  | 'COMMITMENT'
  | 'REVEAL'
  | 'ANIMATION_SYNC'
  | 'CANCEL';

export interface P2PMessage<TPayload = unknown> {
  readonly type: P2PMessageType;
  readonly senderId: string;
  readonly sessionId: string;
  readonly payload: TPayload;
  readonly timestampMs: number;
}

export interface P2PTransportPort {
  readonly localPeerId: string;
  connect(channelId: string): Promise<void>;
  disconnect(): void;
  send(message: P2PMessage): void;
  onMessage(handler: (msg: P2PMessage) => void): () => void;
  onError(handler: (err: Error) => void): () => void;
}

export interface BreedingSessionState {
  readonly sessionId: string;
  readonly phase: BreedingPhase;
  readonly localPeerId: string;
  readonly remotePeerId: string | null;
  readonly localParticipant: BreedingParticipant | null;
  readonly remoteParticipant: BreedingParticipant | null;
  readonly compatibility: BreedingCompatibilityResult | null;
  readonly animationSceneIndex: number;
  readonly producedEgg: BredEggRecord | null;
  readonly ownership: OwnershipResolution | null;
  readonly historyRecord: BreedingHistoryRecord | null;
  readonly errorMessage: string | null;
}
