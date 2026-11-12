import { describe, it, expect } from 'vitest';
import type { BattleParticipant } from '../types';
import {
  ATTACKS_CATALOG,
  getAttackById,
  isAttackEligibleForParticipant,
  resolveAvailableAttacks
} from '../domain/attacks-catalog';

function createMockParticipant(overrides: Partial<BattleParticipant> = {}): BattleParticipant {
  return {
    peerId: 'peer-1',
    playerName: 'Treinador A',
    creatureInstanceId: 'inst-1',
    speciesId: 'ignisauro',
    speciesName: 'Ignisauro',
    stage: 'adulto',
    level: 15,
    ageHours: 100,
    attributes: {
      strength: 30,
      defense: 25,
      agility: 25,
      intelligence: 25,
      endurance: 30,
      elementalAffinity: 30
    },
    needs: {
      hunger: 90,
      thirst: 90,
      energy: 90,
      happiness: 90,
      hygiene: 90,
      health: 90
    },
    personalityTemper: 'ferocious',
    element: 'fire',
    unlockedAttackIds: [],
    combatLevel: 5,
    combatXp: 500,
    isReady: true,
    hasConfirmedWager: true,
    ...overrides
  };
}

describe('Attacks Catalog Domain', () => {
  it('contains bespoke attacks for all 11 dinosaur species', () => {
    expect(ATTACKS_CATALOG.length).toBeGreaterThan(15);
    for (const atk of ATTACKS_CATALOG) {
      expect(atk.id).toBeDefined();
      expect(atk.name).toBeDefined();
      expect(atk.baseDamage).toBeGreaterThan(0);
      expect(atk.staminaCost).toBeGreaterThan(0);
      expect(atk.speedTicks).toBeGreaterThan(0);
      expect(atk.recoveryTicks).toBeGreaterThan(0);
      expect(atk.compatibleSpecies.length).toBeGreaterThan(0);
    }
  });

  it('retrieves an attack by its ID or returns undefined when missing', () => {
    expect(getAttackById('mordida-ignea')).toBeDefined();
    expect(getAttackById('non-existent-attack')).toBeUndefined();
  });

  it('correctly validates eligibility based on species, stage, level, and attributes', () => {
    const adultIgnisauro = createMockParticipant({
      speciesId: 'ignisauro',
      stage: 'adulto',
      level: 15
    });

    const soproMagmatico = getAttackById('sopro-magmatico')!;
    expect(isAttackEligibleForParticipant(soproMagmatico, adultIgnisauro)).toBe(true);

    // Incompatible species
    const adultGlacis = createMockParticipant({
      speciesId: 'glacissauro',
      stage: 'adulto',
      level: 15
    });
    expect(isAttackEligibleForParticipant(soproMagmatico, adultGlacis)).toBe(false);

    // Incompatible stage (baby)
    const babyIgnisauro = createMockParticipant({
      speciesId: 'ignisauro',
      stage: 'baby',
      level: 1
    });
    expect(isAttackEligibleForParticipant(soproMagmatico, babyIgnisauro)).toBe(false);

    // Low level
    const lowLevelIgnisauro = createMockParticipant({
      speciesId: 'ignisauro',
      stage: 'adolescente',
      level: 4
    });
    expect(isAttackEligibleForParticipant(soproMagmatico, lowLevelIgnisauro)).toBe(false);

    // Low attributes
    const weakIgnisauro = createMockParticipant({
      speciesId: 'ignisauro',
      stage: 'adolescente',
      level: 10,
      attributes: {
        strength: 5,
        defense: 5,
        agility: 5,
        intelligence: 5,
        endurance: 5,
        elementalAffinity: 5
      }
    });
    expect(isAttackEligibleForParticipant(soproMagmatico, weakIgnisauro)).toBe(false);
  });

  it('resolves available attacks for a baby returning universal basic attack', () => {
    const baby = createMockParticipant({
      speciesId: 'ignisauro',
      stage: 'baby',
      level: 1,
      attributes: {
        strength: 5,
        defense: 5,
        agility: 5,
        intelligence: 5,
        endurance: 5,
        elementalAffinity: 5
      }
    });

    const attacks = resolveAvailableAttacks(baby);
    expect(attacks.length).toBeGreaterThanOrEqual(1);
    expect(attacks.some((a) => a.id === 'golpe-instintivo')).toBe(true);
    expect(attacks.some((a) => a.id === 'sopro-magmatico')).toBe(false);
  });

  it('falls back to golpe-instintivo if participant matches no attacks', () => {
    const restricted = createMockParticipant({
      stage: 'ovo',
      level: 0,
      attributes: {
        strength: 0,
        defense: 0,
        agility: 0,
        intelligence: 0,
        endurance: 0,
        elementalAffinity: 0
      }
    });

    const attacks = resolveAvailableAttacks(restricted);
    expect(attacks.length).toBe(1);
    expect(attacks[0].id).toBe('golpe-instintivo');
  });
});
