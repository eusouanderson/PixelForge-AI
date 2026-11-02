import { describe, it, expect } from 'vitest';
import { validatePixelArt } from './pixel-art-schema';
import {
  stage1EggIntactPreset,
  stage2EggCrackingPreset,
  stage3EggFracturingPreset,
  stage4EggHatchingPreset,
  stage5BabyIdle1Preset,
  stage6BabyIdle2Preset
} from '@/shared/constants/presets';

describe('pixelArtSchema', () => {
  it('validates all 6 lifecycle presets successfully', () => {
    const presets = [
      stage1EggIntactPreset,
      stage2EggCrackingPreset,
      stage3EggFracturingPreset,
      stage4EggHatchingPreset,
      stage5BabyIdle1Preset,
      stage6BabyIdle2Preset
    ];

    for (const preset of presets) {
      const validated = validatePixelArt(preset);
      expect(validated.name).toBeTruthy();
      expect(validated.layers.length).toBeGreaterThan(0);
      expect(validated.logicalDimensions.width).toBe(32);
      expect(validated.logicalDimensions.height).toBe(32);
    }
  });

  it('throws error when color used in operation is missing from palette', () => {
    const invalidArt = {
      version: '1.0.0',
      name: 'Invalid Color Art',
      description: 'Test',
      logicalDimensions: { width: 16, height: 16 },
      palette: {
        bg: '#000000'
      },
      layers: [
        {
          id: 'layer1',
          name: 'Layer 1',
          visible: true,
          opacity: 1,
          zIndex: 0,
          operations: [
            {
              type: 'rect',
              x: 0,
              y: 0,
              width: 5,
              height: 5,
              color: 'missing_color'
            }
          ]
        }
      ]
    };

    expect(() => validatePixelArt(invalidArt)).toThrowError(
      /não foi definida na paleta/
    );
  });

  it('throws error when required fields are missing', () => {
    const missingName = {
      logicalDimensions: { width: 16, height: 16 },
      palette: { bg: '#000000' },
      layers: []
    };

    expect(() => validatePixelArt(missingName)).toThrow();
  });

  it('validates symmetry_h operations recursively', () => {
    const symmetryArt = {
      version: '1.0.0',
      name: 'Symmetric Shield',
      description: 'Test',
      logicalDimensions: { width: 16, height: 16 },
      palette: {
        iron: '#94a3b8'
      },
      layers: [
        {
          id: 'shield',
          name: 'Shield',
          visible: true,
          opacity: 1,
          zIndex: 0,
          operations: [
            {
              type: 'symmetry_h',
              axisX: 8,
              operations: [
                {
                  type: 'pixel',
                  x: 3,
                  y: 5,
                  color: 'iron'
                }
              ]
            }
          ]
        }
      ]
    };

    const validated = validatePixelArt(symmetryArt);
    expect(validated.layers[0].operations.length).toBe(1);
  });
});
