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
  it('exposes complete food catalog with all 8 species signature foods plus hydration and specific medicines', () => {
    const all = listAllFoods();
    expect(all.length).toBe(18);
    for (const item of all) {
      expect(getFoodById(item.id)).toEqual(item);
    }
    expect(FOOD_CATALOG['volcanic-roast-meat'].category).toBe('meat');
    expect(FOOD_CATALOG['thermal-spring-water'].category).toBe('hydration');
    expect(FOOD_CATALOG['vitality-herbal-elixir'].category).toBe('medicine');
    expect(FOOD_CATALOG['nutri-vital-serum'].curesDiseaseId).toBe('malnutrition');
    expect(FOOD_CATALOG['awakening-fruit'].category).toBe('fruit');
    expect(FOOD_CATALOG['awakening-fruit'].priceCoins).toBe(100);
  });

  it('evaluates favorite, accepted, and forbidden foods per character species', () => {
    const igni = getCharacterSpeciesById('ignisauro');
    expect(evaluateDietaryPreference(igni, 'volcanic-roast-meat')).toBe('favorite');
    expect(evaluateDietaryPreference(igni, 'golden-starburst-sunpeach')).toBe('accepted');
    expect(evaluateDietaryPreference(igni, 'frosted-crystal-berry')).toBe('forbidden');
    expect(evaluateDietaryPreference(igni, 'nutri-vital-serum')).toBe('accepted');
    expect(evaluateDietaryPreference(igni, 'awakening-fruit')).toBe('accepted');
    expect(evaluateDietaryPreference(igni, 'unknown-item')).toBe('accepted');
  });

  it('computes feeding reactions for favorite, accepted, medicine, overeating, and forbidden foods', () => {
    const igni = getCharacterSpeciesById('ignisauro');

    // Favorite food boosts nutrition by 1.25x and grants attribute bonus and 10 XP
    const favReaction = feedCharacter(igni, 'volcanic-roast-meat', 1000, 50);
    expect(favReaction.accepted).toBe(true);
    expect(favReaction.preference).toBe('favorite');
    expect(favReaction.satisfactionLevel).toBe('ecstatic');
    expect(favReaction.appliedNeedsDelta.hunger).toBeGreaterThan(25);
    expect(favReaction.appliedAttributeDelta.strength).toBeGreaterThan(0);
    expect(favReaction.experienceGained).toBe(10);

    // Accepted food grants standard nutrition without bonus multiplier and 5 XP
    const accReaction = feedCharacter(igni, 'thermal-spring-water', 2000, 50, 60);
    expect(accReaction.accepted).toBe(true);
    expect(accReaction.preference).toBe('accepted');
    expect(accReaction.satisfactionLevel).toBe('satisfied');
    expect(accReaction.appliedNeedsDelta.thirst).toBeGreaterThan(20);
    expect(accReaction.experienceGained).toBe(5);

    // Over-hydration: drinking water when currentThirst >= 95 causes bloating, refusal and 0 XP
    const overHydrate = feedCharacter(igni, 'thermal-spring-water', 2100, 50, 96);
    expect(overHydrate.accepted).toBe(false);
    expect(overHydrate.experienceGained).toBe(0);
    expect(overHydrate.message).toContain('empanturramento');

    // Unneeded medicine on healthy character is rejected with 0 XP and penalty
    const unneededMed = feedCharacter(igni, 'nutri-vital-serum', 2400, 50, 50, []);
    expect(unneededMed.accepted).toBe(false);
    expect(unneededMed.experienceGained).toBe(0);
    expect(unneededMed.appliedNeedsDelta.health).toBeLessThan(0);
    expect(unneededMed.message).toContain('não possui a enfermidade');

    // Medicine item administered to sick character returns curedDiseaseId and 8 XP
    const diseases = [
      {
        id: 'malnutrition' as const,
        name: 'Desnutrição Aguda',
        description: 'Falta severa de calorias',
        remedyFoodId: 'nutri-vital-serum',
        contractedAtMs: 2000
      }
    ];
    const medReaction = feedCharacter(igni, 'nutri-vital-serum', 2500, 50, 50, diseases);
    expect(medReaction.accepted).toBe(true);
    expect(medReaction.curedDiseaseId).toBe('malnutrition');
    expect(medReaction.experienceGained).toBe(8);

    // Panacea (vitality-herbal-elixir) cures 'all' when character has any disease
    const panaceaReaction = feedCharacter(igni, 'vitality-herbal-elixir', 2550, 50, 50, diseases);
    expect(panaceaReaction.accepted).toBe(true);
    expect(panaceaReaction.curedDiseaseId).toBe('all');

    // Overeating solid food when currentHunger >= 95 causes overeating_indigestion
    const overeatReaction = feedCharacter(igni, 'volcanic-roast-meat', 2800, 96);
    expect(overeatReaction.accepted).toBe(false);
    expect(overeatReaction.contractedDiseaseId).toBe('overeating_indigestion');
    expect(overeatReaction.appliedNeedsDelta.health).toBeLessThan(0);

    // Forbidden food causes disgust/poison penalty and contracts food_poisoning
    const forbReaction = feedCharacter(igni, 'frosted-crystal-berry', 3000, 50);
    expect(forbReaction.accepted).toBe(false);
    expect(forbReaction.preference).toBe('forbidden');
    expect(forbReaction.satisfactionLevel).toBe('poisoned');
    expect(forbReaction.contractedDiseaseId).toBe('food_poisoning');
    expect(forbReaction.appliedNeedsDelta.health).toBeLessThan(0);
    expect(forbReaction.appliedNeedsDelta.happiness).toBeLessThan(0);
    expect(forbReaction.appliedAttributeDelta).toEqual({});
    expect(forbReaction.experienceGained).toBe(0);

    // Awakening fruit (awakening-fruit) is accepted, grants awakening reaction with 5 XP
    const awakenReaction = feedCharacter(igni, 'awakening-fruit', 3500, 50);
    expect(awakenReaction.accepted).toBe(true);
    expect(awakenReaction.preference).toBe('accepted');
    expect(awakenReaction.message).toContain('Fruta do Despertar');
    expect(awakenReaction.experienceGained).toBe(5);
  });
});

