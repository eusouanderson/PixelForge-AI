export type AttributeKind =
  | 'strength'
  | 'defense'
  | 'agility'
  | 'intelligence'
  | 'endurance'
  | 'elementalAffinity';

export interface CharacterAttributes {
  readonly strength: number;
  readonly defense: number;
  readonly agility: number;
  readonly intelligence: number;
  readonly endurance: number;
  readonly elementalAffinity: number;
}

export type AttributeGainSource =
  | 'feeding_bonus'
  | 'activity_training'
  | 'stage_evolution'
  | 'level_up';

export interface AttributeModifier {
  readonly source: AttributeGainSource;
  readonly deltas: Partial<Record<AttributeKind, number>>;
}

