import { describe, it, expect } from 'vitest';
import { FOOD_PIXEL_ARTS, getFoodPixelArt } from '../domain/food-pixel-art-catalog';
import { validatePixelArt } from '@/core/domain/validation/pixel-art-schema';
import { listAllFoods } from '../domain/feeding-engine';

describe('Food and Medicine Pixel Art Catalog', () => {
  it('defines valid 16x16 DeclarativePixelArt for all 18 foods and medicines in the catalog', () => {
    const allFoods = listAllFoods();
    expect(allFoods.length).toBe(18);

    for (const food of allFoods) {
      const art = getFoodPixelArt(food.id);
      expect(art).toBeDefined();
      expect(art.logicalDimensions.width).toBe(16);
      expect(art.logicalDimensions.height).toBe(16);
      expect(art.palette.transparent).toBe('#00000000');
      expect(art.layers.length).toBeGreaterThan(0);
      expect(art.layers[0].operations.length).toBeGreaterThan(5);

      // Validate against the strict PixelForge schema (palette colors matching, rects, lines, etc.)
      const validated = validatePixelArt(art);
      expect(validated.name).toBeTruthy();
      expect(validated.logicalDimensions.width).toBe(16);
    }
  });

  it('defines valid pixel art for awakening-fruit with star and energy colors', () => {
    const art = getFoodPixelArt('awakening-fruit');
    expect(art.name).toBe('Fruta do Despertar');
    expect(art.palette.star_gold).toBe('#f59e0b');
    expect(art.palette.fruit_dark).toBe('#9333ea');
  });

  it('throws an error when requesting pixel art for an unknown food ID', () => {
    expect(() => getFoodPixelArt('unknown-food-item')).toThrow(
      'Pixel art não encontrada para o alimento/remédio: unknown-food-item'
    );
  });

  it('verifies all 18 items have distinct and unique pixel art definitions', () => {
    const artNames = Object.values(FOOD_PIXEL_ARTS).map((a) => a.name);
    const uniqueNames = new Set(artNames);
    expect(uniqueNames.size).toBe(18);
  });
});
