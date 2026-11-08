import type { CharacterId, CharacterRuntimeState } from '@/domains/characters/types';
import type { PetNeedsState } from '@/domains/pet-needs/types';
import type { CharacterAttributes } from '@/domains/attributes/types';
import type { ProgressionState } from '@/domains/progression/types';
import type { InventoryState } from '@/domains/inventory/types';
import type { WalletState } from '@/domains/economy/types';
import type { GameSettingsState } from '@/domains/settings/types';

export interface ClockPort {
  nowMs(): number;
}

export interface CharacterSaveRecord {
  readonly runtime: CharacterRuntimeState;
  readonly needs: PetNeedsState;
  readonly attributes: CharacterAttributes;
  readonly progression: ProgressionState;
}

export interface GameSaveSnapshot {
  readonly schemaVersion: number;
  readonly activeCharacterId: CharacterId;
  readonly lastSavedAtMs: number;
  readonly characters: Readonly<Record<CharacterId, CharacterSaveRecord>>;
  readonly inventory: InventoryState;
  readonly wallet: WalletState;
  readonly settings: GameSettingsState;
}

export interface GameSaveRepositoryPort {
  loadSave(): Promise<GameSaveSnapshot | null>;
  saveSnapshot(snapshot: GameSaveSnapshot): Promise<void>;
  clearSave(): Promise<void>;
}

