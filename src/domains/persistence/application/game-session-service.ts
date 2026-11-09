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
import type { BredEggRecord, BreedingHistoryRecord } from '@/domains/breeding/types';
import type { GameSaveSnapshot, CharacterSaveRecord } from '../types';

export function selectActiveCharacterUseCase(
  snapshot: GameSaveSnapshot,
  characterId: CharacterId,
  nowMs: number
): GameSaveSnapshot {
  return {
    ...snapshot,
    activeCharacterId: characterId,
    lastSavedAtMs: nowMs
  };
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
  const activeId = snapshot.activeCharacterId;
  const charRecord = snapshot.characters[activeId];
  const species = getCharacterSpeciesById(activeId);

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
    snapshot: {
      ...snapshot,
      lastSavedAtMs: nowMs,
      inventory: consumeRes.state,
      characters: {
        ...snapshot.characters,
        [activeId]: {
          ...charRecord,
          runtime: nextRuntime,
          needs: nextNeeds,
          attributes: nextAttributes,
          progression: {
            ...xpResult.state,
            currentStage: finalStage
          }
        }
      }
    }
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
  const activeId = snapshot.activeCharacterId;
  const charRecord = snapshot.characters[activeId];
  const species = getCharacterSpeciesById(activeId);

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
  const nextAnimation = resolveCharacterAnimation(
    finalStage,
    healthCondition,
    emotionalState,
    'amando'
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
      activeDiseases: updatedDiseases
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
    snapshot: {
      ...snapshot,
      lastSavedAtMs: nowMs,
      wallet: coinRes.wallet,
      characters: {
        ...snapshot.characters,
        [activeId]: {
          ...charRecord,
          runtime: nextRuntime,
          needs: nextNeeds,
          attributes: nextAttributes,
          progression: {
            ...xpResult.state,
            currentStage: finalStage
          }
        }
      }
    }
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
  const activeId = snapshot.activeCharacterId;
  const charRecord = snapshot.characters[activeId];
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

  return {
    ...snapshot,
    lastSavedAtMs: nowMs,
    characters: {
      ...snapshot.characters,
      [activeId]: {
        ...charRecord,
        runtime: nextRuntime,
        progression: {
          ...charRecord.progression,
          currentStage: 'baby'
        }
      }
    }
  };
}

export function reviveDeceasedCharacterUseCase(
  snapshot: GameSaveSnapshot,
  nowMs: number
): GameSaveSnapshot {
  const activeId = snapshot.activeCharacterId;
  const charRecord = snapshot.characters[activeId];
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

  return {
    ...snapshot,
    lastSavedAtMs: nowMs,
    characters: {
      ...snapshot.characters,
      [activeId]: {
        ...charRecord,
        needs: restoredNeeds,
        progression: {
          ...charRecord.progression,
          currentStage: targetStage
        },
        runtime: nextRuntime
      }
    }
  };
}

export function recordBreedingResultUseCase(
  snapshot: GameSaveSnapshot,
  historyRecord: BreedingHistoryRecord,
  bredEggIfWon: BredEggRecord | null,
  nowMs: number
): GameSaveSnapshot {
  const nextIncubator = bredEggIfWon
    ? [...snapshot.incubator, bredEggIfWon]
    : snapshot.incubator;

  return {
    ...snapshot,
    lastSavedAtMs: nowMs,
    incubator: nextIncubator,
    genealogyArchive: [historyRecord, ...snapshot.genealogyArchive]
  };
}

export function advanceIncubationUseCase(
  snapshot: GameSaveSnapshot,
  eggId: string,
  elapsedMinutes: number,
  nowMs: number
): GameSaveSnapshot {
  const updatedIncubator = snapshot.incubator.map((egg) => {
    if (egg.id !== eggId) return egg;
    const progressInc = elapsedMinutes / 60;
    const nextProgress = Math.min(egg.maxIncubationHours, egg.incubationProgress + progressInc);
    return {
      ...egg,
      incubationProgress: nextProgress,
      isReadyToHatch: nextProgress >= egg.maxIncubationHours
    };
  });

  return {
    ...snapshot,
    lastSavedAtMs: nowMs,
    incubator: updatedIncubator
  };
}

export function hatchBredEggUseCase(
  snapshot: GameSaveSnapshot,
  eggId: string,
  nowMs: number
): GameSaveSnapshot {
  const egg = snapshot.incubator.find((e) => e.id === eggId);
  if (!egg) {
    return snapshot;
  }

  const targetSpecies = egg.targetSpecies;
  const initialRuntime = createInitialCharacterRuntime(targetSpecies, nowMs, 'baby');
  const loggedRuntime = appendCharacterCareLog(
    initialRuntime,
    'evolve',
    `Ovo de reprodução (${egg.genome.generation}ª Geração) eclodiu com sucesso!`,
    nowMs
  );

  const newRecord: CharacterSaveRecord = {
    runtime: loggedRuntime,
    needs: createInitialNeeds(),
    attributes: { ...egg.genome.phenotype.attributes },
    progression: createInitialProgression('baby'),
    genetics: egg.genome
  };

  const remainingIncubator = snapshot.incubator.filter((e) => e.id !== eggId);

  return {
    ...snapshot,
    activeCharacterId: targetSpecies,
    lastSavedAtMs: nowMs,
    characters: {
      ...snapshot.characters,
      [targetSpecies]: newRecord
    },
    incubator: remainingIncubator
  };
}
