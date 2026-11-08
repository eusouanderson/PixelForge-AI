import { describe, it, expect } from 'vitest';
import { MockPixelArtAIProvider } from './mock-pixel-art-ai-provider';
import { validatePixelArt } from '@/core/domain/validation/pixel-art-schema';

describe('MockPixelArtAIProvider', () => {
  const provider = new MockPixelArtAIProvider();

  it('generates valid frontal binocular declarative pixel art for each elemental theme', async () => {
    const themes = ['fire', 'ice', 'electric', 'poison', 'earth', 'air', 'shadow', 'light'] as const;
    for (const theme of themes) {
      const res = await provider.generatePixelArt({
        name: `Criatura ${theme}`,
        description: `Sprite frontal elemental de ${theme}`,
        logicalWidth: 32,
        logicalHeight: 32,
        paletteTheme: theme
      });

      expect(res.success).toBe(true);
      expect(res.declarativeArt).toBeDefined();
      const validated = validatePixelArt(res.declarativeArt);
      expect(validated.logicalDimensions).toEqual({ width: 32, height: 32 });
      expect(validated.palette.transparent).toBe('#00000000');
      expect(res.tokenUsage?.totalTokens).toBeGreaterThan(0);
    }
  });

  it('uses default fire theme when paletteTheme is omitted and rejects invalid dimensions or empty name', async () => {
    const defaultRes = await provider.generatePixelArt({
      name: 'Mascote Padrão',
      description: 'Teste sem tema explícito',
      logicalWidth: 32,
      logicalHeight: 32
    });
    expect(defaultRes.success).toBe(true);

    const emptyNameRes = await provider.generatePixelArt({
      name: '   ',
      description: 'Inválido',
      logicalWidth: 32,
      logicalHeight: 32
    });
    expect(emptyNameRes.success).toBe(false);
    expect(emptyNameRes.error).toContain('Nome');

    const badSizeRes = await provider.generatePixelArt({
      name: 'Tamanho Inválido',
      description: 'Inválido',
      logicalWidth: 0,
      logicalHeight: 32
    });
    expect(badSizeRes.success).toBe(false);
    expect(badSizeRes.error).toContain('Dimensões');
  });
});

