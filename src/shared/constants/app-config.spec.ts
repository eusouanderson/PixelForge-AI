import { describe, it, expect } from 'vitest';
import { APP_CONFIG, resolveInitialAppView } from './app-config';

describe('APP_CONFIG', () => {
  it('exposes valid application configuration and logical sizes', () => {
    expect(APP_CONFIG.appName).toBe('PixelForge AI');
    expect(APP_CONFIG.defaultLogicalDimensions).toEqual({ width: 32, height: 32 });
    expect(APP_CONFIG.defaultOutputDimensions).toEqual({ width: 1024, height: 1024 });
    expect(APP_CONFIG.allowedLogicalSizes).toContain(32);
    expect(APP_CONFIG.defaultScale).toBe(8);
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


