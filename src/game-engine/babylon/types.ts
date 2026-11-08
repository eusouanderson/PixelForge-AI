import type { DeclarativePixelArt } from '@/core/domain/pixel-art/interfaces';
import type { CharacterId } from '@/domains/characters/types';
import type { CharacterEnvironmentConfig } from '@/domains/environments/types';
import type {
  CharacterParticleConfig,
  ReactiveParticleBurstConfig,
  ReactiveParticleTrigger
} from '@/domains/particles/types';
import type { GraphicsQualityPreset } from '@/domains/settings/types';

export interface BabylonEngineConfig {
  readonly canvas: HTMLCanvasElement;
  readonly quality: GraphicsQualityPreset;
}

export interface CreatureSceneControllerPort {
  initialize(config: BabylonEngineConfig): void;
  loadCharacterEnvironment(
    characterId: CharacterId,
    environmentConfig: CharacterEnvironmentConfig,
    particleConfig: CharacterParticleConfig,
    initialSprite: DeclarativePixelArt
  ): void;
  updateCreatureSprite(sprite: DeclarativePixelArt, showGrid?: boolean): void;
  triggerReactiveParticles(burst: ReactiveParticleBurstConfig): void;
  setQualityPreset(quality: GraphicsQualityPreset): void;
  pauseRendering(): void;
  resumeRendering(): void;
  resize(): void;
  dispose(): void;
  getActiveResourceMetrics(): {
    readonly activeMeshes: number;
    readonly activeParticleSystems: number;
    readonly activeTextures: number;
    readonly isDisposed: boolean;
  };
}

export type ReactiveBurstFactory = (trigger: ReactiveParticleTrigger) => ReactiveParticleBurstConfig;

