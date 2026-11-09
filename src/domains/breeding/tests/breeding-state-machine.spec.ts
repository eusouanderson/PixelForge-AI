import { describe, it, expect } from 'vitest';
import {
  canTransition,
  transitionBreedingPhase
} from '../domain/breeding-state-machine';

describe('Breeding: State Machine', () => {
  it('validates allowed state transitions in sequence', () => {
    expect(canTransition('idle', 'discovering')).toBe(true);
    expect(canTransition('discovering', 'pairing')).toBe(true);
    expect(canTransition('pairing', 'character_selection')).toBe(true);
    expect(canTransition('character_selection', 'compatibility_check')).toBe(true);
    expect(canTransition('compatibility_check', 'awaiting_confirmation')).toBe(true);
    expect(canTransition('awaiting_confirmation', 'breeding_started')).toBe(true);
    expect(canTransition('breeding_started', 'animation_running')).toBe(true);
    expect(canTransition('animation_running', 'genetics_calculation')).toBe(true);
    expect(canTransition('genetics_calculation', 'ownership_selection')).toBe(true);
    expect(canTransition('ownership_selection', 'result_validation')).toBe(true);
    expect(canTransition('result_validation', 'egg_creation')).toBe(true);
    expect(canTransition('egg_creation', 'completed')).toBe(true);
    expect(canTransition('completed', 'idle')).toBe(true);
  });

  it('allows remaining in the same state', () => {
    expect(canTransition('idle', 'idle')).toBe(true);
    expect(canTransition('animation_running', 'animation_running')).toBe(true);
    expect(canTransition('unknown_phase' as import('../types').BreedingPhase, 'idle')).toBe(false);
  });

  it('rejects forbidden leaps and throws in transitionBreedingPhase', () => {
    expect(canTransition('idle', 'egg_creation')).toBe(false);
    expect(canTransition('breeding_started', 'completed')).toBe(false);

    expect(() => transitionBreedingPhase('idle', 'egg_creation')).toThrow(
      'Transição de estado inválida no fluxo reprodutivo'
    );
  });
});
