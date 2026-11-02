import { describe, it, expect } from 'vitest';
import {
  parseHexColor,
  rgbaToUint32,
  hexToUint32,
  uint32ToRgba,
  blendUint32Colors
} from './color';

describe('color utils', () => {
  it('parses 3-digit hex colors', () => {
    const rgba = parseHexColor('#fff');
    expect(rgba).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  });

  it('parses 6-digit hex colors without leading hash', () => {
    const rgba = parseHexColor('10b981');
    expect(rgba).toEqual({ r: 16, g: 185, b: 129, a: 255 });
  });

  it('parses 8-digit hex colors with alpha', () => {
    const rgba = parseHexColor('#10b98180');
    expect(rgba).toEqual({ r: 16, g: 185, b: 129, a: 128 });
  });

  it('handles invalid hex gracefully', () => {
    const rgba = parseHexColor('invalid');
    expect(rgba).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it('converts rgba to uint32 and back', () => {
    const uint32 = rgbaToUint32(100, 150, 200, 255);
    const parsed = uint32ToRgba(uint32);
    expect(parsed).toEqual({ r: 100, g: 150, b: 200, a: 255 });
  });

  it('converts hex string directly to uint32', () => {
    const uint32 = hexToUint32('#ffffff');
    expect(uint32ToRgba(uint32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  });

  it('blends colors with full opacity', () => {
    const dst = hexToUint32('#00000000');
    const src = hexToUint32('#ff0000');
    const result = blendUint32Colors(dst, src, 1);
    expect(result).toBe(src);
  });

  it('returns destination color when opacity is zero', () => {
    const dst = hexToUint32('#00ff00');
    const src = hexToUint32('#ff0000');
    const result = blendUint32Colors(dst, src, 0);
    expect(result).toBe(dst);
  });

  it('blends colors with intermediate opacity', () => {
    const dst = hexToUint32('#000000');
    const src = hexToUint32('#ffffff');
    const result = blendUint32Colors(dst, src, 0.5);
    const rgba = uint32ToRgba(result);
    expect(rgba.r).toBeGreaterThan(100);
    expect(rgba.r).toBeLessThan(150);
  });
});

