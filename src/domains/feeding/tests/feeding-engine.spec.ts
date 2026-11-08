import { describe, it, expect } from 'vitest';
import {
  FOOD_CATALOG,
  listAllFoods,
  getFoodById,
  evaluateDietaryPreference,
  feedCharacter
} from '../domain/feeding-engine';
import { getCharacterSpeciesById } from '@/domains/characters/domain/character-registry';

describe('feeding domain catalog and dietary rules', () => {
  it('exposes complete food catalog with all 8 species signature foods plus hydration and medicine', () => {
    const all = listAllFoods();
    expect(all.length).toBe(10);
    for (const item of all) {
      expect(getFoodById(item.id)).toEqual(item);
    }
    expect(FOOD_CATALOG['volcanic-roast-meat'].category).toBe('meat');
    expect(FOOD_CATALOG['thermal-spring-water'].category).toBe('hydration');
    expect(FOOD_CATALOG['vitality-herbal-elixir'].category).toBe('medicine');
  });

  it('evaluates favorite, accepted, and forbidden foods per character species', () => {
    const igni = getCharacterSpeciesById('ignisauro');
    expect(evaluateDietaryPreference(igni, 'volcanic-roast-meat')).toBe('favorite');
    expect(evaluateDietaryPreference(igni, 'golden-starburst-sunpeach')).toBe('accepted');
    expect(evaluateDietaryPreference(igni, 'frosted-crystal-berry')).toBe('forbidden');
    expect(evaluateDietaryPreference(igni, 'unknown-item')).toBe('accepted');
  });

  it('computes feeding reactions for favorite, accepted, and forbidden foods with attribute rules', () => {
    const igni = getCharacterSpeciesById('ignisauro');

    // Favorite food boosts nutrition by 1.3x and grants attribute bonus
    const favReaction = feedCharacter(igni, 'volcanic-roast-meat', 1000);
    expect(favReaction.accepted).toBe(true);
    expect(favReaction.preference).toBe('favorite');
    expect(favReaction.satisfactionLevel).toBe('ecstatic');
    expect(favReaction.appliedNeedsDelta.hunger).toBeGreaterThan(25);
    expect(favReaction.appliedAttributeDelta.strength).toBeGreaterThan(0);
    expect(favReaction.experienceGained).toBe(35);

    // Accepted food grants standard nutrition without bonus multiplier
    const accReaction = feedCharacter(igni, 'thermal-spring-water', 2000);
    expect(accReaction.accepted).toBe(true);
    expect(accReaction.preference).toBe('accepted');
    expect(accReaction.satisfactionLevel).toBe('satisfied');
    expect(accReaction.appliedNeedsDelta.thirst).toBeGreaterThan(20);
    expect(accReaction.experienceGained).toBe(20);

    // Forbidden food causes disgust/poison penalty to health and happiness and zero attribute gain
    const forbReaction = feedCharacter(igni, 'frosted-crystal-berry', 3000);
    expect(forbReaction.accepted).toBe(false);
    expect(forbReaction.preference).toBe('forbidden');
    expect(forbReaction.satisfactionLevel).toBe('poisoned');
    expect(forbReaction.appliedNeedsDelta.health).toBeLessThan(0);
    expect(forbReaction.appliedNeedsDelta.happiness).toBeLessThan(0);
    expect(forbReaction.appliedAttributeDelta).toEqual({});
    expect(forbReaction.experienceGained).toBe(0);
  });
});

