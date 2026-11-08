import { describe, it, expect, vi } from 'vitest';
import { Canvas2dRenderer } from './canvas-2d-renderer';
import {
  stage1EggIntactPreset,
  stage5BabyIdle1Preset,
  stage6BabyIdle2Preset
} from '@/shared/constants/presets';
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

  it('rasterizes all primitive operation types and symmetry_h sub-operations correctly', () => {
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
            { type: 'line', x0: 5, y0: 15, x1: 0, y1: 10, color: 'white' },
            { type: 'line', x0: 0, y0: 15, x1: 5, y1: 10, color: 'white' },
            { type: 'circle', cx: 12, cy: 12, radius: 2, color: 'green', fill: true },
            { type: 'circle', cx: 12, cy: 12, radius: 3, color: 'white', fill: false },
            { type: 'pixel', x: 0, y: 0, color: 'white' },
            { type: 'pixel', x: 1, y: 1, color: 'missing_key' },
            { type: 'points', color: 'yellow', coordinates: [[1, 0], [0, 1]] },
            {
              type: 'symmetry_h',
              operations: [
                { type: 'pixel', x: 2, y: 8, color: 'white' },
                { type: 'points', color: 'green', coordinates: [[3, 8]] },
                { type: 'rect', x: 1, y: 9, width: 2, height: 2, color: 'red' },
                { type: 'stroke_rect', x: 1, y: 12, width: 2, height: 2, color: 'yellow' },
                { type: 'line', x0: 1, y0: 6, x1: 3, y1: 7, color: 'white' },
                { type: 'circle', cx: 3, cy: 4, radius: 1, color: 'green', fill: true },
                { type: 'fill', color: 'blue' }
              ]
            }
          ]
        }
      ]
    };

    const buffer = renderer.renderToBuffer(testArt);
    expect(buffer.width).toBe(16);
    expect(buffer.height).toBe(16);
    expect(buffer.getPixel(2, 8)).toBe(hexToUint32('#0000ff'));
  });

  it('respects layer visibility, zIndex ordering, and opacity blending', () => {
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
          id: 'top_semi',
          name: 'Top Semi',
          visible: true,
          opacity: 0.5,
          zIndex: 2,
          operations: [{ type: 'pixel', x: 0, y: 0, color: 'red' }]
        },
        {
          id: 'bottom',
          name: 'Bottom',
          visible: true,
          opacity: 1,
          zIndex: 0,
          operations: [{ type: 'fill', color: 'blue' }]
        },
        {
          id: 'hidden',
          name: 'Hidden',
          visible: false,
          opacity: 1,
          zIndex: 3,
          operations: [{ type: 'fill', color: 'red' }]
        }
      ]
    };

    const buffer = renderer.renderToBuffer(testArt);
    expect(buffer.getPixel(1, 1)).toBe(hexToUint32('#0000ff'));
    expect(buffer.getPixel(0, 0)).not.toBe(hexToUint32('#0000ff'));
  });

  it('renders to HTMLCanvasElement with and without grid and handles missing contexts gracefully', () => {
    const art: DeclarativePixelArt = {
      version: '1.0.0',
      name: 'Canvas Render Test',
      description: 'Test',
      logicalDimensions: { width: 4, height: 4 },
      palette: { red: '#ff0000' },
      layers: [
        {
          id: 'l1',
          name: 'L1',
          visible: true,
          opacity: 1,
          zIndex: 0,
          operations: [{ type: 'fill', color: 'red' }]
        }
      ]
    };

    const fakeCtx = {
      imageSmoothingEnabled: true,
      strokeStyle: '',
      lineWidth: 0,
      putImageData: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn()
    };

    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(fakeCtx as unknown as CanvasRenderingContext2D);

    const origCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreateElement(tag);
      if (tag === 'canvas') {
        vi.spyOn(el as HTMLCanvasElement, 'getContext').mockReturnValue(
          fakeCtx as unknown as CanvasRenderingContext2D
        );
      }
      return el;
    });

    renderer.renderToCanvas(canvas, art, 32, 32, true);
    expect(fakeCtx.imageSmoothingEnabled).toBe(false);
    expect(fakeCtx.drawImage).toHaveBeenCalled();
    expect(fakeCtx.stroke).toHaveBeenCalled();

    renderer.renderToCanvas(canvas, art, 32, 32, false);

    // Null offscreen context
    createElementSpy.mockImplementationOnce((tag: string) => {
      const el = origCreateElement(tag);
      vi.spyOn(el as HTMLCanvasElement, 'getContext').mockReturnValue(null);
      return el;
    });
    renderer.renderToCanvas(canvas, art, 32, 32, false);

    // Null target context
    vi.spyOn(canvas, 'getContext').mockReturnValueOnce(null);
    renderer.renderToCanvas(canvas, art, 32, 32, false);

    createElementSpy.mockRestore();
  });

  it('exports PNG Blob and rejects when toBlob returns null', async () => {
    const art: DeclarativePixelArt = {
      version: '1.0.0',
      name: 'Export Test',
      description: 'Test',
      logicalDimensions: { width: 4, height: 4 },
      palette: { red: '#ff0000' },
      layers: [
        {
          id: 'l1',
          name: 'L1',
          visible: true,
          opacity: 1,
          zIndex: 0,
          operations: [{ type: 'fill', color: 'red' }]
        }
      ]
    };

    const origCreateElement = document.createElement.bind(document);
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreateElement(tag) as HTMLCanvasElement;
      if (tag === 'canvas') {
        el.toBlob = (cb: BlobCallback) => cb(new Blob(['png'], { type: 'image/png' }));
      }
      return el;
    });

    const blob = await renderer.exportPngBlob(art);
    expect(blob).toBeInstanceOf(Blob);

    createSpy.mockImplementation((tag: string) => {
      const el = origCreateElement(tag) as HTMLCanvasElement;
      if (tag === 'canvas') {
        el.toBlob = (cb: BlobCallback) => cb(null);
      }
      return el;
    });

    await expect(renderer.exportPngBlob(art, 64, 64)).rejects.toThrow('Falha ao gerar Blob PNG');
    createSpy.mockRestore();
  });
});
