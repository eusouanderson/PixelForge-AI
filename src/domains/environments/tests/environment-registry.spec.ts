import { describe, it, expect } from 'vitest';
import {
  ENVIRONMENT_REGISTRY,
  getCharacterEnvironmentConfig
} from '../domain/environment-registry';
import { listAllCharacterSpecies } from '@/domains/characters/domain/character-registry';

describe('environments domain registry', () => {
  it('provides a distinct 3D environment configuration with lighting, backdrops, and layered props for all 8 characters', () => {
    const speciesList = listAllCharacterSpecies();
    const envIds = new Set<string>();

    for (const species of speciesList) {
      const env = getCharacterEnvironmentConfig(species.id);
      expect(env.characterId).toBe(species.id);
      expect(env.id).toBe(species.environmentId);
      expect(env.element).toBe(species.element);
      expect(env.props.length).toBeGreaterThanOrEqual(4);
      expect(env.lighting.mainLightIntensity).toBeGreaterThan(0);
      expect(env.lighting.pointLightColorHex).toBeDefined();

      // Verify 2.5D backdrop configuration
      expect(env.backdrop).toBeDefined();
      expect(env.backdrop!.skyTopColorHex).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(env.backdrop!.skyBottomColorHex).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(['eclipse', 'aurora', 'sun', 'moon', 'clouds', 'nebula']).toContain(
        env.backdrop!.celestialKind
      );

      // Verify prop layers
      const midgroundProps = env.props.filter((p) => p.depthLayer === 'midground');
      const foregroundProps = env.props.filter((p) => p.depthLayer === 'foreground');
      expect(midgroundProps.length).toBeGreaterThanOrEqual(2);
      expect(foregroundProps.length).toBeGreaterThanOrEqual(1);

      for (const prop of env.props) {
        expect([
          'crystal-pillar',
          'floating-ring',
          'lava-pool',
          'mushroom',
          'solar-obelisk',
          'obsidian-arch',
          'monolith'
        ]).toContain(prop.shape);
      }

      envIds.add(env.id);
    }

    expect(envIds.size).toBe(11);
    expect(Object.keys(ENVIRONMENT_REGISTRY).length).toBe(11);
  });
});

