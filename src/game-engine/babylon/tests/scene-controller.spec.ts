import { describe, it, expect } from 'vitest';
import { BabylonCreatureSceneController } from '../scene-controller';
import { getCharacterEnvironmentConfig } from '@/domains/environments/domain/environment-registry';
import {
  getCharacterParticleConfig,
  createReactiveParticleBurst
} from '@/domains/particles/domain/particle-registry';
import { stage5BabyIdle1Preset, stage6BabyIdle2Preset } from '@/shared/constants/presets';
import { listAllCharacterSpecies } from '@/domains/characters/domain/character-registry';

describe('BabylonCreatureSceneController', () => {
  it('initializes, loads all 8 character environments & particles, disposes previous scene resources on switch, and handles lifecycle', () => {
    const canvas = document.createElement('canvas');
    const controller = new BabylonCreatureSceneController();

    // Calling methods before initialize is safe no-op
    controller.loadCharacterEnvironment(
      'ignisauro',
      getCharacterEnvironmentConfig('ignisauro'),
      getCharacterParticleConfig('ignisauro'),
      stage5BabyIdle1Preset
    );
    controller.updateCreatureSprite(stage5BabyIdle1Preset);
    controller.triggerReactiveParticles(createReactiveParticleBurst('happy'));
    controller.setQualityPreset('balanced');
    controller.pauseRendering();
    controller.resumeRendering();
    controller.resize();

    controller.initialize({ canvas, quality: 'high' });

    for (const species of listAllCharacterSpecies()) {
      const env = getCharacterEnvironmentConfig(species.id);
      const part = getCharacterParticleConfig(species.id);
      controller.loadCharacterEnvironment(species.id, env, part, stage5BabyIdle1Preset);

      const metrics = controller.getActiveResourceMetrics();
      expect(metrics.isDisposed).toBe(false);
      // 1 backdrop plane + 1 ground + 1 pedestal + 1 creature plane + N props (no leaked meshes from previous character!)
      expect(metrics.activeMeshes).toBe(4 + env.props.length);
      expect(metrics.activeParticleSystems).toBe(1);
      expect(metrics.activeTextures).toBe(4);
    }

    controller.updateCreatureSprite(stage6BabyIdle2Preset, true);
    controller.triggerReactiveParticles(createReactiveParticleBurst('happy'));
    controller.triggerReactiveParticles(createReactiveParticleBurst('playing'));
    controller.setQualityPreset('battery-saver');
    controller.pauseRendering();
    controller.resumeRendering();
    controller.resize();

    // Test environment without backdrop and without point light
    const baseEnv = getCharacterEnvironmentConfig('ignisauro');
    const noBackdropEnv = {
      ...baseEnv,
      backdrop: undefined,
      lighting: {
        ...baseEnv.lighting,
        pointLightColorHex: undefined
      }
    };
    controller.loadCharacterEnvironment(
      'ignisauro',
      noBackdropEnv,
      getCharacterParticleConfig('ignisauro'),
      stage5BabyIdle1Preset
    );
    expect(controller.getActiveResourceMetrics().activeMeshes).toBe(3 + baseEnv.props.length);

    // Test environment with point light using default position, intensity, and range
    const defaultPointLightEnv = {
      ...baseEnv,
      lighting: {
        ...baseEnv.lighting,
        pointLightColorHex: '#ff8800',
        pointLightPosition: undefined,
        pointLightIntensity: undefined,
        pointLightRange: undefined
      }
    };
    controller.loadCharacterEnvironment(
      'ignisauro',
      defaultPointLightEnv,
      getCharacterParticleConfig('ignisauro'),
      stage5BabyIdle1Preset
    );
    expect(controller.getActiveResourceMetrics().activeMeshes).toBe(4 + baseEnv.props.length);

    controller.dispose();
    const afterDispose = controller.getActiveResourceMetrics();
    expect(afterDispose.isDisposed).toBe(true);
    expect(afterDispose.activeMeshes).toBe(0);
    expect(afterDispose.activeParticleSystems).toBe(0);
    expect(afterDispose.activeTextures).toBe(0);
  });
});
