import type { DeclarativePixelArt } from '@/core/domain/pixel-art/interfaces';
import type { PixelParticleTexturePattern } from '@/domains/particles/types';
import { Canvas2dRenderer } from '@/infrastructure/renderer/canvas-2d-renderer';
import { parseHexColor, uint32ToRgba } from '@/core/domain/canvas/color';

const sharedRenderer = new Canvas2dRenderer();

export interface RawRgbaTextureData {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

export function rasterizeSpriteToRgbaBytes(
  art: DeclarativePixelArt,
  scaleFactor: number = 8,
  showGrid: boolean = false
): RawRgbaTextureData {
  const logicalBuffer = sharedRenderer.renderToBuffer(art);
  const scale = Math.max(1, Math.floor(scaleFactor));
  const outWidth = logicalBuffer.width * scale;
  const outHeight = logicalBuffer.height * scale;
  const data = new Uint8Array(outWidth * outHeight * 4);

  for (let ly = 0; ly < logicalBuffer.height; ly++) {
    // Flip Y for WebGL RawTexture coordinates so the sprite stands upright
    const flippedLy = logicalBuffer.height - 1 - ly;
    for (let lx = 0; lx < logicalBuffer.width; lx++) {
      const pixelUint32 = logicalBuffer.getPixel(lx, flippedLy);
      const rgba = uint32ToRgba(pixelUint32);

      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const outX = lx * scale + sx;
          const outY = ly * scale + sy;
          const idx = (outY * outWidth + outX) * 4;

          const isGridBorder = showGrid && (sx === 0 || sy === 0);
          if (isGridBorder && rgba.a > 0) {
            data[idx] = Math.min(255, rgba.r + 25);
            data[idx + 1] = Math.min(255, rgba.g + 25);
            data[idx + 2] = Math.min(255, rgba.b + 25);
            data[idx + 3] = rgba.a;
          } else {
            data[idx] = rgba.r;
            data[idx + 1] = rgba.g;
            data[idx + 2] = rgba.b;
            data[idx + 3] = rgba.a;
          }
        }
      }
    }
  }

  return { width: outWidth, height: outHeight, data };
}

export function rasterizeParticlePatternToRgbaBytes(
  pattern: PixelParticleTexturePattern,
  hexColor: string,
  scaleFactor: number = 4
): RawRgbaTextureData {
  const scale = Math.max(1, Math.floor(scaleFactor));
  const outWidth = pattern.size * scale;
  const outHeight = pattern.size * scale;
  const data = new Uint8Array(outWidth * outHeight * 4);
  const rgba = parseHexColor(hexColor);

  for (let py = 0; py < pattern.size; py++) {
    const row = pattern.pixels[py];
    for (let px = 0; px < pattern.size; px++) {
      const active = row[px] === 'X';
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const outX = px * scale + sx;
          const outY = py * scale + sy;
          const idx = (outY * outWidth + outX) * 4;
          if (active) {
            data[idx] = rgba.r;
            data[idx + 1] = rgba.g;
            data[idx + 2] = rgba.b;
            data[idx + 3] = 255;
          }
        }
      }
    }
  }

  return { width: outWidth, height: outHeight, data };
}

