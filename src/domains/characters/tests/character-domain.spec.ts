import { describe, it, expect } from 'vitest';
import {
  CHARACTER_SPECIES_REGISTRY,
  listAllCharacterSpecies,
  getCharacterSpeciesById,
  pickRandomCharacterId
} from '../domain/character-registry';
import {
  createInitialCharacterRuntime,
  deriveEmotionalAndHealthState,
  resolveCharacterAnimation,
  appendCharacterCareLog
} from '../domain/character-state-engine';
import { CharacterSpriteRepository } from '../infrastructure/character-sprite-repository';

describe('characters domain registry, state engine, and sprite repository', () => {
  it('registers all 8 real canonical dinosaur species with distinct traits, diets, particles, and environments', () => {
    const all = listAllCharacterSpecies();
    expect(all.length).toBe(8);

    const ids = all.map((c) => c.id);
    expect(ids).toEqual([
      'ignisauro',
      'glacissauro',
      'electrossauro',
      'toxissauro',
      'terrassauro',
      'aerossauro',
      'umbrassauro',
      'solassauro'
    ]);

    const environments = new Set(all.map((c) => c.environmentId));
    const particles = new Set(all.map((c) => c.particlePresetId));
    expect(environments.size).toBe(8);
    expect(particles.size).toBe(8);

    for (const species of all) {
      expect(getCharacterSpeciesById(species.id)).toEqual(species);
      expect(species.favoriteFoodIds.length).toBeGreaterThan(0);
      expect(species.acceptedFoodIds.length).toBeGreaterThan(0);
      expect(species.forbiddenFoodIds.length).toBeGreaterThan(0);
      expect(species.evolutionRules.length).toBe(5);
    }

    expect(CHARACTER_SPECIES_REGISTRY.ignisauro.element).toBe('fire');
    expect(CHARACTER_SPECIES_REGISTRY.solassauro.element).toBe('light');

    expect(pickRandomCharacterId(0)).toBe('ignisauro');
    expect(pickRandomCharacterId(0.99)).toBe('solassauro');
    expect(ids).toContain(pickRandomCharacterId());
  });

  it('derives emotional and health states from needs across all branches', () => {
    expect(
      deriveEmotionalAndHealthState({
        hunger: 90,
        thirst: 90,
        energy: 90,
        happiness: 90,
        hygiene: 90,
        health: 95
      })
    ).toEqual({ emotionalState: 'radiant', healthCondition: 'healthy' });

    expect(
      deriveEmotionalAndHealthState({
        hunger: 75,
        thirst: 75,
        energy: 75,
        happiness: 75,
        hygiene: 75,
        health: 80
      })
    ).toEqual({ emotionalState: 'happy', healthCondition: 'healthy' });

    expect(
      deriveEmotionalAndHealthState({
        hunger: 55,
        thirst: 55,
        energy: 55,
        happiness: 55,
        hygiene: 55,
        health: 55
      })
    ).toEqual({ emotionalState: 'calm', healthCondition: 'weakened' });

    expect(
      deriveEmotionalAndHealthState({
        hunger: 10,
        thirst: 60,
        energy: 60,
        happiness: 60,
        hygiene: 60,
        health: 60
      })
    ).toEqual({ emotionalState: 'hungry', healthCondition: 'weakened' });

    expect(
      deriveEmotionalAndHealthState({
        hunger: 60,
        thirst: 60,
        energy: 10,
        happiness: 60,
        hygiene: 60,
        health: 75
      })
    ).toEqual({ emotionalState: 'tired', healthCondition: 'healthy' });

    expect(
      deriveEmotionalAndHealthState({
        hunger: 60,
        thirst: 60,
        energy: 60,
        happiness: 10,
        hygiene: 60,
        health: 75
      })
    ).toEqual({ emotionalState: 'sad', healthCondition: 'healthy' });

    expect(
      deriveEmotionalAndHealthState({
        hunger: 60,
        thirst: 60,
        energy: 60,
        happiness: 60,
        hygiene: 60,
        health: 30
      })
    ).toEqual({ emotionalState: 'sick', healthCondition: 'sick' });

    expect(
      deriveEmotionalAndHealthState({
        hunger: 60,
        thirst: 60,
        energy: 60,
        happiness: 60,
        hygiene: 60,
        health: 10
      })
    ).toEqual({ emotionalState: 'critical', healthCondition: 'critical' });

    expect(
      deriveEmotionalAndHealthState({
        hunger: 0,
        thirst: 0,
        energy: 0,
        happiness: 0,
        hygiene: 0,
        health: 0
      })
    ).toEqual({ emotionalState: 'deceased', healthCondition: 'deceased' });
  });

  it('resolves character animation based on stage, health, and override action', () => {
    expect(resolveCharacterAnimation('ovo', 'healthy', 'calm')).toBe('eclosao');
    expect(resolveCharacterAnimation('baby', 'deceased', 'deceased')).toBe('morte');
    expect(resolveCharacterAnimation('baby', 'sick', 'sick')).toBe('doente');
    expect(resolveCharacterAnimation('baby', 'critical', 'critical')).toBe('doente');
    expect(resolveCharacterAnimation('adulto', 'healthy', 'radiant', 'comendo')).toBe('comendo');
    expect(resolveCharacterAnimation('adulto', 'healthy', 'radiant')).toBe('idle');
  });

  it('creates initial runtime state and appends bounded care log entries', () => {
    const eggRuntime = createInitialCharacterRuntime('ignisauro', 500, 'ovo');
    expect(eggRuntime.currentAnimation).toBe('eclosao');

    let runtime = createInitialCharacterRuntime('ignisauro', 1000);
    expect(runtime.characterId).toBe('ignisauro');
    expect(runtime.currentStage).toBe('baby');
    expect(runtime.careHistory.length).toBe(1);

    for (let i = 0; i < 35; i++) {
      runtime = appendCharacterCareLog(runtime, 'feed', `Refeição ${i}`, 2000 + i);
    }
    expect(runtime.careHistory.length).toBe(30);
    expect(runtime.careHistory[0].summary).toBe('Refeição 34');
  });

  it('retrieves verified sprites for all 8 characters, stages, and animations from CharacterSpriteRepository', () => {
    const repo = new CharacterSpriteRepository();

    const eggFrames = repo.getAnimationFrames('ignisauro', 'ovo', 'eclosao');
    expect(eggFrames.length).toBe(4);

    // Living stage requesting eclosao automatically normalizes to idle
    const livingFallback = repo.getAnimationFrames('ignisauro', 'adulto', 'eclosao');
    expect(livingFallback.length).toBe(2);

    // Ovo stage requesting idle automatically normalizes to eclosao
    const ovoFallback = repo.getAnimationFrames('glacissauro', 'ovo', 'idle');
    expect(ovoFallback.length).toBe(4);

    const frame1 = repo.getSpriteFrame('solassauro', 'adulto', 'comendo', 1);
    expect(frame1.metadata?.creatureName).toBe('Solassauro');
    expect(frame1.metadata?.animation).toBe('comendo');

    const frameOut = repo.getSpriteFrame('umbrassauro', 'adulto', 'morte', 99);
    expect(frameOut.metadata?.creatureName).toBe('Umbrassauro');
  });
});
