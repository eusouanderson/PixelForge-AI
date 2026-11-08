import { describe, it, expect } from 'vitest';
import {
  rasterizeSpriteToRgbaBytes,
  rasterizeParticlePatternToRgbaBytes,
  rasterizeBackdropToRgbaBytes,
  rasterizePedestalToRgbaBytes
} from '../pixel-texture-adapter';
import { stage5BabyIdle1Preset } from '@/shared/constants/presets';
import { getCharacterParticleConfig } from '@/domains/particles/domain/particle-registry';
import type { ElementAffinity } from '@/domains/characters/types';

describe('Babylon PixelTextureAdapter', () => {
  it('rasterizes DeclarativePixelArt into nearest-neighbor RGBA bytes with optional grid', () => {
    const resNoGrid = rasterizeSpriteToRgbaBytes(stage5BabyIdle1Preset, 4, false);
    expect(resNoGrid.width).toBe(128);
    expect(resNoGrid.height).toBe(128);
    expect(resNoGrid.data.length).toBe(128 * 128 * 4);

    const resGrid = rasterizeSpriteToRgbaBytes(stage5BabyIdle1Preset, 4, true);
    expect(resGrid.width).toBe(128);
    expect(resGrid.height).toBe(128);
    expect(resGrid.data.length).toBe(128 * 128 * 4);
  });

  it('rasterizes pixelated particle pattern into crisp RGBA bytes', () => {
    const pConfig = getCharacterParticleConfig('ignisauro');
    const tex = rasterizeParticlePatternToRgbaBytes(
      pConfig.texturePattern,
      pConfig.primaryColorHex,
      4
    );
    expect(tex.width).toBe(16);
    expect(tex.height).toBe(16);
    expect(tex.data.length).toBe(16 * 16 * 4);
  });

  it('rasterizes 2.5D pixel art backdrops for all celestial kinds', () => {
    const celestialKinds = ['eclipse', 'aurora', 'sun', 'moon', 'clouds', 'nebula'] as const;

    for (const kind of celestialKinds) {
      const tex = rasterizeBackdropToRgbaBytes({
        skyTopColorHex: '#100b1a',
        skyBottomColorHex: '#2d1b3e',
        horizonColorHex: '#3a2252',
        mountainColorHex: '#181226',
        mountainHighlightHex: '#251a3b',
        celestialColorHex: '#ff8844',
        celestialKind: kind
      });

      expect(tex.width).toBe(128);
      expect(tex.height).toBe(64);
      expect(tex.data.length).toBe(128 * 64 * 4);
      expect(tex.data[3]).toBe(255);
    }
  });

  it('rasterizes elemental pedestals with runes for all 11 elements', () => {
    const elements: ElementAffinity[] = [
      'fire',
      'ice',
      'electric',
      'poison',
      'earth',
      'air',
      'shadow',
      'light',
      'fairy',
      'crystal',
      'cosmic'
    ];

    for (const element of elements) {
      const tex = rasterizePedestalToRgbaBytes('#333333', '#ffaa00', element, 64);
      expect(tex.width).toBe(64);
      expect(tex.height).toBe(64);
      expect(tex.data.length).toBe(64 * 64 * 4);
    }
  });
});
