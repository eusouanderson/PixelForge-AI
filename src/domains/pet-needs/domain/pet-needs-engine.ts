import type {
  NeedCriticalStatus,
  NeedDecayRatesPerHour,
  NeedsDelta,
  NeedsSimulationResult,
  PetNeedsState
} from '../types';

export const DEFAULT_DECAY_RATES_PER_HOUR: NeedDecayRatesPerHour = {
  hunger: 6,
  thirst: 8,
  energy: 5,
  happiness: 4,
  hygiene: 3
};

export function clampNeedValue(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function createInitialNeeds(): PetNeedsState {
  return {
    hunger: 85,
    thirst: 85,
    energy: 90,
    happiness: 85,
    hygiene: 90,
    health: 100
  };
}

export function applyNeedsDelta(current: PetNeedsState, delta: NeedsDelta): PetNeedsState {
  return {
    hunger: clampNeedValue(current.hunger + (delta.hunger ?? 0)),
    thirst: clampNeedValue(current.thirst + (delta.thirst ?? 0)),
    energy: clampNeedValue(current.energy + (delta.energy ?? 0)),
    happiness: clampNeedValue(current.happiness + (delta.happiness ?? 0)),
    hygiene: clampNeedValue(current.hygiene + (delta.hygiene ?? 0)),
    health: clampNeedValue(current.health + (delta.health ?? 0))
  };
}

export function evaluateNeedCriticalStatus(needs: PetNeedsState): NeedCriticalStatus {
  const isDeceased = needs.health <= 0;
  return {
    isStarving: needs.hunger <= 15,
    isDehydrated: needs.thirst <= 15,
    isExhausted: needs.energy <= 15,
    isDepressed: needs.happiness <= 15,
    isFilthy: needs.hygiene <= 15,
    isSick: needs.health <= 35 || needs.hygiene <= 10,
    isDeceased
  };
}

export function simulateNeedsOverTime(
  previousNeeds: PetNeedsState,
  elapsedMinutes: number,
  decayRates: NeedDecayRatesPerHour = DEFAULT_DECAY_RATES_PER_HOUR
): NeedsSimulationResult {
  const safeMinutes = Math.max(0, elapsedMinutes);
  if (safeMinutes === 0 || previousNeeds.health <= 0) {
    return {
      previousNeeds,
      currentNeeds: previousNeeds,
      elapsedMinutes: 0,
      criticalStatus: evaluateNeedCriticalStatus(previousNeeds)
    };
  }

  const hours = safeMinutes / 60;
  const nextHunger = clampNeedValue(previousNeeds.hunger - decayRates.hunger * hours);
  const nextThirst = clampNeedValue(previousNeeds.thirst - decayRates.thirst * hours);
  const nextEnergy = clampNeedValue(previousNeeds.energy - decayRates.energy * hours);
  const nextHappiness = clampNeedValue(previousNeeds.happiness - decayRates.happiness * hours);
  const nextHygiene = clampNeedValue(previousNeeds.hygiene - decayRates.hygiene * hours);

  let healthPenalty = 0;
  if (nextHunger === 0) healthPenalty += 4 * hours;
  if (nextThirst === 0) healthPenalty += 5 * hours;
  if (nextHygiene <= 10) healthPenalty += 2 * hours;

  const nextHealth = clampNeedValue(previousNeeds.health - healthPenalty);

  const currentNeeds: PetNeedsState = {
    hunger: nextHunger,
    thirst: nextThirst,
    energy: nextEnergy,
    happiness: nextHappiness,
    hygiene: nextHygiene,
    health: nextHealth
  };

  return {
    previousNeeds,
    currentNeeds,
    elapsedMinutes: Math.round(safeMinutes),
    criticalStatus: evaluateNeedCriticalStatus(currentNeeds)
  };
}

