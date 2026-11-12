import { describe, it, expect } from 'vitest';
import type { BattleParticipant } from '../types';
import { initializeFighterRuntime, simulateBattle } from '../domain/battle-engine';

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

describe('Battle Engine Domain', () => {
  it('initializes fighter runtime with stats derived from endurance, defense, stage and needs', () => {
    const fullHealthAdult = createMockParticipant({
      stage: 'adulto',
      needs: { hunger: 100, thirst: 100, energy: 100, happiness: 100, hygiene: 100, health: 100 }
    });
    const partialHealthAdult = createMockParticipant({
      stage: 'adulto',
      needs: { hunger: 100, thirst: 100, energy: 100, happiness: 100, hygiene: 100, health: 90 }
    });
    const baby = createMockParticipant({ stage: 'baby' });

    const fFull = initializeFighterRuntime(fullHealthAdult, 'f-full');
    const fPartial = initializeFighterRuntime(partialHealthAdult, 'f-partial');
    const fBaby = initializeFighterRuntime(baby, 'f-baby');
    const fEgg = initializeFighterRuntime(createMockParticipant({ stage: 'ovo' }), 'f-egg');

    expect(fFull.maxHp).toBeGreaterThan(fBaby.maxHp);
    expect(fEgg.maxHp).toBeGreaterThan(0);
    expect(fFull.maxStamina).toBeGreaterThan(fBaby.maxStamina);
    expect(fFull.currentHp).toBe(fFull.maxHp);
    expect(fPartial.currentHp).toBe(Math.round(fPartial.maxHp * 0.9));

    // Also simulate battle with custom stage to cover stage maturity fallback
    const eggBattle = simulateBattle(
      createMockParticipant({ stage: 'ovo', attributes: { strength: 10, defense: 10, agility: 10, intelligence: 10, endurance: 10, elementalAffinity: 10 } }),
      createMockParticipant({ stage: 'adulto' }),
      'egg-seed'
    );
    expect(eggBattle.events.length).toBeGreaterThan(0);
  });

  it('runs deterministic simulation: identical seed yields identical battle events and winner', () => {
    const p1 = createMockParticipant({ peerId: 'p1', speciesId: 'ignisauro', element: 'fire' });
    const p2 = createMockParticipant({ peerId: 'p2', speciesId: 'glacissauro', element: 'ice' });

    const sim1 = simulateBattle(p1, p2, 'deterministic-battle-seed-xyz');
    const sim2 = simulateBattle(p1, p2, 'deterministic-battle-seed-xyz');

    expect(sim1.winnerPeerId).toBe(sim2.winnerPeerId);
    expect(sim1.events.length).toBe(sim2.events.length);
    expect(sim1.totalDamageFighter1).toBe(sim2.totalDamageFighter1);
    expect(sim1.totalDamageFighter2).toBe(sim2.totalDamageFighter2);
    expect(sim1.fighter1FinalHp).toBe(sim2.fighter1FinalHp);
    expect(sim1.fighter2FinalHp).toBe(sim2.fighter2FinalHp);
  });

  it('generates event sequence with match_start and match_end events', () => {
    const p1 = createMockParticipant({ peerId: 'p1' });
    const p2 = createMockParticipant({ peerId: 'p2' });

    const result = simulateBattle(p1, p2, 'seed-events-test');

    expect(result.events[0].type).toBe('match_start');
    const lastEvent = result.events[result.events.length - 1];
    expect(lastEvent.type).toBe('match_end');
    expect(result.durationTicks).toBeGreaterThan(0);
  });

  it('gives advantage to adult dinosaur over baby dinosaur of same base stats', () => {
    const adult = createMockParticipant({
      peerId: 'adult-peer',
      stage: 'adulto',
      level: 10
    });
    const baby = createMockParticipant({
      peerId: 'baby-peer',
      stage: 'baby',
      level: 1
    });

    // Run over 5 matches with different seeds
    let adultWins = 0;
    for (let i = 0; i < 5; i++) {
      const res = simulateBattle(adult, baby, `seed-age-diff-${i}`);
      if (res.winnerPeerId === 'adult-peer') adultWins++;
    }

    expect(adultWins).toBeGreaterThanOrEqual(4);
  });

  it('handles low health and low hunger care debuffs in combat performance', () => {
    const healthy = createMockParticipant({
      peerId: 'healthy',
      needs: { hunger: 100, thirst: 100, energy: 100, happiness: 100, hygiene: 100, health: 100 }
    });
    const neglected = createMockParticipant({
      peerId: 'neglected',
      needs: { hunger: 10, thirst: 10, energy: 20, happiness: 10, hygiene: 10, health: 40 }
    });

    const res = simulateBattle(healthy, neglected, 'seed-care-diff');
    expect(res.winnerPeerId).toBe('healthy');
  });

  it('handles draw when ticks expire with identical remaining HP ratio', () => {
    // Huge HP pools ensure ticks reach MAX_SIMULATION_TICKS without knockout
    const p1 = createMockParticipant({
      peerId: 'p1',
      stage: 'adulto',
      attributes: { strength: 1, defense: 99, agility: 10, intelligence: 10, endurance: 9999, elementalAffinity: 1 }
    });
    const p2 = createMockParticipant({
      peerId: 'p2',
      stage: 'adulto',
      attributes: { strength: 1, defense: 99, agility: 10, intelligence: 10, endurance: 9999, elementalAffinity: 1 }
    });

    const result = simulateBattle(p1, p2, 'draw-seed-test-123');
    expect(result.durationTicks).toBe(121);
    expect(result.isDraw).toBe(true);
    expect(result.winnerPeerId).toBeNull();
  });

  it('handles timeout resolution when HP ratios differ at tick limit', () => {
    // Both high endurance so battle reaches 120 ticks, but p1 has 100% health, p2 has 50% health
    const p1 = createMockParticipant({
      peerId: 'p1',
      stage: 'adulto',
      needs: { hunger: 100, thirst: 100, energy: 100, happiness: 100, hygiene: 100, health: 100 },
      attributes: { strength: 1, defense: 99, agility: 10, intelligence: 10, endurance: 9999, elementalAffinity: 1 }
    });
    const p2 = createMockParticipant({
      peerId: 'p2',
      stage: 'adulto',
      needs: { hunger: 50, thirst: 50, energy: 50, happiness: 50, hygiene: 50, health: 50 }, // starts with 50% HP ratio
      attributes: { strength: 1, defense: 99, agility: 10, intelligence: 10, endurance: 9999, elementalAffinity: 1 }
    });

    const result1 = simulateBattle(p1, p2, 'timeout-p1-wins-seed');
    expect(result1.durationTicks).toBe(121);
    expect(result1.isDraw).toBe(false);
    expect(result1.winnerPeerId).toBe('p1');

    // Opposite: p2 starts with more HP ratio
    const result2 = simulateBattle(p2, p1, 'timeout-p2-wins-seed');
    expect(result2.durationTicks).toBe(121);
    expect(result2.isDraw).toBe(false);
    expect(result2.winnerPeerId).toBe('p1'); // p1 has 100% health in this call as fighter 2
  });

  it('triggers rest action when stamina is depleted to zero', () => {
    const exhausted1 = createMockParticipant({
      peerId: 'p1',
      needs: { hunger: 50, thirst: 50, energy: 0, happiness: 50, hygiene: 50, health: 100 }
    });
    const p2 = createMockParticipant({ peerId: 'p2' });

    const result = simulateBattle(exhausted1, p2, 'stamina-rest-seed-1');
    expect(result.events.some((e) => e.type === 'stamina_recovered')).toBe(true);
  });
});
