import type { CharacterId, CharacterLifeStage } from '@/domains/characters/types';
import {
  MAX_NATURAL_LIFESPAN_HOURS,
  getCharacterSpeciesById
} from '@/domains/characters/domain/character-registry';
import {
  appendCharacterCareLog,
  contractDisease,
  createInitialCharacterRuntime,
  cureDiseasesWithRemedy,
  deriveEmotionalAndHealthState,
  diagnoseNeedsTriggeredDiseases,
  resolveCharacterAnimation
} from '@/domains/characters/domain/character-state-engine';
import { applyNeedsDelta, createInitialNeeds } from '@/domains/pet-needs/domain/pet-needs-engine';
import { applyAttributeModifier } from '@/domains/attributes/domain/attributes-engine';
import {
  addExperience,
  createInitialProgression,
  resolveEligibleEvolutionStage
} from '@/domains/progression/domain/progression-engine';
import { feedCharacter, getFoodById } from '@/domains/feeding/domain/feeding-engine';
import type { FeedingReaction } from '@/domains/feeding/types';
import {
  addItemToInventory,
  consumeItemFromInventory
} from '@/domains/inventory/domain/inventory-engine';
import { executeCharacterActivity } from '@/domains/activities/domain/activities-engine';
import { earnCoins, spendCoins } from '@/domains/economy/domain/economy-engine';
import { updateGameSettings } from '@/domains/settings/domain/settings-engine';
import type { GameSettingsState } from '@/domains/settings/types';
import { startSleepSession } from '@/domains/sleep/domain/sleep-engine';
import type { BredEggRecord, BreedingHistoryRecord } from '@/domains/breeding/types';
import {
  advanceBredEggIncubationList,
  applyActiveCreatureUpdate,
  isValidBredEggRecord,
  listOwnedCreatures,
  normalizeBredEggRecord,
  resolveActiveCreatureContext,
  resolveEggStatus
} from '../domain/persistence-engine';
import type {
  CharacterSaveRecord,
  EggActionResult,
  GameSaveSnapshot,
  HatchBredEggResult
} from '../types';

export function selectActiveCharacterUseCase(
  snapshot: GameSaveSnapshot,
  characterId: CharacterId,
  nowMs: number
): GameSaveSnapshot {
  return {
    ...snapshot,
    activeCharacterId: characterId,
    activeCreatureInstanceId: characterId,
    lastSavedAtMs: nowMs
  };
}

export function selectActiveCreatureUseCase(
  snapshot: GameSaveSnapshot,
  creatureId: string,
  nowMs: number
): GameSaveSnapshot {
  const fromCollection = snapshot.collection?.[creatureId];
  if (fromCollection) {
    return {
      ...snapshot,
      activeCharacterId: fromCollection.runtime.characterId,
      activeCreatureInstanceId: creatureId,
      lastSavedAtMs: nowMs
    };
  }

  if (creatureId in snapshot.characters) {
    const speciesId = creatureId as CharacterId;
    return selectActiveCharacterUseCase(snapshot, speciesId, nowMs);
  }

  return snapshot;
}

export function updateSettingsUseCase(
  snapshot: GameSaveSnapshot,
  patch: Partial<GameSettingsState>,
  nowMs: number
): GameSaveSnapshot {
  return {
    ...snapshot,
    settings: updateGameSettings(snapshot.settings, patch),
    lastSavedAtMs: nowMs
  };
}

export interface FeedCharacterUseCaseResult {
  readonly success: boolean;
  readonly message: string;
  readonly reaction?: FeedingReaction;
  readonly snapshot: GameSaveSnapshot;
}

export function feedActiveCharacterUseCase(
  snapshot: GameSaveSnapshot,
  foodId: string,
  nowMs: number
): FeedCharacterUseCaseResult {
  const activeCtx = resolveActiveCreatureContext(snapshot);
  const charRecord = activeCtx.record;
  const species = getCharacterSpeciesById(activeCtx.speciesId);

  if (charRecord.runtime.currentStage === 'ovo') {
    return {
      success: false,
      message: `${species.displayName} ainda está no ovo ancestral! Aguarde a eclosão para alimentá-lo.`,
      snapshot
    };
  }

  if (charRecord.runtime.healthCondition === 'deceased') {
    return {
      success: false,
      message: `${species.displayName} está falecido. Utilize a Bênção do Santuário para revivê-lo!`,
      snapshot
    };
  }

  if (charRecord.runtime.sleepState === 'sleeping') {
    return {
      success: false,
      message: `${species.displayName} está dormindo profundamente e descansando. Não é possível alimentá-lo agora!`,
      snapshot
    };
  }

  const consumeRes = consumeItemFromInventory(snapshot.inventory, foodId, 1);
  if (!consumeRes.success) {
    return {
      success: false,
      message: consumeRes.reason as string,
      snapshot
    };
  }

  const reaction = feedCharacter(
    species,
    foodId,
    nowMs,
    charRecord.needs.hunger,
    charRecord.needs.thirst,
    charRecord.runtime.activeDiseases
  );
  const nextNeeds = applyNeedsDelta(charRecord.needs, reaction.appliedNeedsDelta);
  const nextAttributes = applyAttributeModifier(charRecord.attributes, {
    source: 'feeding_bonus',
    deltas: reaction.appliedAttributeDelta
  });

  let updatedDiseases = charRecord.runtime.activeDiseases;
  if (reaction.contractedDiseaseId) {
    updatedDiseases = contractDisease(updatedDiseases, reaction.contractedDiseaseId, nowMs);
  }
  let finalMessage = reaction.message;
  if (reaction.curedDiseaseId) {
    const cureRes = cureDiseasesWithRemedy(updatedDiseases, reaction.curedDiseaseId);
    updatedDiseases = cureRes.remaining;
    finalMessage = `${reaction.message} Curou ${cureRes.cured.length} enfermidade(s)!`;
  }
  updatedDiseases = diagnoseNeedsTriggeredDiseases(nextNeeds, updatedDiseases, nowMs);

  const xpResult = addExperience(charRecord.progression, reaction.experienceGained);
  const currentAgeHours = charRecord.runtime.ageHours;
  const evolvedToStage =
    updatedDiseases.length === 0
      ? resolveEligibleEvolutionStage(
          xpResult.state,
          currentAgeHours,
          nextNeeds.health,
          nextNeeds.happiness,
          species.evolutionRules
        )
      : null;
  const finalStage = evolvedToStage ?? xpResult.state.currentStage;
  const { emotionalState, healthCondition } = deriveEmotionalAndHealthState(
    nextNeeds,
    updatedDiseases.length,
    currentAgeHours
  );
  const nextAnimation = resolveCharacterAnimation(
    finalStage,
    healthCondition,
    emotionalState,
    reaction.accepted ? 'comendo' : 'doente'
  );

  const nextRuntime = appendCharacterCareLog(
    {
      ...charRecord.runtime,
      currentStage: finalStage,
      ageHours: currentAgeHours,
      emotionalState,
      healthCondition,
      currentAnimation: nextAnimation,
      activeDiseases: updatedDiseases
    },
    'feed',
    finalMessage,
    nowMs
  );

  return {
    success: true,
    message: finalMessage,
    reaction,
    snapshot: applyActiveCreatureUpdate(
      snapshot,
      activeCtx,
      {
        ...charRecord,
        runtime: nextRuntime,
        needs: nextNeeds,
        attributes: nextAttributes,
        progression: {
          ...xpResult.state,
          currentStage: finalStage
        }
      },
      nowMs,
      { inventory: consumeRes.state }
    )
  };
}

export interface PerformActivityUseCaseResult {
  readonly success: boolean;
  readonly message: string;
  readonly leveledUp: boolean;
  readonly evolvedToStage: CharacterLifeStage | null;
  readonly snapshot: GameSaveSnapshot;
}

export function performCharacterActivityUseCase(
  snapshot: GameSaveSnapshot,
  activityId: string,
  nowMs: number
): PerformActivityUseCaseResult {
  const activeCtx = resolveActiveCreatureContext(snapshot);
  const charRecord = activeCtx.record;
  const species = getCharacterSpeciesById(activeCtx.speciesId);

  if (charRecord.runtime.currentStage === 'ovo') {
    return {
      success: false,
      message: `${species.displayName} ainda é um ovo ancestral! Ele precisa eclodir antes de realizar atividades.`,
      leveledUp: false,
      evolvedToStage: null,
      snapshot
    };
  }

  if (charRecord.runtime.healthCondition === 'deceased') {
    return {
      success: false,
      message: `${species.displayName} está falecido e precisa ser revivido antes de realizar atividades.`,
      leveledUp: false,
      evolvedToStage: null,
      snapshot
    };
  }

  if (charRecord.runtime.sleepState === 'sleeping') {
    return {
      success: false,
      message: `${species.displayName} está dormindo profundamente e descansando. Aguarde ele acordar naturalmente!`,
      leveledUp: false,
      evolvedToStage: null,
      snapshot
    };
  }

  const execRes = executeCharacterActivity(
    species,
    activityId,
    charRecord.needs.energy,
    charRecord.needs
  );
  if (!execRes.success) {
    return {
      success: false,
      message: execRes.message,
      leveledUp: false,
      evolvedToStage: null,
      snapshot
    };
  }

  const nextNeeds = applyNeedsDelta(charRecord.needs, execRes.needsDelta);
  let nextAttributes = applyAttributeModifier(charRecord.attributes, {
    source: 'activity_training',
    deltas: execRes.attributeGains
  });

  const updatedDiseases = diagnoseNeedsTriggeredDiseases(
    nextNeeds,
    charRecord.runtime.activeDiseases,
    nowMs
  );
  const xpResult = addExperience(charRecord.progression, execRes.experienceGained);
  const currentAgeHours = charRecord.runtime.ageHours;
  const evolvedToStage =
    updatedDiseases.length === 0
      ? resolveEligibleEvolutionStage(
          xpResult.state,
          currentAgeHours,
          nextNeeds.health,
          nextNeeds.happiness,
          species.evolutionRules
        )
      : null;

  const finalStage = evolvedToStage ?? xpResult.state.currentStage;
  if (evolvedToStage) {
    nextAttributes = applyAttributeModifier(nextAttributes, {
      source: 'stage_evolution',
      deltas: {
        strength: 3,
        defense: 3,
        agility: 3,
        intelligence: 3,
        endurance: 3,
        elementalAffinity: 4
      }
    });
  }

  const { emotionalState, healthCondition } = deriveEmotionalAndHealthState(
    nextNeeds,
    updatedDiseases.length,
    currentAgeHours
  );
  const isDeepSlumber = activityId === 'deep-slumber';
  const newSleepSession = isDeepSlumber
    ? startSleepSession(finalStage, nextNeeds.energy, nowMs)
    : charRecord.runtime.sleepSession;
  const newSleepState = isDeepSlumber ? 'sleeping' : charRecord.runtime.sleepState;

  const nextAnimation = resolveCharacterAnimation(
    finalStage,
    healthCondition,
    emotionalState,
    isDeepSlumber ? undefined : 'amando',
    newSleepState
  );

  const summary = evolvedToStage
    ? `${execRes.message} Evoluiu para a fase ${evolvedToStage.toUpperCase()}!`
    : execRes.message;

  const nextRuntime = appendCharacterCareLog(
    {
      ...charRecord.runtime,
      currentStage: finalStage,
      ageHours: currentAgeHours,
      emotionalState,
      healthCondition,
      currentAnimation: nextAnimation,
      activeDiseases: updatedDiseases,
      sleepState: newSleepState,
      sleepSession: newSleepSession
    },
    evolvedToStage ? 'evolve' : 'activity',
    summary,
    nowMs
  );

  const coinRes = earnCoins(snapshot.wallet, execRes.coinsGained);

  return {
    success: true,
    message: summary,
    leveledUp: xpResult.leveledUp,
    evolvedToStage,
    snapshot: applyActiveCreatureUpdate(
      snapshot,
      activeCtx,
      {
        ...charRecord,
        runtime: nextRuntime,
        needs: nextNeeds,
        attributes: nextAttributes,
        progression: {
          ...xpResult.state,
          currentStage: finalStage
        }
      },
      nowMs,
      { wallet: coinRes.wallet }
    )
  };
}

export function purchaseFoodItemUseCase(
  snapshot: GameSaveSnapshot,
  foodId: string,
  quantity: number,
  nowMs: number
): {
  readonly success: boolean;
  readonly message: string;
  readonly snapshot: GameSaveSnapshot;
} {
  const safeQty = Math.floor(quantity);
  if (safeQty <= 0) {
    return {
      success: false,
      message: 'Quantidade inválida para compra.',
      snapshot
    };
  }

  const food = getFoodById(foodId);
  const totalCost = food.priceCoins * safeQty;
  const spendRes = spendCoins(snapshot.wallet, totalCost);

  if (!spendRes.success) {
    return {
      success: false,
      message: spendRes.reason as string,
      snapshot
    };
  }

  const invRes = addItemToInventory(snapshot.inventory, foodId, safeQty);
  return {
    success: true,
    message: `Comprou ${safeQty}x ${food.name} por ${totalCost} Moedas Âmbar!`,
    snapshot: {
      ...snapshot,
      lastSavedAtMs: nowMs,
      wallet: spendRes.wallet,
      inventory: invRes.state
    }
  };
}

export function hatchCharacterEggUseCase(
  snapshot: GameSaveSnapshot,
  nowMs: number
): GameSaveSnapshot {
  const activeCtx = resolveActiveCreatureContext(snapshot);
  const charRecord = activeCtx.record;
  if (charRecord.runtime.currentStage !== 'ovo') {
    return snapshot;
  }

  const nextRuntime = appendCharacterCareLog(
    {
      ...charRecord.runtime,
      currentStage: 'baby',
      currentAnimation: 'idle'
    },
    'evolve',
    'O ovo ancestral eclodiu! O filhote nasceu cheio de energia.',
    nowMs
  );

  return applyActiveCreatureUpdate(
    snapshot,
    activeCtx,
    {
      ...charRecord,
      runtime: nextRuntime,
      progression: {
        ...charRecord.progression,
        currentStage: 'baby'
      }
    },
    nowMs
  );
}

export function reviveDeceasedCharacterUseCase(
  snapshot: GameSaveSnapshot,
  nowMs: number
): GameSaveSnapshot {
  const activeCtx = resolveActiveCreatureContext(snapshot);
  const charRecord = activeCtx.record;
  const restoredNeeds = createInitialNeeds();
  const isReincarnation = charRecord.runtime.ageHours >= MAX_NATURAL_LIFESPAN_HOURS;
  const targetStage = isReincarnation ? 'ovo' : charRecord.runtime.currentStage;
  const targetAgeHours = isReincarnation ? 0 : charRecord.runtime.ageHours;

  const nextRuntime = appendCharacterCareLog(
    {
      ...charRecord.runtime,
      currentStage: targetStage,
      ageHours: targetAgeHours,
      emotionalState: 'happy',
      healthCondition: 'healthy',
      currentAnimation: isReincarnation ? 'eclosao' : 'idle',
      activeDiseases: [],
      causeOfDeath: undefined
    },
    'revive',
    isReincarnation
      ? 'Ciclo de 1 mês concluído! Um novo ovo ancestral surgiu pela Chama do Santuário!'
      : 'Renascido pela Chama Ancestral do Santuário!',
    nowMs
  );

  return applyActiveCreatureUpdate(
    snapshot,
    activeCtx,
    {
      ...charRecord,
      needs: restoredNeeds,
      progression: {
        ...charRecord.progression,
        currentStage: targetStage
      },
      runtime: nextRuntime
    },
    nowMs
  );
}

export function recordBreedingResultUseCase(
  snapshot: GameSaveSnapshot,
  historyRecord: BreedingHistoryRecord,
  bredEggIfWon: BredEggRecord | null,
  nowMs: number
): GameSaveSnapshot {
  const ownerId = snapshot.playerId ?? 'local-player';
  let nextIncubator = snapshot.incubator;

  if (bredEggIfWon && !snapshot.incubator.some((e) => e.id === bredEggIfWon.id)) {
    const normalizedEgg = normalizeBredEggRecord(
      { ...bredEggIfWon, ownerId },
      ownerId,
      snapshot.collection
    );
    nextIncubator = [...snapshot.incubator, normalizedEgg];
  }

  return {
    ...snapshot,
    lastSavedAtMs: nowMs,
    incubator: nextIncubator,
    genealogyArchive: [historyRecord, ...snapshot.genealogyArchive]
  };
}

function findOwnedValidEgg(
  snapshot: GameSaveSnapshot,
  eggId: string,
  actorPlayerId?: string
): { readonly ok: true; readonly egg: BredEggRecord } | { readonly ok: false; readonly message: string } {
  const egg = snapshot.incubator.find((e) => e.id === eggId);
  if (!egg) {
    return { ok: false, message: 'Ovo não encontrado no inventário/berçário.' };
  }

  const actor = actorPlayerId ?? snapshot.playerId;
  if (egg.ownerId && actor && egg.ownerId !== actor) {
    return { ok: false, message: 'Este ovo pertence a outro jogador e não pode ser utilizado.' };
  }

  if (!isValidBredEggRecord(egg)) {
    return { ok: false, message: 'Dados do ovo inválidos para incubação ou eclosão.' };
  }

  return { ok: true, egg };
}

export function startEggIncubationUseCase(
  snapshot: GameSaveSnapshot,
  eggId: string,
  nowMs: number,
  actorPlayerId?: string
): EggActionResult {
  const lookup = findOwnedValidEgg(snapshot, eggId, actorPlayerId);
  if (!lookup.ok) {
    return { success: false, message: lookup.message, snapshot };
  }

  const status = resolveEggStatus(lookup.egg);
  if (status === 'incubating') {
    return {
      success: false,
      message: 'Este ovo já está em processo de incubação.',
      snapshot
    };
  }
  if (status === 'ready_to_hatch') {
    return {
      success: false,
      message: 'Este ovo já concluiu a incubação e está pronto para nascer.',
      snapshot
    };
  }
  if (status === 'hatched') {
    return {
      success: false,
      message: 'Este ovo já eclodiu e não pode ser incubado novamente.',
      snapshot
    };
  }

  const updatedIncubator = snapshot.incubator.map((egg) =>
    egg.id === eggId
      ? {
          ...egg,
          status: 'incubating' as const,
          incubationStartedAtMs: nowMs,
          isWarm: true,
          isReadyToHatch: false
        }
      : egg
  );

  return {
    success: true,
    message: `Incubação de ${getCharacterSpeciesById(lookup.egg.targetSpecies).displayName} iniciada!`,
    snapshot: {
      ...snapshot,
      lastSavedAtMs: nowMs,
      incubator: updatedIncubator
    }
  };
}

export function advanceIncubationUseCase(
  snapshot: GameSaveSnapshot,
  eggId: string,
  elapsedMinutes: number,
  nowMs: number
): GameSaveSnapshot {
  const updatedIncubator = advanceBredEggIncubationList(snapshot.incubator, eggId, elapsedMinutes);
  if (updatedIncubator === snapshot.incubator) {
    return snapshot;
  }

  return {
    ...snapshot,
    lastSavedAtMs: nowMs,
    incubator: updatedIncubator
  };
}

export function advanceAllIncubatingEggsUseCase(
  snapshot: GameSaveSnapshot,
  elapsedMinutes: number,
  nowMs: number
): GameSaveSnapshot {
  const updatedIncubator = advanceBredEggIncubationList(snapshot.incubator, null, elapsedMinutes);
  if (updatedIncubator === snapshot.incubator) {
    return snapshot;
  }

  return {
    ...snapshot,
    lastSavedAtMs: nowMs,
    incubator: updatedIncubator
  };
}

export function warmIncubatingEggUseCase(
  snapshot: GameSaveSnapshot,
  eggId: string,
  nowMs: number,
  actorPlayerId?: string
): EggActionResult {
  const lookup = findOwnedValidEgg(snapshot, eggId, actorPlayerId);
  if (!lookup.ok) {
    return { success: false, message: lookup.message, snapshot };
  }

  const status = resolveEggStatus(lookup.egg);
  if (status === 'available') {
    return startEggIncubationUseCase(snapshot, eggId, nowMs, actorPlayerId);
  }
  if (status === 'ready_to_hatch') {
    return {
      success: false,
      message: 'A incubação já foi concluída! Ecloda o ovo para conhecer o filhote.',
      snapshot
    };
  }
  if (status === 'hatched') {
    return {
      success: false,
      message: 'Este ovo já eclodiu anteriormente.',
      snapshot
    };
  }

  const warmedIncubator = advanceBredEggIncubationList(
    snapshot.incubator.map((egg) => (egg.id === eggId ? { ...egg, isWarm: true } : egg)),
    eggId,
    0.5
  );
  const updatedEgg = warmedIncubator.find((e) => e.id === eggId)!;
  const ready = resolveEggStatus(updatedEgg) === 'ready_to_hatch';

  return {
    success: true,
    message: ready
      ? '✨ Incubação concluída! O ovo está pronto para nascer!'
      : '♨️ Ovo aquecido! O embrião está se desenvolvendo bem.',
    snapshot: {
      ...snapshot,
      lastSavedAtMs: nowMs,
      incubator: warmedIncubator
    }
  };
}

function buildUniqueCreatureId(
  egg: BredEggRecord,
  collection: Readonly<Record<string, CharacterSaveRecord>> | undefined
): string {
  const baseId = `creature-${egg.id}`;
  if (!collection || !(baseId in collection)) {
    return baseId;
  }
  let suffix = 2;
  while (`${baseId}-${suffix}` in collection) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
}

export function hatchBredEggAtomicUseCase(
  snapshot: GameSaveSnapshot,
  eggId: string,
  nowMs: number,
  customNickname?: string,
  actorPlayerId?: string
): HatchBredEggResult {
  const lookup = findOwnedValidEgg(snapshot, eggId, actorPlayerId);
  if (!lookup.ok) {
    return { success: false, message: lookup.message, snapshot };
  }

  const egg = lookup.egg;
  const status = resolveEggStatus(egg);
  const collection = snapshot.collection ?? {};
  const existingFromEgg = Object.values(collection).find((c) => c.originEggId === egg.id);

  if (status === 'hatched' || Boolean(egg.hatchedCreatureId) || existingFromEgg) {
    return {
      success: false,
      message: 'Este ovo já eclodiu e não pode gerar outro dinossauro.',
      snapshot
    };
  }

  if (status !== 'ready_to_hatch') {
    return {
      success: false,
      message: 'Este ovo ainda não terminou a incubação para nascer.',
      snapshot
    };
  }

  const targetSpecies = egg.targetSpecies;
  const speciesDef = getCharacterSpeciesById(targetSpecies);
  const creatureId = buildUniqueCreatureId(egg, collection);
  const trimmedNick = customNickname?.trim();

  const initialRuntime = createInitialCharacterRuntime(targetSpecies, nowMs, 'baby');
  const birthSummary = egg.genome.parents
    ? `Nasceu do ovo ${egg.id} (${egg.genome.generation}ª Geração: ${egg.genome.parents.sireName} × ${egg.genome.parents.damName}).`
    : `Nasceu do ovo ${egg.id} (${egg.genome.generation}ª Geração)!`;

  const runtimeWithNick = trimmedNick
    ? { ...initialRuntime, customNickname: trimmedNick }
    : initialRuntime;

  const loggedRuntime = appendCharacterCareLog(runtimeWithNick, 'evolve', birthSummary, nowMs);

  const newRecord: CharacterSaveRecord = {
    id: creatureId,
    originEggId: egg.id,
    runtime: loggedRuntime,
    needs: createInitialNeeds(),
    attributes: { ...egg.genome.phenotype.attributes },
    progression: createInitialProgression('baby'),
    genetics: egg.genome
  };

  const updatedIncubator = snapshot.incubator.map((item) =>
    item.id === eggId
      ? {
          ...item,
          status: 'hatched' as const,
          isReadyToHatch: false,
          hatchedAtMs: nowMs,
          hatchedCreatureId: creatureId
        }
      : item
  );

  const nextSnapshot: GameSaveSnapshot = {
    ...snapshot,
    activeCharacterId: targetSpecies,
    activeCreatureInstanceId: creatureId,
    lastSavedAtMs: nowMs,
    collection: {
      ...collection,
      [creatureId]: newRecord
    },
    incubator: updatedIncubator
  };

  return {
    success: true,
    message: `🐣 ${trimmedNick || speciesDef.displayName} (Baby, Gen ${egg.genome.generation}) nasceu e entrou para sua coleção!`,
    hatchedCreatureId: creatureId,
    hatchedRecord: newRecord,
    snapshot: nextSnapshot
  };
}

export function hatchBredEggUseCase(
  snapshot: GameSaveSnapshot,
  eggId: string,
  nowMs: number
): GameSaveSnapshot {
  return hatchBredEggAtomicUseCase(snapshot, eggId, nowMs).snapshot;
}

export { listOwnedCreatures };
