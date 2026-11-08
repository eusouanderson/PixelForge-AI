import type {
  PixelArtAIProvider,
  PixelArtGenerationRequest,
  PixelArtGenerationResult
} from '@/core/ports/ai-provider/interfaces';
import type { DeclarativePixelArt } from '@/core/domain/pixel-art/interfaces';
import { validatePixelArt } from '@/core/domain/validation/pixel-art-schema';

const THEME_PALETTES: Readonly<
  Record<
    NonNullable<PixelArtGenerationRequest['paletteTheme']>,
    {
      readonly base: string;
      readonly belly: string;
      readonly crest: string;
      readonly eye: string;
      readonly pupil: string;
    }
  >
> = {
  fire: { base: '#c2410c', belly: '#facc15', crest: '#059669', eye: '#fde047', pupil: '#0f172a' },
  ice: { base: '#0284c7', belly: '#bae6fd', crest: '#38bdf8', eye: '#38bdf8', pupil: '#082f49' },
  electric: { base: '#ca8a04', belly: '#1e293b', crest: '#06b6d4', eye: '#06b6d4', pupil: '#083344' },
  poison: { base: '#7e22ce', belly: '#bef264', crest: '#22c55e', eye: '#84cc16', pupil: '#14532d' },
  earth: { base: '#78716c', belly: '#d97706', crest: '#10b981', eye: '#f59e0b', pupil: '#1c1917' },
  air: { base: '#14b8a6', belly: '#f8fafc', crest: '#38bdf8', eye: '#fde047', pupil: '#042f2e' },
  shadow: { base: '#27272a', belly: '#9f1239', crest: '#d6d3d1', eye: '#f43f5e', pupil: '#09090b' },
  light: { base: '#f59e0b', belly: '#f8fafc', crest: '#f97316', eye: '#38bdf8', pupil: '#0c4a6e' }
};

export class MockPixelArtAIProvider implements PixelArtAIProvider {
  public async generatePixelArt(
    request: PixelArtGenerationRequest
  ): Promise<PixelArtGenerationResult> {
    const trimmedName = request.name.trim();
    if (!trimmedName) {
      return {
        success: false,
        error: 'Nome da arte é obrigatório para geração declarativa.'
      };
    }

    if (request.logicalWidth <= 0 || request.logicalHeight <= 0) {
      return {
        success: false,
        error: 'Dimensões lógicas devem ser inteiros positivos.'
      };
    }

    const themeKey = request.paletteTheme ?? 'fire';
    const colors = THEME_PALETTES[themeKey];
    const cx = Math.floor(request.logicalWidth / 2);
    const cy = Math.floor(request.logicalHeight / 2);

    const candidate: DeclarativePixelArt = {
      $schema: 'https://pixelforge.ai/schemas/v1/pixel-art.json',
      version: '1.0.0',
      name: trimmedName,
      description: request.description,
      logicalDimensions: {
        width: request.logicalWidth,
        height: request.logicalHeight
      },
      palette: {
        transparent: '#00000000',
        outline: '#090d16',
        dino_base: colors.base,
        dino_belly: colors.belly,
        dino_crest: colors.crest,
        dino_eye: colors.eye,
        dino_pupil: colors.pupil,
        specular: '#ffffff'
      },
      layers: [
        {
          id: 'layer_body_front',
          name: 'Silhueta Frontal',
          visible: true,
          opacity: 1,
          zIndex: 1,
          operations: [
            { type: 'circle', cx, cy: cy + 2, radius: 6, color: 'dino_base', fill: true },
            { type: 'rect', x: cx - 3, y: cy + 1, width: 6, height: 5, color: 'dino_belly' },
            { type: 'rect', x: cx - 2, y: cy - 6, width: 4, height: 3, color: 'dino_crest' }
          ]
        },
        {
          id: 'layer_eyes_front',
          name: 'Genética Ocular Binocular',
          visible: true,
          opacity: 1,
          zIndex: 2,
          operations: [
            {
              type: 'symmetry_h',
              axisX: cx,
              operations: [
                { type: 'rect', x: cx - 4, y: cy - 2, width: 2, height: 2, color: 'dino_eye' },
                { type: 'pixel', x: cx - 3, y: cy - 1, color: 'dino_pupil' },
                { type: 'pixel', x: cx - 4, y: cy - 2, color: 'specular' }
              ]
            }
          ]
        }
      ],
      metadata: {
        author: 'PixelForge LLM Engine',
        creatureName: trimmedName,
        lifeStage: 'baby',
        animation: 'idle',
        frame: 1,
        tags: [themeKey, 'frontal', 'binocular']
      }
    };

    const validated = validatePixelArt(candidate);
    return {
      success: true,
      declarativeArt: validated,
      tokenUsage: {
        promptTokens: 120,
        completionTokens: 240,
        totalTokens: 360
      }
    };
  }
}

