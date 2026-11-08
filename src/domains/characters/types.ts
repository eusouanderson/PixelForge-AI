import type { DeclarativePixelArt, LifeStage } from '@/core/domain/pixel-art/interfaces';

export type CharacterId =
  | 'ignisauro'
  | 'glacissauro'
  | 'electrossauro'
  | 'toxissauro'
  | 'terrassauro'
  | 'aerossauro'
  | 'umbrassauro'
  | 'solassauro';

export type ElementAffinity =
  | 'fire'
  | 'ice'
  | 'electric'
  | 'poison'
  | 'earth'
  | 'air'
  | 'shadow'
  | 'light';

export type CharacterAnimationName =
  | 'eclosao'
  | 'idle'
  | 'comendo'
  | 'amando'
  | 'doente'
  | 'morte';

export type CharacterLifeStage =
  | 'ovo'
  | 'baby'
  | 'crianca'
  | 'pre-adolescente'
  | 'adolescente'
  | 'adulto';

export type EmotionalState =
  | 'radiant'
  | 'happy'
  | 'calm'
  | 'hungry'
  | 'tired'
  | 'sad'
  | 'sick'
  | 'critical'
  | 'deceased';

export type HealthCondition = 'healthy' | 'weakened' | 'sick' | 'critical' | 'deceased';

export type DiseaseId =
  | 'malnutrition'
  | 'severe_dehydration'
  | 'overeating_indigestion'
  | 'food_poisoning'
  | 'parasitic_infection'
  | 'chronic_exhaustion'
  | 'elemental_melancholy';

export interface ActiveDisease {
  readonly id: DiseaseId;
  readonly name: string;
  readonly description: string;
  readonly remedyFoodId: string;
  readonly contractedAtMs: number;
}

export interface OcularGenetics {
  readonly eyeColor: string;
  readonly pupilColor: string;
  readonly specularColor: string;
}

export interface CharacterVisualTraits {
  readonly silhouetteDescription: string;
  readonly orientation: 'frontal_binocular';
  readonly logicalDimensions: {
    readonly width: number;
    readonly height: number;
  };
  readonly ocularGenetics: OcularGenetics;
  readonly primaryColors: {
    readonly base: string;
    readonly belly: string;
    readonly crest: string;
    readonly highlight: string;
  };
}

export interface CharacterPersonalityProfile {
  readonly archetype: string;
  readonly traits: readonly string[];
  readonly favoriteActivityId: string;
  readonly dislikedActivityId: string;
  readonly temper: 'ferocious' | 'stoic' | 'energetic' | 'curious' | 'gentle' | 'noble' | 'mysterious';
}

export interface CharacterEvolutionRule {
  readonly fromStage: CharacterLifeStage;
  readonly toStage: CharacterLifeStage;
  readonly requiredLevel: number;
  readonly requiredAgeHours: number;
  readonly minHealth: number;
  readonly minHappiness: number;
}

export interface CharacterCareLogEntry {
  readonly id: string;
  readonly timestampMs: number;
  readonly actionType: 'feed' | 'hydrate' | 'sleep' | 'clean' | 'heal' | 'activity' | 'evolve' | 'revive';
  readonly summary: string;
}

export interface CharacterSpeciesDefinition {
  readonly id: CharacterId;
  readonly name: string;
  readonly displayName: string;
  readonly scientificName: string;
  readonly species: string;
  readonly description: string;
  readonly lore: string;
  readonly element: ElementAffinity;
  readonly elementLabel: string;
  readonly personality: CharacterPersonalityProfile;
  readonly visualTraits: CharacterVisualTraits;
  readonly environmentId: string;
  readonly particlePresetId: string;
  readonly favoriteFoodIds: readonly string[];
  readonly acceptedFoodIds: readonly string[];
  readonly forbiddenFoodIds: readonly string[];
  readonly baseAttributes: {
    readonly strength: number;
    readonly defense: number;
    readonly agility: number;
    readonly intelligence: number;
    readonly endurance: number;
    readonly elementalAffinity: number;
  };
  readonly evolutionRules: readonly CharacterEvolutionRule[];
}

export interface CharacterRuntimeState {
  readonly characterId: CharacterId;
  readonly customNickname?: string;
  readonly currentStage: CharacterLifeStage;
  readonly currentAnimation: CharacterAnimationName;
  readonly ageHours: number;
  readonly emotionalState: EmotionalState;
  readonly healthCondition: HealthCondition;
  readonly activeDiseases: readonly ActiveDisease[];
  readonly causeOfDeath?: 'neglect_or_disease' | 'old_age';
  readonly careHistory: readonly CharacterCareLogEntry[];
  readonly createdAtMs: number;
  readonly lastUpdatedAtMs: number;
}

export interface CharacterSpriteRepositoryPort {
  getSpriteFrame(
    characterId: CharacterId,
    stage: CharacterLifeStage | LifeStage,
    animation: CharacterAnimationName,
    frame: number
  ): DeclarativePixelArt;
  getAnimationFrames(
    characterId: CharacterId,
    stage: CharacterLifeStage,
    animation: CharacterAnimationName
  ): readonly DeclarativePixelArt[];
}

