export interface AppConfiguration {
  appName: string;
  appSubtitle: string;
  version: string;
  defaultOutputDimensions: {
    width: number;
    height: number;
  };
  defaultLogicalDimensions: {
    width: number;
    height: number;
  };
  allowedLogicalSizes: readonly number[];
  defaultScale: number;
}

export const APP_CONFIG: AppConfiguration = {
  appName: 'PixelForge AI',
  appSubtitle: 'Plataforma Profissional de Pixel Art com LLM',
  version: '1.0.0',
  defaultOutputDimensions: {
    width: 1024,
    height: 1024
  },
  defaultLogicalDimensions: {
    width: 32,
    height: 32
  },
  allowedLogicalSizes: [16, 32, 48, 64, 128] as const,
  defaultScale: 8
};

export type AppViewMode = 'game' | 'studio';

export function resolveInitialAppView(mode: string, search: string = ''): AppViewMode {
  const params = new URLSearchParams(search);
  const queryMode = (params.get('mode') ?? params.get('view') ?? '').toLowerCase();

  if (queryMode === 'studio' || queryMode === 'pixelart') {
    return 'studio';
  }
  if (queryMode === 'apk' || queryMode === 'game') {
    return 'game';
  }

  const normalizedMode = mode.toLowerCase();
  if (normalizedMode === 'pixelart' || normalizedMode === 'studio') {
    return 'studio';
  }

  return 'game';
}


