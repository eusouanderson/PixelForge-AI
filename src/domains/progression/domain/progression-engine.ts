import type { CharacterEvolutionRule, CharacterLifeStage } from '@/domains/characters/types';
import type { ExperienceGainResult, ProgressionState } from '../types';

export function calculateXpForNextLevel(level: number): number {
  return Math.max(1, Math.floor(level)) * 100;
}

export function createInitialProgression(
  initialStage: CharacterLifeStage = 'baby'
): ProgressionState {
  return {
    level: 1,
    currentXp: 0,
    nextLevelXp: calculateXpForNextLevel(1),
    totalXpEarned: 0,
    currentStage: initialStage
  };
}

export function addExperience(
  state: ProgressionState,
  xpAmount: number
): ExperienceGainResult {
  const safeXp = Math.max(0, Math.round(xpAmount));
  if (safeXp === 0) {
    return {
      previousLevel: state.level,
      newLevel: state.level,
      leveledUp: false,
      levelsGained: 0,
      state
    };
  }

  let level = state.level;
  let currentXp = state.currentXp + safeXp;
  let nextLevelXp = state.nextLevelXp;

  while (currentXp >= nextLevelXp) {
    currentXp -= nextLevelXp;
    level += 1;
    nextLevelXp = calculateXpForNextLevel(level);
  }

  const nextState: ProgressionState = {
    level,
    currentXp,
    nextLevelXp,
    totalXpEarned: state.totalXpEarned + safeXp,
    currentStage: state.currentStage
  };

  return {
    previousLevel: state.level,
    newLevel: level,
    leveledUp: level > state.level,
    levelsGained: level - state.level,
    state: nextState
  };
}

export function resolveEligibleEvolutionStage(
  progression: ProgressionState,
  ageHours: number,
  health: number,
  happiness: number,
  rules: readonly CharacterEvolutionRule[]
): CharacterLifeStage | null {
  const rule = rules.find((r) => r.fromStage === progression.currentStage);
  if (!rule) return null;

  const meetsCriteria =
    progression.level >= rule.requiredLevel &&
    ageHours >= rule.requiredAgeHours &&
    health >= rule.minHealth &&
    happiness >= rule.minHappiness;

  return meetsCriteria ? rule.toStage : null;
}

