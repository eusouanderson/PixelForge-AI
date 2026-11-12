import { describe, it, expect } from 'vitest';
import type { BattleParticipant } from '../types';
import { simulateBattle } from '../domain/battle-engine';

function buildFighterProfile(
  id: string,
  archetype: 'strong' | 'agile' | 'defensive' | 'intelligent' | 'balanced',
  element: 'fire' | 'ice' | 'electric' | 'earth' = 'earth'
): BattleParticipant {
  const baseAttrs = {
    strength: 20,
    defense: 20,
    agility: 20,
    intelligence: 20,
    endurance: 20,
    elementalAffinity: 20
  };

  if (archetype === 'strong') {
    baseAttrs.strength = 45;
    baseAttrs.endurance = 25;
    baseAttrs.agility = 12;
  } else if (archetype === 'agile') {
    baseAttrs.agility = 45;
    baseAttrs.strength = 15;
    baseAttrs.defense = 14;
  } else if (archetype === 'defensive') {
    baseAttrs.defense = 45;
    baseAttrs.endurance = 35;
    baseAttrs.strength = 14;
    baseAttrs.agility = 12;
  } else if (archetype === 'intelligent') {
    baseAttrs.intelligence = 45;
    baseAttrs.elementalAffinity = 35;
    baseAttrs.strength = 14;
  }

  const speciesMap = {
    fire: 'ignisauro' as const,
    ice: 'glacissauro' as const,
    electric: 'electrossauro' as const,
    earth: 'terrassauro' as const
  };

  return {
    peerId: id,
    playerName: `Perfil ${archetype}`,
    creatureInstanceId: `inst-${id}`,
    speciesId: speciesMap[element],
    speciesName: speciesMap[element].toUpperCase(),
    stage: 'adulto',
    level: 15,
    ageHours: 120,
    attributes: baseAttrs,
    needs: { hunger: 90, thirst: 90, energy: 90, happiness: 90, hygiene: 90, health: 90 },
    personalityTemper: archetype === 'strong' ? 'ferocious' : archetype === 'agile' ? 'energetic' : 'stoic',
    element,
    unlockedAttackIds: [],
    combatLevel: 5,
    combatXp: 500,
    isReady: true,
    hasConfirmedWager: true
  };
}

describe('Battle Balance & Archetype Simulations', () => {
  it('simulates 100 matches between Strong and Agile fighters verifying no absolute dominance', () => {
    const strong = buildFighterProfile('f-strong', 'strong', 'fire');
    const agile = buildFighterProfile('f-agile', 'agile', 'electric');

    let strongWins = 0;
    let agileWins = 0;
    let _draws = 0;
    const matchCount = 100;

    for (let i = 0; i < matchCount; i++) {
      const res = simulateBattle(strong, agile, `sim-strong-vs-agile-${i}`);
      if (res.winnerPeerId === 'f-strong') strongWins++;
      else if (res.winnerPeerId === 'f-agile') agileWins++;
      else _draws++;
    }

    const strongWinRate = (strongWins / matchCount) * 100;
    const agileWinRate = (agileWins / matchCount) * 100;

    // Neither archetype dominates 100% of the time
    expect(strongWinRate).toBeGreaterThan(15);
    expect(strongWinRate).toBeLessThan(85);
    expect(agileWinRate).toBeGreaterThan(15);
    expect(agileWinRate).toBeLessThan(85);
  });

  it('simulates Defensive vs Strong verifying high defense provides effective attrition', () => {
    // Isolating archetype stats on equal elemental ground
    const defensive = buildFighterProfile('f-defensive', 'defensive', 'earth');
    const strong = {
      ...buildFighterProfile('f-strong', 'strong', 'earth'),
      attributes: {
        strength: 48,
        defense: 20,
        agility: 18,
        intelligence: 18,
        endurance: 30,
        elementalAffinity: 20
      }
    };

    let defWins = 0;
    let strongWins = 0;
    const matchCount = 80;

    for (let i = 0; i < matchCount; i++) {
      const res = simulateBattle(defensive, strong, `sim-def-vs-strong-${i}`);
      if (res.winnerPeerId === 'f-defensive') defWins++;
      else if (res.winnerPeerId === 'f-strong') strongWins++;
    }

    expect(defWins).toBeGreaterThan(15);
    expect(strongWins).toBeGreaterThan(15);
  });

  it('verifies elemental advantage confers a measurable statistical edge without auto-win', () => {
    // Fire balanced vs Ice fighter with agile counterplay
    const fireFighter = buildFighterProfile('f-fire', 'balanced', 'fire');
    const iceFighter = {
      ...buildFighterProfile('f-ice', 'agile', 'ice'),
      attributes: {
        strength: 22,
        defense: 20,
        agility: 32,
        intelligence: 26,
        endurance: 22,
        elementalAffinity: 24
      }
    };

    let fireWins = 0;
    let iceWins = 0;
    const matchCount = 80;

    for (let i = 0; i < matchCount; i++) {
      const res = simulateBattle(fireFighter, iceFighter, `sim-elemental-edge-${i}`);
      if (res.winnerPeerId === 'f-fire') fireWins++;
      else if (res.winnerPeerId === 'f-ice') iceWins++;
    }

    const fireWinRate = (fireWins / matchCount) * 100;

    // Fire should have a clear advantage (> 50%) but agile Ice can still win (> 10%)
    expect(fireWinRate).toBeGreaterThan(50);
    expect(fireWinRate).toBeLessThan(90);
    expect(iceWins).toBeGreaterThan(5);
  });
});
