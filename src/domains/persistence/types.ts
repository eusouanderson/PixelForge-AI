import type { CharacterId, CharacterRuntimeState } from '@/domains/characters/types';
import type { PetNeedsState } from '@/domains/pet-needs/types';
import type { CharacterAttributes } from '@/domains/attributes/types';
import type { ProgressionState } from '@/domains/progression/types';
import type { InventoryState } from '@/domains/inventory/types';
import type { WalletState } from '@/domains/economy/types';
import type { GameSettingsState } from '@/domains/settings/types';
import type { CreatureGenome } from '@/domains/genetics/types';
import type { BredEggRecord, BreedingHistoryRecord } from '@/domains/breeding/types';
import type { BattleHistoryRecord, CharacterBattleRecord } from '@/domains/battle/types';

export interface ClockPort {
  nowMs(): number;
}

export interface CharacterSaveRecord {
  readonly id?: string;
  readonly originEggId?: string;
  readonly runtime: CharacterRuntimeState;
  readonly needs: PetNeedsState;
  readonly attributes: CharacterAttributes;
  readonly progression: ProgressionState;
  readonly genetics: CreatureGenome;
  readonly battleRecord?: CharacterBattleRecord;
}

export interface OwnedCreatureEntry {
  readonly creatureId: string;
  readonly speciesId: CharacterId;
  readonly source: 'starter' | 'collection';
  readonly record: CharacterSaveRecord;
}

export interface GameSaveSnapshot {
  readonly schemaVersion: number;
  readonly playerId?: string;
  readonly starterCharacterId?: CharacterId;
  readonly activeCharacterId: CharacterId;
  readonly activeCreatureInstanceId?: string;
  readonly lastSavedAtMs: number;
  readonly characters: Readonly<Record<CharacterId, CharacterSaveRecord>>;
  readonly collection?: Readonly<Record<string, CharacterSaveRecord>>;
  readonly inventory: InventoryState;
  readonly wallet: WalletState;
  readonly settings: GameSettingsState;
  readonly incubator: readonly BredEggRecord[];
  readonly genealogyArchive: readonly BreedingHistoryRecord[];
  readonly battleArchive?: readonly BattleHistoryRecord[];
}

export interface EggActionResult {
  readonly success: boolean;
  readonly message: string;
  readonly snapshot: GameSaveSnapshot;
}

export interface HatchBredEggResult extends EggActionResult {
  readonly hatchedCreatureId?: string;
  readonly hatchedRecord?: CharacterSaveRecord;
}

export interface GameSaveRepositoryPort {
  loadSave(): Promise<GameSaveSnapshot | null>;
  saveSnapshot(snapshot: GameSaveSnapshot): Promise<void>;
  clearSave(): Promise<void>;
}
