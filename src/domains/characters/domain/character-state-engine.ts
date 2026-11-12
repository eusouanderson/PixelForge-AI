import type { PetNeedsState } from '@/domains/pet-needs/types';
import { MAX_NATURAL_LIFESPAN_HOURS } from './character-registry';
import type {
  ActiveDisease,
  CharacterAnimationName,
  CharacterCareLogEntry,
  CharacterId,
  CharacterLifeStage,
  CharacterRuntimeState,
  CharacterSleepState,
  DiseaseId,
  EmotionalState,
  HealthCondition
} from '../types';

export const DISEASE_REGISTRY: Readonly<
  Record<DiseaseId, Omit<ActiveDisease, 'contractedAtMs'>>
> = {
  malnutrition: {
    id: 'malnutrition',
    name: 'Desnutrição Aguda',
    description: 'Fome extrema prolongada enfraqueceu o metabolismo elemental. Trate com Soro Nutri-Vital.',
    remedyFoodId: 'nutri-vital-serum'
  },
  severe_dehydration: {
    id: 'severe_dehydration',
    name: 'Desidratação Severa',
    description: 'Falta crítica de água ressecou as escamas vitais. Trate com Elixir Isotônico.',
    remedyFoodId: 'isotonic-hydra-elixir'
  },
  overeating_indigestion: {
    id: 'overeating_indigestion',
    name: 'Congestão por Excesso de Comida',
    description: 'Alimentação forçada com o estômago já cheio causou indigestão aguda. Trate com Tônico Digestivo.',
    remedyFoodId: 'enzymatic-digest-tonic'
  },
  food_poisoning: {
    id: 'food_poisoning',
    name: 'Intoxicação por Dieta Incompatível',
    description: 'Ingestão de alimento proibido para a espécie intoxicou o organismo. Trate com Extrato Antitoxina.',
    remedyFoodId: 'antitoxin-charcoal-extract'
  },
  parasitic_infection: {
    id: 'parasitic_infection',
    name: 'Infecção Parasitária',
    description: 'Baixa higiene permitiu a proliferação de parasitas nas escamas. Trate com Bálsamo Antisséptico.',
    remedyFoodId: 'antiseptic-spore-salve'
  },
  chronic_exhaustion: {
    id: 'chronic_exhaustion',
    name: 'Estafa e Exaustão Crônica',
    description: 'Esgotamento severo de energia sem repouso adequado. Trate com Ampola Revitalizante.',
    remedyFoodId: 'adrenal-stamina-ampoule'
  },
  elemental_melancholy: {
    id: 'elemental_melancholy',
    name: 'Melancolia Elemental',
    description: 'Tristeza profunda por falta de atenção e afeto. Trate com Néctar Floral da Serenidade.',
    remedyFoodId: 'serotonin-aura-nectar'
  }
};

export function contractDisease(
  existing: readonly ActiveDisease[] = [],
  diseaseId: DiseaseId,
  nowMs: number
): readonly ActiveDisease[] {
  if (existing.some((d) => d.id === diseaseId)) {
    return existing;
  }
  const def = DISEASE_REGISTRY[diseaseId];
  return [...existing, { ...def, contractedAtMs: nowMs }];
}

export function diagnoseNeedsTriggeredDiseases(
  needs: PetNeedsState,
  existing: readonly ActiveDisease[] = [],
  nowMs: number
): readonly ActiveDisease[] {
  let result: readonly ActiveDisease[] = existing;
  if (needs.hunger <= 15) {
    result = contractDisease(result, 'malnutrition', nowMs);
  }
  if (needs.thirst <= 15) {
    result = contractDisease(result, 'severe_dehydration', nowMs);
  }
  if (needs.hygiene <= 15) {
    result = contractDisease(result, 'parasitic_infection', nowMs);
  }
  if (needs.energy <= 10) {
    result = contractDisease(result, 'chronic_exhaustion', nowMs);
  }
  if (needs.happiness <= 15) {
    result = contractDisease(result, 'elemental_melancholy', nowMs);
  }
  return result;
}

export function cureDiseasesWithRemedy(
  existing: readonly ActiveDisease[] = [],
  curesDiseaseId: DiseaseId | 'all'
): {
  readonly remaining: readonly ActiveDisease[];
  readonly cured: readonly ActiveDisease[];
} {
  if (curesDiseaseId === 'all') {
    return {
      remaining: [],
      cured: [...existing]
    };
  }
  const cured = existing.filter((d) => d.id === curesDiseaseId);
  const remaining = existing.filter((d) => d.id !== curesDiseaseId);
  return { remaining, cured };
}

export function deriveEmotionalAndHealthState(
  needs: PetNeedsState,
  activeDiseasesCount: number = 0,
  ageHours: number = 0
): {
  readonly emotionalState: EmotionalState;
  readonly healthCondition: HealthCondition;
} {
  if (needs.health <= 0 || ageHours >= MAX_NATURAL_LIFESPAN_HOURS) {
    return { emotionalState: 'deceased', healthCondition: 'deceased' };
  }

  let healthCondition: HealthCondition = 'healthy';
  if (needs.health <= 20) {
    healthCondition = 'critical';
  } else if (needs.health <= 40 || needs.hygiene <= 15 || activeDiseasesCount > 0) {
    healthCondition = 'sick';
  } else if (needs.health <= 65) {
    healthCondition = 'weakened';
  }

  if (healthCondition === 'critical') {
    return { emotionalState: 'critical', healthCondition };
  }
  if (healthCondition === 'sick') {
    return { emotionalState: 'sick', healthCondition };
  }
  if (needs.hunger <= 20 || needs.thirst <= 20) {
    return { emotionalState: 'hungry', healthCondition };
  }
  if (needs.energy <= 20) {
    return { emotionalState: 'tired', healthCondition };
  }
  if (needs.happiness <= 25) {
    return { emotionalState: 'sad', healthCondition };
  }

  const averageWellbeing =
    (needs.hunger + needs.thirst + needs.energy + needs.happiness + needs.hygiene) / 5;

  if (averageWellbeing >= 85 && needs.health >= 85) {
    return { emotionalState: 'radiant', healthCondition };
  }
  if (averageWellbeing >= 65) {
    return { emotionalState: 'happy', healthCondition };
  }

  return { emotionalState: 'calm', healthCondition };
}

export function resolveCharacterAnimation(
  stage: CharacterLifeStage,
  healthCondition: HealthCondition,
  _emotionalState: EmotionalState,
  temporaryOverride?: CharacterAnimationName,
  sleepState?: CharacterSleepState
): CharacterAnimationName {
  if (stage === 'ovo') return 'eclosao';
  if (healthCondition === 'deceased') return 'morte';
  if (sleepState === 'sleeping') return 'dormindo';
  if (temporaryOverride && temporaryOverride !== 'eclosao') return temporaryOverride;
  if (healthCondition === 'sick' || healthCondition === 'critical') return 'doente';
  return 'idle';
}

export function createInitialCharacterRuntime(
  characterId: CharacterId,
  nowMs: number,
  initialStage: CharacterLifeStage = 'ovo'
): CharacterRuntimeState {
  return {
    characterId,
    currentStage: initialStage,
    currentAnimation: initialStage === 'ovo' ? 'eclosao' : 'idle',
    ageHours: 0,
    emotionalState: 'happy',
    healthCondition: 'healthy',
    activeDiseases: [],
    sleepState: 'awake',
    sleepSession: null,
    careHistory: [
      {
        id: `${characterId}-born-${nowMs}`,
        timestampMs: nowMs,
        actionType: 'evolve',
        summary: 'Um ovo ancestral despertou no santuário elemental!'
      }
    ],
    createdAtMs: nowMs,
    lastUpdatedAtMs: nowMs
  };
}

export function appendCharacterCareLog(
  runtime: CharacterRuntimeState,
  actionType: CharacterCareLogEntry['actionType'],
  summary: string,
  timestampMs: number
): CharacterRuntimeState {
  const newEntry: CharacterCareLogEntry = {
    id: `${runtime.characterId}-${actionType}-${timestampMs}-${runtime.careHistory.length}`,
    timestampMs,
    actionType,
    summary
  };
  return {
    ...runtime,
    lastUpdatedAtMs: timestampMs,
    careHistory: [newEntry, ...runtime.careHistory].slice(0, 30)
  };
}
