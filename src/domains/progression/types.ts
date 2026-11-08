import type { CharacterLifeStage } from '@/domains/characters/types';

export interface ProgressionState {
  readonly level: number;
  readonly currentXp: number;
  readonly nextLevelXp: number;
  readonly totalXpEarned: number;
  readonly currentStage: CharacterLifeStage;
}

export interface ExperienceGainResult {
  readonly previousLevel: number;
  readonly newLevel: number;
  readonly leveledUp: boolean;
  readonly levelsGained: number;
  readonly state: ProgressionState;
}

