import type { CharacterId, ElementAffinity } from '@/domains/characters/types';
import { CHARACTER_SPECIES_REGISTRY } from '@/domains/characters/domain/character-registry';
import type {
  AllelePair,
  BiologicalSex,
  CreatureGenome,
  CreaturePhenotype,
  GeneAlleles,
  GeneMutationRecord,
  GeneticAttributeKey,
  VisualAlleles
} from '../types';

export const GENETIC_ATTRIBUTE_KEYS: readonly GeneticAttributeKey[] = [
  'strength',
  'defense',
  'agility',
  'intelligence',
  'endurance',
  'elementalAffinity'
] as const;

export function generateGenomeId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  const normalized = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(normalized, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function interpolateHexColors(colorA: string, colorB: string, ratio = 0.5): string {
  const rgbA = parseHexColor(colorA);
  const rgbB = parseHexColor(colorB);
  const r = rgbA.r * (1 - ratio) + rgbB.r * ratio;
  const g = rgbA.g * (1 - ratio) + rgbB.g * ratio;
  const b = rgbA.b * (1 - ratio) + rgbB.b * ratio;
  return rgbToHex(r, g, b);
}

export function calculatePhenotype(
  alleles: GeneAlleles,
  appearance: VisualAlleles,
  dominantElement: ElementAffinity,
  mutations: readonly GeneMutationRecord[] = []
): CreaturePhenotype {
  const computedAttrs = {} as Record<GeneticAttributeKey, number>;

  for (const key of GENETIC_ATTRIBUTE_KEYS) {
    const pair = alleles[key];
    const baseValue = Math.round((pair.maternal + pair.paternal) / 2);
    const attrMutations = mutations.filter((m) => m.trait === key);
    const bonus = attrMutations.reduce((sum, m) => sum + (typeof m.mutatedValue === 'number' ? m.mutatedValue : 0), 0);
    computedAttrs[key] = Math.max(1, baseValue + bonus);
  }

  const baseColor = appearance.primaryColor.expressDominant
    ? appearance.primaryColor.dominant
    : appearance.primaryColor.recessive;

  const bellyColor = appearance.bellyColor.expressDominant
    ? appearance.bellyColor.dominant
    : appearance.bellyColor.recessive;

  const crestColor = appearance.crestColor.expressDominant
    ? appearance.crestColor.dominant
    : appearance.crestColor.recessive;

  const eyeColor = appearance.eyeColor.expressDominant
    ? appearance.eyeColor.dominant
    : appearance.eyeColor.recessive;

  return {
    attributes: computedAttrs,
    colors: {
      base: baseColor,
      belly: bellyColor,
      crest: crestColor,
      eye: eyeColor
    },
    pattern: appearance.pattern,
    scale: appearance.bodyScale,
    dominantElement
  };
}

export function createGenesisGenome(
  speciesId: CharacterId,
  sex: BiologicalSex,
  nowMs: number,
  customGenomeId?: string
): CreatureGenome {
  const species = CHARACTER_SPECIES_REGISTRY[speciesId];
  const genomeId = customGenomeId ?? generateGenomeId();

  const alleles: Record<GeneticAttributeKey, AllelePair> = {
    strength: { maternal: species.baseAttributes.strength, paternal: species.baseAttributes.strength },
    defense: { maternal: species.baseAttributes.defense, paternal: species.baseAttributes.defense },
    agility: { maternal: species.baseAttributes.agility, paternal: species.baseAttributes.agility },
    intelligence: { maternal: species.baseAttributes.intelligence, paternal: species.baseAttributes.intelligence },
    endurance: { maternal: species.baseAttributes.endurance, paternal: species.baseAttributes.endurance },
    elementalAffinity: { maternal: species.baseAttributes.elementalAffinity, paternal: species.baseAttributes.elementalAffinity }
  };

  const appearance: VisualAlleles = {
    primaryColor: {
      dominant: species.visualTraits.primaryColors.base,
      recessive: species.visualTraits.primaryColors.highlight,
      expressDominant: true
    },
    bellyColor: {
      dominant: species.visualTraits.primaryColors.belly,
      recessive: species.visualTraits.primaryColors.belly,
      expressDominant: true
    },
    crestColor: {
      dominant: species.visualTraits.primaryColors.crest,
      recessive: species.visualTraits.primaryColors.crest,
      expressDominant: true
    },
    eyeColor: {
      dominant: species.visualTraits.ocularGenetics.eyeColor,
      recessive: species.visualTraits.ocularGenetics.eyeColor,
      expressDominant: true
    },
    pattern: 'solid',
    bodyScale: 1.0
  };

  const phenotype = calculatePhenotype(alleles, appearance, species.element, []);

  return {
    genomeId,
    generation: 1,
    species: speciesId,
    sex,
    alleles,
    appearance,
    phenotype,
    mutations: [],
    parents: null,
    createdAtMs: nowMs
  };
}
