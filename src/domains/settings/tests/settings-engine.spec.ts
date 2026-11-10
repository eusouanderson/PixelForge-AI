import { describe, it, expect } from 'vitest';
import {
  createDefaultSettings,
  updateGameSettings
} from '../domain/settings-engine';

describe('settings domain engine', () => {
  it('creates default mobile settings and updates partial preferences immutably', () => {
    const defaults = createDefaultSettings();
    expect(defaults.graphicsQuality).toBe('high');
    expect(defaults.autoSaveEnabled).toBe(true);
    expect(defaults.notificationsEnabled).toBe(true);

    const updated = updateGameSettings(defaults, {
      graphicsQuality: 'battery-saver',
      showPixelGrid: true,
      notificationsEnabled: false
    });
    expect(updated.graphicsQuality).toBe('battery-saver');
    expect(updated.showPixelGrid).toBe(true);
    expect(updated.soundEnabled).toBe(true);
    expect(updated.notificationsEnabled).toBe(false);
  });
});

