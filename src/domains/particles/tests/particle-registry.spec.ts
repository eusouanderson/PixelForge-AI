import { describe, it, expect } from 'vitest';
import {
  PARTICLE_PRESET_REGISTRY,
  getCharacterParticleConfig,
  scaleParticleConfigForQuality,
  createReactiveParticleBurst
} from '../domain/particle-registry';
import { listAllCharacterSpecies } from '@/domains/characters/domain/character-registry';

describe('particles domain registry and reactive bursts', () => {
  it('defines a unique pixelated particle configuration for every character', () => {
    const speciesList = listAllCharacterSpecies();
    const behaviors = new Set<string>();

    for (const species of speciesList) {
      const config = getCharacterParticleConfig(species.id);
      expect(config.characterId).toBe(species.id);
      expect(config.id).toBe(species.particlePresetId);
      expect(config.texturePattern.pixels.length).toBe(config.texturePattern.size);
      expect(config.maxParticles).toBeGreaterThan(10);
      behaviors.add(config.behavior);
    }

    expect(behaviors.size).toBe(8);
    expect(Object.keys(PARTICLE_PRESET_REGISTRY).length).toBe(8);
  });

  it('scales particle counts and emit rates according to Android graphics quality presets', () => {
    const base = getCharacterParticleConfig('ignisauro');

    const high = scaleParticleConfigForQuality(base, 'high');
    expect(high.maxParticles).toBe(base.maxParticles);

    const balanced = scaleParticleConfigForQuality(base, 'balanced');
    expect(balanced.maxParticles).toBeLessThan(base.maxParticles);
    expect(balanced.emitRate).toBeLessThan(base.emitRate);

    const saver = scaleParticleConfigForQuality(base, 'battery-saver');
    expect(saver.maxParticles).toBeLessThan(balanced.maxParticles);
    expect(saver.emitRate).toBeLessThan(balanced.emitRate);
  });

  it('creates reactive particle bursts for all 10 gameplay triggers', () => {
    const triggers = [
      'ambient',
      'happy',
      'sad',
      'feeding',
      'sleeping',
      'playing',
      'sick',
      'evolution',
      'level-up',
      'special'
    ] as const;

    for (const trigger of triggers) {
      const burst = createReactiveParticleBurst(trigger);
      expect(burst.trigger).toBe(trigger);
      expect(burst.durationMs).toBeGreaterThan(0);
      expect(burst.emitCount).toBeGreaterThan(0);
    }
  });
});

