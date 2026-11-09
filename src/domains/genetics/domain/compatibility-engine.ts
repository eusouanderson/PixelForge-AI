import type { CharacterId, CharacterLifeStage, HealthCondition } from '@/domains/characters/types';
import type {
  BreedingCompatibilityResult,
  CreatureGenome,
  InbreedingCheckResult
} from '../types';

export interface SpeciesAffinityRule {
  readonly canBreed: boolean;
  readonly synergy: number;
  readonly possibleOffspring: readonly CharacterId[];
}

export const SPECIES_COMPATIBILITY_MATRIX: Readonly<Record<string, SpeciesAffinityRule>> = {
  // Fire pairings
  'ignisauro:terrassauro': { canBreed: true, synergy: 0.95, possibleOffspring: ['ignisauro', 'terrassauro'] },
  'ignisauro:glacissauro': { canBreed: true, synergy: 0.80, possibleOffspring: ['ignisauro', 'glacissauro'] },
  'ignisauro:solassauro': { canBreed: true, synergy: 0.90, possibleOffspring: ['ignisauro', 'solassauro'] },
  'ignisauro:electrossauro': { canBreed: true, synergy: 0.85, possibleOffspring: ['ignisauro', 'electrossauro'] },

  // Ice pairings
  'glacissauro:aerossauro': { canBreed: true, synergy: 0.90, possibleOffspring: ['glacissauro', 'aerossauro'] },
  'glacissauro:cristalissauro': { canBreed: true, synergy: 0.95, possibleOffspring: ['glacissauro', 'cristalissauro'] },

  // Electric pairings
  'electrossauro:aerossauro': { canBreed: true, synergy: 0.95, possibleOffspring: ['electrossauro', 'aerossauro'] },
  'electrossauro:astrassauro': { canBreed: true, synergy: 0.90, possibleOffspring: ['electrossauro', 'astrassauro'] },

  // Poison pairings
  'toxissauro:terrassauro': { canBreed: true, synergy: 0.85, possibleOffspring: ['toxissauro', 'terrassauro'] },
  'toxissauro:umbrassauro': { canBreed: true, synergy: 0.90, possibleOffspring: ['toxissauro', 'umbrassauro'] },

  // Light / Shadow pairings
  'solassauro:umbrassauro': { canBreed: true, synergy: 0.85, possibleOffspring: ['solassauro', 'umbrassauro'] },
  'rosassauro:solassauro': { canBreed: true, synergy: 0.95, possibleOffspring: ['rosassauro', 'solassauro'] },
  'rosassauro:cristalissauro': { canBreed: true, synergy: 0.90, possibleOffspring: ['rosassauro', 'cristalissauro'] },

  // Incompatible pairings (Toxicity incompatible with delicate floral fairy)
  'toxissauro:rosassauro': { canBreed: false, synergy: 0.0, possibleOffspring: [] },

  // Cosmic / Crystal pairings
  'astrassauro:cristalissauro': { canBreed: true, synergy: 0.95, possibleOffspring: ['astrassauro', 'cristalissauro'] },
  'astrassauro:umbrassauro': { canBreed: true, synergy: 0.88, possibleOffspring: ['astrassauro', 'umbrassauro'] }
};

export function getSpeciesAffinity(speciesA: CharacterId, speciesB: CharacterId): SpeciesAffinityRule {
  if (speciesA === speciesB) {
    return {
      canBreed: true,
      synergy: 1.0,
      possibleOffspring: [speciesA]
    };
  }

  const key1 = `${speciesA}:${speciesB}`;
  const key2 = `${speciesB}:${speciesA}`;

  if (SPECIES_COMPATIBILITY_MATRIX[key1]) {
    return SPECIES_COMPATIBILITY_MATRIX[key1];
  }
  if (SPECIES_COMPATIBILITY_MATRIX[key2]) {
    return SPECIES_COMPATIBILITY_MATRIX[key2];
  }

  // Universal elemental baseline for cross-species breeding
  return {
    canBreed: true,
    synergy: 0.75,
    possibleOffspring: [speciesA, speciesB]
  };
}

export function checkInbreeding(
  genomeA: CreatureGenome,
  genomeB: CreatureGenome
): InbreedingCheckResult {
  // Direct check: same individual
  if (genomeA.genomeId === genomeB.genomeId) {
    return {
      isAllowed: false,
      riskLevel: 'forbidden_direct',
      explanation: 'Não é possível reproduzir o mesmo indivíduo consigo mesmo.'
    };
  }

  // Parent-offspring check
  if (
    genomeA.parents?.sireGenomeId === genomeB.genomeId ||
    genomeA.parents?.damGenomeId === genomeB.genomeId ||
    genomeB.parents?.sireGenomeId === genomeA.genomeId ||
    genomeB.parents?.damGenomeId === genomeA.genomeId
  ) {
    return {
      isAllowed: false,
      riskLevel: 'forbidden_direct',
      explanation: 'Cruzamento proibido entre progenitor e descendente (consanguinidade de 1º grau).'
    };
  }

  // Sibling check: both share the exact same parents
  if (
    genomeA.parents &&
    genomeB.parents &&
    Boolean(genomeA.parents.sireGenomeId) &&
    genomeA.parents.sireGenomeId === genomeB.parents.sireGenomeId &&
    Boolean(genomeA.parents.damGenomeId) &&
    genomeA.parents.damGenomeId === genomeB.parents.damGenomeId
  ) {
    return {
      isAllowed: false,
      riskLevel: 'forbidden_direct',
      explanation: 'Cruzamento proibido entre irmãos plenos (mesmo pai e mesma mãe).'
    };
  }

  // Half-sibling check: share one parent
  if (
    genomeA.parents &&
    genomeB.parents &&
    ((Boolean(genomeA.parents.sireGenomeId) && genomeA.parents.sireGenomeId === genomeB.parents.sireGenomeId) ||
      (Boolean(genomeA.parents.damGenomeId) && genomeA.parents.damGenomeId === genomeB.parents.damGenomeId))
  ) {
    return {
      isAllowed: true,
      riskLevel: 'high',
      explanation: 'Atenção: Meio-irmãos compartilham um progenitor em comum. Risco genético elevado.'
    };
  }

  return {
    isAllowed: true,
    riskLevel: 'none',
    explanation: 'Nenhum laço de consanguinidade direta detectado. Linhagem segura.'
  };
}

export interface CompatibilityEvaluationInput {
  readonly genomeA: CreatureGenome;
  readonly stageA: CharacterLifeStage;
  readonly healthA: HealthCondition;
  readonly genomeB: CreatureGenome;
  readonly stageB: CharacterLifeStage;
  readonly healthB: HealthCondition;
}

export function evaluateBreedingCompatibility(
  input: CompatibilityEvaluationInput
): BreedingCompatibilityResult {
  const reasons: string[] = [];

  // Sex biological check
  const sexA = input.genomeA.sex;
  const sexB = input.genomeB.sex;

  if (sexA === sexB) {
    if (sexA === 'male') {
      reasons.push('Dois machos não podem reproduzir. A reprodução exige um macho e uma fêmea.');
    } else {
      reasons.push('Duas fêmeas não podem reproduzir. A reprodução exige um macho e uma fêmea.');
    }
  }

  // Sexual maturity check (adulto only)
  if (input.stageA !== 'adulto') {
    reasons.push('O primeiro dinossauro ainda não atingiu a maturidade sexual (Adulto).');
  }
  if (input.stageB !== 'adulto') {
    reasons.push('O segundo dinossauro ainda não atingiu a maturidade sexual (Adulto).');
  }

  // Living status check
  if (input.healthA === 'deceased') {
    reasons.push('O primeiro dinossauro está falecido e não pode reproduzir.');
  }
  if (input.healthB === 'deceased') {
    reasons.push('O segundo dinossauro está falecido e não pode reproduzir.');
  }

  // Inbreeding check
  const inbreeding = checkInbreeding(input.genomeA, input.genomeB);
  if (!inbreeding.isAllowed) {
    reasons.push(inbreeding.explanation);
  }

  // Species affinity
  const affinity = getSpeciesAffinity(input.genomeA.species, input.genomeB.species);
  if (!affinity.canBreed) {
    reasons.push('As espécies não são geneticamente compatíveis.');
  }

  const isCompatible = reasons.length === 0;

  return {
    compatible: isCompatible,
    reasons,
    inbreedingRisk: inbreeding.riskLevel,
    projectedOffspringSpeciesOptions: affinity.possibleOffspring,
    elementalSynergy: affinity.synergy
  };
}
