import type {
  DetailEnhancementOptions,
  LogicalDimensions,
  OutputDimensions,
  UpscalingAlgorithm
} from '@/core/domain/pixel-art/interfaces';

export interface RenderingSurfaceScales {
  readonly texture3d: number;
  readonly overlay2d: number;
  readonly studioPreview: number;
  readonly breeding: number;
  readonly pngExport: number;
}

export interface RenderingConfiguration {
  readonly logicalDimensions: LogicalDimensions;
  readonly renderScale: number;
  readonly outputDimensions: OutputDimensions;
  readonly upscalingAlgorithm: UpscalingAlgorithm;
  readonly detailEnhancement: DetailEnhancementOptions;
  readonly surfaceScales: RenderingSurfaceScales;
  readonly supportedRenderScales: readonly number[];
}

export interface AppConfiguration {
  appName: string;
  appSubtitle: string;
  version: string;
  defaultOutputDimensions: OutputDimensions;
  defaultLogicalDimensions: LogicalDimensions;
  allowedLogicalSizes: readonly number[];
  defaultScale: number;
  rendering: RenderingConfiguration;
}

export const APP_CONFIG: AppConfiguration = {
  appName: 'PixelForge AI',
  appSubtitle: 'Plataforma Profissional de Pixel Art com LLM',
  version: '1.13.4',
  defaultOutputDimensions: {
    width: 1024,
    height: 1024
  },
  defaultLogicalDimensions: {
    width: 32,
    height: 32
  },
  allowedLogicalSizes: [16, 32, 48, 64, 128] as const,
  defaultScale: 8,
  rendering: {
    logicalDimensions: {
      width: 32,
      height: 32
    },
    renderScale: 4,
    outputDimensions: {
      width: 128,
      height: 128
    },
    upscalingAlgorithm: 'nearest-neighbor',
    detailEnhancement: {
      enabled: false,
      shadingStrength: 12,
      outlinePreservation: true
    },
    surfaceScales: {
      texture3d: 8,
      overlay2d: 6,
      studioPreview: 8,
      breeding: 4,
      pngExport: 32
    },
    supportedRenderScales: [2, 3, 4, 6, 8, 16, 32] as const
  }
};

/**
 * Computes rendered output dimensions from logical sprite dimensions and a render scale factor.
 */
export function resolveOutputDimensions(
  logical: LogicalDimensions,
  scale: number = APP_CONFIG.rendering.renderScale
): OutputDimensions {
  const safeScale = Math.max(1, Math.floor(scale));
  return {
    width: logical.width * safeScale,
    height: logical.height * safeScale
  };
}

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


