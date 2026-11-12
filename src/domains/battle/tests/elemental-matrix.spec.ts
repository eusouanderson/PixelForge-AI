import { describe, it, expect } from 'vitest';
import type { ElementAffinity } from '@/domains/characters/types';
import {
  ELEMENTAL_EFFECTIVENESS_MATRIX,
  ELEMENT_LABELS,
  NEUTRAL_MULTIPLIER,
  NOT_VERY_EFFECTIVE_MULTIPLIER,
  SUPER_EFFECTIVE_MULTIPLIER,
  getElementalEffectivenessDescription,
  getElementalMultiplier
} from '../domain/elemental-matrix';

const ALL_ELEMENTS: readonly ElementAffinity[] = [
  'fire',
  'ice',
  'electric',
  'poison',
  'earth',
  'air',
  'shadow',
  'light',
  'fairy',
  'crystal',
  'cosmic'
];

describe('Elemental Matrix Domain', () => {
  it('covers all 11 dinosaur elements with exact pairs of strengths and weaknesses', () => {
    for (const el of ALL_ELEMENTS) {
      const profile = ELEMENTAL_EFFECTIVENESS_MATRIX[el];
      expect(profile).toBeDefined();
      expect(profile.strongAgainst.length).toBe(2);
      expect(profile.weakAgainst.length).toBe(2);
      expect(ELEMENT_LABELS[el]).toBeDefined();
    }
  });

  it('calculates correct 1.5x super effective multiplier and description', () => {
    expect(getElementalMultiplier('fire', 'ice')).toBe(SUPER_EFFECTIVE_MULTIPLIER);
    const desc = getElementalEffectivenessDescription('fire', 'ice');
    expect(desc).toContain('Super efetivo!');
    expect(desc).toContain('Fogo');
    expect(desc).toContain('Gelo');
  });

  it('calculates correct 0.75x weak multiplier and description', () => {
    expect(getElementalMultiplier('fire', 'earth')).toBe(NOT_VERY_EFFECTIVE_MULTIPLIER);
    const desc = getElementalEffectivenessDescription('fire', 'earth');
    expect(desc).toContain('Pouco efetivo...');
    expect(desc).toContain('Terra');
    expect(desc).toContain('Fogo');
  });

  it('calculates correct 1.0x neutral multiplier and description', () => {
    expect(getElementalMultiplier('fire', 'electric')).toBe(NEUTRAL_MULTIPLIER);
    const desc = getElementalEffectivenessDescription('fire', 'electric');
    expect(desc).toContain('Efetividade neutra');
  });

  it('handles unknown or fallback elements gracefully returning neutral multiplier', () => {
    expect(getElementalMultiplier('unknown' as ElementAffinity, 'fire')).toBe(NEUTRAL_MULTIPLIER);
  });
});
