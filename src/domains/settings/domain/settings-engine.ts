import type { GameSettingsState } from '../types';

export function createDefaultSettings(): GameSettingsState {
  return {
    soundEnabled: true,
    vibrationEnabled: true,
    notificationsEnabled: true,
    graphicsQuality: 'high',
    showPixelGrid: false,
    reducedMotion: false,
    autoSaveEnabled: true
  };
}

export function updateGameSettings(
  current: GameSettingsState,
  patch: Partial<GameSettingsState>
): GameSettingsState {
  return {
    ...current,
    ...patch
  };
}

