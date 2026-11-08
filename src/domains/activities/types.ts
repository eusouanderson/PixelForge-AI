import type { AttributeKind } from '@/domains/attributes/types';
import type { ElementAffinity } from '@/domains/characters/types';

export type ActivityKind =
  | 'play'
  | 'train'
  | 'explore'
  | 'meditate'
  | 'bath'
  | 'sleep'
  | 'heal';

export interface ActivityDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly kind: ActivityKind;
  readonly preferredElement?: ElementAffinity;
  readonly minEnergyRequired: number;
  readonly needsDelta: {
    readonly hunger: number;
    readonly thirst: number;
    readonly energy: number;
    readonly happiness: number;
    readonly hygiene: number;
    readonly health: number;
  };
  readonly attributeGains: Partial<Record<AttributeKind, number>>;
  readonly experienceReward: number;
  readonly coinReward: number;
}

export interface ActivityExecutionResult {
  readonly success: boolean;
  readonly activityId: string;
  readonly message: string;
  readonly needsDelta: ActivityDefinition['needsDelta'];
  readonly attributeGains: Partial<Record<AttributeKind, number>>;
  readonly experienceGained: number;
  readonly coinsGained: number;
}

