import type {
  CharacterLifeStage,
  CharacterSleepSessionSummary,
  CharacterSleepState
} from '@/domains/characters/types';

export type { CharacterSleepState };
export type CharacterSleepSession = CharacterSleepSessionSummary;

export interface AgeSleepConfiguration {
  readonly stage: CharacterLifeStage;
  readonly label: string;
  readonly fatigueThreshold: number; // Entra em sono quando energia <= este valor
  readonly durationMinutes: number; // Duração do sono em minutos
  readonly minEnergyRecoveryPerMinute: number; // Taxa contínua de recuperação de energia
  readonly minAwakeCooldownMinutes: number; // Intervalo mínimo acordado antes de poder dormir novamente
}

export interface SleepEvaluationResult {
  readonly sleepState: CharacterSleepState;
  readonly session: CharacterSleepSession | null;
  readonly energy: number;
  readonly transition: 'none' | 'fell_asleep' | 'woke_up';
  readonly message?: string;
}
