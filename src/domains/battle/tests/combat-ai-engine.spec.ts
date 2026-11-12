import { describe, it, expect } from 'vitest';
import type { BattleFighterRuntime, BattleParticipant } from '../types';
import { createDeterministicRng, decideCombatAction } from '../domain/combat-ai-engine';
import { initializeFighterRuntime } from '../domain/battle-engine';

function createMockParticipant(overrides: Partial<BattleParticipant> = {}): BattleParticipant {
  return {
    peerId: 'peer-1',
    playerName: 'Treinador A',
    creatureInstanceId: 'inst-1',
    speciesId: 'ignisauro',
    speciesName: 'Ignisauro',
    stage: 'adulto',
    level: 15,
    ageHours: 100,
    attributes: {
      strength: 30,
      defense: 25,
      agility: 25,
      intelligence: 25,
      endurance: 30,
      elementalAffinity: 30
    },
    needs: {
      hunger: 90,
      thirst: 90,
      energy: 90,
      happiness: 90,
      hygiene: 90,
      health: 90
    },
    personalityTemper: 'ferocious',
    element: 'fire',
    unlockedAttackIds: [],
    combatLevel: 5,
    combatXp: 500,
    isReady: true,
    hasConfirmedWager: true,
    ...overrides
  };
}

describe('Combat AI Engine', () => {
  it('deterministic RNG produces repeatable pseudo-random numbers from same seed', () => {
    const rng1 = createDeterministicRng('battle-seed-123');
    const rng2 = createDeterministicRng('battle-seed-123');

    for (let i = 0; i < 20; i++) {
      expect(rng1.next()).toBe(rng2.next());
      expect(rng1.nextInt(1, 100)).toBe(rng2.nextInt(1, 100));
    }
  });

  it('chooses rest when stamina is depleted below minimum attack cost', () => {
    const p1 = createMockParticipant();
    const p2 = createMockParticipant({ peerId: 'peer-2', speciesId: 'glacissauro', element: 'ice' });

    const f1 = {
      ...initializeFighterRuntime(p1, 'peer-1'),
      currentStamina: 2 // muito baixa
    };
    const f2 = initializeFighterRuntime(p2, 'peer-2');
    const rng = createDeterministicRng('seed-rest');

    const decision = decideCombatAction(f1, f2, rng);
    expect(decision.type).toBe('rest');
    expect(decision.reason).toContain('Recuperando fôlego');
  });

  it('considers tactical defense or dodge when HP is critically low', () => {
    const p1 = createMockParticipant({
      attributes: {
        strength: 20,
        defense: 40,
        agility: 10,
        intelligence: 30,
        endurance: 20,
        elementalAffinity: 20
      }
    });
    const p2 = createMockParticipant({ peerId: 'peer-2' });

    const f1: BattleFighterRuntime = {
      ...initializeFighterRuntime(p1, 'peer-1'),
      currentHp: 15 // HP crítico
    };
    const f2 = initializeFighterRuntime(p2, 'peer-2');

    // Test across several deterministic seeds to verify defensive trigger
    let hasDefended = false;
    for (let i = 0; i < 15; i++) {
      const rng = createDeterministicRng(`seed-defensive-${i}`);
      const decision = decideCombatAction(f1, f2, rng);
      if (decision.type === 'defend' || decision.type === 'dodge') {
        hasDefended = true;
        break;
      }
    }
    expect(hasDefended).toBe(true);
  });

  it('selects offensive attack with intelligence-weighted elemental advantage', () => {
    const p1 = createMockParticipant({
      speciesId: 'ignisauro',
      element: 'fire',
      attributes: {
        strength: 35,
        defense: 20,
        agility: 20,
        intelligence: 30, // Inteligência alta para notar vantagem
        endurance: 30,
        elementalAffinity: 30
      }
    });
    // Adversário de gelo (fogo tem vantagem super-efetiva)
    const p2 = createMockParticipant({ peerId: 'peer-2', speciesId: 'glacissauro', element: 'ice' });

    const f1 = initializeFighterRuntime(p1, 'peer-1');
    const f2 = initializeFighterRuntime(p2, 'peer-2');
    const rng = createDeterministicRng('seed-attack-choice');

    const decision = decideCombatAction(f1, f2, rng);
    expect(decision.type).toBe('attack');
    expect(decision.attackId).toBeDefined();
  });

  it('supports energetic and stoic temperaments proactively dodging or blocking', () => {
    const stoicParticipant = createMockParticipant({
      personalityTemper: 'stoic',
      attributes: { strength: 20, defense: 30, agility: 10, intelligence: 10, endurance: 20, elementalAffinity: 10 }
    });
    const energeticParticipant = createMockParticipant({
      personalityTemper: 'energetic',
      attributes: { strength: 10, defense: 10, agility: 35, intelligence: 10, endurance: 20, elementalAffinity: 10 }
    });
    const opponent = createMockParticipant({ peerId: 'peer-2' });

    const fStoic = initializeFighterRuntime(stoicParticipant, 'peer-1');
    const fEnergetic = initializeFighterRuntime(energeticParticipant, 'peer-1');
    const fOpp = initializeFighterRuntime(opponent, 'peer-2');

    let stoicBlocked = false;
    let energeticDodged = false;

    for (let i = 0; i < 30; i++) {
      const rng1 = createDeterministicRng(`stoic-seed-${i}`);
      const d1 = decideCombatAction(fStoic, fOpp, rng1);
      if (d1.type === 'defend') stoicBlocked = true;

      const rng2 = createDeterministicRng(`energetic-seed-${i}`);
      const d2 = decideCombatAction(fEnergetic, fOpp, rng2);
      if (d2.type === 'dodge') energeticDodged = true;
    }

    expect(stoicBlocked).toBe(true);
    expect(energeticDodged).toBe(true);
  });

  it('curious temperament favors special attacks and handles weighted RNG choices', () => {
    const curiousParticipant = createMockParticipant({
      personalityTemper: 'curious',
      speciesId: 'ignisauro',
      attributes: { strength: 20, defense: 20, agility: 20, intelligence: 20, endurance: 20, elementalAffinity: 25 }
    });
    const opponent = createMockParticipant({ peerId: 'peer-2' });

    const fCurious = initializeFighterRuntime(curiousParticipant, 'peer-1');
    const fOpp = initializeFighterRuntime(opponent, 'peer-2');

    // Deterministic mock RNG that forces alternative pick
    let counter = 0;
    const alternatingRng = {
      next: () => {
        counter++;
        return counter % 2 === 0 ? 0.99 : 0.1;
      },
      nextInt: (min: number, _max: number) => min
    };

    const d1 = decideCombatAction(fCurious, fOpp, alternatingRng);
    expect(d1.type).toBe('attack');
  });
});
