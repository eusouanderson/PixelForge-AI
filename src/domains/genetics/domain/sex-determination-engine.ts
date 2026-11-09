import type { BiologicalSex } from '../types';

export function determineBiologicalSex(randomValue?: number): BiologicalSex {
  const value = randomValue !== undefined ? randomValue : Math.random();
  return value < 0.5 ? 'male' : 'female';
}

export function deterministicSexFromSeed(seed: string): BiologicalSex {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2 === 0 ? 'male' : 'female';
}

export function formatBiologicalSexLabel(sex: BiologicalSex): string {
  return sex === 'male' ? 'Macho (♂)' : 'Fêmea (♀)';
}

export function formatBiologicalSexSymbol(sex: BiologicalSex): string {
  return sex === 'male' ? '♂' : '♀';
}
