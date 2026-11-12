import type { AttributeKind, CharacterAttributes } from '@/domains/attributes/types';
import type {
  CharacterId,
  CharacterLifeStage,
  CharacterPersonalityProfile,
  ElementAffinity
} from '@/domains/characters/types';
import type { PetNeedsState } from '@/domains/pet-needs/types';

export type BattleP2PMessageType =
  | 'BATTLE_HELLO'
  | 'BATTLE_INVITE'
  | 'BATTLE_INVITE_ACCEPT'
  | 'BATTLE_INVITE_REJECT'
  | 'BATTLE_FIGHTER_DATA'
  | 'BATTLE_CONFIRM_WAGER'
  | 'BATTLE_COMMIT_SEED'
  | 'BATTLE_REVEAL_SEED'
  | 'BATTLE_ACTION_EVENT'
  | 'BATTLE_RESULT_SYNC'
  | 'BATTLE_RESULT_ACK'
  | 'BATTLE_CANCEL'
  | 'BATTLE_FORFEIT';

export interface BattleP2PMessage<TPayload = unknown> {
  readonly protocolVersion: string;
  readonly messageId: string;
  readonly type: BattleP2PMessageType;
  readonly senderId: string;
  readonly sessionId: string;
  readonly sequence: number;
  readonly payload: TPayload;
  readonly timestampMs: number;
}

export interface BattleParticipant {
  readonly peerId: string;
  readonly playerName: string;
  readonly creatureInstanceId: string;
  readonly speciesId: CharacterId;
  readonly speciesName: string;
  readonly customNickname?: string;
  readonly stage: CharacterLifeStage;
  readonly level: number;
  readonly ageHours: number;
  readonly attributes: CharacterAttributes;
  readonly needs: PetNeedsState;
  readonly personalityTemper: CharacterPersonalityProfile['temper'];
  readonly element: ElementAffinity;
  readonly unlockedAttackIds: readonly string[];
  readonly combatLevel: number;
  readonly combatXp: number;
  readonly isReady: boolean;
  readonly hasConfirmedWager: boolean;
}

export type BattleAttackCategory = 'physical' | 'special' | 'tactical';

export type BattleStatusEffectType =
  | 'burn'
  | 'freeze'
  | 'paralyze'
  | 'stun'
  | 'defense_down'
  | 'attack_buff';

export interface BattleAttackDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly element: ElementAffinity;
  readonly category: BattleAttackCategory;
  readonly compatibleSpecies: readonly CharacterId[];
  readonly minStage: CharacterLifeStage;
  readonly minLevel: number;
  readonly requiredAttributes?: Partial<Record<AttributeKind, number>>;
  readonly baseDamage: number;
  readonly staminaCost: number;
  readonly accuracyPercent: number;
  readonly criticalChancePercent: number;
  readonly speedTicks: number;
  readonly recoveryTicks: number;
  readonly attributeScaling: Partial<Record<AttributeKind, number>>;
  readonly effectType?: BattleStatusEffectType;
  readonly effectChancePercent?: number;
  readonly soundEffect?: string;
  readonly animationName: string;
}

export interface BattleStatusEffect {
  readonly id: string;
  readonly type: BattleStatusEffectType;
  readonly remainingTicks: number;
  readonly potency: number;
}

export interface BattleFighterRuntime {
  readonly fighterId: string;
  readonly participant: BattleParticipant;
  readonly maxHp: number;
  readonly currentHp: number;
  readonly maxStamina: number;
  readonly currentStamina: number;
  readonly shieldHp: number;
  readonly cooldownTicks: number;
  readonly isDefending: boolean;
  readonly isDodging: boolean;
  readonly isResting: boolean;
  readonly statusEffects: readonly BattleStatusEffect[];
}

export type BattleActionType = 'attack' | 'defend' | 'dodge' | 'rest' | 'tactical';

export interface BattleActionDecision {
  readonly type: BattleActionType;
  readonly attackId?: string;
  readonly reason: string;
}

export type BattleCombatEventType =
  | 'match_start'
  | 'action_decided'
  | 'attack_launched'
  | 'damage_inflicted'
  | 'attack_dodged'
  | 'attack_blocked'
  | 'critical_hit'
  | 'status_applied'
  | 'status_damage'
  | 'stamina_exhausted'
  | 'stamina_recovered'
  | 'fighter_fainted'
  | 'match_end';

export interface BattleCombatEvent {
  readonly sequence: number;
  readonly tick: number;
  readonly type: BattleCombatEventType;
  readonly actorId: string;
  readonly targetId?: string;
  readonly attackId?: string;
  readonly attackName?: string;
  readonly element?: ElementAffinity;
  readonly damage?: number;
  readonly absorbedDamage?: number;
  readonly staminaDelta?: number;
  readonly actorHp: number;
  readonly targetHp?: number;
  readonly actorStamina: number;
  readonly description: string;
}

export interface BattleSimulationResult {
  readonly battleId: string;
  readonly seed: string;
  readonly winnerPeerId: string | null;
  readonly loserPeerId: string | null;
  readonly isDraw: boolean;
  readonly durationTicks: number;
  readonly events: readonly BattleCombatEvent[];
  readonly fighter1FinalHp: number;
  readonly fighter2FinalHp: number;
  readonly totalDamageFighter1: number;
  readonly totalDamageFighter2: number;
}

export interface BattleWagerConfig {
  readonly defaultWager: number;
  readonly minWager: number;
  readonly maxWager: number;
  readonly winnerMultiplier: number;
  readonly arenaFeePercentage: number;
}

export interface BattleHistoryRecord {
  readonly id: string;
  readonly timestampMs: number;
  readonly battleId: string;
  readonly localPlayerId: string;
  readonly opponentPlayerId: string;
  readonly opponentName: string;
  readonly localCreatureSpecies: CharacterId;
  readonly localCreatureNickname?: string;
  readonly opponentCreatureSpecies: CharacterId;
  readonly opponentCreatureNickname?: string;
  readonly result: 'victory' | 'defeat' | 'draw';
  readonly wagerAmount: number;
  readonly rewardCoins: number;
  readonly combatXpGained: number;
  readonly roundsCount: number;
}

export interface CharacterBattleRecord {
  readonly totalBattles: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly combatXp: number;
  readonly combatLevel: number;
  readonly unlockedAttacks: readonly string[];
  readonly recentOpponents: readonly {
    readonly opponentSpecies: CharacterId;
    readonly timestampMs: number;
    readonly won: boolean;
  }[];
}

export type BattleArenaPhase =
  | 'idle'
  | 'discovering'
  | 'opponent_found'
  | 'selecting_creature'
  | 'wager_negotiation'
  | 'awaiting_confirmation'
  | 'syncing_seed'
  | 'battle_running'
  | 'battle_completed'
  | 'reward_claimed'
  | 'cancelled'
  | 'failed';

export interface BattleSessionState {
  readonly sessionId: string;
  readonly phase: BattleArenaPhase;
  readonly localPeerId: string;
  readonly remotePeerId: string | null;
  readonly remotePlayerName: string | null;
  readonly localParticipant: BattleParticipant | null;
  readonly remoteParticipant: BattleParticipant | null;
  readonly wagerAmount: number;
  readonly sharedSeed: string | null;
  readonly simulationResult: BattleSimulationResult | null;
  readonly historyRecord: BattleHistoryRecord | null;
  readonly errorMessage: string | null;
}

export interface BattleDiscoveredOpponent {
  readonly endpointId: string;
  readonly peerId: string;
  readonly playerName: string;
  readonly avatarSpeciesId?: CharacterId;
  readonly discoveredAtMs: number;
}

export interface BattleTransportPort {
  readonly localPeerId: string;
  connect(channelId: string): Promise<void>;
  disconnect(): void;
  sendBattleMessage(message: BattleP2PMessage): void;
  onBattleMessage(handler: (msg: BattleP2PMessage) => void): () => void;
  onError(handler: (err: Error) => void): () => void;
  getConnectionStatus?(): string;
  getDiscoveredPeers?(): readonly BattleDiscoveredOpponent[];
  connectToPeer?(endpointId: string): Promise<void>;
  acceptConnection?(endpointId: string): Promise<void>;
  rejectConnection?(endpointId: string): Promise<void>;
  onStatusChange?(handler: (status: string) => void): () => void;
  onPeersChange?(handler: (peers: readonly BattleDiscoveredOpponent[]) => void): () => void;
}
