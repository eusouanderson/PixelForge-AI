export type GraphicsQualityPreset = 'high' | 'balanced' | 'battery-saver';

export interface GameSettingsState {
  readonly soundEnabled: boolean;
  readonly vibrationEnabled: boolean;
  readonly notificationsEnabled: boolean;
  readonly graphicsQuality: GraphicsQualityPreset;
  readonly showPixelGrid: boolean;
  readonly reducedMotion: boolean;
  readonly autoSaveEnabled: boolean;
  readonly developerModeEnabled: boolean;
}

