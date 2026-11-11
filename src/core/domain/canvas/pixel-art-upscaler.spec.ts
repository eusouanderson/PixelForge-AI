import { describe, expect, it } from 'vitest';
import { PixelBuffer } from './pixel-buffer';
import { hexToUint32, rgbaToUint32, uint32ToRgba } from './color';
import { hashPixelBuffer, PixelArtUpscaler } from './pixel-art-upscaler';
import { Canvas2dRenderer } from '@/infrastructure/renderer/canvas-2d-renderer';
import {
  stage5BabyIdle1Preset,
  stage6BabyIdle2Preset
} from '@/shared/constants/presets';

function snapshotPixels(buffer: PixelBuffer): number[] {
  return Array.from(buffer.uint32View);
}

function collectUniqueColors(buffer: PixelBuffer): Set<number> {
  const colors = new Set<number>();
  for (let i = 0; i < buffer.uint32View.length; i++) {
    colors.add(buffer.uint32View[i]);
  }
  return colors;
}

describe('PixelArtUpscaler', () => {
  const renderer = new Canvas2dRenderer();

  it('expands 32x32 logical buffer cleanly to 64x64, 96x96, 128x128, 192x192, 256x256, 512x512, and 1024x1024', () => {
    const upscaler = new PixelArtUpscaler();
    const logical = renderer.renderToBuffer(stage5BabyIdle1Preset);
    const originalSnapshot = snapshotPixels(logical);
    const inputColors = collectUniqueColors(logical);

    const expectedSizes = [
      { scale: 2, dim: 64 },
      { scale: 3, dim: 96 },
      { scale: 4, dim: 128 },
      { scale: 6, dim: 192 },
      { scale: 8, dim: 256 },
      { scale: 16, dim: 512 },
      { scale: 32, dim: 1024 }
    ];

    for (const { scale, dim } of expectedSizes) {
      const nn = upscaler.upscaleNearestNeighbor(logical, scale);
      expect(nn.width).toBe(dim);
      expect(nn.height).toBe(dim);
      expect(collectUniqueColors(nn)).toEqual(inputColors);

      const smart = upscaler.upscaleIntelligent(logical, scale);
      expect(smart.width).toBe(dim);
      expect(smart.height).toBe(dim);
      for (const c of collectUniqueColors(smart)) {
        expect(inputColors.has(c)).toBe(true);
      }
    }

    // Input buffer must never be mutated
    expect(snapshotPixels(logical)).toEqual(originalSnapshot);
  });

  it('replicates logical pixels into exact scaled NxN blocks with zero corruption in Nearest-Neighbor', () => {
    const upscaler = new PixelArtUpscaler();
    const src = new PixelBuffer(32, 32);
    const red = hexToUint32('#ef4444');
    const semiBlue = hexToUint32('#3b82f680');
    src.setPixel(10, 10, red);
    src.setPixel(0, 0, semiBlue);

    const cloned = upscaler.upscaleNearestNeighbor(src, 1);
    expect(cloned.width).toBe(32);
    expect(cloned.getPixel(10, 10)).toBe(red);

    const out4x = upscaler.upscaleNearestNeighbor(src, 4);
    expect(out4x.width).toBe(128);
    expect(out4x.height).toBe(128);

    // Logical (10,10) must occupy (40..43, 40..43)
    for (let y = 40; y < 44; y++) {
      for (let x = 40; x < 44; x++) {
        expect(out4x.getPixel(x, y)).toBe(red);
      }
    }
    // Adjacent background pixels remain completely transparent
    expect(out4x.getPixel(39, 40)).toBe(0);
    expect(out4x.getPixel(44, 43)).toBe(0);

    // Semi-transparent color preserved accurately
    expect(out4x.getPixel(3, 3)).toBe(semiBlue);
  });

  it('preserves completely transparent images and isolated 1x1 pixels without loss', () => {
    const upscaler = new PixelArtUpscaler();
    const empty = new PixelBuffer(32, 32);

    for (const algo of ['nearest-neighbor', 'scale2x', 'scale3x', 'intelligent'] as const) {
      const expanded = upscaler.upscale(empty, { scale: 4, algorithm: algo });
      expect(expanded.width).toBe(128);
      expect(expanded.height).toBe(128);
      expect(expanded.uint32View.every((px) => px === 0)).toBe(true);
    }

    const singleDot = new PixelBuffer(32, 32);
    const gold = hexToUint32('#fde047');
    singleDot.setPixel(16, 16, gold);
    singleDot.setPixel(0, 0, gold);
    singleDot.setPixel(31, 31, gold);

    for (const algo of ['nearest-neighbor', 'scale2x', 'scale3x', 'intelligent'] as const) {
      const scale = algo === 'scale3x' ? 3 : 2;
      const expanded = upscaler.upscale(singleDot, { scale, algorithm: algo });
      let goldCount = 0;
      for (let i = 0; i < expanded.uint32View.length; i++) {
        if (expanded.uint32View[i] === gold) goldCount++;
      }
      expect(goldCount).toBe(3 * scale * scale);
    }
  });

  it('refines diagonal staircases in Scale2x and Scale3x while preserving orthogonal strokes and outlines', () => {
    const upscaler = new PixelArtUpscaler();
    const diag = new PixelBuffer(6, 6);
    const outline = hexToUint32('#090d16');
    const body = hexToUint32('#ea580c');

    // Diagonal outline staircase
    diag.setPixel(1, 2, outline);
    diag.setPixel(2, 1, outline);
    diag.setPixel(2, 2, body);
    diag.setPixel(3, 2, body);
    diag.setPixel(2, 3, body);
    // Horizontal bar at y=4
    diag.setPixel(1, 4, outline);
    diag.setPixel(2, 4, outline);
    diag.setPixel(3, 4, outline);

    const s2 = upscaler.upscaleScale2x(diag);
    expect(s2.width).toBe(12);
    expect(s2.height).toBe(12);
    // All output colors stay within input palette (no interpolation!)
    const allowed = collectUniqueColors(diag);
    for (const c of collectUniqueColors(s2)) {
      expect(allowed.has(c)).toBe(true);
    }
    // Outer pure transparent corners stay transparent
    expect(s2.getPixel(0, 0)).toBe(0);
    expect(s2.getPixel(11, 11)).toBe(0);

    const s3 = upscaler.upscaleScale3x(diag);
    expect(s3.width).toBe(18);
    expect(s3.height).toBe(18);
    for (const c of collectUniqueColors(s3)) {
      expect(allowed.has(c)).toBe(true);
    }
    expect(s3.getPixel(0, 0)).toBe(0);

    // Explicit mode combinations including non-multiple scales
    expect(upscaler.upscale(diag, { scale: 1, algorithm: 'intelligent' }).width).toBe(6);
    expect(upscaler.upscale(diag, { scale: 5, algorithm: 'intelligent' }).width).toBe(30);
    expect(upscaler.upscale(diag, { scale: 3, algorithm: 'scale2x' }).width).toBe(18);
    expect(upscaler.upscale(diag, { scale: 2, algorithm: 'scale3x' }).width).toBe(12);
  });

  it('applies optional enhanceDetails without touching transparent pixels, outlines, or mutating source', () => {
    const upscaler = new PixelArtUpscaler();
    const logical = new PixelBuffer(4, 4);
    const darkOutline = rgbaToUint32(10, 10, 10, 255);
    const orange = rgbaToUint32(200, 100, 40, 255);
    // Center 2x2 orange square bordered on top/bottom/sides by outline & transparent corner (0,0)
    logical.setPixel(1, 0, darkOutline);
    logical.setPixel(2, 0, darkOutline);
    logical.setPixel(1, 1, orange);
    logical.setPixel(2, 1, orange);
    logical.setPixel(1, 2, orange);
    logical.setPixel(2, 2, orange);
    logical.setPixel(1, 3, darkOutline);
    logical.setPixel(2, 3, darkOutline);

    const expanded = upscaler.upscaleNearestNeighbor(logical, 2); // 8x8
    const expandedSnap = snapshotPixels(expanded);

    // Disabled returns exact copy
    const disabled = upscaler.enhanceDetails(expanded, { enabled: false });
    expect(snapshotPixels(disabled)).toEqual(expandedSnap);

    // Strength 0 or tiny 1x1 buffer returns unchanged clone
    expect(snapshotPixels(upscaler.enhanceDetails(expanded, { enabled: true, shadingStrength: 0 }))).toEqual(
      expandedSnap
    );
    const tiny = new PixelBuffer(1, 1);
    tiny.setPixel(0, 0, orange);
    expect(upscaler.enhanceDetails(tiny, { enabled: true }).getPixel(0, 0)).toBe(orange);

    const enhanced = upscaler.enhanceDetails(expanded, {
      enabled: true,
      shadingStrength: 14,
      outlinePreservation: true
    });

    // Source never mutated
    expect(snapshotPixels(expanded)).toEqual(expandedSnap);

    // Transparent pixels MUST remain 0
    for (let i = 0; i < expanded.uint32View.length; i++) {
      if (expanded.uint32View[i] === 0) {
        expect(enhanced.uint32View[i]).toBe(0);
      }
    }

    // Dark outline preserved when outlinePreservation is true
    expect(enhanced.getPixel(2, 0)).toBe(darkOutline);

    // Interior top sub-edge highlights cleanly, bottom sub-edge deepens cleanly
    const topOrange = uint32ToRgba(enhanced.getPixel(3, 2));
    const bottomOrange = uint32ToRgba(enhanced.getPixel(3, 5));
    expect(topOrange.r).toBeGreaterThan(200);
    expect(bottomOrange.r).toBeLessThan(200);

    // With outlinePreservation disabled, dark outline edges also receive bevel contrast
    const unpreserved = upscaler.enhanceDetails(expanded, {
      enabled: true,
      shadingStrength: 10,
      outlinePreservation: false
    });
    expect(unpreserved.getPixel(2, 0)).not.toBe(darkOutline);

    // Opaque pixel blocks sitting directly on left/right/top/bottom canvas boundaries
    const borderBlock = new PixelBuffer(4, 4);
    for (let by = 0; by < 4; by++) {
      for (let bx = 0; bx < 4; bx++) {
        borderBlock.setPixel(bx, by, orange);
      }
    }
    const enhancedBorder = upscaler.enhanceDetails(borderBlock, {
      enabled: true,
      shadingStrength: 10
    });
    expect(enhancedBorder.width).toBe(4);
    expect(enhancedBorder.getPixel(0, 0)).toBe(orange);
    expect(enhancedBorder.getPixel(3, 3)).toBe(orange);
  });

  it('resizes to arbitrary target dimensions and supports consistent multi-frame animations', () => {
    const upscaler = new PixelArtUpscaler();
    const frame1 = renderer.renderToBuffer(stage5BabyIdle1Preset);
    const frame2 = renderer.renderToBuffer(stage6BabyIdle2Preset);

    expect(upscaler.resizeToDimensions(frame1, 32, 32).width).toBe(32);
    expect(upscaler.resizeToDimensions(frame1, 128, 128, 'nearest-neighbor').width).toBe(128);
    expect(upscaler.resizeToDimensions(frame1, 128, 128, 'intelligent').height).toBe(128);

    // Non-square / non-integer dimensions with and without intelligent pre-scale
    const nonMultipleNn = upscaler.resizeToDimensions(frame1, 50, 70, 'nearest-neighbor');
    expect(nonMultipleNn.width).toBe(50);
    expect(nonMultipleNn.height).toBe(70);

    const nonMultipleSmart = upscaler.resizeToDimensions(frame1, 70, 90, 'scale2x');
    expect(nonMultipleSmart.width).toBe(70);
    expect(nonMultipleSmart.height).toBe(90);

    const nonMultipleScale3 = upscaler.resizeToDimensions(frame1, 100, 110, 'scale3x');
    expect(nonMultipleScale3.width).toBe(100);
    expect(nonMultipleScale3.height).toBe(110);

    // Consistent multi-frame dimensions & distinct frame hashes
    const up1 = upscaler.upscale(frame1, {
      scale: 4,
      algorithm: 'intelligent',
      detailEnhancement: { enabled: true }
    }, hashPixelBuffer(frame1));
    const up2 = upscaler.upscale(frame2, {
      scale: 4,
      algorithm: 'intelligent',
      detailEnhancement: { enabled: true }
    }, hashPixelBuffer(frame2));
    expect(up1.width).toBe(128);
    expect(up2.width).toBe(128);
    expect(hashPixelBuffer(up1)).not.toBe(hashPixelBuffer(up2));
  });

  it('caches results with bounded LRU eviction and explicit resize target options', () => {
    const upscaler = new PixelArtUpscaler(2);
    const b1 = new PixelBuffer(4, 4);
    b1.setPixel(0, 0, hexToUint32('#ff0000'));
    const b2 = new PixelBuffer(4, 4);
    b2.setPixel(0, 0, hexToUint32('#00ff00'));
    const b3 = new PixelBuffer(4, 4);
    b3.setPixel(0, 0, hexToUint32('#0000ff'));

    const res1a = upscaler.upscale(
      b1,
      { targetWidth: 8, targetHeight: 8, algorithm: 'nearest-neighbor' },
      'k1'
    );
    const res1b = upscaler.upscale(
      b1,
      { targetWidth: 8, targetHeight: 8, algorithm: 'nearest-neighbor' },
      'k1'
    );
    expect(res1b).toBe(res1a);
    expect(upscaler.getCacheSize()).toBe(1);

    upscaler.upscale(b2, { scale: 2 }, 'k2');
    upscaler.upscale(b3, { scale: 2 }, 'k3');
    expect(upscaler.getCacheSize()).toBe(2);

    upscaler.clearCache();
    expect(upscaler.getCacheSize()).toBe(0);

    const noCache = new PixelArtUpscaler(0);
    noCache.upscale(b1, { scale: 2 }, 'k1');
    expect(noCache.getCacheSize()).toBe(0);
  });
});
