import { describe, it, expect } from 'vitest';
import {
  createInitialProgression,
  calculateXpForNextLevel,
  addExperience,
  resolveEligibleEvolutionStage
} from '../domain/progression-engine';
import type { CharacterEvolutionRule } from '@/domains/characters/types';

describe('progression domain engine', () => {
  const rules: readonly CharacterEvolutionRule[] = [
    { fromStage: 'ovo', toStage: 'baby', requiredLevel: 1, requiredAgeHours: 0, minHealth: 50, minHappiness: 50 },
    { fromStage: 'baby', toStage: 'crianca', requiredLevel: 2, requiredAgeHours: 1, minHealth: 60, minHappiness: 60 },
    { fromStage: 'crianca', toStage: 'pre-adolescente', requiredLevel: 4, requiredAgeHours: 4, minHealth: 65, minHappiness: 65 },
    { fromStage: 'pre-adolescente', toStage: 'adolescente', requiredLevel: 7, requiredAgeHours: 12, minHealth: 70, minHappiness: 70 },
    { fromStage: 'adolescente', toStage: 'adulto', requiredLevel: 10, requiredAgeHours: 24, minHealth: 75, minHappiness: 75 }
  ];

  it('creates initial progression state starting as ovo and computes XP curve', () => {
    const defaultOvo = createInitialProgression();
    expect(defaultOvo.currentStage).toBe('ovo');

    const init = createInitialProgression('baby');
    expect(init).toEqual({
      level: 1,
      currentXp: 0,
      nextLevelXp: 100,
      totalXpEarned: 0,
      currentStage: 'baby'
    });
    expect(calculateXpForNextLevel(1)).toBe(100);
    expect(calculateXpForNextLevel(5)).toBe(500);
    expect(calculateXpForNextLevel(0)).toBe(100);
  });

  it('adds experience and handles single and multiple level-ups', () => {
    const start = createInitialProgression('baby');

    // Non-positive XP returns unchanged
    const noGain = addExperience(start, 0);
    expect(noGain.leveledUp).toBe(false);
    expect(noGain.state).toEqual(start);

    // Partial XP
    const partial = addExperience(start, 60);
    expect(partial.leveledUp).toBe(false);
    expect(partial.state.currentXp).toBe(60);

    // Multi-level up (+350 XP from 60 -> 410 total: lvl 1 needs 100, lvl 2 needs 200 -> reaches lvl 3 with 110 XP)
    const multi = addExperience(partial.state, 350);
    expect(multi.leveledUp).toBe(true);
    expect(multi.previousLevel).toBe(1);
    expect(multi.newLevel).toBe(3);
    expect(multi.levelsGained).toBe(2);
    expect(multi.state.currentXp).toBe(110);
    expect(multi.state.nextLevelXp).toBe(300);
    expect(multi.state.totalXpEarned).toBe(410);
  });

  it('resolves eligible evolution stage when level, age, health, and happiness meet rules', () => {
    // Eligible from baby -> crianca
    const nextStage = resolveEligibleEvolutionStage(
      { level: 2, currentXp: 0, nextLevelXp: 200, totalXpEarned: 100, currentStage: 'baby' },
      2,
      80,
      80,
      rules
    );
    expect(nextStage).toBe('crianca');

    // Not eligible when health or level is too low
    const notEligible = resolveEligibleEvolutionStage(
      { level: 1, currentXp: 50, nextLevelXp: 100, totalXpEarned: 50, currentStage: 'baby' },
      2,
      80,
      80,
      rules
    );
    expect(notEligible).toBeNull();

    // Adult has no further evolution rule
    const adultCheck = resolveEligibleEvolutionStage(
      { level: 15, currentXp: 0, nextLevelXp: 1500, totalXpEarned: 5000, currentStage: 'adulto' },
      100,
      100,
      100,
      rules
    );
    expect(adultCheck).toBeNull();
  });
});

