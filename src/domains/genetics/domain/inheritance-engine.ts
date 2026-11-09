import type { CharacterId } from '@/domains/characters/types';
import { CHARACTER_SPECIES_REGISTRY } from '@/domains/characters/domain/character-registry';
import type {
  AllelePair,
  BiologicalSex,
  CreatureGenome,
  CreatureParentage,
  GeneticAttributeKey,
  SkinPattern,
  VisualAlleles
} from '../types';
import {
  GENETIC_ATTRIBUTE_KEYS,
  calculatePhenotype,
  generateGenomeId,
  interpolateHexColors
} from './dna-engine';
import { getSpeciesAffinity } from './compatibility-engine';
import { evaluateMutations } from './mutation-engine';

export interface InheritanceRandomSource {
  readonly sexRandom?: number;
  readonly speciesPickRandom?: number;
  readonly allelePickRandoms?: Record<GeneticAttributeKey, { sirePick: number; damPick: number }>;
  readonly mutationRollRandom?: number;
  readonly mutationAttrRandom?: number;
  readonly colorDominanceRandom?: number;
  readonly patternRandom?: number;
  readonly scaleVarianceRandom?: number;
}

export function inheritAllelePair(
  sirePair: AllelePair,
  damPair: AllelePair,
  sirePick: number,
  damPick: number
): AllelePair {
  const paternal = sirePick < 0.5 ? sirePair.paternal : sirePair.maternal;
  const maternal = damPick < 0.5 ? damPair.paternal : damPair.maternal;
  return { paternal, maternal };
}

export function crossGenomes(
  sire: CreatureGenome,
  dam: CreatureGenome,
  nowMs: number,
  randomSource: InheritanceRandomSource = {},
  customGenomeId?: string
): CreatureGenome {
  // 1. Biological sex of offspring
  const sexRoll = randomSource.sexRandom ?? Math.random();
  const sex: BiologicalSex = sexRoll < 0.5 ? 'male' : 'female';

  // 2. Offspring species determination
  const affinity = getSpeciesAffinity(sire.species, dam.species);
  const speciesRoll = randomSource.speciesPickRandom ?? Math.random();
  const speciesIndex = Math.floor(speciesRoll * affinity.possibleOffspring.length) % affinity.possibleOffspring.length;
  const offspringSpecies: CharacterId = affinity.possibleOffspring[speciesIndex];
  const speciesDef = CHARACTER_SPECIES_REGISTRY[offspringSpecies];

  // 3. Mendelian Allele inheritance
  const childAlleles = {} as Record<GeneticAttributeKey, AllelePair>;
  for (const key of GENETIC_ATTRIBUTE_KEYS) {
    const picks = randomSource.allelePickRandoms?.[key] ?? {
      sirePick: Math.random(),
      damPick: Math.random()
    };
    childAlleles[key] = inheritAllelePair(
      sire.alleles[key],
      dam.alleles[key],
      picks.sirePick,
      picks.damPick
    );
  }

  // 4. Visual Traits inheritance
  const colorDomRoll = randomSource.colorDominanceRandom ?? Math.random();
  const blendedBase = interpolateHexColors(sire.phenotype.colors.base, dam.phenotype.colors.base, 0.5);
  const blendedBelly = interpolateHexColors(sire.phenotype.colors.belly, dam.phenotype.colors.belly, 0.5);
  const blendedCrest = interpolateHexColors(sire.phenotype.colors.crest, dam.phenotype.colors.crest, 0.5);
  const blendedEye = colorDomRoll < 0.5 ? sire.phenotype.colors.eye : dam.phenotype.colors.eye;

  const patternRoll = randomSource.patternRandom ?? Math.random();
  const patterns: readonly SkinPattern[] = ['solid', 'striped', 'spotted', 'elemental_glow'];
  const inheritedPattern: SkinPattern =
    patternRoll < 0.6
      ? sire.appearance.pattern
      : patternRoll < 0.9
        ? dam.appearance.pattern
        : patterns[Math.floor(patternRoll * patterns.length) % patterns.length];

  const scaleRoll = randomSource.scaleVarianceRandom ?? Math.random();
  const avgScale = (sire.appearance.bodyScale + dam.appearance.bodyScale) / 2;
  const scaleVariance = (scaleRoll - 0.5) * 0.1; // +/- 5%
  const bodyScale = Math.max(0.8, Math.min(1.3, Math.round((avgScale + scaleVariance) * 100) / 100));

  let appearance: VisualAlleles = {
    primaryColor: {
      dominant: blendedBase,
      recessive: colorDomRoll < 0.5 ? sire.phenotype.colors.base : dam.phenotype.colors.base,
      expressDominant: true
    },
    bellyColor: {
      dominant: blendedBelly,
      recessive: dam.phenotype.colors.belly,
      expressDominant: true
    },
    crestColor: {
      dominant: blendedCrest,
      recessive: sire.phenotype.colors.crest,
      expressDominant: true
    },
    eyeColor: {
      dominant: blendedEye,
      recessive: colorDomRoll >= 0.5 ? sire.phenotype.colors.eye : dam.phenotype.colors.eye,
      expressDominant: true
    },
    pattern: inheritedPattern,
    bodyScale
  };

  // 5. Evaluate mutations
  const mutationRoll = randomSource.mutationRollRandom ?? Math.random();
  const mutationAttrRoll = randomSource.mutationAttrRandom ?? Math.random();

  const speciesElement = speciesDef?.element ?? 'fire';
  const tempPhenotype = calculatePhenotype(childAlleles, appearance, speciesElement, []);
  const mutationOutcome = evaluateMutations(mutationRoll, mutationAttrRoll, tempPhenotype.attributes);

  const finalMutations = mutationOutcome.hasMutation && mutationOutcome.mutation ? [mutationOutcome.mutation] : [];

  if (mutationOutcome.skinPatternOverride) {
    appearance = {
      ...appearance,
      pattern: mutationOutcome.skinPatternOverride
    };
  }
  if (mutationOutcome.colorShiftHex) {
    appearance = {
      ...appearance,
      primaryColor: {
        ...appearance.primaryColor,
        dominant: mutationOutcome.colorShiftHex
      }
    };
  }

  // 6. Final phenotype
  const phenotype = calculatePhenotype(childAlleles, appearance, speciesElement, finalMutations);

  // 7. Parentage record
  const parents: CreatureParentage = {
    sireId: sire.species,
    damId: dam.species,
    sireGenomeId: sire.genomeId,
    damGenomeId: dam.genomeId,
    sireSpecies: sire.species,
    damSpecies: dam.species,
    sireName: CHARACTER_SPECIES_REGISTRY[sire.species]?.displayName ?? sire.species,
    damName: CHARACTER_SPECIES_REGISTRY[dam.species]?.displayName ?? dam.species
  };

  const generation = Math.max(sire.generation, dam.generation) + 1;
  const genomeId = customGenomeId ?? generateGenomeId();

  return {
    genomeId,
    generation,
    species: offspringSpecies,
    sex,
    alleles: childAlleles,
    appearance,
    phenotype,
    mutations: finalMutations,
    parents,
    createdAtMs: nowMs
  };
}
