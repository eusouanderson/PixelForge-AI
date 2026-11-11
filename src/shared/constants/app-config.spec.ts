import { describe, it, expect } from 'vitest';
import {
  APP_CONFIG,
  resolveInitialAppView,
  resolveOutputDimensions
} from './app-config';

describe('APP_CONFIG', () => {
  it('exposes valid application configuration, logical sizes, and centralized rendering scales', () => {
    expect(APP_CONFIG.appName).toBe('PixelForge AI');
    expect(APP_CONFIG.defaultLogicalDimensions).toEqual({ width: 32, height: 32 });
    expect(APP_CONFIG.defaultOutputDimensions).toEqual({ width: 1024, height: 1024 });
    expect(APP_CONFIG.allowedLogicalSizes).toContain(32);
    expect(APP_CONFIG.defaultScale).toBe(8);

    expect(APP_CONFIG.rendering.logicalDimensions).toEqual({ width: 32, height: 32 });
    expect(APP_CONFIG.rendering.renderScale).toBe(4);
    expect(APP_CONFIG.rendering.outputDimensions).toEqual({ width: 128, height: 128 });
    expect(APP_CONFIG.rendering.upscalingAlgorithm).toBe('nearest-neighbor');
    expect(APP_CONFIG.rendering.detailEnhancement.enabled).toBe(false);
    expect(APP_CONFIG.rendering.surfaceScales.texture3d).toBe(8);
    expect(APP_CONFIG.rendering.surfaceScales.overlay2d).toBe(6);
    expect(APP_CONFIG.rendering.surfaceScales.pngExport).toBe(32);

    expect(resolveOutputDimensions({ width: 32, height: 32 })).toEqual({
      width: 128,
      height: 128
    });
    expect(resolveOutputDimensions({ width: 32, height: 32 }, 8)).toEqual({
      width: 256,
      height: 256
    });
    expect(resolveOutputDimensions({ width: 32, height: 32 }, 0)).toEqual({
      width: 32,
      height: 32
    });
  });

  it('resolves initial view between Pixel Art Studio and APK Game based on Vite mode and URL query', () => {
    expect(resolveInitialAppView('pixelart', '')).toBe('studio');
    expect(resolveInitialAppView('studio', '')).toBe('studio');
    expect(resolveInitialAppView('apk', '')).toBe('game');
    expect(resolveInitialAppView('production', '')).toBe('game');
    expect(resolveInitialAppView('apk', '?mode=pixelart')).toBe('studio');
    expect(resolveInitialAppView('pixelart', '?view=apk')).toBe('game');
  });
});


