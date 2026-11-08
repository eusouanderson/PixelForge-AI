import type { CharacterId } from '@/domains/characters/types';

export type ParticleBehaviorKind =
  | 'rising-embers'
  | 'falling-crystals'
  | 'voltaic-sparks'
  | 'rising-bubbles'
  | 'floating-shards'
  | 'swirling-feathers'
  | 'shadow-wisps'
  | 'solar-corona';

export type ReactiveParticleTrigger =
  | 'ambient'
  | 'happy'
  | 'sad'
  | 'feeding'
  | 'sleeping'
  | 'playing'
  | 'sick'
  | 'evolution'
  | 'level-up'
  | 'special';

export interface Vector3Coords {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface PixelParticleTexturePattern {
  readonly id: string;
  readonly size: 4 | 8;
  readonly pixels: readonly string[];
}

export interface CharacterParticleConfig {
  readonly id: string;
  readonly characterId: CharacterId;
  readonly behavior: ParticleBehaviorKind;
  readonly texturePattern: PixelParticleTexturePattern;
  readonly primaryColorHex: string;
  readonly secondaryColorHex: string;
  readonly accentColorHex: string;
  readonly maxParticles: number;
  readonly emitRate: number;
  readonly minLifeTimeSec: number;
  readonly maxLifeTimeSec: number;
  readonly minSize: number;
  readonly maxSize: number;
  readonly minEmitPower: number;
  readonly maxEmitPower: number;
  readonly gravity: Vector3Coords;
  readonly direction1: Vector3Coords;
  readonly direction2: Vector3Coords;
  readonly emitBoxMin: Vector3Coords;
  readonly emitBoxMax: Vector3Coords;
}

export interface ReactiveParticleBurstConfig {
  readonly trigger: ReactiveParticleTrigger;
  readonly durationMs: number;
  readonly emitCount: number;
  readonly colorOverrideHex?: string;
  readonly speedMultiplier: number;
  readonly sizeMultiplier: number;
}

