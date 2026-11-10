import type { CharacterId } from '@/domains/characters/types';
import {
  CHARACTER_SPECIES_REGISTRY,
  MAX_NATURAL_LIFESPAN_HOURS,
  listAllCharacterSpecies,
  pickRandomCharacterId
} from '@/domains/characters/domain/character-registry';
import {
  createInitialCharacterRuntime,
  deriveEmotionalAndHealthState,
  diagnoseNeedsTriggeredDiseases,
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
import { createGenesisGenome } from '@/domains/genetics/domain/dna-engine';
import { deterministicSexFromSeed } from '@/domains/genetics/domain/sex-determination-engine';
import type {
  CharacterSaveRecord,
  ClockPort,
  GameSaveSnapshot
} from '../types';

export const CURRENT_SAVE_SCHEMA_VERSION = 2;

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
  const sex = deterministicSexFromSeed(`${characterId}:v2`);
  const genetics = createGenesisGenome(characterId, sex, nowMs);

  return {
    runtime: createInitialCharacterRuntime(characterId, nowMs, 'ovo'),
    needs: createInitialNeeds(),
    attributes: { ...species.baseAttributes },
    progression: createInitialProgression('ovo'),
    genetics
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
    settings: createDefaultSettings(),
    incubator: [],
    genealogyArchive: []
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
    const nextDiseases = diagnoseNeedsTriggeredDiseases(
      sim.currentNeeds,
      prevRecord.runtime.activeDiseases,
      nowMs
    );
    const reachedOldAge = nextAgeHours >= MAX_NATURAL_LIFESPAN_HOURS;
    const evolvedStage =
      nextDiseases.length === 0 && !reachedOldAge
        ? resolveEligibleEvolutionStage(
            prevRecord.progression,
            nextAgeHours,
            sim.currentNeeds.health,
            sim.currentNeeds.happiness,
            species.evolutionRules
          )
        : null;
    const nextStage = evolvedStage ?? prevRecord.runtime.currentStage;
    const { emotionalState, healthCondition } = deriveEmotionalAndHealthState(
      sim.currentNeeds,
      nextDiseases.length,
      nextAgeHours
    );
    const nextAnimation = resolveCharacterAnimation(
      nextStage,
      healthCondition,
      emotionalState
    );

    const finalNeeds = reachedOldAge
      ? { ...sim.currentNeeds, health: 0 }
      : sim.currentNeeds;
    const causeOfDeath =
      healthCondition === 'deceased'
        ? reachedOldAge
          ? ('old_age' as const)
          : ('neglect_or_disease' as const)
        : undefined;

    updatedCharacters[species.id] = {
      ...prevRecord,
      needs: finalNeeds,
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
        activeDiseases: nextDiseases,
        causeOfDeath,
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
        const genetics = existing.genetics ?? createGenesisGenome(
          species.id,
          deterministicSexFromSeed(`${species.id}:${existing.runtime.createdAtMs || 1000}`),
          existing.runtime.createdAtMs || nowMs
        );
        mergedCharacters[species.id] = {
          ...existing,
          genetics
        };
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
    settings:
      candidate.settings && typeof candidate.settings === 'object'
        ? { ...fresh.settings, ...candidate.settings }
        : fresh.settings,
    incubator: Array.isArray(candidate.incubator) ? candidate.incubator : [],
    genealogyArchive: Array.isArray(candidate.genealogyArchive) ? candidate.genealogyArchive : []
  };
}

