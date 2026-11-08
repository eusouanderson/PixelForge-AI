import { describe, it, expect } from 'vitest';
import {
  rasterizeSpriteToRgbaBytes,
  rasterizeParticlePatternToRgbaBytes
} from '../pixel-texture-adapter';
import { stage5BabyIdle1Preset } from '@/shared/constants/presets';
import { getCharacterParticleConfig } from '@/domains/particles/domain/particle-registry';

describe('Babylon PixelTextureAdapter', () => {
  it('rasterizes DeclarativePixelArt into nearest-neighbor RGBA bytes with optional grid', () => {
    const resNoGrid = rasterizeSpriteToRgbaBytes(stage5BabyIdle1Preset, 4, false);
    expect(resNoGrid.width).toBe(128);
    expect(resNoGrid.height).toBe(128);
    expect(resNoGrid.data.length).toBe(128 * 128 * 4);

    const resGrid = rasterizeSpriteToRgbaBytes(stage5BabyIdle1Preset, 4, true);
    expect(resGrid.width).toBe(128);
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
});

