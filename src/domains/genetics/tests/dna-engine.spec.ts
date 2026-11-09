import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculatePhenotype,
  createGenesisGenome,
  generateGenomeId,
  interpolateHexColors,
  parseHexColor,
  rgbToHex
} from '../domain/dna-engine';
import type { GeneAlleles, VisualAlleles } from '../types';

describe('Genetics: DNA Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates a valid UUID string using crypto.randomUUID or fallback', () => {
    const id1 = generateGenomeId();
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    // Mock when randomUUID is undefined but getRandomValues is available
    const originalRandomUUID = globalThis.crypto?.randomUUID;
    if (globalThis.crypto) {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        value: undefined,
        configurable: true
      });
    }

    const id2 = generateGenomeId();
    expect(id2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    // Mock when getRandomValues is also undefined (fallback to Math.random)
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      configurable: true
    });

    const id3 = generateGenomeId();
    expect(id3).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    // Restore
    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      configurable: true
    });
    if (globalThis.crypto && originalRandomUUID) {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        value: originalRandomUUID,
        configurable: true
      });
    }
  });

  it('parses 3-char and 6-char hex colors and handles padding', () => {
    expect(parseHexColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHexColor('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(parseHexColor('ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseHexColor('#ab')).toEqual({ r: 171, g: 0, b: 0 });
  });

  it('clamps RGB values properly in rgbToHex', () => {
    expect(rgbToHex(-10, 300, 128)).toBe('#00ff80');
  });

  it('interpolates colors correctly', () => {
    const blended = interpolateHexColors('#000000', '#ffffff', 0.5);
    expect(blended).toBe('#808080');

    const blendedDefault = interpolateHexColors('#ff0000', '#0000ff');
    expect(blendedDefault).toBe('#800080');
  });

  it('calculates phenotype with dominant and recessive visual alleles and mutations', () => {
    const alleles: GeneAlleles = {
      strength: { maternal: 20, paternal: 10 },
      defense: { maternal: 15, paternal: 15 },
      agility: { maternal: 12, paternal: 14 },
      intelligence: { maternal: 8, paternal: 10 },
      endurance: { maternal: 16, paternal: 14 },
      elementalAffinity: { maternal: 18, paternal: 18 }
    };

    const appearance: VisualAlleles = {
      primaryColor: { dominant: '#ff0000', recessive: '#00ff00', expressDominant: false },
      bellyColor: { dominant: '#ffff00', recessive: '#ffffaa', expressDominant: false },
      crestColor: { dominant: '#0000ff', recessive: '#000088', expressDominant: false },
      eyeColor: { dominant: '#ffffff', recessive: '#aaaaaa', expressDominant: false },
      pattern: 'striped',
      bodyScale: 1.1
    };

    const phenotype = calculatePhenotype(alleles, appearance, 'fire', [
      {
        trait: 'strength',
        previousValue: 15,
        mutatedValue: 5,
        rarity: 'rare',
        multiplier: 1.2,
        description: 'Bônus de mutação numérico'
      },
      {
        trait: 'defense',
        previousValue: 15,
        mutatedValue: 'non_numeric',
        rarity: 'rare',
        multiplier: 1.0,
        description: 'Mutação não numérica'
      }
    ]);

    expect(phenotype.attributes.strength).toBe(20); // (20+10)/2 = 15 + 5
    expect(phenotype.attributes.defense).toBe(15);
    expect(phenotype.colors.base).toBe('#00ff00');
    expect(phenotype.colors.belly).toBe('#ffffaa');
    expect(phenotype.colors.crest).toBe('#000088');
    expect(phenotype.colors.eye).toBe('#aaaaaa');
    expect(phenotype.pattern).toBe('striped');
    expect(phenotype.scale).toBe(1.1);
    expect(phenotype.dominantElement).toBe('fire');
  });

  it('creates genesis generation 1 genome for species', () => {
    const genome = createGenesisGenome('ignisauro', 'male', 1000, 'custom-uuid-1');
    expect(genome.genomeId).toBe('custom-uuid-1');
    expect(genome.generation).toBe(1);
    expect(genome.species).toBe('ignisauro');
    expect(genome.sex).toBe('male');
    expect(genome.parents).toBeNull();
    expect(genome.mutations).toHaveLength(0);
    expect(genome.phenotype.dominantElement).toBe('fire');
    expect(genome.createdAtMs).toBe(1000);

    const autoIdGenome = createGenesisGenome('glacissauro', 'female', 2000);
    expect(autoIdGenome.genomeId).toBeDefined();
    expect(autoIdGenome.generation).toBe(1);
  });
});
