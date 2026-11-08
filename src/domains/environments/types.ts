import type { CharacterId, ElementAffinity } from '@/domains/characters/types';

export interface EnvironmentLightingConfig {
  readonly clearColorHex: string;
  readonly ambientColorHex: string;
  readonly groundColorHex: string;
  readonly mainLightColorHex: string;
  readonly mainLightIntensity: number;
  readonly rimLightColorHex: string;
  readonly rimLightIntensity: number;
  readonly fogColorHex: string;
  readonly fogDensity: number;
}

export interface EnvironmentPropConfig {
  readonly id: string;
  readonly shape: 'monolith' | 'crystal-pillar' | 'lava-pool' | 'mushroom' | 'floating-ring' | 'obsidian-arch' | 'solar-obelisk';
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly scale: { readonly x: number; readonly y: number; readonly z: number };
  readonly primaryColorHex: string;
  readonly emissiveColorHex: string;
  readonly floatAmplitude: number;
  readonly rotationSpeed: number;
}

export interface CharacterEnvironmentConfig {
  readonly id: string;
  readonly characterId: CharacterId;
  readonly name: string;
  readonly description: string;
  readonly element: ElementAffinity;
  readonly lighting: EnvironmentLightingConfig;
  readonly pedestalColorHex: string;
  readonly pedestalAccentHex: string;
  readonly groundColorHex: string;
  readonly props: readonly EnvironmentPropConfig[];
}

