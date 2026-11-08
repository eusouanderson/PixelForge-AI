import type { CharacterId, CharacterLifeStage } from '@/domains/characters/types';
import { getCharacterSpeciesById } from '@/domains/characters/domain/character-registry';
import {
  appendCharacterCareLog,
  deriveEmotionalAndHealthState,
  resolveCharacterAnimation
} from '@/domains/characters/domain/character-state-engine';
import { applyNeedsDelta, createInitialNeeds } from '@/domains/pet-needs/domain/pet-needs-engine';
import { applyAttributeModifier } from '@/domains/attributes/domain/attributes-engine';
import {
  addExperience,
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
import type { GameSaveSnapshot } from '../types';

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

  const reaction = feedCharacter(species, foodId, nowMs);
  const nextNeeds = applyNeedsDelta(charRecord.needs, reaction.appliedNeedsDelta);
  const nextAttributes = applyAttributeModifier(charRecord.attributes, {
    source: 'feeding_bonus',
    deltas: reaction.appliedAttributeDelta
  });

  const xpResult = addExperience(charRecord.progression, reaction.experienceGained);
  const nextAgeHours = Math.round((charRecord.runtime.ageHours + 0.25) * 100) / 100;
  const evolvedToStage = resolveEligibleEvolutionStage(
    xpResult.state,
    nextAgeHours,
    nextNeeds.health,
    nextNeeds.happiness,
    species.evolutionRules
  );
  const finalStage = evolvedToStage ?? xpResult.state.currentStage;
  const { emotionalState, healthCondition } = deriveEmotionalAndHealthState(nextNeeds);
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
      ageHours: nextAgeHours,
      emotionalState,
      healthCondition,
      currentAnimation: nextAnimation
    },
    'feed',
    reaction.message,
    nowMs
  );

  return {
    success: true,
    message: reaction.message,
    reaction,
    snapshot: {
      ...snapshot,
      lastSavedAtMs: nowMs,
      inventory: consumeRes.state,
      characters: {
        ...snapshot.characters,
        [activeId]: {
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

  if (charRecord.runtime.healthCondition === 'deceased') {
    return {
      success: false,
      message: `${species.displayName} está falecido e precisa ser revivido antes de realizar atividades.`,
      leveledUp: false,
      evolvedToStage: null,
      snapshot
    };
  }

  const execRes = executeCharacterActivity(species, activityId, charRecord.needs.energy);
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

  const xpResult = addExperience(charRecord.progression, execRes.experienceGained);
  const nextAgeHours = Math.round((charRecord.runtime.ageHours + 0.5) * 100) / 100;
  const evolvedToStage = resolveEligibleEvolutionStage(
    xpResult.state,
    nextAgeHours,
    nextNeeds.health,
    nextNeeds.happiness,
    species.evolutionRules
  );

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

  const { emotionalState, healthCondition } = deriveEmotionalAndHealthState(nextNeeds);
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
      ageHours: nextAgeHours,
      emotionalState,
      healthCondition,
      currentAnimation: nextAnimation
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

  const nextRuntime = appendCharacterCareLog(
    {
      ...charRecord.runtime,
      emotionalState: 'happy',
      healthCondition: 'healthy',
      currentAnimation: 'idle'
    },
    'revive',
    'Renascido pela Chama Ancestral do Santuário!',
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
        runtime: nextRuntime
      }
    }
  };
}
