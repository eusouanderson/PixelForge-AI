import { describe, it, expect } from 'vitest';
import {
  determineBiologicalSex,
  deterministicSexFromSeed,
  formatBiologicalSexLabel,
  formatBiologicalSexSymbol
} from '../domain/sex-determination-engine';

describe('Genetics: Sex Determination Engine', () => {
  it('determines biological sex with provided random value', () => {
    expect(determineBiologicalSex(0.1)).toBe('male');
    expect(determineBiologicalSex(0.49)).toBe('male');
    expect(determineBiologicalSex(0.5)).toBe('female');
    expect(determineBiologicalSex(0.99)).toBe('female');
  });

  it('determines biological sex without args using Math.random', () => {
    const sex = determineBiologicalSex();
    expect(['male', 'female']).toContain(sex);
  });

  it('produces deterministic sex from seed string', () => {
    const sex1 = deterministicSexFromSeed('ignisauro-genesis-seed');
    const sex2 = deterministicSexFromSeed('ignisauro-genesis-seed');
    expect(sex1).toBe(sex2);

    const sexDifferent = deterministicSexFromSeed('seed-alpha-1234');
    expect(['male', 'female']).toContain(sexDifferent);
  });

  it('formats labels and symbols correctly', () => {
    expect(formatBiologicalSexLabel('male')).toBe('Macho (♂)');
    expect(formatBiologicalSexLabel('female')).toBe('Fêmea (♀)');
    expect(formatBiologicalSexSymbol('male')).toBe('♂');
    expect(formatBiologicalSexSymbol('female')).toBe('♀');
  });
});
