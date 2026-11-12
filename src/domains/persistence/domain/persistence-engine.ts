import type { CharacterId } from '@/domains/characters/types';
import {
  CHARACTER_SPECIES_REGISTRY,
  EGG_INCUBATION_DURATION_MS,
  MAX_NATURAL_LIFESPAN_HOURS,
  getCharacterSpeciesById,
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
import type { BredEggRecord, EggIncubationStatus } from '@/domains/breeding/types';
import type {
  CharacterSaveRecord,
  ClockPort,
  GameSaveSnapshot,
  OwnedCreatureEntry
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
    id: characterId,
    runtime: createInitialCharacterRuntime(characterId, nowMs, 'ovo'),
    needs: createInitialNeeds(),
    attributes: { ...species.baseAttributes },
    progression: createInitialProgression('ovo'),
    genetics
  };
}

const INCUBATION_EPSILON = 1e-9;

export function resolveEggStatus(egg: BredEggRecord): EggIncubationStatus {
  if (egg.status === 'hatched' || Boolean(egg.hatchedCreatureId)) {
    return 'hatched';
  }
  if (
    egg.isReadyToHatch ||
    egg.incubationProgress + INCUBATION_EPSILON >= egg.maxIncubationHours ||
    egg.status === 'ready_to_hatch'
  ) {
    return 'ready_to_hatch';
  }
  if (
    egg.status === 'incubating' ||
    Boolean(egg.incubationStartedAtMs) ||
    egg.incubationProgress > 0
  ) {
    return 'incubating';
  }
  return 'available';
}

export function isValidBredEggRecord(egg: BredEggRecord): boolean {
  return Boolean(
    egg.id &&
      egg.genome?.genomeId &&
      isKnownCharacterId(egg.targetSpecies) &&
      Number.isFinite(egg.maxIncubationHours) &&
      egg.maxIncubationHours > 0
  );
}

export function normalizeBredEggRecord(
  egg: BredEggRecord,
  fallbackOwnerId: string,
  collection?: Readonly<Record<string, CharacterSaveRecord>>
): BredEggRecord {
  const maxIncubationHours = egg.maxIncubationHours > 0 ? egg.maxIncubationHours : 0.05;
  const clampedProgress = Math.max(0, Math.min(maxIncubationHours, egg.incubationProgress || 0));
  const alreadyHatchedInCollection = Boolean(
    egg.hatchedCreatureId && collection?.[egg.hatchedCreatureId]
  );

  const rawStatus = alreadyHatchedInCollection
    ? 'hatched'
    : resolveEggStatus({
        ...egg,
        maxIncubationHours,
        incubationProgress: clampedProgress
      });

  const normalizedOwnerId =
    !egg.ownerId || egg.ownerId.startsWith('peer-') ? fallbackOwnerId : egg.ownerId;

  return {
    ...egg,
    ownerId: normalizedOwnerId,
    status: rawStatus,
    incubationProgress: clampedProgress,
    maxIncubationHours,
    isReadyToHatch: rawStatus === 'ready_to_hatch'
  };
}

export function resolveActiveCreatureContext(snapshot: GameSaveSnapshot): OwnedCreatureEntry {
  const instanceId = snapshot.activeCreatureInstanceId;
  const fromCollection = instanceId ? snapshot.collection?.[instanceId] : undefined;
  if (instanceId && fromCollection) {
    return {
      creatureId: instanceId,
      speciesId: fromCollection.runtime.characterId,
      source: 'collection',
      record: fromCollection
    };
  }

  const fallbackRecord = snapshot.characters[snapshot.activeCharacterId];
  return {
    creatureId: fallbackRecord.id ?? snapshot.activeCharacterId,
    speciesId: snapshot.activeCharacterId,
    source: 'starter',
    record: fallbackRecord
  };
}

export function applyActiveCreatureUpdate(
  snapshot: GameSaveSnapshot,
  ctx: OwnedCreatureEntry,
  updatedRecord: CharacterSaveRecord,
  nowMs: number,
  extraPatch?: Partial<GameSaveSnapshot>
): GameSaveSnapshot {
  if (ctx.source === 'collection') {
    return {
      ...snapshot,
      ...extraPatch,
      activeCharacterId: ctx.speciesId,
      activeCreatureInstanceId: ctx.creatureId,
      lastSavedAtMs: nowMs,
      collection: {
        ...snapshot.collection,
        [ctx.creatureId]: updatedRecord
      }
    };
  }

  return {
    ...snapshot,
    ...extraPatch,
    activeCharacterId: ctx.speciesId,
    lastSavedAtMs: nowMs,
    characters: {
      ...snapshot.characters,
      [ctx.speciesId]: updatedRecord
    }
  };
}

export function listOwnedCreatures(snapshot: GameSaveSnapshot): readonly OwnedCreatureEntry[] {
  const activeCtx = resolveActiveCreatureContext(snapshot);
  const starterId = snapshot.starterCharacterId ?? snapshot.activeCharacterId;
  const entries: OwnedCreatureEntry[] = [];

  for (const species of listAllCharacterSpecies()) {
    const rec = snapshot.characters[species.id];
    const isStarter = species.id === starterId;
    const isActiveStarter = activeCtx.source === 'starter' && species.id === snapshot.activeCharacterId;

    if (isStarter || isActiveStarter) {
      entries.push({
        creatureId: rec.id ?? species.id,
        speciesId: species.id,
        source: 'starter',
        record: rec
      });
    }
  }

  const collectionMap = snapshot.collection ?? {};
  for (const [instanceId, rec] of Object.entries(collectionMap)) {
    entries.push({
      creatureId: instanceId,
      speciesId: rec.runtime.characterId,
      source: 'collection',
      record: rec
    });
  }

  entries.sort((a, b) => {
    if (a.creatureId === activeCtx.creatureId) return -1;
    if (b.creatureId === activeCtx.creatureId) return 1;
    return a.record.runtime.createdAtMs - b.record.runtime.createdAtMs;
  });

  return entries;
}

export function advanceBredEggIncubationList(
  incubator: readonly BredEggRecord[],
  targetEggId: string | null,
  elapsedMinutes: number
): readonly BredEggRecord[] {
  if (elapsedMinutes <= 0) {
    return incubator;
  }

  const progressInc = elapsedMinutes / 60;
  let changed = false;

  const updated = incubator.map((egg) => {
    if (targetEggId !== null && egg.id !== targetEggId) {
      return egg;
    }
    if (resolveEggStatus(egg) !== 'incubating') {
      return egg;
    }

    const rawProgress = Math.min(egg.maxIncubationHours, egg.incubationProgress + progressInc);
    const ready = rawProgress + INCUBATION_EPSILON >= egg.maxIncubationHours;
    const nextProgress = ready ? egg.maxIncubationHours : rawProgress;
    const nextStatus: EggIncubationStatus = ready ? 'ready_to_hatch' : 'incubating';
    changed = true;
    return {
      ...egg,
      status: nextStatus,
      incubationProgress: nextProgress,
      isReadyToHatch: ready
    };
  });

  return changed ? updated : incubator;
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
    playerId: 'local-player',
    starterCharacterId: initialCharacterId,
    activeCharacterId: initialCharacterId,
    activeCreatureInstanceId: initialCharacterId,
    lastSavedAtMs: nowMs,
    characters,
    collection: {},
    inventory: createStarterInventory(),
    wallet: createInitialWallet(),
    settings: createDefaultSettings(),
    incubator: [],
    genealogyArchive: []
  };
}

export interface OfflineSimulationOptions {
  readonly deferActiveEggHatch?: boolean;
}

function simulateSingleCharacterProgress(
  prevRecord: CharacterSaveRecord,
  nowMs: number,
  elapsedMinutes: number,
  elapsedHours: number,
  eggMinutes: number,
  shouldDeferEgg: boolean
): CharacterSaveRecord {
  const species = getCharacterSpeciesById(prevRecord.runtime.characterId);
  const isEgg = prevRecord.runtime.currentStage === 'ovo';

  if (isEgg) {
    const eggElapsedMs = Math.max(0, nowMs - prevRecord.runtime.createdAtMs);
    if (eggElapsedMs < EGG_INCUBATION_DURATION_MS || shouldDeferEgg) {
      return {
        ...prevRecord,
        runtime: {
          ...prevRecord.runtime,
          lastUpdatedAtMs: nowMs
        }
      };
    }
  }

  const effectiveMinutes = isEgg ? Math.max(1, elapsedMinutes - eggMinutes) : elapsedMinutes;
  const baseProgression = isEgg
    ? { ...prevRecord.progression, currentStage: 'baby' as const }
    : prevRecord.progression;

  const sim = simulateNeedsOverTime(prevRecord.needs, effectiveMinutes);
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
          baseProgression,
          nextAgeHours,
          sim.currentNeeds.health,
          sim.currentNeeds.happiness,
          species.evolutionRules
        )
      : null;
  const nextStage = evolvedStage ?? baseProgression.currentStage;
  const { emotionalState, healthCondition } = deriveEmotionalAndHealthState(
    sim.currentNeeds,
    nextDiseases.length,
    nextAgeHours
  );
  const nextAnimation = resolveCharacterAnimation(nextStage, healthCondition, emotionalState);

  const finalNeeds = reachedOldAge ? { ...sim.currentNeeds, health: 0 } : sim.currentNeeds;
  const causeOfDeath =
    healthCondition === 'deceased'
      ? reachedOldAge
        ? ('old_age' as const)
        : ('neglect_or_disease' as const)
      : undefined;

  return {
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

export function simulateOfflineProgressOnSnapshot(
  snapshot: GameSaveSnapshot,
  nowMs: number,
  options: OfflineSimulationOptions = {}
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
  const eggMinutes = Math.floor(EGG_INCUBATION_DURATION_MS / 60000);
  const activeCtx = resolveActiveCreatureContext(snapshot);
  const starterId = snapshot.starterCharacterId ?? snapshot.activeCharacterId;
  const updatedCharacters = {} as Record<CharacterId, CharacterSaveRecord>;

  for (const species of listAllCharacterSpecies()) {
    const prevRecord = snapshot.characters[species.id];
    const isOwnedStarterOrActive =
      species.id === starterId ||
      (activeCtx.source === 'starter' && species.id === snapshot.activeCharacterId);

    if (!isOwnedStarterOrActive) {
      updatedCharacters[species.id] = prevRecord;
      continue;
    }

    const shouldDefer = Boolean(
      options.deferActiveEggHatch &&
        activeCtx.source === 'starter' &&
        species.id === snapshot.activeCharacterId
    );
    updatedCharacters[species.id] = simulateSingleCharacterProgress(
      prevRecord,
      nowMs,
      elapsedMinutes,
      elapsedHours,
      eggMinutes,
      shouldDefer
    );
  }

  const updatedCollection: Record<string, CharacterSaveRecord> = {};
  for (const [instanceId, prevRecord] of Object.entries(snapshot.collection ?? {})) {
    updatedCollection[instanceId] = simulateSingleCharacterProgress(
      prevRecord,
      nowMs,
      elapsedMinutes,
      elapsedHours,
      eggMinutes,
      false
    );
  }

  const updatedIncubator = advanceBredEggIncubationList(snapshot.incubator, null, elapsedMinutes);

  return {
    ...snapshot,
    lastSavedAtMs: nowMs,
    characters: updatedCharacters,
    collection: updatedCollection,
    incubator: updatedIncubator
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

  const starterCharacterId: CharacterId = isKnownCharacterId(candidate.starterCharacterId)
    ? candidate.starterCharacterId
    : activeCharacterId;

  const playerId =
    typeof candidate.playerId === 'string' && candidate.playerId.trim().length > 0
      ? candidate.playerId
      : fresh.playerId!;

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
          id: existing.id ?? species.id,
          genetics
        };
      }
    }
  }

  const migratedCollection: Record<string, CharacterSaveRecord> = {};
  if (candidate.collection && typeof candidate.collection === 'object') {
    for (const [instanceId, record] of Object.entries(candidate.collection)) {
      if (
        record &&
        record.runtime &&
        isKnownCharacterId(record.runtime.characterId) &&
        record.needs &&
        record.attributes &&
        record.progression &&
        record.genetics
      ) {
        migratedCollection[instanceId] = {
          ...record,
          id: record.id ?? instanceId
        };
      }
    }
  }

  const activeCollectionRecord =
    typeof candidate.activeCreatureInstanceId === 'string'
      ? migratedCollection[candidate.activeCreatureInstanceId]
      : undefined;

  const resolvedActiveCharacterId = activeCollectionRecord
    ? activeCollectionRecord.runtime.characterId
    : activeCharacterId;

  const resolvedActiveInstanceId = activeCollectionRecord
    ? candidate.activeCreatureInstanceId
    : resolvedActiveCharacterId;

  const rawIncubator = Array.isArray(candidate.incubator) ? candidate.incubator : [];
  const normalizedIncubator = rawIncubator
    .filter((egg): egg is BredEggRecord => Boolean(egg && typeof egg === 'object' && isValidBredEggRecord(egg)))
    .map((egg) => normalizeBredEggRecord(egg, playerId, migratedCollection));

  return {
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    playerId,
    starterCharacterId,
    activeCharacterId: resolvedActiveCharacterId,
    activeCreatureInstanceId: resolvedActiveInstanceId,
    lastSavedAtMs,
    characters: mergedCharacters,
    collection: migratedCollection,
    inventory: candidate.inventory ?? fresh.inventory,
    wallet: candidate.wallet ?? fresh.wallet,
    settings:
      candidate.settings && typeof candidate.settings === 'object'
        ? { ...fresh.settings, ...candidate.settings }
        : fresh.settings,
    incubator: normalizedIncubator,
    genealogyArchive: Array.isArray(candidate.genealogyArchive) ? candidate.genealogyArchive : []
  };
}

