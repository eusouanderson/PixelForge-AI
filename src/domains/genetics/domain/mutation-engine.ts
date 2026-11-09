import type {
  GeneMutationRarity,
  GeneMutationRecord,
  GeneticAttributeKey,
  SkinPattern
} from '../types';
import { GENETIC_ATTRIBUTE_KEYS } from './dna-engine';

export interface MutationRollOutcome {
  readonly hasMutation: boolean;
  readonly mutation: GeneMutationRecord | null;
  readonly skinPatternOverride?: SkinPattern;
  readonly colorShiftHex?: string;
}

export function rollMutationChance(randomVal: number): GeneMutationRarity | null {
  // Cumulative probabilities:
  // mythic: 0.2%
  // legendary: 0.8% (0.2 + 0.8 = 1.0%)
  // epic: 2.0% (1.0 + 2.0 = 3.0%)
  // rare: 4.0% (3.0 + 4.0 = 7.0%)
  // uncommon: 8.0% (7.0 + 8.0 = 15.0%)
  // common: 15.0% (15.0 + 15.0 = 30.0%)
  // none: 70.0%
  if (randomVal < 0.002) return 'mythic';
  if (randomVal < 0.01) return 'legendary';
  if (randomVal < 0.03) return 'epic';
  if (randomVal < 0.07) return 'rare';
  if (randomVal < 0.15) return 'uncommon';
  if (randomVal < 0.30) return 'common';
  return null;
}

export function generateAttributeMutation(
  rarity: GeneMutationRarity,
  attrKey: GeneticAttributeKey,
  currentValue: number
): GeneMutationRecord {
  const config: Record<
    GeneMutationRarity,
    { bonus: number; multiplier: number; descPrefix: string }
  > = {
    common: { bonus: 1, multiplier: 1.05, descPrefix: 'Sutil despertar adaptativo' },
    uncommon: { bonus: 2, multiplier: 1.10, descPrefix: 'Hiperdesenvolvimento biológico' },
    rare: { bonus: 4, multiplier: 1.20, descPrefix: 'Ancestralidade elemental despertada' },
    epic: { bonus: 6, multiplier: 1.35, descPrefix: 'Ressonância genética estelar' },
    legendary: { bonus: 9, multiplier: 1.50, descPrefix: 'Apex biológico milenar' },
    mythic: { bonus: 13, multiplier: 1.75, descPrefix: 'Gênese primordial dos titãs' }
  };

  const selected = config[rarity];

  return {
    trait: attrKey,
    previousValue: currentValue,
    mutatedValue: selected.bonus,
    rarity,
    multiplier: selected.multiplier,
    description: `${selected.descPrefix} em ${attrKey} (+${selected.bonus})`
  };
}

export function evaluateMutations(
  randomRoll: number,
  attrPickRoll: number,
  currentAttributes: Record<GeneticAttributeKey, number>
): MutationRollOutcome {
  const rarity = rollMutationChance(randomRoll);
  if (!rarity) {
    return { hasMutation: false, mutation: null };
  }

  const attrIndex = Math.floor(attrPickRoll * GENETIC_ATTRIBUTE_KEYS.length) % GENETIC_ATTRIBUTE_KEYS.length;
  const pickedAttr = GENETIC_ATTRIBUTE_KEYS[attrIndex];
  const currentValue = currentAttributes[pickedAttr] ?? 10;
  const mutation = generateAttributeMutation(rarity, pickedAttr, currentValue);

  let skinPatternOverride: SkinPattern | undefined;
  let colorShiftHex: string | undefined;

  if (rarity === 'mythic') {
    skinPatternOverride = 'elemental_glow';
    colorShiftHex = '#f43f5e';
  } else if (rarity === 'legendary') {
    skinPatternOverride = 'spotted';
    colorShiftHex = '#fbbf24';
  } else if (rarity === 'epic') {
    skinPatternOverride = 'striped';
    colorShiftHex = '#a855f7';
  }

  return {
    hasMutation: true,
    mutation,
    skinPatternOverride,
    colorShiftHex
  };
}
