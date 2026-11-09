import { describe, it, expect } from 'vitest';
import {
  evaluateMutations,
  generateAttributeMutation,
  rollMutationChance
} from '../domain/mutation-engine';

describe('Genetics: Mutation Engine', () => {
  it('rolls mutation chance according to rarity thresholds', () => {
    expect(rollMutationChance(0.001)).toBe('mythic');
    expect(rollMutationChance(0.005)).toBe('legendary');
    expect(rollMutationChance(0.02)).toBe('epic');
    expect(rollMutationChance(0.05)).toBe('rare');
    expect(rollMutationChance(0.10)).toBe('uncommon');
    expect(rollMutationChance(0.25)).toBe('common');
    expect(rollMutationChance(0.50)).toBeNull();
  });

  it('generates attribute mutations with proper bonuses and descriptions', () => {
    const mythicMut = generateAttributeMutation('mythic', 'strength', 20);
    expect(mythicMut.mutatedValue).toBe(13);
    expect(mythicMut.multiplier).toBe(1.75);
    expect(mythicMut.description).toContain('Gênese primordial dos titãs');

    const commonMut = generateAttributeMutation('common', 'defense', 10);
    expect(commonMut.mutatedValue).toBe(1);
    expect(commonMut.multiplier).toBe(1.05);
  });

  it('evaluates mutations with skin pattern override and color shift for higher tiers', () => {
    const currentAttrs = {
      strength: 15,
      defense: 12,
      agility: 14,
      intelligence: 10,
      endurance: 15,
      elementalAffinity: 16
    };

    // No mutation
    const noMut = evaluateMutations(0.8, 0.1, currentAttrs);
    expect(noMut.hasMutation).toBe(false);
    expect(noMut.mutation).toBeNull();

    // Mythic mutation
    const mythicRes = evaluateMutations(0.001, 0, currentAttrs);
    expect(mythicRes.hasMutation).toBe(true);
    expect(mythicRes.skinPatternOverride).toBe('elemental_glow');
    expect(mythicRes.colorShiftHex).toBe('#f43f5e');

    // Legendary mutation
    const legRes = evaluateMutations(0.008, 0.2, currentAttrs);
    expect(legRes.hasMutation).toBe(true);
    expect(legRes.skinPatternOverride).toBe('spotted');
    expect(legRes.colorShiftHex).toBe('#fbbf24');

    // Epic mutation
    const epicRes = evaluateMutations(0.025, 0.4, currentAttrs);
    expect(epicRes.hasMutation).toBe(true);
    expect(epicRes.skinPatternOverride).toBe('striped');
    expect(epicRes.colorShiftHex).toBe('#a855f7');

    // Common mutation (no skin pattern override or color shift)
    const commonRes = evaluateMutations(0.20, 0.5, currentAttrs);
    expect(commonRes.hasMutation).toBe(true);
    expect(commonRes.skinPatternOverride).toBeUndefined();
    expect(commonRes.colorShiftHex).toBeUndefined();

    // Missing attribute in map defaults to 10
    const sparseAttrs = {} as Record<import('../types').GeneticAttributeKey, number>;
    const sparseRes = evaluateMutations(0.001, 0, sparseAttrs);
    expect(sparseRes.mutation?.previousValue).toBe(10);
  });
});
