import type { DeclarativePixelArt } from '@/core/domain/pixel-art/interfaces';
import type { ElementAffinity } from '@/domains/characters/types';
import type { EnvironmentBackdropConfig } from '@/domains/environments/types';
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

interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

function lerpRgba(c1: RgbaColor, c2: RgbaColor, t: number): RgbaColor {
  const clampedT = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * clampedT),
    g: Math.round(c1.g + (c2.g - c1.g) * clampedT),
    b: Math.round(c1.b + (c2.b - c1.b) * clampedT),
    a: Math.round(c1.a + (c2.a - c1.a) * clampedT)
  };
}

export function rasterizeBackdropToRgbaBytes(
  config: EnvironmentBackdropConfig,
  width: number = 128,
  height: number = 64
): RawRgbaTextureData {
  const data = new Uint8Array(width * height * 4);
  const skyTop = parseHexColor(config.skyTopColorHex);
  const skyBottom = parseHexColor(config.skyBottomColorHex);
  const horizonColor = parseHexColor(config.horizonColorHex);
  const mountainColor = parseHexColor(config.mountainColorHex);
  const mountainHighlight = parseHexColor(config.mountainHighlightHex);
  const celestialColor = parseHexColor(config.celestialColorHex);

  for (let y = 0; y < height; y++) {
    // WebGL Texture Coordinate Y = 0 is bottom, flip so y = 0 is sky top
    const renderY = height - 1 - y;

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Base: Retro Pixel Art Sky Gradient with 2x2 Dither
      const dither = (x + renderY) % 2 === 0 ? 0.05 : -0.05;
      const skyFactor = Math.min(1, renderY / 40 + dither);
      let pixelColor = lerpRgba(skyTop, skyBottom, skyFactor);

      // Celestial Features
      if (config.celestialKind === 'eclipse') {
        const dx = x - 64;
        const dy = renderY - 18;
        const distSq = dx * dx + dy * dy;
        if (distSq <= 121) {
          if (distSq <= 36) {
            pixelColor = { r: 5, g: 5, b: 8, a: 255 };
          } else {
            const glow = 1 - (Math.sqrt(distSq) - 6) / 5;
            pixelColor = lerpRgba(pixelColor, celestialColor, glow);
          }
        }
      } else if (config.celestialKind === 'aurora') {
        const wave1 = 14 + Math.sin(x * 0.09) * 4;
        const wave2 = 20 + Math.cos(x * 0.12) * 3;
        if (Math.abs(renderY - wave1) <= 2.5 || Math.abs(renderY - wave2) <= 2) {
          pixelColor = lerpRgba(pixelColor, celestialColor, 0.75);
        }
      } else if (config.celestialKind === 'sun') {
        const dx = x - 64;
        const dy = renderY - 16;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= 8) {
          pixelColor = celestialColor;
        } else if (dist <= 16 && (Math.abs(dx) === Math.abs(dy) || dx === 0 || dy === 0)) {
          pixelColor = lerpRgba(pixelColor, celestialColor, 0.5);
        }
      } else if (config.celestialKind === 'moon') {
        const dx = x - 92;
        const dy = renderY - 14;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= 7) {
          const isShadow = dx - dy > 2;
          pixelColor = isShadow ? lerpRgba(celestialColor, skyTop, 0.6) : celestialColor;
        }
      } else if (config.celestialKind === 'clouds') {
        const cloudBand = 18 + Math.sin(x * 0.15) * 3 + Math.cos(x * 0.3) * 2;
        if (Math.abs(renderY - cloudBand) <= 3) {
          pixelColor = lerpRgba(pixelColor, celestialColor, 0.7);
        }
      } else {
        const star = (x * 41 + renderY * 19) % 37 === 0 && renderY < 32;
        if (star) {
          pixelColor = celestialColor;
        } else if (renderY >= 12 && renderY <= 24 && (x + renderY) % 3 === 0) {
          pixelColor = lerpRgba(pixelColor, celestialColor, 0.35);
        }
      }

      // Distant 2.5D Mountain Peaks
      const mountainY = Math.floor(36 + Math.sin(x * 0.08) * 8 + Math.cos(x * 0.2 + 1) * 4);
      if (renderY >= mountainY && renderY < 54) {
        const isRidgePeak = renderY === mountainY || ((x + renderY) % 4 === 0 && renderY <= mountainY + 2);
        pixelColor = isRidgePeak ? mountainHighlight : mountainColor;
      }

      // Horizon Glow / Ground Transition
      if (renderY >= 50) {
        const groundFactor = (renderY - 50) / 14;
        pixelColor = lerpRgba(pixelColor, horizonColor, groundFactor * 0.85);
      }

      data[idx] = pixelColor.r;
      data[idx + 1] = pixelColor.g;
      data[idx + 2] = pixelColor.b;
      data[idx + 3] = 255;
    }
  }

  return { width, height, data };
}

export function rasterizePedestalToRgbaBytes(
  pedestalHex: string,
  accentHex: string,
  element: ElementAffinity,
  size: number = 64
): RawRgbaTextureData {
  const data = new Uint8Array(size * size * 4);
  const baseColor = parseHexColor(pedestalHex);
  const accentColor = parseHexColor(accentHex);
  const half = size / 2;
  const maxR = half - 2;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = (py * size + px) * 4;
      const dx = px - half;
      const dy = py - half;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > maxR) {
        // Outside circle
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
        continue;
      }

      let color = baseColor;

      // Outer Bevel Rim
      if (dist >= maxR - 3) {
        color = lerpRgba(baseColor, { r: 0, g: 0, b: 0, a: 255 }, 0.4);
      } else if (dist >= maxR - 7 && dist < maxR - 3) {
        // Elemental Accent Ring
        color = accentColor;
      } else if (dist <= 10) {
        // Central Elemental Rune Glyph
        const inFlame = element === 'fire' && (Math.abs(dx) <= (10 - dy) / 2 && dy >= -8 && dy <= 8);
        const inIce = element === 'ice' && (Math.abs(dx) <= 1 || Math.abs(dy) <= 1 || Math.abs(dx) === Math.abs(dy));
        const inElectric = element === 'electric' && (Math.abs(dx + dy * 0.5) <= 1.5 && Math.abs(dy) <= 7);
        const inPoison = element === 'poison' && (dist <= 5 || (Math.abs(dx) <= 2 && dy >= 0 && dy <= 7));
        const inEarth = element === 'earth' && (Math.abs(dx) + Math.abs(dy) <= 7);
        const inAir = element === 'air' && (Math.abs(dy - Math.sin(dx * 0.5) * 2) <= 1.5 && Math.abs(dx) <= 8);
        const inShadow = element === 'shadow' && (dist <= 6 && (dx < 0 || dist > 3));
        const inLight = element === 'light' && (dist <= 4 || (Math.abs(dx) <= 1 && Math.abs(dy) <= 8) || (Math.abs(dy) <= 1 && Math.abs(dx) <= 8));

        if (inFlame || inIce || inElectric || inPoison || inEarth || inAir || inShadow || inLight) {
          color = accentColor;
        }
      }

      data[idx] = color.r;
      data[idx + 1] = color.g;
      data[idx + 2] = color.b;
      data[idx + 3] = 255;
    }
  }

  return { width: size, height: size, data };
}
