import type { BreedingPhase } from '../types';

export const VALID_BREEDING_TRANSITIONS: Readonly<Record<BreedingPhase, readonly BreedingPhase[]>> = {
  idle: ['discovering', 'pairing', 'cancelled'],
  discovering: ['pairing', 'idle', 'cancelled', 'failed'],
  pairing: ['character_selection', 'discovering', 'idle', 'cancelled', 'failed'],
  character_selection: ['compatibility_check', 'pairing', 'discovering', 'idle', 'cancelled', 'failed'],
  compatibility_check: ['awaiting_confirmation', 'character_selection', 'discovering', 'idle', 'cancelled', 'failed'],
  awaiting_confirmation: ['breeding_started', 'character_selection', 'compatibility_check', 'discovering', 'idle', 'cancelled', 'failed'],
  breeding_started: ['animation_running', 'failed', 'cancelled'],
  animation_running: ['genetics_calculation', 'failed', 'cancelled'],
  genetics_calculation: ['ownership_selection', 'failed', 'cancelled'],
  ownership_selection: ['result_validation', 'failed', 'cancelled'],
  result_validation: ['egg_creation', 'failed', 'cancelled'],
  egg_creation: ['completed', 'failed'],
  completed: ['idle'],
  cancelled: ['idle'],
  failed: ['idle']
};

export function canTransition(
  currentPhase: BreedingPhase,
  nextPhase: BreedingPhase
): boolean {
  if (currentPhase === nextPhase) return true;
  const allowed = VALID_BREEDING_TRANSITIONS[currentPhase];
  return allowed ? allowed.includes(nextPhase) : false;
}

export function transitionBreedingPhase(
  currentPhase: BreedingPhase,
  nextPhase: BreedingPhase
): BreedingPhase {
  if (!canTransition(currentPhase, nextPhase)) {
    throw new Error(
      `Transição de estado inválida no fluxo reprodutivo: de "${currentPhase}" para "${nextPhase}".`
    );
  }
  return nextPhase;
}
