import { describe, it, expect } from 'vitest';
import {
  clampAttributeValue,
  applyAttributeModifier,
  computeTotalPowerRating
} from '../domain/attributes-engine';
import type { CharacterAttributes } from '../types';

describe('attributes domain engine', () => {
  const baseAttrs: CharacterAttributes = {
    strength: 12,
    defense: 10,
    agility: 14,
    intelligence: 11,
    endurance: 13,
    elementalAffinity: 15
  };

  it('clamps attribute values between 1 and 999 and handles NaN', () => {
    expect(clampAttributeValue(0)).toBe(1);
    expect(clampAttributeValue(-10)).toBe(1);
    expect(clampAttributeValue(1500)).toBe(999);
    expect(clampAttributeValue(25.4)).toBe(25);
    expect(clampAttributeValue(Number.NaN)).toBe(1);
  });

  it('applies attribute modifiers from valid domain sources across all fields', () => {
    const updated = applyAttributeModifier(baseAttrs, {
      source: 'activity_training',
      deltas: {
        strength: 3,
        defense: 2,
        agility: 2,
        intelligence: 4,
        endurance: 1,
        elementalAffinity: 5
      }
    });

    expect(updated.strength).toBe(15);
    expect(updated.defense).toBe(12);
    expect(updated.agility).toBe(16);
    expect(updated.intelligence).toBe(15);
    expect(updated.endurance).toBe(14);
    expect(updated.elementalAffinity).toBe(20);

    const emptyUpdate = applyAttributeModifier(baseAttrs, {
      source: 'level_up',
      deltas: {}
    });
    expect(emptyUpdate).toEqual(baseAttrs);
  });

  it('computes total power rating across all 6 attributes', () => {
    expect(computeTotalPowerRating(baseAttrs)).toBe(75);
  });
});
