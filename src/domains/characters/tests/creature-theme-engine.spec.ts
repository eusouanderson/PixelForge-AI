import { describe, it, expect } from 'vitest';
import {
  parseHexColor,
  generateCreatureTheme
} from '../domain/creature-theme-engine';

describe('CreatureThemeEngine Domain', () => {
  it('parses standard 6-digit hex colors accurately', () => {
    const rgb = parseHexColor('#db2777'); // Rosassauro pink
    expect(rgb).toEqual({ r: 219, g: 39, b: 119 });

    const ignisauroRgb = parseHexColor('#c2410c');
    expect(ignisauroRgb).toEqual({ r: 194, g: 65, b: 12 });
  });

  it('parses 3-digit shorthand hex colors accurately', () => {
    const rgb = parseHexColor('#f0a');
    expect(rgb).toEqual({ r: 255, g: 0, b: 170 });
  });

  it('handles hex without leading hash symbol and trims whitespace', () => {
    const rgb = parseHexColor('  0284c7  ');
    expect(rgb).toEqual({ r: 2, g: 132, b: 199 });
  });

  it('falls back to default cyan/blue on invalid, empty or non-hex inputs', () => {
    const defaultRgb = { r: 2, g: 132, b: 199 };

    expect(parseHexColor('')).toEqual(defaultRgb);
    expect(parseHexColor(null as unknown as string)).toEqual(defaultRgb);
    expect(parseHexColor(undefined as unknown as string)).toEqual(defaultRgb);
    expect(parseHexColor('#xyz')).toEqual(defaultRgb);
    expect(parseHexColor('#12345')).toEqual(defaultRgb);
    expect(parseHexColor('#1234567')).toEqual(defaultRgb);
    expect(parseHexColor('#gg0000')).toEqual(defaultRgb);
  });

  it('generates a complete cohesive creature theme for Rosassauro (pink)', () => {
    const theme = generateCreatureTheme('#db2777', '#f472b6');

    expect(theme.primaryColor).toBe('#db2777');
    expect(theme.highlightColor).toBe('#f472b6');
    expect(theme.rootBackground).toMatch(/^#[0-9a-f]{6}$/i);
    expect(theme.containerBackground).toMatch(/^#[0-9a-f]{6}$/i);
    expect(theme.headerBackground).toMatch(/^#[0-9a-f]{6}$/i);
    expect(theme.cardBackground).toMatch(/^#[0-9a-f]{6}$/i);
    expect(theme.cardDarkBackground).toMatch(/^#[0-9a-f]{6}$/i);
    expect(theme.borderColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(theme.borderSubtleColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(theme.ambientGradient).toContain('radial-gradient');
    expect(theme.accentGlow).toContain('rgba(219, 39, 119');
  });

  it('defaults highlightColor to primaryClean if omitted', () => {
    const theme = generateCreatureTheme('#c2410c');

    expect(theme.primaryColor).toBe('#c2410c');
    expect(theme.highlightColor).toBe('#c2410c');
  });

  it('gracefully handles invalid highlightColor', () => {
    const theme = generateCreatureTheme('#c2410c', 'invalid-hex');

    expect(theme.primaryColor).toBe('#c2410c');
    expect(theme.highlightColor).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
