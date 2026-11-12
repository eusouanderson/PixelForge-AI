import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FoodPixelArt from '../presentation/FoodPixelArt.vue';
import { getFoodPixelArt, FOOD_PIXEL_ARTS } from '../domain/food-pixel-art-catalog';
import type { DeclarativePixelArt } from '@/core/domain/pixel-art/interfaces';

describe('FoodPixelArt.vue component', () => {
  it('renders SVG with crisp pixel art by foodId', () => {
    const wrapper = mount(FoodPixelArt, {
      props: {
        foodId: 'volcanic-roast-meat',
        size: 40
      }
    });

    const svg = wrapper.find('[data-testid="food-pixel-art-svg"]');
    expect(svg.exists()).toBe(true);
    expect(svg.attributes('viewBox')).toBe('0 0 16 16');
    expect(wrapper.attributes('style')).toContain('width: 40px');
    expect(wrapper.attributes('style')).toContain('height: 40px');
    expect(svg.findAll('rect').length).toBeGreaterThan(5);
  });

  it('renders SVG when passed DeclarativePixelArt directly as art prop', () => {
    const art = getFoodPixelArt('frosted-crystal-berry');
    const wrapper = mount(FoodPixelArt, {
      props: {
        art,
        size: '48px'
      }
    });

    const svg = wrapper.find('[data-testid="food-pixel-art-svg"]');
    expect(svg.exists()).toBe(true);
    expect(svg.attributes('aria-label')).toBe('Fruta-Cristal da Tundra');
  });

  it('renders all 17 food and medicine items without errors', () => {
    for (const id of Object.keys(FOOD_PIXEL_ARTS)) {
      const wrapper = mount(FoodPixelArt, {
        props: {
          foodId: id
        }
      });
      expect(wrapper.find('svg').exists()).toBe(true);
    }
  });

  it('applies biteStage masks when biteStage is 1, 2, or 3', () => {
    const wrapper0 = mount(FoodPixelArt, {
      props: { foodId: 'volcanic-roast-meat', biteStage: 0 }
    });
    expect(wrapper0.find('defs').exists()).toBe(false);

    const wrapper1 = mount(FoodPixelArt, {
      props: { foodId: 'volcanic-roast-meat', biteStage: 1 }
    });
    expect(wrapper1.find('defs').exists()).toBe(true);
    expect(wrapper1.find('mask').exists()).toBe(true);

    const wrapper2 = mount(FoodPixelArt, {
      props: { foodId: 'volcanic-roast-meat', biteStage: 2 }
    });
    expect(wrapper2.find('mask').findAll('circle').length).toBeGreaterThan(1);

    const wrapper3 = mount(FoodPixelArt, {
      props: { foodId: 'volcanic-roast-meat', biteStage: 3 }
    });
    expect(wrapper3.find('mask').exists()).toBe(true);
  });

  it('renders symmetry_h operations correctly when present in pixel art', () => {
    const symmetricArt: DeclarativePixelArt = {
      version: '1.0.0',
      name: 'Simétrico',
      description: 'Teste',
      logicalDimensions: { width: 16, height: 16 },
      palette: {
        transparent: '#00000000',
        core: '#ffffff'
      },
      layers: [
        {
          id: 'sym',
          name: 'Sym',
          visible: true,
          opacity: 1,
          zIndex: 1,
          operations: [
            {
              type: 'symmetry_h',
              axisX: 8,
              operations: [
                { type: 'rect', x: 2, y: 5, width: 2, height: 2, color: 'core' },
                { type: 'pixel', x: 3, y: 7, color: 'core' },
                { type: 'points', color: 'core', coordinates: [[4, 8]] }
              ]
            }
          ]
        }
      ]
    };

    const wrapper = mount(FoodPixelArt, {
      props: { art: symmetricArt }
    });
    expect(wrapper.find('svg').exists()).toBe(true);
    // Left side (3 ops) + mirrored right side (3 ops) = 6 rects
    expect(wrapper.findAll('rect').length).toBe(6);
  });

  it('renders fallback when art is not found', () => {
    const wrapper = mount(FoodPixelArt, {
      props: { foodId: 'non-existent-item' }
    });
    expect(wrapper.find('svg').exists()).toBe(false);
    expect(wrapper.text()).toBe('?');
  });
});
