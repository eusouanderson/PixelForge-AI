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

    // Neutral activity (purifying-bath)
    const bathRes = executeCharacterActivity(igni, 'purifying-bath', 80);
    expect(bathRes.success).toBe(true);
    expect(bathRes.needsDelta.hygiene).toBeGreaterThan(30);
  });
});

