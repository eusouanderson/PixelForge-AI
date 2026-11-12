import { describe, it, expect } from 'vitest';
import {
  AGE_SLEEP_CONFIGURATIONS,
  getSleepConfigForStage,
  shouldCharacterFallAsleep,
  startSleepSession,
  computeSleepProgressAndEnergy,
  evaluateSleepStateOverTime
} from '../domain/sleep-engine';
import type { CharacterSleepSession } from '../types';

describe('Sleep Engine', () => {
  describe('AGE_SLEEP_CONFIGURATIONS & getSleepConfigForStage', () => {
    it('returns null for egg stage', () => {
      expect(getSleepConfigForStage('ovo')).toBeNull();
    });

    it('returns proper age configuration for baby', () => {
      const config = getSleepConfigForStage('baby');
      expect(config).toBeDefined();
      expect(config?.fatigueThreshold).toBe(40);
      expect(config?.durationMinutes).toBe(15);
      expect(config?.label).toBe('Bebê');
    });

    it('returns proper age configuration for crianca, pre-adolescente, and adolescente', () => {
      for (const stage of ['crianca', 'pre-adolescente', 'adolescente'] as const) {
        const config = getSleepConfigForStage(stage);
        expect(config?.fatigueThreshold).toBe(25);
        expect(config?.durationMinutes).toBe(10);
      }
    });

    it('returns proper age configuration for adulto', () => {
      const config = getSleepConfigForStage('adulto');
      expect(config?.fatigueThreshold).toBe(15);
      expect(config?.durationMinutes).toBe(6);
      expect(config?.label).toBe('Adulto');
    });

    it('returns fallback for unknown stage string cast', () => {
      // @ts-expect-error test invalid stage
      expect(getSleepConfigForStage('unknown')).toBeNull();
    });
  });

  describe('shouldCharacterFallAsleep', () => {
    it('never falls asleep if stage is ovo', () => {
      expect(shouldCharacterFallAsleep('ovo', 0)).toBe(false);
    });

    it('never falls asleep if isDeceased is true', () => {
      expect(shouldCharacterFallAsleep('baby', 0, null, Date.now(), true)).toBe(false);
    });

    it('never falls asleep if already sleeping', () => {
      const now = Date.now();
      const session: CharacterSleepSession = {
        state: 'sleeping',
        startedAtMs: now - 1000,
        durationMinutes: 15,
        wakeAtMs: now + 14 * 60 * 1000,
        energyAtStart: 10,
        targetEnergy: 100,
        lastEnergyUpdateMs: now - 1000
      };
      expect(shouldCharacterFallAsleep('baby', 10, session, now, false)).toBe(false);
    });

    it('respects min awake cooldown if character woke up recently', () => {
      const now = 1000000;
      const babyConfig = AGE_SLEEP_CONFIGURATIONS.baby;
      const recentWakeAtMs = now - 5 * 60 * 1000; // woke up 5 mins ago (cooldown is 15 mins)
      const session: CharacterSleepSession = {
        state: 'awake',
        startedAtMs: recentWakeAtMs - 15 * 60 * 1000,
        durationMinutes: 15,
        wakeAtMs: recentWakeAtMs,
        energyAtStart: 10,
        targetEnergy: 100,
        lastEnergyUpdateMs: recentWakeAtMs
      };

      // Even with 0 energy, cooldown prevents immediately falling back asleep
      expect(shouldCharacterFallAsleep('baby', 0, session, now, false)).toBe(false);

      // Once cooldown has passed
      const pastCooldownNow = recentWakeAtMs + (babyConfig.minAwakeCooldownMinutes + 1) * 60 * 1000;
      expect(shouldCharacterFallAsleep('baby', 30, session, pastCooldownNow, false)).toBe(true);
    });

    it('returns false when energy is above fatigue threshold', () => {
      expect(shouldCharacterFallAsleep('adulto', 50)).toBe(false);
      expect(shouldCharacterFallAsleep('baby', 45)).toBe(false);
    });

    it('returns true when energy is at or below fatigue threshold', () => {
      expect(shouldCharacterFallAsleep('baby', 40)).toBe(true);
      expect(shouldCharacterFallAsleep('baby', 20)).toBe(true);
      expect(shouldCharacterFallAsleep('adulto', 15)).toBe(true);
      expect(shouldCharacterFallAsleep('adulto', 5)).toBe(true);
    });

    it('returns false if stage config is missing', () => {
      // @ts-expect-error test invalid stage
      expect(shouldCharacterFallAsleep('alien', 5)).toBe(false);
    });
  });

  describe('startSleepSession', () => {
    it('creates a sleeping session with correct duration and energy targets for baby', () => {
      const now = 500000;
      const session = startSleepSession('baby', 25, now);
      expect(session.state).toBe('sleeping');
      expect(session.startedAtMs).toBe(now);
      expect(session.durationMinutes).toBe(15);
      expect(session.wakeAtMs).toBe(now + 15 * 60 * 1000);
      expect(session.energyAtStart).toBe(25);
      expect(session.targetEnergy).toBe(100);
      expect(session.lastEnergyUpdateMs).toBe(now);
    });

    it('creates a sleeping session with correct duration and energy targets for adulto', () => {
      const now = 500000;
      const session = startSleepSession('adulto', 10, now);
      expect(session.state).toBe('sleeping');
      expect(session.startedAtMs).toBe(now);
      expect(session.durationMinutes).toBe(6);
      expect(session.wakeAtMs).toBe(now + 6 * 60 * 1000);
      expect(session.energyAtStart).toBe(10);
      expect(session.targetEnergy).toBe(100);
    });

    it('falls back gracefully to adult defaults if unknown stage', () => {
      const now = 500000;
      // @ts-expect-error test unknown stage fallback
      const session = startSleepSession('alien', 10, now);
      expect(session.durationMinutes).toBe(AGE_SLEEP_CONFIGURATIONS.adulto.durationMinutes);
    });
  });

  describe('computeSleepProgressAndEnergy', () => {
    it('returns 100 energy and completes when time meets or exceeds wakeAtMs', () => {
      const start = 100000;
      const session = startSleepSession('adulto', 10, start);
      const afterWake = session.wakeAtMs + 5000;

      const result = computeSleepProgressAndEnergy(session, 'adulto', afterWake);
      expect(result.isCompleted).toBe(true);
      expect(result.energy).toBe(100);
      expect(result.updatedSession).toBeNull();
    });

    it('recovers energy linearly and updates lastEnergyUpdateMs during mid-sleep', () => {
      const start = 100000;
      const session = startSleepSession('adulto', 0, start); // 6 mins total duration
      const halfWay = start + 3 * 60 * 1000; // 50% elapsed

      const result = computeSleepProgressAndEnergy(session, 'adulto', halfWay);
      expect(result.isCompleted).toBe(false);
      expect(result.energy).toBe(50); // 0 + (100 - 0) * 0.5 = 50
      expect(result.updatedSession?.lastEnergyUpdateMs).toBe(halfWay);
      expect(result.updatedSession?.state).toBe('sleeping');
    });

    it('handles negative or zero elapsed time gracefully', () => {
      const start = 100000;
      const session = startSleepSession('adulto', 20, start);

      const result = computeSleepProgressAndEnergy(session, 'adulto', start - 1000);
      expect(result.isCompleted).toBe(false);
      expect(result.energy).toBe(20);
    });
  });

  describe('evaluateSleepStateOverTime', () => {
    it('returns awake with no changes for ovo stage or deceased character', () => {
      const resEgg = evaluateSleepStateOverTime('ovo', 10, null, 100000, false);
      expect(resEgg.sleepState).toBe('awake');
      expect(resEgg.transition).toBe('none');

      const resDeceased = evaluateSleepStateOverTime('adulto', 0, null, 100000, true);
      expect(resDeceased.sleepState).toBe('awake');
      expect(resDeceased.transition).toBe('none');
    });

    it('transitions to fell_asleep when energy reaches threshold for stage', () => {
      const now = 200000;
      const result = evaluateSleepStateOverTime('baby', 35, null, now, false);
      expect(result.sleepState).toBe('sleeping');
      expect(result.transition).toBe('fell_asleep');
      expect(result.session).not.toBeNull();
      expect(result.message).toContain('adormeceu');
    });

    it('remains awake when energy is above threshold', () => {
      const now = 200000;
      const result = evaluateSleepStateOverTime('baby', 80, null, now, false);
      expect(result.sleepState).toBe('awake');
      expect(result.transition).toBe('none');
      expect(result.session).toBeNull();
    });

    it('updates energy while sleeping', () => {
      const start = 100000;
      const session = startSleepSession('baby', 10, start); // 15 mins total
      const midTime = start + 7.5 * 60 * 1000; // 50% elapsed

      const result = evaluateSleepStateOverTime('baby', 10, session, midTime, false);
      expect(result.sleepState).toBe('sleeping');
      expect(result.transition).toBe('none');
      expect(result.energy).toBe(55); // 10 + (100 - 10) * 0.5 = 55
      expect(result.session?.lastEnergyUpdateMs).toBe(midTime);
    });

    it('wakes up automatically when duration has elapsed', () => {
      const start = 100000;
      const session = startSleepSession('baby', 10, start);
      const afterWake = session.wakeAtMs + 1000;

      const result = evaluateSleepStateOverTime('baby', 10, session, afterWake, false);
      expect(result.sleepState).toBe('awake');
      expect(result.transition).toBe('woke_up');
      expect(result.session).toBeNull();
      expect(result.energy).toBe(100);
      expect(result.message).toContain('acordou');
    });
  });
});
