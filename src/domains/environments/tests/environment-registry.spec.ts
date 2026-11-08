import { describe, it, expect } from 'vitest';
import {
  ENVIRONMENT_REGISTRY,
  getCharacterEnvironmentConfig
} from '../domain/environment-registry';
import { listAllCharacterSpecies } from '@/domains/characters/domain/character-registry';

describe('environments domain registry', () => {
  it('provides a distinct 3D environment configuration with lighting and props for all 8 characters', () => {
    const speciesList = listAllCharacterSpecies();
    const envIds = new Set<string>();

    for (const species of speciesList) {
      const env = getCharacterEnvironmentConfig(species.id);
      expect(env.characterId).toBe(species.id);
      expect(env.id).toBe(species.environmentId);
      expect(env.element).toBe(species.element);
      expect(env.props.length).toBeGreaterThanOrEqual(2);
      expect(env.lighting.mainLightIntensity).toBeGreaterThan(0);
      envIds.add(env.id);
    }

    expect(envIds.size).toBe(8);
    expect(Object.keys(ENVIRONMENT_REGISTRY).length).toBe(8);
  });
});

