import { PixelBuffer } from './pixel-buffer';
import { rgbaToUint32, uint32ToRgba } from './color';
import type {
  DetailEnhancementOptions,
  UpscaleRenderOptions,
  UpscalingAlgorithm
} from '../pixel-art/interfaces';

const DEFAULT_CACHE_LIMIT = 64;
const DEFAULT_SHADING_STRENGTH = 12;
const OUTLINE_LUMA_THRESHOLD = 52;

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function samplePixel(
  view: Uint32Array,
  width: number,
  height: number,
  x: number,
  y: number
): number {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return 0;
  }
  return view[y * width + x];
}

function adjustChannel(channel: number, delta: number): number {
  return clampInt(Math.round(channel + delta), 0, 255);
}

/**
 * Computes a deterministic 32-bit FNV-1a fingerprint over a PixelBuffer's pixels and dimensions.
 */
export function hashPixelBuffer(buffer: PixelBuffer): string {
  let hash = 0x811c9dc5;
  const view = buffer.uint32View;
  for (let i = 0; i < view.length; i++) {
    hash ^= view[i];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${buffer.width}x${buffer.height}:${hash.toString(16)}`;
}

/**
 * Deterministic pixel-art upscaler decoupled from LLM generation and scene renderers.
 * Supports lossless Nearest-Neighbor replication, EPX/Scale2x, Scale3x, adaptive intelligent
 * scaling, arbitrary dimension resizing, optional sub-pixel detail enhancement, and LRU caching.
 */
export class PixelArtUpscaler {
  private readonly maxCacheEntries: number;
  private readonly cache = new Map<string, PixelBuffer>();

  constructor(maxCacheEntries: number = DEFAULT_CACHE_LIMIT) {
    this.maxCacheEntries = Math.max(0, Math.floor(maxCacheEntries));
  }

  public getCacheSize(): number {
    return this.cache.size;
  }

  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Lossless integer pixel replication (Nearest-Neighbor).
   * Preserves exact palette colors, alpha transparency, and silhouette without mutating input.
   */
  public upscaleNearestNeighbor(buffer: PixelBuffer, scale: number): PixelBuffer {
    const s = Math.max(1, Math.floor(scale));
    if (s === 1) {
      return buffer.clone();
    }

    const srcW = buffer.width;
    const srcH = buffer.height;
    const dstW = srcW * s;
    const out = new PixelBuffer(dstW, srcH * s);
    const src = buffer.uint32View;
    const dst = out.uint32View;

    for (let y = 0; y < srcH; y++) {
      const srcRowOffset = y * srcW;
      const dstBaseY = y * s;
      for (let x = 0; x < srcW; x++) {
        const pixel = src[srcRowOffset + x];
        if (pixel === 0) continue;
        const dstBaseX = x * s;
        for (let sy = 0; sy < s; sy++) {
          const rowStart = (dstBaseY + sy) * dstW + dstBaseX;
          for (let sx = 0; sx < s; sx++) {
            dst[rowStart + sx] = pixel;
          }
        }
      }
    }

    return out;
  }

  /**
   * AdvanceMAME EPX / Scale2x: expands 1x -> 2x refining 45-degree diagonal staircases
   * using strictly existing palette colors while keeping orthogonal edges, outlines, and alpha intact.
   */
  public upscaleScale2x(buffer: PixelBuffer): PixelBuffer {
    const w = buffer.width;
    const h = buffer.height;
    const outW = w * 2;
    const out = new PixelBuffer(outW, h * 2);
    const src = buffer.uint32View;
    const dst = out.uint32View;

    for (let y = 0; y < h; y++) {
      const row0 = y * 2 * outW;
      const row1 = row0 + outW;
      for (let x = 0; x < w; x++) {
        const p = src[y * w + x];
        const n = samplePixel(src, w, h, x, y - 1);
        const s = samplePixel(src, w, h, x, y + 1);
        const wPx = samplePixel(src, w, h, x - 1, y);
        const ePx = samplePixel(src, w, h, x + 1, y);

        let e0 = p;
        let e1 = p;
        let e2 = p;
        let e3 = p;

        if (n !== s && wPx !== ePx) {
          e0 = wPx === n ? wPx : p;
          e1 = n === ePx ? ePx : p;
          e2 = wPx === s ? wPx : p;
          e3 = s === ePx ? ePx : p;
        }

        const outX = x * 2;
        dst[row0 + outX] = e0;
        dst[row0 + outX + 1] = e1;
        dst[row1 + outX] = e2;
        dst[row1 + outX + 1] = e3;
      }
    }

    return out;
  }

  /**
   * AdvanceMAME Scale3x: expands 1x -> 3x by analyzing the 3x3 pixel neighborhood
   * without introducing blurred or interpolated intermediate colors.
   */
  public upscaleScale3x(buffer: PixelBuffer): PixelBuffer {
    const w = buffer.width;
    const h = buffer.height;
    const outW = w * 3;
    const out = new PixelBuffer(outW, h * 3);
    const src = buffer.uint32View;
    const dst = out.uint32View;

    for (let y = 0; y < h; y++) {
      const r0 = y * 3 * outW;
      const r1 = r0 + outW;
      const r2 = r1 + outW;
      for (let x = 0; x < w; x++) {
        const a = samplePixel(src, w, h, x - 1, y - 1);
        const b = samplePixel(src, w, h, x, y - 1);
        const c = samplePixel(src, w, h, x + 1, y - 1);
        const d = samplePixel(src, w, h, x - 1, y);
        const e = src[y * w + x];
        const f = samplePixel(src, w, h, x + 1, y);
        const g = samplePixel(src, w, h, x - 1, y + 1);
        const hPx = samplePixel(src, w, h, x, y + 1);
        const i = samplePixel(src, w, h, x + 1, y + 1);

        let e0 = e;
        let e1 = e;
        let e2 = e;
        let e3 = e;
        const e4 = e;
        let e5 = e;
        let e6 = e;
        let e7 = e;
        let e8 = e;

        if (b !== hPx && d !== f) {
          e0 = d === b ? d : e;
          e1 = (d === b && e !== c) || (b === f && e !== a) ? b : e;
          e2 = b === f ? f : e;
          e3 = (d === b && e !== g) || (d === hPx && e !== a) ? d : e;
          e5 = (b === f && e !== i) || (hPx === f && e !== c) ? f : e;
          e6 = d === hPx ? d : e;
          e7 = (d === hPx && e !== i) || (hPx === f && e !== g) ? hPx : e;
          e8 = hPx === f ? f : e;
        }

        const outX = x * 3;
        dst[r0 + outX] = e0;
        dst[r0 + outX + 1] = e1;
        dst[r0 + outX + 2] = e2;
        dst[r1 + outX] = e3;
        dst[r1 + outX + 1] = e4;
        dst[r1 + outX + 2] = e5;
        dst[r2 + outX] = e6;
        dst[r2 + outX + 1] = e7;
        dst[r2 + outX + 2] = e8;
      }
    }

    return out;
  }

  /**
   * Composes Scale3x / Scale2x diagonal-refinement passes (capped at 2 curve passes to avoid
   * over-rounding retro pixel art and keep high-scale CPU cost bounded) followed by crisp NN replication.
   */
  public upscaleIntelligent(buffer: PixelBuffer, scale: number): PixelBuffer {
    return this.composeScalePasses(buffer, scale, 'intelligent');
  }

  private composeScalePasses(
    buffer: PixelBuffer,
    scale: number,
    mode: 'scale2x' | 'scale3x' | 'intelligent'
  ): PixelBuffer {
    const targetScale = Math.max(1, Math.floor(scale));
    if (targetScale === 1) {
      return buffer.clone();
    }

    let current = buffer;
    let remaining = targetScale;
    let passes = 0;

    while (remaining >= 2 && passes < 2) {
      if ((mode === 'scale3x' || mode === 'intelligent') && remaining % 3 === 0) {
        current = this.upscaleScale3x(current);
        remaining /= 3;
        passes++;
      } else if ((mode === 'scale2x' || mode === 'intelligent') && remaining % 2 === 0) {
        current = this.upscaleScale2x(current);
        remaining /= 2;
        passes++;
      } else {
        break;
      }
    }

    if (remaining > 1) {
      current = this.upscaleNearestNeighbor(current, remaining);
    }

    return current;
  }

  /**
   * Optional deterministic micro-shading enhancer applied on an already expanded PixelBuffer.
   * Never mutates the input buffer, never paints into alpha=0 pixels, and protects dark outlines.
   */
  public enhanceDetails(
    buffer: PixelBuffer,
    options: Partial<DetailEnhancementOptions> = {}
  ): PixelBuffer {
    if (options.enabled === false) {
      return buffer.clone();
    }

    const strength = clampInt(
      Math.round(options.shadingStrength ?? DEFAULT_SHADING_STRENGTH),
      0,
      32
    );
    const preserveOutlines = options.outlinePreservation ?? true;
    const out = buffer.clone();
    const w = buffer.width;
    const h = buffer.height;

    if (strength === 0 || w < 2 || h < 2) {
      return out;
    }

    const src = buffer.uint32View;
    const dst = out.uint32View;
    const sideDelta = Math.round(strength * 0.5);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const p = src[idx];
        const rgba = uint32ToRgba(p);
        if (rgba.a === 0) continue;

        const luma = (rgba.r * 299 + rgba.g * 587 + rgba.b * 114) / 1000;
        if (preserveOutlines && luma < OUTLINE_LUMA_THRESHOLD) continue;

        const up = y > 0 ? src[(y - 1) * w + x] : p;
        const down = y < h - 1 ? src[(y + 1) * w + x] : p;
        const left = x > 0 ? src[y * w + (x - 1)] : p;
        const right = x < w - 1 ? src[y * w + (x + 1)] : p;

        let delta = 0;
        if (up !== p && down === p) delta += strength;
        if (down !== p && up === p) delta -= strength;
        if (left !== p && right === p) delta += sideDelta;
        if (right !== p && left === p) delta -= sideDelta;

        if (delta !== 0) {
          dst[idx] = rgbaToUint32(
            adjustChannel(rgba.r, delta),
            adjustChannel(rgba.g, delta),
            adjustChannel(rgba.b, delta),
            rgba.a
          );
        }
      }
    }

    return out;
  }

  /**
   * Resizes a PixelBuffer to explicit pixel dimensions using discrete nearest-neighbor grid sampling,
   * optionally applying an intelligent pre-expansion pass when scaling up by >= 2x.
   */
  public resizeToDimensions(
    buffer: PixelBuffer,
    targetWidth: number,
    targetHeight: number,
    algorithm: UpscalingAlgorithm = 'nearest-neighbor'
  ): PixelBuffer {
    const outW = Math.max(1, Math.floor(targetWidth));
    const outH = Math.max(1, Math.floor(targetHeight));

    if (outW === buffer.width && outH === buffer.height) {
      return buffer.clone();
    }

    const scaleX = outW / buffer.width;
    const scaleY = outH / buffer.height;
    if (scaleX === scaleY && Number.isInteger(scaleX) && scaleX >= 2) {
      return algorithm === 'nearest-neighbor'
        ? this.upscaleNearestNeighbor(buffer, scaleX)
        : this.composeScalePasses(buffer, scaleX, algorithm);
    }

    const minRatio = Math.min(scaleX, scaleY);
    let working = buffer;
    if (algorithm !== 'nearest-neighbor' && minRatio >= 2) {
      const preScale = algorithm === 'scale3x' && minRatio >= 3 ? 3 : 2;
      working =
        preScale === 3 ? this.upscaleScale3x(buffer) : this.upscaleScale2x(buffer);
    }

    const out = new PixelBuffer(outW, outH);
    const src = working.uint32View;
    const dst = out.uint32View;
    const srcW = working.width;
    const srcH = working.height;

    for (let y = 0; y < outH; y++) {
      const srcY = Math.floor((y * srcH) / outH);
      const srcRowOffset = srcY * srcW;
      const dstRowOffset = y * outW;
      for (let x = 0; x < outW; x++) {
        const srcX = Math.floor((x * srcW) / outW);
        dst[dstRowOffset + x] = src[srcRowOffset + srcX];
      }
    }

    return out;
  }

  /**
   * Unified entry point used by renderers. Applies selected algorithm + optional detail enhancement,
   * reusing a bounded LRU cache whenever cacheKey is supplied.
   */
  public upscale(
    buffer: PixelBuffer,
    options: UpscaleRenderOptions = {},
    cacheKey?: string
  ): PixelBuffer {
    const algorithm: UpscalingAlgorithm = options.algorithm ?? 'nearest-neighbor';
    const scale = Math.max(1, Math.floor(options.scale ?? 1));
    const enhancement = options.detailEnhancement;
    const targetSize =
      options.targetWidth !== undefined && options.targetHeight !== undefined
        ? {
            width: Math.max(1, Math.floor(options.targetWidth)),
            height: Math.max(1, Math.floor(options.targetHeight))
          }
        : undefined;

    const enhanceSig = enhancement?.enabled
      ? `1:${enhancement.shadingStrength ?? DEFAULT_SHADING_STRENGTH}:${enhancement.outlinePreservation ?? true}`
      : '0';

    const fullKey =
      cacheKey !== undefined && this.maxCacheEntries > 0
        ? `${cacheKey}|${algorithm}|${scale}|${targetSize ? `${targetSize.width}x${targetSize.height}` : ''}|${enhanceSig}`
        : undefined;

    if (fullKey !== undefined) {
      const cached = this.cache.get(fullKey);
      if (cached) {
        this.cache.delete(fullKey);
        this.cache.set(fullKey, cached);
        return cached;
      }
    }

    let result: PixelBuffer;
    if (targetSize) {
      result = this.resizeToDimensions(buffer, targetSize.width, targetSize.height, algorithm);
    } else if (algorithm === 'nearest-neighbor') {
      result = this.upscaleNearestNeighbor(buffer, scale);
    } else {
      result = this.composeScalePasses(buffer, scale, algorithm);
    }

    if (enhancement?.enabled) {
      result = this.enhanceDetails(result, enhancement);
    }

    if (fullKey !== undefined) {
      if (this.cache.size >= this.maxCacheEntries) {
        const oldest = this.cache.keys().next();
        this.cache.delete(String(oldest.value));
      }
      this.cache.set(fullKey, result);
    }

    return result;
  }
}
