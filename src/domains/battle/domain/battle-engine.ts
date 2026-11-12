import type { CharacterLifeStage } from '@/domains/characters/types';
import type {
  BattleCombatEvent,
  BattleFighterRuntime,
  BattleParticipant,
  BattleSimulationResult,
  BattleStatusEffect
} from '../types';
import { getAttackById } from './attacks-catalog';
import { createDeterministicRng, decideCombatAction } from './combat-ai-engine';
import { getElementalMultiplier } from './elemental-matrix';

export const STAGE_MATURITY_FACTORS: Readonly<Record<CharacterLifeStage, number>> = {
  ovo: 0.1,
  baby: 0.6,
  crianca: 0.75,
  'pre-adolescente': 0.85,
  adolescente: 0.95,
  adulto: 1.0
};

export const MAX_SIMULATION_TICKS = 120;

export function initializeFighterRuntime(
  participant: BattleParticipant,
  fighterId: string
): BattleFighterRuntime {
  const attrs = participant.attributes;
  const needs = participant.needs;
  const stageFactor = STAGE_MATURITY_FACTORS[participant.stage] ?? 1.0;

  // Saúde e cuidados influenciam a vitalidade máxima inicial
  const healthRatio = Math.max(0.4, Math.min(1.0, needs.health / 100));
  const baseHp = (100 + attrs.endurance * 4 + attrs.defense * 1.5 + participant.level * 5) * stageFactor;
  const maxHp = Math.round(baseHp);
  const currentHp = Math.round(maxHp * healthRatio);

  const baseStamina = (60 + attrs.endurance * 2.5 + attrs.agility * 2) * stageFactor;
  const maxStamina = Math.round(baseStamina);
  // Energia baixa reduz a estamina inicial (mínimo 5% para permitir recuperação)
  const energyRatio = Math.max(0.05, Math.min(1.0, needs.energy / 100));
  const currentStamina = Math.round(maxStamina * energyRatio);

  return {
    fighterId,
    participant,
    maxHp,
    currentHp,
    maxStamina,
    currentStamina,
    shieldHp: 0,
    cooldownTicks: 0,
    isDefending: false,
    isDodging: false,
    isResting: false,
    statusEffects: []
  };
}

export function simulateBattle(
  participant1: BattleParticipant,
  participant2: BattleParticipant,
  seed: string
): BattleSimulationResult {
  const rng = createDeterministicRng(seed);
  const battleId = `battle-${seed.slice(0, 12)}`;

  let f1 = initializeFighterRuntime(participant1, participant1.peerId);
  let f2 = initializeFighterRuntime(participant2, participant2.peerId);

  const events: BattleCombatEvent[] = [];
  let sequence = 0;
  let totalDamageF1 = 0;
  let totalDamageF2 = 0;

  events.push({
    sequence: sequence++,
    tick: 0,
    type: 'match_start',
    actorId: f1.fighterId,
    targetId: f2.fighterId,
    actorHp: f1.currentHp,
    targetHp: f2.currentHp,
    actorStamina: f1.currentStamina,
    description: `Batalha iniciada entre ${f1.participant.speciesName} e ${f2.participant.speciesName}!`
  });

  let tick = 1;

  while (tick <= MAX_SIMULATION_TICKS && f1.currentHp > 0 && f2.currentHp > 0) {
    // 1. Processa efeitos contínuos de status em ambos
    const tickStatusResult1 = processStatusEffectsOnTick(f1, tick, sequence);
    f1 = tickStatusResult1.fighter;
    sequence = tickStatusResult1.sequence;
    events.push(...tickStatusResult1.events);

    const tickStatusResult2 = processStatusEffectsOnTick(f2, tick, sequence);
    f2 = tickStatusResult2.fighter;
    sequence = tickStatusResult2.sequence;
    events.push(...tickStatusResult2.events);

    if (f1.currentHp <= 0 || f2.currentHp <= 0) break;

    // 2. Recuperação natural de estamina e redução de cooldown
    f1 = tickFighterUpkeep(f1);
    f2 = tickFighterUpkeep(f2);

    // 3. Ordem de ação baseada na agilidade com ligeira variação determinística
    const speed1 = f1.participant.attributes.agility + rng.nextInt(0, 4);
    const speed2 = f2.participant.attributes.agility + rng.nextInt(0, 4);

    const firstIsF1 = speed1 >= speed2;
    const actorA = firstIsF1 ? f1 : f2;
    const actorB = firstIsF1 ? f2 : f1;

    // Ação do primeiro atacante
    const resA = executeFighterTurn(actorA, actorB, tick, sequence, rng);
    if (firstIsF1) {
      f1 = resA.actor;
      f2 = resA.target;
      totalDamageF1 += resA.damageDealt;
    } else {
      f2 = resA.actor;
      f1 = resA.target;
      totalDamageF2 += resA.damageDealt;
    }
    sequence = resA.sequence;
    events.push(...resA.events);

    if (f1.currentHp <= 0 || f2.currentHp <= 0) break;

    // Ação do segundo lutador
    const currentActorB = firstIsF1 ? f2 : f1;
    const currentTargetB = firstIsF1 ? f1 : f2;
    const resB = executeFighterTurn(currentActorB, currentTargetB, tick, sequence, rng);

    if (firstIsF1) {
      f2 = resB.actor;
      f1 = resB.target;
      totalDamageF2 += resB.damageDealt;
    } else {
      f1 = resB.actor;
      f2 = resB.target;
      totalDamageF1 += resB.damageDealt;
    }
    sequence = resB.sequence;
    events.push(...resB.events);

    tick++;
  }

  // Determina vencedor
  let winnerPeerId: string | null = null;
  let loserPeerId: string | null = null;
  let isDraw = false;

  if (f1.currentHp <= 0 && f2.currentHp <= 0) {
    isDraw = true;
  } else if (f1.currentHp <= 0) {
    winnerPeerId = f2.fighterId;
    loserPeerId = f1.fighterId;
  } else if (f2.currentHp <= 0) {
    winnerPeerId = f1.fighterId;
    loserPeerId = f2.fighterId;
  } else {
    // Esgotamento de tempo (ticks)
    const hpRatio1 = f1.currentHp / f1.maxHp;
    const hpRatio2 = f2.currentHp / f2.maxHp;
    if (Math.abs(hpRatio1 - hpRatio2) < 0.05) {
      isDraw = true;
    } else if (hpRatio1 > hpRatio2) {
      winnerPeerId = f1.fighterId;
      loserPeerId = f2.fighterId;
    } else {
      winnerPeerId = f2.fighterId;
      loserPeerId = f1.fighterId;
    }
  }

  const finalWinnerName = winnerPeerId === f1.fighterId ? f1.participant.speciesName : f2.participant.speciesName;

  events.push({
    sequence,
    tick,
    type: 'match_end',
    actorId: winnerPeerId ?? f1.fighterId,
    actorHp: f1.currentHp,
    targetHp: f2.currentHp,
    actorStamina: f1.currentStamina,
    description: isDraw
      ? 'A batalha terminou em um empate tenso!'
      : `Vitória gloriosa de ${finalWinnerName}!`
  });

  return {
    battleId,
    seed,
    winnerPeerId,
    loserPeerId,
    isDraw,
    durationTicks: tick,
    events,
    fighter1FinalHp: Math.max(0, f1.currentHp),
    fighter2FinalHp: Math.max(0, f2.currentHp),
    totalDamageFighter1: totalDamageF1,
    totalDamageFighter2: totalDamageF2
  };
}

function tickFighterUpkeep(fighter: BattleFighterRuntime): BattleFighterRuntime {
  const endurance = fighter.participant.attributes.endurance;
  const staminaRecovery = Math.max(3, Math.round(endurance * 0.5));
  const newStamina = Math.min(fighter.maxStamina, fighter.currentStamina + staminaRecovery);
  const newCooldown = Math.max(0, fighter.cooldownTicks - 1);

  return {
    ...fighter,
    currentStamina: newStamina,
    cooldownTicks: newCooldown,
    // Limpa postura anterior
    isDefending: false,
    isDodging: false,
    isResting: false
  };
}

interface ProcessStatusResult {
  readonly fighter: BattleFighterRuntime;
  readonly events: readonly BattleCombatEvent[];
  readonly sequence: number;
}

function processStatusEffectsOnTick(
  fighter: BattleFighterRuntime,
  tick: number,
  initialSequence: number
): ProcessStatusResult {
  if (fighter.statusEffects.length === 0) {
    return { fighter, events: [], sequence: initialSequence };
  }

  let hp = fighter.currentHp;
  let seq = initialSequence;
  const newEvents: BattleCombatEvent[] = [];
  const nextEffects: BattleStatusEffect[] = [];

  for (const effect of fighter.statusEffects) {
    if (effect.type === 'burn') {
      const burnDmg = Math.max(2, Math.round(effect.potency));
      hp = Math.max(0, hp - burnDmg);
      newEvents.push({
        sequence: seq++,
        tick,
        type: 'status_damage',
        actorId: fighter.fighterId,
        damage: burnDmg,
        actorHp: hp,
        actorStamina: fighter.currentStamina,
        description: `${fighter.participant.speciesName} sofreu ${burnDmg} de dano contínuo por queimadura!`
      });
    }

    if (effect.remainingTicks > 1) {
      nextEffects.push({
        ...effect,
        remainingTicks: effect.remainingTicks - 1
      });
    }
  }

  return {
    fighter: {
      ...fighter,
      currentHp: hp,
      statusEffects: nextEffects
    },
    events: newEvents,
    sequence: seq
  };
}

interface TurnExecutionResult {
  readonly actor: BattleFighterRuntime;
  readonly target: BattleFighterRuntime;
  readonly events: readonly BattleCombatEvent[];
  readonly damageDealt: number;
  readonly sequence: number;
}

function executeFighterTurn(
  actor: BattleFighterRuntime,
  target: BattleFighterRuntime,
  tick: number,
  initialSequence: number,
  rng: ReturnType<typeof createDeterministicRng>
): TurnExecutionResult {
  // Se estiver em recarga, aguarda
  if (actor.cooldownTicks > 0) {
    return {
      actor,
      target,
      events: [],
      damageDealt: 0,
      sequence: initialSequence
    };
  }

  const decision = decideCombatAction(actor, target, rng);
  let seq = initialSequence;
  const turnEvents: BattleCombatEvent[] = [];

  if (decision.type === 'rest') {
    const recovered = Math.round(actor.maxStamina * 0.35);
    const newStamina = Math.min(actor.maxStamina, actor.currentStamina + recovered);
    turnEvents.push({
      sequence: seq++,
      tick,
      type: 'stamina_recovered',
      actorId: actor.fighterId,
      staminaDelta: recovered,
      actorHp: actor.currentHp,
      actorStamina: newStamina,
      description: `${actor.participant.speciesName} recuperou ${recovered} de estamina respirando fundo.`
    });
    return {
      actor: {
        ...actor,
        currentStamina: newStamina,
        isResting: true,
        cooldownTicks: 1
      },
      target,
      events: turnEvents,
      damageDealt: 0,
      sequence: seq
    };
  }

  if (decision.type === 'defend') {
    turnEvents.push({
      sequence: seq++,
      tick,
      type: 'action_decided',
      actorId: actor.fighterId,
      actorHp: actor.currentHp,
      actorStamina: actor.currentStamina,
      description: `${actor.participant.speciesName} adotou postura de guarda e bloqueio reforçado!`
    });
    return {
      actor: {
        ...actor,
        isDefending: true,
        cooldownTicks: 1
      },
      target,
      events: turnEvents,
      damageDealt: 0,
      sequence: seq
    };
  }

  if (decision.type === 'dodge') {
    turnEvents.push({
      sequence: seq++,
      tick,
      type: 'action_decided',
      actorId: actor.fighterId,
      actorHp: actor.currentHp,
      actorStamina: actor.currentStamina,
      description: `${actor.participant.speciesName} se posicionou ágil para esquivar do próximo ataque!`
    });
    return {
      actor: {
        ...actor,
        isDodging: true,
        cooldownTicks: 1
      },
      target,
      events: turnEvents,
      damageDealt: 0,
      sequence: seq
    };
  }

  // Ação de Ataque
  const attack = getAttackById(decision.attackId ?? '') ?? getAttackById('golpe-instintivo')!;
  const staminaUsed = Math.min(actor.currentStamina, attack.staminaCost);
  const remainingStamina = Math.max(0, actor.currentStamina - staminaUsed);

  turnEvents.push({
    sequence: seq++,
    tick,
    type: 'attack_launched',
    actorId: actor.fighterId,
    targetId: target.fighterId,
    attackId: attack.id,
    attackName: attack.name,
    element: attack.element,
    staminaDelta: -staminaUsed,
    actorHp: actor.currentHp,
    targetHp: target.currentHp,
    actorStamina: remainingStamina,
    description: `${actor.participant.speciesName} desferiu ${attack.name}!`
  });

  // 1. Verifica esquiva do alvo
  const targetAgility = target.participant.attributes.agility;
  const actorAgility = actor.participant.attributes.agility;
  const baseDodge = target.isDodging ? 0.35 : 0.04;
  const agilDiff = Math.max(-10, Math.min(25, targetAgility - actorAgility));
  const dodgeChance = Math.max(0.02, Math.min(0.55, baseDodge + agilDiff * 0.006));

  if (rng.next() < dodgeChance) {
    turnEvents.push({
      sequence: seq++,
      tick,
      type: 'attack_dodged',
      actorId: target.fighterId,
      targetId: actor.fighterId,
      actorHp: target.currentHp,
      actorStamina: target.currentStamina,
      description: `${target.participant.speciesName} esquivou com reflexos impecáveis!`
    });

    return {
      actor: {
        ...actor,
        currentStamina: remainingStamina,
        cooldownTicks: attack.recoveryTicks
      },
      target,
      events: turnEvents,
      damageDealt: 0,
      sequence: seq
    };
  }

  // 2. Cálculo do dano base e bônus de atributos
  const attrs = actor.participant.attributes;
  const stageMult = STAGE_MATURITY_FACTORS[actor.participant.stage] ?? 1.0;

  let scaledPower = attack.baseDamage;
  if (attack.attributeScaling.strength) scaledPower += attrs.strength * attack.attributeScaling.strength * 1.2;
  if (attack.attributeScaling.agility) scaledPower += attrs.agility * attack.attributeScaling.agility;
  if (attack.attributeScaling.defense) scaledPower += attrs.defense * attack.attributeScaling.defense * 0.8;
  if (attack.attributeScaling.intelligence) scaledPower += attrs.intelligence * attack.attributeScaling.intelligence;
  if (attack.attributeScaling.endurance) scaledPower += attrs.endurance * attack.attributeScaling.endurance * 0.8;
  if (attack.attributeScaling.elementalAffinity) {
    scaledPower += attrs.elementalAffinity * attack.attributeScaling.elementalAffinity * 1.2;
  }

  // Penetração de armadura: Força bruta perfura defesas elevadas
  const targetDef = target.participant.attributes.defense;
  if (attrs.strength > targetDef) {
    scaledPower += (attrs.strength - targetDef) * 0.6;
  }

  // Modificadores nutricionais/fome
  if (actor.participant.needs.hunger < 25 || actor.participant.needs.thirst < 25) {
    scaledPower *= 0.82;
  }

  // Multiplicador elemental
  const elementalMult = getElementalMultiplier(attack.element, target.participant.element);
  scaledPower *= elementalMult;
  scaledPower *= stageMult;

  // Crítico
  const critChance = Math.min(0.35, (attack.criticalChancePercent + attrs.agility * 0.3) / 100);
  const isCrit = rng.next() < critChance;
  if (isCrit) {
    scaledPower *= 1.45;
    turnEvents.push({
      sequence: seq++,
      tick,
      type: 'critical_hit',
      actorId: actor.fighterId,
      targetId: target.fighterId,
      actorHp: actor.currentHp,
      actorStamina: remainingStamina,
      description: 'Acerto Crítico fulminante!'
    });
  }

  // Mitigação de Defesa do alvo
  const defMitigation = 100 / (100 + targetDef * 0.9);
  let finalDamage = Math.max(3, Math.round(scaledPower * defMitigation));

  if (target.isDefending) {
    const absorbed = Math.round(finalDamage * 0.35);
    finalDamage = Math.max(2, finalDamage - absorbed);
    turnEvents.push({
      sequence: seq++,
      tick,
      type: 'attack_blocked',
      actorId: target.fighterId,
      absorbedDamage: absorbed,
      actorHp: target.currentHp,
      actorStamina: target.currentStamina,
      description: `${target.participant.speciesName} bloqueou parte do impacto (-${absorbed} dano)!`
    });
  }

  const nextTargetHp = Math.max(0, target.currentHp - finalDamage);

  turnEvents.push({
    sequence: seq++,
    tick,
    type: 'damage_inflicted',
    actorId: actor.fighterId,
    targetId: target.fighterId,
    damage: finalDamage,
    actorHp: actor.currentHp,
    targetHp: nextTargetHp,
    actorStamina: remainingStamina,
    description: `${attack.name} infligiu ${finalDamage} de dano a ${target.participant.speciesName}!`
  });

  // Efeito de status secundário (queimadura, etc)
  const nextStatusEffects = [...target.statusEffects];
  if (attack.effectType && attack.effectChancePercent && rng.next() < (attack.effectChancePercent / 100)) {
    nextStatusEffects.push({
      id: `${attack.effectType}-${seq}`,
      type: attack.effectType,
      remainingTicks: 3,
      potency: Math.max(2, Math.round(finalDamage * 0.25))
    });

    turnEvents.push({
      sequence: seq++,
      tick,
      type: 'status_applied',
      actorId: actor.fighterId,
      targetId: target.fighterId,
      actorHp: actor.currentHp,
      targetHp: nextTargetHp,
      actorStamina: remainingStamina,
      description: `${target.participant.speciesName} foi afligido por ${attack.effectType}!`
    });
  }

  if (nextTargetHp === 0) {
    turnEvents.push({
      sequence: seq++,
      tick,
      type: 'fighter_fainted',
      actorId: target.fighterId,
      actorHp: 0,
      actorStamina: target.currentStamina,
      description: `${target.participant.speciesName} perdeu todos os pontos de vida e tombou!`
    });
  }

  return {
    actor: {
      ...actor,
      currentStamina: remainingStamina,
      cooldownTicks: attack.recoveryTicks
    },
    target: {
      ...target,
      currentHp: nextTargetHp,
      statusEffects: nextStatusEffects
    },
    events: turnEvents,
    damageDealt: finalDamage,
    sequence: seq
  };
}
