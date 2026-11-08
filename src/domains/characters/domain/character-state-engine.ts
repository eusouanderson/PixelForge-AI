import type { PetNeedsState } from '@/domains/pet-needs/types';
import type {
  CharacterAnimationName,
  CharacterCareLogEntry,
  CharacterId,
  CharacterLifeStage,
  CharacterRuntimeState,
  EmotionalState,
  HealthCondition
} from '../types';

export function deriveEmotionalAndHealthState(needs: PetNeedsState): {
  readonly emotionalState: EmotionalState;
  readonly healthCondition: HealthCondition;
} {
  if (needs.health <= 0) {
    return { emotionalState: 'deceased', healthCondition: 'deceased' };
  }

  let healthCondition: HealthCondition = 'healthy';
  if (needs.health <= 20) {
    healthCondition = 'critical';
  } else if (needs.health <= 40 || needs.hygiene <= 15) {
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
  temporaryOverride?: CharacterAnimationName
): CharacterAnimationName {
  if (stage === 'ovo') return 'eclosao';
  if (healthCondition === 'deceased') return 'morte';
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

