import type { DeclarativePixelArt } from '@/core/domain/pixel-art/interfaces';

export type AnimationMode = 'none' | 'lifecycle' | 'idle' | 'hatching';

export interface ViewerState {
  currentArt: DeclarativePixelArt;
  selectedPresetId: string;
  zoomLevel: number;
  showGrid: boolean;
  animationMode: AnimationMode;
  animationSpeedMs: number;
  activeTab: 'layers' | 'palette' | 'info';
  errorMessage: string | null;
}

export interface ViewerActions {
  selectPreset(presetId: string): void;
  toggleGrid(): void;
  setZoom(zoom: number): void;
  setAnimationMode(mode: AnimationMode): void;
  setAnimationSpeed(speedMs: number): void;
  toggleLayerVisibility(layerId: string): void;
  setLayerOpacity(layerId: string, opacity: number): void;
  exportPng(): Promise<void>;
  exportJson(): void;
  importJson(file: File): Promise<void>;
}
