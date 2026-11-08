import type { DeclarativePixelArt } from '@/core/domain/pixel-art/interfaces';

export interface PixelArtGenerationRequest {
  readonly name: string;
  readonly description: string;
  readonly logicalWidth: number;
  readonly logicalHeight: number;
  readonly paletteTheme?: 'fire' | 'ice' | 'electric' | 'poison' | 'earth' | 'air' | 'shadow' | 'light';
}

export interface PixelArtGenerationResult {
  readonly success: boolean;
  readonly declarativeArt?: DeclarativePixelArt;
  readonly error?: string;
  readonly tokenUsage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
}

export interface PixelArtAIProvider {
  generatePixelArt(request: PixelArtGenerationRequest): Promise<PixelArtGenerationResult>;
}

