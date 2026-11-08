import type { CharacterId } from '@/domains/characters/types';
import {
  CHARACTER_SPECIES_REGISTRY,
  listAllCharacterSpecies,
  pickRandomCharacterId
} from '@/domains/characters/domain/character-registry';
import {
  createInitialCharacterRuntime,
  deriveEmotionalAndHealthState,
  resolveCharacterAnimation
} from '@/domains/characters/domain/character-state-engine';
import {
  createInitialNeeds,
  simulateNeedsOverTime
} from '@/domains/pet-needs/domain/pet-needs-engine';
import {
  createInitialProgression,
  resolveEligibleEvolutionStage
} from '@/domains/progression/domain/progression-engine';
import { createStarterInventory } from '@/domains/inventory/domain/inventory-engine';
import { createInitialWallet } from '@/domains/economy/domain/economy-engine';
import { createDefaultSettings } from '@/domains/settings/domain/settings-engine';
import type {
  CharacterSaveRecord,
  ClockPort,
  GameSaveSnapshot
} from '../types';

export const CURRENT_SAVE_SCHEMA_VERSION = 1;

export class SystemClock implements ClockPort {
  public nowMs(): number {
    return Date.now();
  }
}

export function createDefaultCharacterSaveRecord(
  characterId: CharacterId,
  nowMs: number
): CharacterSaveRecord {
  const species = CHARACTER_SPECIES_REGISTRY[characterId];
  return {
    runtime: createInitialCharacterRuntime(characterId, nowMs, 'ovo'),
    needs: createInitialNeeds(),
    attributes: { ...species.baseAttributes },
    progression: createInitialProgression('ovo')
  };
}

export function createNewGameSaveSnapshot(
  nowMs: number,
  initialCharacterId: CharacterId = pickRandomCharacterId()
): GameSaveSnapshot {
  const allSpecies = listAllCharacterSpecies();
  const characters = {} as Record<CharacterId, CharacterSaveRecord>;

  for (const species of allSpecies) {
    characters[species.id] = createDefaultCharacterSaveRecord(species.id, nowMs);
  }

  return {
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    activeCharacterId: initialCharacterId,
    lastSavedAtMs: nowMs,
    characters,
    inventory: createStarterInventory(),
    wallet: createInitialWallet(),
    settings: createDefaultSettings()
  };
}

export function simulateOfflineProgressOnSnapshot(
  snapshot: GameSaveSnapshot,
  nowMs: number
): GameSaveSnapshot {
  const elapsedMs = Math.max(0, nowMs - snapshot.lastSavedAtMs);
  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  if (elapsedMinutes <= 0) {
    return {
      ...snapshot,
      lastSavedAtMs: nowMs
    };
  }

  const elapsedHours = Math.round((elapsedMinutes / 60) * 10) / 10;
  const updatedCharacters = {} as Record<CharacterId, CharacterSaveRecord>;

  for (const species of listAllCharacterSpecies()) {
    const prevRecord = snapshot.characters[species.id];
    const sim = simulateNeedsOverTime(prevRecord.needs, elapsedMinutes);
    const nextAgeHours = Math.round((prevRecord.runtime.ageHours + elapsedHours) * 10) / 10;
    const evolvedStage = resolveEligibleEvolutionStage(
      prevRecord.progression,
      nextAgeHours,
      sim.currentNeeds.health,
      sim.currentNeeds.happiness,
      species.evolutionRules
    );
    const nextStage = evolvedStage ?? prevRecord.runtime.currentStage;
    const { emotionalState, healthCondition } = deriveEmotionalAndHealthState(sim.currentNeeds);
    const nextAnimation = resolveCharacterAnimation(
      nextStage,
      healthCondition,
      emotionalState
    );

    updatedCharacters[species.id] = {
      ...prevRecord,
      needs: sim.currentNeeds,
      progression: {
        ...prevRecord.progression,
        currentStage: nextStage
      },
      runtime: {
        ...prevRecord.runtime,
        currentStage: nextStage,
        ageHours: nextAgeHours,
        emotionalState,
        healthCondition,
        currentAnimation: nextAnimation,
        lastUpdatedAtMs: nowMs
      }
    };
  }

  return {
    ...snapshot,
    lastSavedAtMs: nowMs,
    characters: updatedCharacters
  };
}

function isKnownCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && value in CHARACTER_SPECIES_REGISTRY;
}

export function validateAndMigrateSaveSnapshot(
  rawInput: unknown,
  nowMs: number
): GameSaveSnapshot {
  const fresh = createNewGameSaveSnapshot(nowMs);
  if (!rawInput || typeof rawInput !== 'object') {
    return fresh;
  }

  const candidate = rawInput as Partial<GameSaveSnapshot>;
  const activeCharacterId: CharacterId = isKnownCharacterId(candidate.activeCharacterId)
    ? candidate.activeCharacterId
    : 'ignisauro';

  const lastSavedAtMs =
    typeof candidate.lastSavedAtMs === 'number' && candidate.lastSavedAtMs > 0
      ? candidate.lastSavedAtMs
      : nowMs;

  const mergedCharacters = { ...fresh.characters };
  if (candidate.characters && typeof candidate.characters === 'object') {
    for (const species of listAllCharacterSpecies()) {
      const existing = (candidate.characters as Record<string, CharacterSaveRecord | undefined>)[
        species.id
      ];
      if (existing && existing.runtime && existing.needs && existing.attributes && existing.progression) {
        mergedCharacters[species.id] = existing;
      }
    }
  }

  return {
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    activeCharacterId,
    lastSavedAtMs,
    characters: mergedCharacters,
    inventory: candidate.inventory ?? fresh.inventory,
    wallet: candidate.wallet ?? fresh.wallet,
    settings: candidate.settings ?? fresh.settings
  };
}

