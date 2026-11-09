import type { CharacterId, ElementAffinity } from '@/domains/characters/types';

export type BiologicalSex = 'male' | 'female';

export type GeneticAttributeKey =
  | 'strength'
  | 'defense'
  | 'agility'
  | 'intelligence'
  | 'endurance'
  | 'elementalAffinity';

export interface AllelePair {
  readonly maternal: number;
  readonly paternal: number;
}

export type GeneAlleles = Readonly<Record<GeneticAttributeKey, AllelePair>>;

export interface VisualAllelePair {
  readonly dominant: string;
  readonly recessive: string;
  readonly expressDominant: boolean;
}

export type SkinPattern = 'solid' | 'striped' | 'spotted' | 'elemental_glow';

export interface VisualAlleles {
  readonly primaryColor: VisualAllelePair;
  readonly bellyColor: VisualAllelePair;
  readonly crestColor: VisualAllelePair;
  readonly eyeColor: VisualAllelePair;
  readonly pattern: SkinPattern;
  readonly bodyScale: number;
}

export type GeneMutationRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic';

export interface GeneMutationRecord {
  readonly trait: string;
  readonly previousValue: string | number;
  readonly mutatedValue: string | number;
  readonly rarity: GeneMutationRarity;
  readonly multiplier: number;
  readonly description: string;
}

export interface CreatureParentage {
  readonly sireId: string;
  readonly damId: string;
  readonly sireGenomeId: string;
  readonly damGenomeId: string;
  readonly sireSpecies: CharacterId;
  readonly damSpecies: CharacterId;
  readonly sireName: string;
  readonly damName: string;
}

export interface CreaturePhenotype {
  readonly attributes: Readonly<Record<GeneticAttributeKey, number>>;
  readonly colors: {
    readonly base: string;
    readonly belly: string;
    readonly crest: string;
    readonly eye: string;
  };
  readonly pattern: SkinPattern;
  readonly scale: number;
  readonly dominantElement: ElementAffinity;
}

export interface CreatureGenome {
  readonly genomeId: string;
  readonly generation: number;
  readonly species: CharacterId;
  readonly sex: BiologicalSex;
  readonly alleles: GeneAlleles;
  readonly appearance: VisualAlleles;
  readonly phenotype: CreaturePhenotype;
  readonly mutations: readonly GeneMutationRecord[];
  readonly parents: CreatureParentage | null;
  readonly createdAtMs: number;
  readonly ownerPeerId?: string;
}

export interface InbreedingCheckResult {
  readonly isAllowed: boolean;
  readonly riskLevel: 'none' | 'forbidden_direct' | 'high' | 'safe';
  readonly explanation: string;
}

export interface BreedingCompatibilityResult {
  readonly compatible: boolean;
  readonly reasons: readonly string[];
  readonly inbreedingRisk: 'none' | 'forbidden_direct' | 'high' | 'safe';
  readonly projectedOffspringSpeciesOptions: readonly CharacterId[];
  readonly elementalSynergy: number;
}

export interface GenealogyNode {
  readonly genomeId: string;
  readonly name: string;
  readonly species: CharacterId;
  readonly generation: number;
  readonly sex: BiologicalSex;
  readonly sire?: GenealogyNode;
  readonly dam?: GenealogyNode;
  readonly mutationsCount: number;
  readonly bredAtMs: number;
}
