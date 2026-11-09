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
  // Conexão e Autenticação
  | 'PLAYER_HELLO'
  | 'PLAYER_PROFILE'
  | 'CONNECTION_REQUEST'
  | 'CONNECTION_ACCEPTED'
  | 'CONNECTION_REJECTED'
  | 'SESSION_AUTH_CHALLENGE'
  | 'SESSION_AUTH_RESPONSE'
  | 'SESSION_AUTHENTICATED'
  | 'HANDSHAKE'
  // Reprodução e Seleção
  | 'BREEDING_REQUEST'
  | 'BREEDING_ACCEPTED'
  | 'BREEDING_CANCELLED'
  | 'CHARACTER_SELECTED'
  | 'CHARACTER_DATA'
  | 'COMPATIBILITY_RESULT'
  | 'BREEDING_CONFIRMATION'
  | 'BREEDING_CONFIRMATION_ACK'
  | 'CHARACTER_SELECT'
  | 'CONFIRM_BREEDING'
  // Genética e Consenso
  | 'GENETIC_COMMIT'
  | 'GENETIC_REVEAL'
  | 'GENETIC_RESULT'
  | 'GENETIC_RESULT_VALIDATION'
  | 'GENETIC_RESULT_ACCEPTED'
  | 'COMMITMENT'
  | 'REVEAL'
  // Propriedade do Ovo
  | 'OWNERSHIP_COMMIT'
  | 'OWNERSHIP_REVEAL'
  | 'OWNERSHIP_RESULT'
  | 'OWNERSHIP_VALIDATION'
  | 'EGG_CREATION_AUTHORIZED'
  | 'EGG_CREATED'
  // Animação e Sincronização
  | 'ANIMATION_READY'
  | 'ANIMATION_START'
  | 'ANIMATION_SYNC'
  | 'ANIMATION_COMPLETED'
  // Finalização e Recuperação
  | 'BREEDING_COMPLETED'
  | 'SESSION_COMPLETED'
  | 'SESSION_ABORTED'
  | 'SESSION_RECOVERY_REQUIRED'
  | 'HEARTBEAT'
  | 'ERROR'
  | 'CANCEL';

export interface P2PMessage<TPayload = unknown> {
  readonly protocolVersion?: string;
  readonly messageId?: string;
  readonly type: P2PMessageType;
  readonly senderId: string;
  readonly sessionId: string;
  readonly sequence?: number;
  readonly payload: TPayload;
  readonly timestampMs: number;
}

export type NearbyConnectionStatus =
  | 'idle'
  | 'checking_environment'
  | 'requesting_permissions'
  | 'starting_discovery'
  | 'discovering'
  | 'player_found'
  | 'connection_requested'
  | 'connection_pending'
  | 'connecting'
  | 'authenticating'
  | 'connected'
  | 'disconnected'
  | 'failed';

export interface DiscoveredPeer {
  readonly endpointId: string;
  readonly peerId: string;
  readonly playerName: string;
  readonly avatarSpeciesId?: CharacterId;
  readonly protocolVersion: string;
  readonly discoveredAtMs: number;
}

export interface P2PTransportPort {
  readonly localPeerId: string;
  connect(channelId: string): Promise<void>;
  disconnect(): void;
  send(message: P2PMessage): void;
  onMessage(handler: (msg: P2PMessage) => void): () => void;
  onError(handler: (err: Error) => void): () => void;
  getConnectionStatus?(): NearbyConnectionStatus;
  getDiscoveredPeers?(): readonly DiscoveredPeer[];
  connectToPeer?(endpointId: string): Promise<void>;
  acceptConnection?(endpointId: string): Promise<void>;
  rejectConnection?(endpointId: string): Promise<void>;
  onStatusChange?(handler: (status: NearbyConnectionStatus) => void): () => void;
  onPeersChange?(handler: (peers: readonly DiscoveredPeer[]) => void): () => void;
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
