import type { CreatureTheme } from '../types';

interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

const DEFAULT_HEX = '#0284c7';

function toHex(n: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(n)));
  return clamped.toString(16).padStart(2, '0');
}

export function parseHexColor(hex: string): RgbColor {
  if (!hex || typeof hex !== 'string') {
    return parseHexColor(DEFAULT_HEX);
  }

  const cleanHex = hex.trim().replace(/^#/, '');

  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
      return parseHexColor(DEFAULT_HEX);
    }
    return { r, g, b };
  }

  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
      return parseHexColor(DEFAULT_HEX);
    }
    return { r, g, b };
  }

  return parseHexColor(DEFAULT_HEX);
}

export function generateCreatureTheme(
  primaryHex: string,
  highlightHex?: string
): CreatureTheme {
  const rgb = parseHexColor(primaryHex);
  const primaryClean = `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  const highlightClean = highlightHex ? `#${toHex(parseHexColor(highlightHex).r)}${toHex(parseHexColor(highlightHex).g)}${toHex(parseHexColor(highlightHex).b)}` : primaryClean;

  const rootBg = `#${toHex(rgb.r * 0.1 + 3)}${toHex(rgb.g * 0.1 + 3)}${toHex(rgb.b * 0.1 + 5)}`;
  const containerBg = `#${toHex(rgb.r * 0.16 + 6)}${toHex(rgb.g * 0.16 + 6)}${toHex(rgb.b * 0.16 + 10)}`;
  const headerBg = `#${toHex(rgb.r * 0.22 + 8)}${toHex(rgb.g * 0.22 + 8)}${toHex(rgb.b * 0.22 + 14)}`;
  const cardBg = `#${toHex(rgb.r * 0.18 + 8)}${toHex(rgb.g * 0.18 + 8)}${toHex(rgb.b * 0.18 + 12)}`;
  const cardDarkBg = `#${toHex(rgb.r * 0.12 + 4)}${toHex(rgb.g * 0.12 + 4)}${toHex(rgb.b * 0.12 + 7)}`;
  const border = `#${toHex(rgb.r * 0.45 + 24)}${toHex(rgb.g * 0.45 + 24)}${toHex(rgb.b * 0.45 + 32)}`;
  const borderSubtle = `#${toHex(rgb.r * 0.3 + 16)}${toHex(rgb.g * 0.3 + 16)}${toHex(rgb.b * 0.3 + 22)}`;

  const ambientGradient = `radial-gradient(circle at 50% -10%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.28) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08) 50%, transparent 80%)`;
  const accentGlow = `0 0 25px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`;

  return {
    primaryColor: primaryClean,
    highlightColor: highlightClean,
    rootBackground: rootBg,
    containerBackground: containerBg,
    headerBackground: headerBg,
    cardBackground: cardBg,
    cardDarkBackground: cardDarkBg,
    borderColor: border,
    borderSubtleColor: borderSubtle,
    ambientGradient,
    accentGlow
  };
}
