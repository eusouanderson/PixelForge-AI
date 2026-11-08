import type { CharacterId } from '@/domains/characters/types';
import type { GraphicsQualityPreset } from '@/domains/settings/types';
import type {
  CharacterParticleConfig,
  PixelParticleTexturePattern,
  ReactiveParticleBurstConfig,
  ReactiveParticleTrigger
} from '../types';

const PIXEL_PARTICLE_PATTERNS: Readonly<Record<string, PixelParticleTexturePattern>> = {
  emberSquare: {
    id: 'emberSquare',
    size: 4,
    pixels: ['.XX.', 'XXXX', 'XXXX', '.XX.']
  },
  crystalDiamond: {
    id: 'crystalDiamond',
    size: 4,
    pixels: ['.X..', 'XXX.', '.X..', '....']
  },
  sparkBolt: {
    id: 'sparkBolt',
    size: 4,
    pixels: ['..X.', '.XX.', 'XX..', '.X..']
  },
  acidBubble: {
    id: 'acidBubble',
    size: 4,
    pixels: ['.XX.', 'X..X', 'X..X', '.XX.']
  },
  emeraldShard: {
    id: 'emeraldShard',
    size: 4,
    pixels: ['.XX.', 'XXXX', '.XX.', '..X.']
  },
  featherPlume: {
    id: 'featherPlume',
    size: 4,
    pixels: ['..XX', '.XX.', 'XX..', 'X...']
  },
  shadowWisp: {
    id: 'shadowWisp',
    size: 4,
    pixels: ['.X..', 'XXX.', 'XXX.', '.X..']
  },
  solarStar: {
    id: 'solarStar',
    size: 4,
    pixels: ['.X..', 'XXXX', '.X..', '.X..']
  },
  fairyHeart: {
    id: 'fairyHeart',
    size: 4,
    pixels: ['X.X.', 'XXXX', '.XX.', '..X.']
  },
  crystalShard: {
    id: 'crystalShard',
    size: 4,
    pixels: ['.X..', 'XXX.', '.X..', '..X.']
  },
  cosmicStar: {
    id: 'cosmicStar',
    size: 4,
    pixels: ['..X.', '.XX.', 'XXXX', '..X.']
  }
};

export const PARTICLE_PRESET_REGISTRY: Readonly<Record<CharacterId, CharacterParticleConfig>> = {
  ignisauro: {
    id: 'ignisauro-magma-embers',
    characterId: 'ignisauro',
    behavior: 'rising-embers',
    texturePattern: PIXEL_PARTICLE_PATTERNS.emberSquare,
    primaryColorHex: '#fb923c',
    secondaryColorHex: '#fde047',
    accentColorHex: '#10b981',
    maxParticles: 48,
    emitRate: 14,
    minLifeTimeSec: 1.0,
    maxLifeTimeSec: 2.2,
    minSize: 0.08,
    maxSize: 0.16,
    minEmitPower: 0.4,
    maxEmitPower: 1.1,
    gravity: { x: 0, y: 0.8, z: 0 },
    direction1: { x: -0.4, y: 1.0, z: -0.2 },
    direction2: { x: 0.4, y: 1.6, z: 0.2 },
    emitBoxMin: { x: -1.3, y: -0.8, z: -0.6 },
    emitBoxMax: { x: 1.3, y: 0.6, z: 0.6 }
  },
  glacissauro: {
    id: 'glacissauro-frost-crystals',
    characterId: 'glacissauro',
    behavior: 'falling-crystals',
    texturePattern: PIXEL_PARTICLE_PATTERNS.crystalDiamond,
    primaryColorHex: '#38bdf8',
    secondaryColorHex: '#e0f2fe',
    accentColorHex: '#0284c7',
    maxParticles: 44,
    emitRate: 12,
    minLifeTimeSec: 1.4,
    maxLifeTimeSec: 2.6,
    minSize: 0.07,
    maxSize: 0.14,
    minEmitPower: 0.2,
    maxEmitPower: 0.7,
    gravity: { x: 0, y: -0.4, z: 0 },
    direction1: { x: -0.3, y: -0.5, z: -0.2 },
    direction2: { x: 0.3, y: 0.2, z: 0.2 },
    emitBoxMin: { x: -1.5, y: 0.2, z: -0.8 },
    emitBoxMax: { x: 1.5, y: 1.8, z: 0.8 }
  },
  electrossauro: {
    id: 'electrossauro-volt-sparks',
    characterId: 'electrossauro',
    behavior: 'voltaic-sparks',
    texturePattern: PIXEL_PARTICLE_PATTERNS.sparkBolt,
    primaryColorHex: '#fde047',
    secondaryColorHex: '#22d3ee',
    accentColorHex: '#06b6d4',
    maxParticles: 52,
    emitRate: 18,
    minLifeTimeSec: 0.5,
    maxLifeTimeSec: 1.2,
    minSize: 0.07,
    maxSize: 0.15,
    minEmitPower: 0.9,
    maxEmitPower: 1.8,
    gravity: { x: 0, y: 0.1, z: 0 },
    direction1: { x: -1.0, y: -0.5, z: -0.4 },
    direction2: { x: 1.0, y: 1.2, z: 0.4 },
    emitBoxMin: { x: -1.2, y: -0.6, z: -0.5 },
    emitBoxMax: { x: 1.2, y: 1.2, z: 0.5 }
  },
  toxissauro: {
    id: 'toxissauro-acid-bubbles',
    characterId: 'toxissauro',
    behavior: 'rising-bubbles',
    texturePattern: PIXEL_PARTICLE_PATTERNS.acidBubble,
    primaryColorHex: '#a3e635',
    secondaryColorHex: '#a855f7',
    accentColorHex: '#22c55e',
    maxParticles: 42,
    emitRate: 11,
    minLifeTimeSec: 1.3,
    maxLifeTimeSec: 2.5,
    minSize: 0.09,
    maxSize: 0.18,
    minEmitPower: 0.3,
    maxEmitPower: 0.8,
    gravity: { x: 0, y: 0.5, z: 0 },
    direction1: { x: -0.3, y: 0.7, z: -0.3 },
    direction2: { x: 0.3, y: 1.2, z: 0.3 },
    emitBoxMin: { x: -1.4, y: -1.0, z: -0.6 },
    emitBoxMax: { x: 1.4, y: 0.4, z: 0.6 }
  },
  terrassauro: {
    id: 'terrassauro-emerald-shards',
    characterId: 'terrassauro',
    behavior: 'floating-shards',
    texturePattern: PIXEL_PARTICLE_PATTERNS.emeraldShard,
    primaryColorHex: '#34d399',
    secondaryColorHex: '#d97706',
    accentColorHex: '#a8a29e',
    maxParticles: 38,
    emitRate: 10,
    minLifeTimeSec: 1.5,
    maxLifeTimeSec: 2.8,
    minSize: 0.08,
    maxSize: 0.16,
    minEmitPower: 0.25,
    maxEmitPower: 0.65,
    gravity: { x: 0, y: 0.2, z: 0 },
    direction1: { x: -0.25, y: 0.4, z: -0.25 },
    direction2: { x: 0.25, y: 0.9, z: 0.25 },
    emitBoxMin: { x: -1.3, y: -0.9, z: -0.6 },
    emitBoxMax: { x: 1.3, y: 0.8, z: 0.6 }
  },
  aerossauro: {
    id: 'aerossauro-zephyr-feathers',
    characterId: 'aerossauro',
    behavior: 'swirling-feathers',
    texturePattern: PIXEL_PARTICLE_PATTERNS.featherPlume,
    primaryColorHex: '#7dd3fc',
    secondaryColorHex: '#f8fafc',
    accentColorHex: '#2dd4bf',
    maxParticles: 46,
    emitRate: 14,
    minLifeTimeSec: 1.2,
    maxLifeTimeSec: 2.4,
    minSize: 0.08,
    maxSize: 0.15,
    minEmitPower: 0.5,
    maxEmitPower: 1.3,
    gravity: { x: 0.15, y: 0.3, z: 0 },
    direction1: { x: -0.8, y: 0.3, z: -0.3 },
    direction2: { x: 0.8, y: 1.1, z: 0.3 },
    emitBoxMin: { x: -1.6, y: -0.7, z: -0.6 },
    emitBoxMax: { x: 1.6, y: 1.1, z: 0.6 }
  },
  umbrassauro: {
    id: 'umbrassauro-crimson-wisps',
    characterId: 'umbrassauro',
    behavior: 'shadow-wisps',
    texturePattern: PIXEL_PARTICLE_PATTERNS.shadowWisp,
    primaryColorHex: '#f43f5e',
    secondaryColorHex: '#52525b',
    accentColorHex: '#fda4af',
    maxParticles: 44,
    emitRate: 13,
    minLifeTimeSec: 1.1,
    maxLifeTimeSec: 2.3,
    minSize: 0.08,
    maxSize: 0.16,
    minEmitPower: 0.35,
    maxEmitPower: 0.95,
    gravity: { x: 0, y: 0.55, z: 0 },
    direction1: { x: -0.4, y: 0.6, z: -0.3 },
    direction2: { x: 0.4, y: 1.3, z: 0.3 },
    emitBoxMin: { x: -1.3, y: -0.8, z: -0.6 },
    emitBoxMax: { x: 1.3, y: 0.9, z: 0.6 }
  },
  solassauro: {
    id: 'solassauro-solar-corona',
    characterId: 'solassauro',
    behavior: 'solar-corona',
    texturePattern: PIXEL_PARTICLE_PATTERNS.solarStar,
    primaryColorHex: '#fde047',
    secondaryColorHex: '#fffbeb',
    accentColorHex: '#f97316',
    maxParticles: 50,
    emitRate: 15,
    minLifeTimeSec: 1.2,
    maxLifeTimeSec: 2.4,
    minSize: 0.08,
    maxSize: 0.17,
    minEmitPower: 0.45,
    maxEmitPower: 1.15,
    gravity: { x: 0, y: 0.65, z: 0 },
    direction1: { x: -0.5, y: 0.7, z: -0.3 },
    direction2: { x: 0.5, y: 1.4, z: 0.3 },
    emitBoxMin: { x: -1.4, y: -0.7, z: -0.6 },
    emitBoxMax: { x: 1.4, y: 1.2, z: 0.6 }
  },
  rosassauro: {
    id: 'rosassauro-fairy-petals',
    characterId: 'rosassauro',
    behavior: 'fairy-petals',
    texturePattern: PIXEL_PARTICLE_PATTERNS.fairyHeart,
    primaryColorHex: '#f472b6',
    secondaryColorHex: '#fbcfe8',
    accentColorHex: '#c084fc',
    maxParticles: 46,
    emitRate: 14,
    minLifeTimeSec: 1.2,
    maxLifeTimeSec: 2.3,
    minSize: 0.08,
    maxSize: 0.16,
    minEmitPower: 0.35,
    maxEmitPower: 1.0,
    gravity: { x: 0, y: 0.6, z: 0 },
    direction1: { x: -0.4, y: 0.6, z: -0.3 },
    direction2: { x: 0.4, y: 1.2, z: 0.3 },
    emitBoxMin: { x: -1.3, y: -0.6, z: -0.5 },
    emitBoxMax: { x: 1.3, y: 1.1, z: 0.5 }
  },
  cristalissauro: {
    id: 'cristalissauro-prism-shards',
    characterId: 'cristalissauro',
    behavior: 'crystal-prisms',
    texturePattern: PIXEL_PARTICLE_PATTERNS.crystalShard,
    primaryColorHex: '#38bdf8',
    secondaryColorHex: '#e0f2fe',
    accentColorHex: '#0284c7',
    maxParticles: 44,
    emitRate: 13,
    minLifeTimeSec: 1.0,
    maxLifeTimeSec: 2.0,
    minSize: 0.07,
    maxSize: 0.15,
    minEmitPower: 0.3,
    maxEmitPower: 0.9,
    gravity: { x: 0, y: 0.5, z: 0 },
    direction1: { x: -0.35, y: 0.5, z: -0.3 },
    direction2: { x: 0.35, y: 1.1, z: 0.3 },
    emitBoxMin: { x: -1.4, y: -0.6, z: -0.5 },
    emitBoxMax: { x: 1.4, y: 1.1, z: 0.5 }
  },
  astrassauro: {
    id: 'astrassauro-cosmic-starlight',
    characterId: 'astrassauro',
    behavior: 'cosmic-starlight',
    texturePattern: PIXEL_PARTICLE_PATTERNS.cosmicStar,
    primaryColorHex: '#fbbf24',
    secondaryColorHex: '#fef08a',
    accentColorHex: '#818cf8',
    maxParticles: 48,
    emitRate: 15,
    minLifeTimeSec: 1.1,
    maxLifeTimeSec: 2.2,
    minSize: 0.08,
    maxSize: 0.16,
    minEmitPower: 0.4,
    maxEmitPower: 1.1,
    gravity: { x: 0, y: 0.6, z: 0 },
    direction1: { x: -0.4, y: 0.65, z: -0.3 },
    direction2: { x: 0.4, y: 1.3, z: 0.3 },
    emitBoxMin: { x: -1.35, y: -0.6, z: -0.5 },
    emitBoxMax: { x: 1.35, y: 1.2, z: 0.5 }
  }
};

export function getCharacterParticleConfig(characterId: CharacterId): CharacterParticleConfig {
  return PARTICLE_PRESET_REGISTRY[characterId];
}

export function scaleParticleConfigForQuality(
  config: CharacterParticleConfig,
  quality: GraphicsQualityPreset
): CharacterParticleConfig {
  if (quality === 'high') return config;

  const factor = quality === 'balanced' ? 0.6 : 0.3;
  return {
    ...config,
    maxParticles: Math.max(8, Math.round(config.maxParticles * factor)),
    emitRate: Math.max(3, Math.round(config.emitRate * factor))
  };
}

const REACTIVE_BURST_TABLE: Readonly<
  Record<ReactiveParticleTrigger, ReactiveParticleBurstConfig>
> = {
  ambient: {
    trigger: 'ambient',
    durationMs: 600,
    emitCount: 10,
    speedMultiplier: 1.0,
    sizeMultiplier: 1.0
  },
  happy: {
    trigger: 'happy',
    durationMs: 1200,
    emitCount: 28,
    colorOverrideHex: '#f43f5e',
    speedMultiplier: 1.4,
    sizeMultiplier: 1.25
  },
  sad: {
    trigger: 'sad',
    durationMs: 1000,
    emitCount: 14,
    colorOverrideHex: '#60a5fa',
    speedMultiplier: 0.6,
    sizeMultiplier: 0.9
  },
  feeding: {
    trigger: 'feeding',
    durationMs: 1100,
    emitCount: 24,
    colorOverrideHex: '#fbbf24',
    speedMultiplier: 1.3,
    sizeMultiplier: 1.2
  },
  sleeping: {
    trigger: 'sleeping',
    durationMs: 1500,
    emitCount: 12,
    colorOverrideHex: '#c084fc',
    speedMultiplier: 0.5,
    sizeMultiplier: 1.1
  },
  playing: {
    trigger: 'playing',
    durationMs: 1300,
    emitCount: 32,
    speedMultiplier: 1.7,
    sizeMultiplier: 1.2
  },
  sick: {
    trigger: 'sick',
    durationMs: 1100,
    emitCount: 16,
    colorOverrideHex: '#84cc16',
    speedMultiplier: 0.55,
    sizeMultiplier: 1.0
  },
  evolution: {
    trigger: 'evolution',
    durationMs: 2000,
    emitCount: 48,
    colorOverrideHex: '#fef08a',
    speedMultiplier: 2.0,
    sizeMultiplier: 1.5
  },
  'level-up': {
    trigger: 'level-up',
    durationMs: 1600,
    emitCount: 38,
    colorOverrideHex: '#34d399',
    speedMultiplier: 1.8,
    sizeMultiplier: 1.35
  },
  special: {
    trigger: 'special',
    durationMs: 1400,
    emitCount: 34,
    speedMultiplier: 1.6,
    sizeMultiplier: 1.3
  }
};

export function createReactiveParticleBurst(
  trigger: ReactiveParticleTrigger
): ReactiveParticleBurstConfig {
  return REACTIVE_BURST_TABLE[trigger];
}

