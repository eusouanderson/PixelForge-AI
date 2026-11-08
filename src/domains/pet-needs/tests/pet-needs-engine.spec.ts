import { describe, it, expect } from 'vitest';
import {
  clampNeedValue,
  createInitialNeeds,
  applyNeedsDelta,
  evaluateNeedCriticalStatus,
  simulateNeedsOverTime
} from '../domain/pet-needs-engine';

describe('pet-needs domain engine', () => {
  it('clamps need values strictly between 0 and 100 and handles NaN', () => {
    expect(clampNeedValue(150)).toBe(100);
    expect(clampNeedValue(-25)).toBe(0);
    expect(clampNeedValue(42.6)).toBe(43);
    expect(clampNeedValue(Number.NaN)).toBe(0);
  });

  it('creates balanced initial needs and applies deltas immutably', () => {
    const initial = createInitialNeeds();
    expect(initial).toEqual({
      hunger: 85,
      thirst: 85,
      energy: 90,
      happiness: 85,
      hygiene: 90,
      health: 100
    });

    const updated = applyNeedsDelta(initial, {
      hunger: 20,
      thirst: -10,
      energy: -100,
      happiness: 5,
      hygiene: -5,
      health: -15
    });
    expect(updated).toEqual({
      hunger: 100,
      thirst: 75,
      energy: 0,
      happiness: 90,
      hygiene: 85,
      health: 85
    });

    const noChange = applyNeedsDelta(initial, {});
    expect(noChange).toEqual(initial);
  });

  it('evaluates critical status thresholds accurately', () => {
    const healthyStatus = evaluateNeedCriticalStatus(createInitialNeeds());
    expect(healthyStatus.isStarving).toBe(false);
    expect(healthyStatus.isSick).toBe(false);
    expect(healthyStatus.isDeceased).toBe(false);

    const criticalStatus = evaluateNeedCriticalStatus({
      hunger: 10,
      thirst: 12,
      energy: 5,
      happiness: 10,
      hygiene: 8,
      health: 30
    });
    expect(criticalStatus).toEqual({
      isStarving: true,
      isDehydrated: true,
      isExhausted: true,
      isDepressed: true,
      isFilthy: true,
      isSick: true,
      isDeceased: false
    });

    const deadStatus = evaluateNeedCriticalStatus({
      hunger: 0,
      thirst: 0,
      energy: 0,
      happiness: 0,
      hygiene: 0,
      health: 0
    });
    expect(deadStatus.isDeceased).toBe(true);
  });

  it('simulates needs decay over minutes, hours, and days including negative/zero time', () => {
    const start = createInitialNeeds();

    // Negative or zero elapsed time returns unchanged state
    const zeroSim = simulateNeedsOverTime(start, -10);
    expect(zeroSim.elapsedMinutes).toBe(0);
    expect(zeroSim.currentNeeds).toEqual(start);

    // 2 hours (120 minutes) decay
    const twoHoursSim = simulateNeedsOverTime(start, 120);
    expect(twoHoursSim.elapsedMinutes).toBe(120);
    expect(twoHoursSim.currentNeeds.hunger).toBeLessThan(start.hunger);
    expect(twoHoursSim.currentNeeds.thirst).toBeLessThan(start.thirst);
    expect(twoHoursSim.currentNeeds.health).toBe(100);

    // 48 hours (2880 minutes) extreme neglect causes starvation, dehydration, and health drop to 0
    const twoDaysSim = simulateNeedsOverTime(start, 2880);
    expect(twoDaysSim.currentNeeds.hunger).toBe(0);
    expect(twoDaysSim.currentNeeds.thirst).toBe(0);
    expect(twoDaysSim.currentNeeds.health).toBe(0);
    expect(twoDaysSim.criticalStatus.isDeceased).toBe(true);
  });
});

