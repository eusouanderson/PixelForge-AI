import type { BattleActionDecision, BattleFighterRuntime } from '../types';
import { getElementalMultiplier } from './elemental-matrix';
import { resolveAvailableAttacks } from './attacks-catalog';

export interface DeterministicRng {
  next(): number;
  nextInt(min: number, max: number): number;
}

export function createDeterministicRng(seed: string): DeterministicRng {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }

  let state = h >>> 0;

  return {
    next(): number {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    },
    nextInt(min: number, max: number): number {
      const n = this.next();
      return Math.floor(n * (max - min + 1)) + min;
    }
  };
}

export function decideCombatAction(
  fighter: BattleFighterRuntime,
  opponent: BattleFighterRuntime,
  rng: DeterministicRng
): BattleActionDecision {
  const attacks = resolveAvailableAttacks(fighter.participant);
  const staminaRatio = fighter.currentStamina / Math.max(1, fighter.maxStamina);
  const hpRatio = fighter.currentHp / Math.max(1, fighter.maxHp);
  const temper = fighter.participant.personalityTemper;
  const intelligence = fighter.participant.attributes.intelligence;
  const agility = fighter.participant.attributes.agility;
  const defense = fighter.participant.attributes.defense;

  // 1. Cansaço extremo: necessita recuperar estamina
  const minStaminaAttack = Math.min(...attacks.map((a) => a.staminaCost));
  if (fighter.currentStamina < minStaminaAttack || (staminaRatio < 0.18 && rng.next() < 0.7)) {
    return {
      type: 'rest',
      reason: 'Recuperando fôlego e estamina para a próxima ação.'
    };
  }

  // 2. Reação defensiva tática quando sob pressão (HP baixo)
  if (hpRatio < 0.35) {
    const defenseScore = defense * 1.2;
    const dodgeScore = agility * 1.3;
    const shouldReactDefensively = rng.next() < (intelligence > 20 ? 0.45 : 0.25);

    if (shouldReactDefensively) {
      if (dodgeScore >= defenseScore && staminaRatio >= 0.25) {
        return {
          type: 'dodge',
          reason: 'Agilidade elevada para tentar esquiva evasiva.'
        };
      }
      return {
        type: 'defend',
        reason: 'Postura defensiva para absorver o impacto.'
      };
    }
  }

  // 3. Temperamento influenciando esquiva ou bloqueio proativo
  if (temper === 'stoic' && rng.next() < 0.25) {
    return {
      type: 'defend',
      reason: 'Postura estóica bloqueando avanço inimigo.'
    };
  }
  if (temper === 'energetic' && agility > 18 && rng.next() < 0.22) {
    return {
      type: 'dodge',
      reason: 'Finta ágil e evasão rápida.'
    };
  }

  // 4. Seleção estratégica de ataque
  // Inteligência alta pontua fraquezas elementais
  const affordableAttacks = attacks.filter((atk) => atk.staminaCost <= fighter.currentStamina);
  const candidatePool = affordableAttacks.length > 0 ? affordableAttacks : attacks;

  const scoredAttacks = candidatePool.map((atk) => {
    let score = atk.baseDamage;
    const elementalMult = getElementalMultiplier(atk.element, opponent.participant.element);

    if (intelligence >= 15) {
      score *= elementalMult;
    }

    if (temper === 'ferocious' && atk.category === 'physical') {
      score *= 1.25;
    } else if (temper === 'curious' && atk.category === 'special') {
      score *= 1.25;
    }

    return { attack: atk, score };
  });

  scoredAttacks.sort((a, b) => b.score - a.score);

  // Seleciona o melhor ataque com probabilidade ponderada por inteligência
  const pickBestChance = Math.min(0.9, 0.45 + (intelligence / 100));
  const chosen = (rng.next() < pickBestChance || scoredAttacks.length === 1)
    ? scoredAttacks[0].attack
    : scoredAttacks[rng.nextInt(0, scoredAttacks.length - 1)].attack;

  return {
    type: 'attack',
    attackId: chosen.id,
    reason: `Executando ataque ${chosen.name}.`
  };
}
