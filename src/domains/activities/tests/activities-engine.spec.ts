import { describe, it, expect } from 'vitest';
import {
  ACTIVITIES_CATALOG,
  listAllActivities,
  getActivityById,
  executeCharacterActivity
} from '../domain/activities-engine';
import { getCharacterSpeciesById } from '@/domains/characters/domain/character-registry';

describe('activities domain engine', () => {
  it('lists all care and elemental training activities', () => {
    const list = listAllActivities();
    expect(list.length).toBeGreaterThanOrEqual(9);
    for (const act of list) {
      expect(getActivityById(act.id)).toEqual(act);
    }
    expect(ACTIVITIES_CATALOG['lava-sprint'].kind).toBe('train');
  });

  it('executes favorite, regular, and disliked activities and blocks when energy is insufficient', () => {
    const igni = getCharacterSpeciesById('ignisauro');

    // Insufficient energy
    const tiredRes = executeCharacterActivity(igni, 'lava-sprint', 5);
    expect(tiredRes.success).toBe(false);
    expect(tiredRes.message).toContain('energia');

    // Favorite activity (lava-sprint for ignisauro) gives bonus happiness & XP
    const favRes = executeCharacterActivity(igni, 'lava-sprint', 80);
    expect(favRes.success).toBe(true);
    expect(favRes.experienceGained).toBeGreaterThan(ACTIVITIES_CATALOG['lava-sprint'].experienceReward);

    // Disliked activity (cryo-meditation for ignisauro) gives reduced happiness
    const dislikedRes = executeCharacterActivity(igni, 'cryo-meditation', 80);
    expect(dislikedRes.success).toBe(true);
    expect(dislikedRes.needsDelta.happiness).toBeLessThan(
      ACTIVITIES_CATALOG['cryo-meditation'].needsDelta.happiness
    );

    // Neutral activity (purifying-bath) consumes energy and restores hygiene
    const bathRes = executeCharacterActivity(igni, 'purifying-bath', 80, {
      hunger: 50,
      thirst: 50,
      energy: 80,
      happiness: 50,
      hygiene: 60,
      health: 80
    });
    expect(bathRes.success).toBe(true);
    expect(bathRes.needsDelta.hygiene).toBeGreaterThan(30);
    expect(bathRes.needsDelta.energy).toBeLessThan(0);

    // Purifying-bath blocked when energy is insufficient (< 10)
    const tiredBath = executeCharacterActivity(igni, 'purifying-bath', 5);
    expect(tiredBath.success).toBe(false);
    expect(tiredBath.experienceGained).toBe(0);

    // Purifying-bath blocked when already clean (hygiene >= 95)
    const cleanBath = executeCharacterActivity(igni, 'purifying-bath', 80, {
      hunger: 50,
      thirst: 50,
      energy: 80,
      happiness: 50,
      hygiene: 96,
      health: 80
    });
    expect(cleanBath.success).toBe(false);
    expect(cleanBath.message).toContain('impecavelmente limpo');
    expect(cleanBath.experienceGained).toBe(0);

    // Deep-slumber blocked when wide awake (energy >= 85)
    const awakeSlumber = executeCharacterActivity(igni, 'deep-slumber', 90);
    expect(awakeSlumber.success).toBe(false);
    expect(awakeSlumber.message).toContain('desperto');
    expect(awakeSlumber.experienceGained).toBe(0);

    // Deep-slumber succeeds when exhausted (< 50 energy), grants full XP and 0 coins
    const exhaustedSlumber = executeCharacterActivity(igni, 'deep-slumber', 30);
    expect(exhaustedSlumber.success).toBe(true);
    expect(exhaustedSlumber.coinsGained).toBe(0);
    expect(exhaustedSlumber.experienceGained).toBe(6);
    expect(exhaustedSlumber.needsDelta.energy).toBeGreaterThan(40);

    // Deep-slumber succeeds when moderately tired (50-84 energy) with light XP (2)
    const moderateSlumber = executeCharacterActivity(igni, 'deep-slumber', 70);
    expect(moderateSlumber.success).toBe(true);
    expect(moderateSlumber.experienceGained).toBe(2);
  });
});

