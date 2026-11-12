import type { CharacterLifeStage } from '@/domains/characters/types';
import { clampNeedValue } from '@/domains/pet-needs/domain/pet-needs-engine';
import type {
  AgeSleepConfiguration,
  CharacterSleepSession,
  SleepEvaluationResult
} from '../types';

export const AGE_SLEEP_CONFIGURATIONS: Readonly<
  Record<Exclude<CharacterLifeStage, 'ovo'>, AgeSleepConfiguration>
> = {
  baby: {
    stage: 'baby',
    label: 'Bebê',
    fatigueThreshold: 40, // Bebês sentem sono e descansam com maior frequência
    durationMinutes: 15, // Soneca mais longa para regeneração do filhote
    minEnergyRecoveryPerMinute: 6.7,
    minAwakeCooldownMinutes: 15
  },
  crianca: {
    stage: 'crianca',
    label: 'Criança',
    fatigueThreshold: 25,
    durationMinutes: 10,
    minEnergyRecoveryPerMinute: 10,
    minAwakeCooldownMinutes: 30
  },
  'pre-adolescente': {
    stage: 'pre-adolescente',
    label: 'Pré-Adolescente',
    fatigueThreshold: 25,
    durationMinutes: 10,
    minEnergyRecoveryPerMinute: 10,
    minAwakeCooldownMinutes: 30
  },
  adolescente: {
    stage: 'adolescente',
    label: 'Adolescente',
    fatigueThreshold: 25,
    durationMinutes: 10,
    minEnergyRecoveryPerMinute: 10,
    minAwakeCooldownMinutes: 30
  },
  adulto: {
    stage: 'adulto',
    label: 'Adulto',
    fatigueThreshold: 15, // Adultos possuem períodos de sono menores e menos frequentes
    durationMinutes: 6, // Período de descanso normal mais rápido
    minEnergyRecoveryPerMinute: 16.7,
    minAwakeCooldownMinutes: 45
  }
};

export function getSleepConfigForStage(
  stage: CharacterLifeStage
): AgeSleepConfiguration | null {
  if (stage === 'ovo') return null;
  return AGE_SLEEP_CONFIGURATIONS[stage] ?? null;
}

export function shouldCharacterFallAsleep(
  stage: CharacterLifeStage,
  currentEnergy: number,
  currentSession?: CharacterSleepSession | null,
  nowMs: number = Date.now(),
  isDeceased: boolean = false
): boolean {
  if (stage === 'ovo' || isDeceased) return false;
  if (currentSession && currentSession.state === 'sleeping') return false;

  const config = getSleepConfigForStage(stage);
  if (!config) return false;

  // Respeita intervalo mínimo acordado caso tenha acordado recentemente
  if (currentSession && nowMs < currentSession.wakeAtMs + config.minAwakeCooldownMinutes * 60 * 1000) {
    return false;
  }

  return currentEnergy <= config.fatigueThreshold;
}

export function startSleepSession(
  stage: CharacterLifeStage,
  currentEnergy: number,
  nowMs: number
): CharacterSleepSession {
  const config = getSleepConfigForStage(stage) ?? AGE_SLEEP_CONFIGURATIONS.adulto;
  const durationMs = config.durationMinutes * 60 * 1000;

  return {
    state: 'sleeping',
    startedAtMs: nowMs,
    durationMinutes: config.durationMinutes,
    wakeAtMs: nowMs + durationMs,
    energyAtStart: clampNeedValue(currentEnergy),
    targetEnergy: 100,
    lastEnergyUpdateMs: nowMs
  };
}

export function computeSleepProgressAndEnergy(
  session: CharacterSleepSession,
  _stage: CharacterLifeStage,
  nowMs: number
): {
  readonly energy: number;
  readonly isCompleted: boolean;
  readonly updatedSession: CharacterSleepSession | null;
} {
  const totalDurationMs = session.durationMinutes * 60 * 1000;
  const elapsedMs = Math.max(0, nowMs - session.startedAtMs);

  if (nowMs >= session.wakeAtMs || elapsedMs >= totalDurationMs) {
    return {
      energy: 100,
      isCompleted: true,
      updatedSession: null
    };
  }

  const ratio = Math.min(1, Math.max(0, elapsedMs / totalDurationMs));
  const recovered = session.energyAtStart + (session.targetEnergy - session.energyAtStart) * ratio;
  const nextEnergy = clampNeedValue(recovered);

  return {
    energy: nextEnergy,
    isCompleted: false,
    updatedSession: {
      ...session,
      lastEnergyUpdateMs: nowMs
    }
  };
}

export function evaluateSleepStateOverTime(
  stage: CharacterLifeStage,
  currentEnergy: number,
  session: CharacterSleepSession | null,
  nowMs: number,
  isDeceased: boolean = false
): SleepEvaluationResult {
  if (stage === 'ovo' || isDeceased) {
    return {
      sleepState: 'awake',
      session: null,
      energy: currentEnergy,
      transition: 'none'
    };
  }

  // 1. Se já está dormindo, atualiza progresso e recuperação de energia baseada em tempo real
  if (session && session.state === 'sleeping') {
    const { energy, isCompleted, updatedSession } = computeSleepProgressAndEnergy(
      session,
      stage,
      nowMs
    );

    if (isCompleted) {
      return {
        sleepState: 'awake',
        session: null,
        energy: 100,
        transition: 'woke_up',
        message: 'O descanso foi concluído com sucesso e o dinossauro acordou cheio de energia!'
      };
    }

    return {
      sleepState: 'sleeping',
      session: updatedSession,
      energy,
      transition: 'none'
    };
  }

  // 2. Se está acordado, verifica se a fadiga exige entrada no sono
  if (shouldCharacterFallAsleep(stage, currentEnergy, session, nowMs, isDeceased)) {
    const newSession = startSleepSession(stage, currentEnergy, nowMs);
    return {
      sleepState: 'sleeping',
      session: newSession,
      energy: currentEnergy,
      transition: 'fell_asleep',
      message: 'O dinossauro adormeceu profundamente para repor suas energias vitais.'
    };
  }

  return {
    sleepState: 'awake',
    session,
    energy: currentEnergy,
    transition: 'none'
  };
}
