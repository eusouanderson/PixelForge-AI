export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseHexColor(hexInput: string): RgbaColor {
  let hex = hexInput.trim();
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }

  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return { r, g, b, a: 255 };
  }

  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { r, g, b, a: 255 };
  }

  if (hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = parseInt(hex.slice(6, 8), 16);
    return { r, g, b, a };
  }

  return { r: 0, g: 0, b: 0, a: 0 };
}

export function rgbaToUint32(r: number, g: number, b: number, a: number): number {
  return (((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff)) >>> 0;
}

export function hexToUint32(hex: string): number {
  const { r, g, b, a } = parseHexColor(hex);
  return rgbaToUint32(r, g, b, a);
}

export function uint32ToRgba(value: number): RgbaColor {
  const r = value & 0xff;
  const g = (value >> 8) & 0xff;
  const b = (value >> 16) & 0xff;
  const a = (value >> 24) & 0xff;
  return { r, g, b, a };
}

export function blendUint32Colors(dst: number, src: number, opacity: number): number {
  const srcRgba = uint32ToRgba(src);
  const dstRgba = uint32ToRgba(dst);

  const effectiveAlpha = (srcRgba.a / 255) * Math.max(0, Math.min(1, opacity));
  if (effectiveAlpha <= 0) return dst;
  if (effectiveAlpha >= 1 && dstRgba.a === 0) return src;

  const outA = effectiveAlpha + (dstRgba.a / 255) * (1 - effectiveAlpha);

  const outR = Math.round(
    (srcRgba.r * effectiveAlpha + dstRgba.r * (dstRgba.a / 255) * (1 - effectiveAlpha)) / outA
  );
  const outG = Math.round(
    (srcRgba.g * effectiveAlpha + dstRgba.g * (dstRgba.a / 255) * (1 - effectiveAlpha)) / outA
  );
  const outB = Math.round(
    (srcRgba.b * effectiveAlpha + dstRgba.b * (dstRgba.a / 255) * (1 - effectiveAlpha)) / outA
  );

  return rgbaToUint32(outR, outG, outB, Math.round(outA * 255));
}
