import type { CharacterId, DiseaseId, ElementAffinity } from '@/domains/characters/types';
import type { AttributeKind } from '@/domains/attributes/types';
import type { DeclarativePixelArt } from '@/core/domain/pixel-art/interfaces';

export type FoodCategory =
  | 'meat'
  | 'crystal'
  | 'fruit'
  | 'fungi'
  | 'nectar'
  | 'hydration'
  | 'medicine';

export type FoodRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type DietaryPreference = 'favorite' | 'accepted' | 'forbidden';

export interface FoodItemDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: FoodCategory;
  readonly rarity: FoodRarity;
  readonly elementAffinity?: ElementAffinity;
  readonly curesDiseaseId?: DiseaseId | 'all';
  readonly priceCoins: number;
  readonly nutrition: {
    readonly hungerRestore: number;
    readonly thirstRestore: number;
    readonly energyDelta: number;
    readonly happinessDelta: number;
    readonly healthDelta: number;
    readonly hygieneDelta: number;
  };
  readonly attributeBonus: Partial<Record<AttributeKind, number>>;
  readonly pixelColors: {
    readonly primary: string;
    readonly secondary: string;
    readonly highlight: string;
  };
  readonly pixelArt: DeclarativePixelArt;
}

export interface FeedingReaction {
  readonly characterId: CharacterId;
  readonly foodId: string;
  readonly preference: DietaryPreference;
  readonly accepted: boolean;
  readonly satisfactionLevel: 'ecstatic' | 'satisfied' | 'disgusted' | 'poisoned';
  readonly contractedDiseaseId?: DiseaseId;
  readonly curedDiseaseId?: DiseaseId | 'all';
  readonly appliedNeedsDelta: {
    readonly hunger: number;
    readonly thirst: number;
    readonly energy: number;
    readonly happiness: number;
    readonly health: number;
    readonly hygiene: number;
  };
  readonly appliedAttributeDelta: Partial<Record<AttributeKind, number>>;
  readonly experienceGained: number;
  readonly message: string;
  readonly timestampMs: number;
}
