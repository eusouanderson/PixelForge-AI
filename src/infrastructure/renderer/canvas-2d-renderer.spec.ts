import { describe, it, expect } from 'vitest';
import { Canvas2dRenderer } from './canvas-2d-renderer';
import { stage1EggIntactPreset, stage5BabyIdle1Preset, stage6BabyIdle2Preset } from '@/shared/constants/presets';
import { hexToUint32 } from '@/core/domain/canvas/color';
import type { DeclarativePixelArt } from '@/core/domain/pixel-art/interfaces';

describe('Canvas2dRenderer', () => {
  const renderer = new Canvas2dRenderer();

  it('renders intact egg preset with transparent background and non-zero pixels', () => {
    const buffer = renderer.renderToBuffer(stage1EggIntactPreset);
    expect(buffer.width).toBe(32);
    expect(buffer.height).toBe(32);

    expect(buffer.getPixel(0, 0)).toBe(0);
    expect(buffer.getPixel(31, 0)).toBe(0);

    let coloredCount = 0;
    for (let i = 0; i < buffer.uint32View.length; i++) {
      if (buffer.uint32View[i] !== 0) {
        coloredCount++;
      }
    }
    expect(coloredCount).toBeGreaterThan(150);
  });

  it('renders baby dinosaur idle frames with distinct motion', () => {
    const buffer1 = renderer.renderToBuffer(stage5BabyIdle1Preset);
    const buffer2 = renderer.renderToBuffer(stage6BabyIdle2Preset);

    expect(buffer1.width).toBe(32);
    expect(buffer2.width).toBe(32);

    expect(buffer1.getPixel(0, 0)).toBe(0);
    expect(buffer2.getPixel(0, 0)).toBe(0);

    let differences = 0;
    for (let i = 0; i < buffer1.uint32View.length; i++) {
      if (buffer1.uint32View[i] !== buffer2.uint32View[i]) {
        differences++;
      }
    }
    expect(differences).toBeGreaterThan(10);
  });

  it('rasterizes all primitive operation types correctly', () => {
    const testArt: DeclarativePixelArt = {
      version: '1.0.0',
      name: 'Primitives Test',
      description: 'Testing all rasterization primitives',
      logicalDimensions: { width: 16, height: 16 },
      palette: {
        red: '#ff0000',
        green: '#00ff00',
        blue: '#0000ff',
        yellow: '#ffff00',
        white: '#ffffff'
      },
      layers: [
        {
          id: 'l1',
          name: 'Base',
          visible: true,
          opacity: 1,
          zIndex: 0,
          operations: [
            { type: 'fill', color: 'blue' },
            { type: 'rect', x: 2, y: 2, width: 4, height: 4, color: 'red' },
            { type: 'stroke_rect', x: 8, y: 2, width: 4, height: 4, color: 'yellow' },
            { type: 'line', x0: 0, y0: 10, x1: 5, y1: 15, color: 'white' },
            { type: 'circle', cx: 12, cy: 12, radius: 2, color: 'green', fill: true },
            { type: 'circle', cx: 12, cy: 12, radius: 3, color: 'white', fill: false },
            { type: 'pixel', x: 0, y: 0, color: 'white' },
            { type: 'points', color: 'yellow', coordinates: [[1, 0], [0, 1]] },
            {
              type: 'symmetry_h',
              axisX: 8,
              operations: [
                { type: 'pixel', x: 2, y: 8, color: 'white' }
              ]
            }
          ]
        }
      ]
    };

    const buffer = renderer.renderToBuffer(testArt);
    expect(buffer.getPixel(0, 0)).toBe(hexToUint32('#ffffff'));
    expect(buffer.getPixel(3, 3)).toBe(hexToUint32('#ff0000'));
    expect(buffer.getPixel(2, 8)).toBe(hexToUint32('#ffffff'));
    expect(buffer.getPixel(14, 8)).toBe(hexToUint32('#ffffff'));
  });

  it('respects layer visibility and opacity', () => {
    const testArt: DeclarativePixelArt = {
      version: '1.0.0',
      name: 'Layer Test',
      description: 'Testing visibility',
      logicalDimensions: { width: 4, height: 4 },
      palette: {
        red: '#ff0000',
        blue: '#0000ff'
      },
      layers: [
        {
          id: 'bottom',
          name: 'Bottom',
          visible: true,
          opacity: 1,
          zIndex: 0,
          operations: [{ type: 'fill', color: 'blue' }]
        },
        {
          id: 'top',
          name: 'Top',
          visible: false,
          opacity: 1,
          zIndex: 1,
          operations: [{ type: 'fill', color: 'red' }]
        }
      ]
    };

    const buffer = renderer.renderToBuffer(testArt);
    expect(buffer.getPixel(0, 0)).toBe(hexToUint32('#0000ff'));
  });
});
