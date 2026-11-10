import { describe, expect, it } from 'vitest';
import { createNewGameSaveSnapshot } from '@/domains/persistence/domain/persistence-engine';
import type { GameSaveSnapshot } from '@/domains/persistence/types';
import {
  CARE_APPROACHING_CRITICAL_THRESHOLD,
  CARE_CRITICAL_THRESHOLD,
  computeMinutesUntilThreshold,
  evaluateCharacterCareAlerts,
  formatCareSummaryBanner,
  HEALTH_APPROACHING_CRITICAL_THRESHOLD,
  HEALTH_CRITICAL_THRESHOLD
} from '../domain/care-notification-engine';

const NOW_MS = 1_760_000_000_000;

function makeHatchedSnapshot(overrides?: {
  nickname?: string;
  hunger?: number;
  thirst?: number;
  energy?: number;
  happiness?: number;
  hygiene?: number;
  health?: number;
  stage?: GameSaveSnapshot['characters']['ignisauro']['runtime']['currentStage'];
  healthCondition?: GameSaveSnapshot['characters']['ignisauro']['runtime']['healthCondition'];
  activeDiseases?: GameSaveSnapshot['characters']['ignisauro']['runtime']['activeDiseases'];
}): GameSaveSnapshot {
  const snapshot = createNewGameSaveSnapshot(NOW_MS, 'ignisauro');
  const current = snapshot.characters.ignisauro;
  return {
    ...snapshot,
    characters: {
      ...snapshot.characters,
      ignisauro: {
        ...current,
        needs: {
          hunger: overrides?.hunger ?? 90,
          thirst: overrides?.thirst ?? 90,
          energy: overrides?.energy ?? 90,
          happiness: overrides?.happiness ?? 90,
          hygiene: overrides?.hygiene ?? 90,
          health: overrides?.health ?? 95
        },
        runtime: {
          ...current.runtime,
          currentStage: overrides?.stage ?? 'baby',
          healthCondition: overrides?.healthCondition ?? 'healthy',
          activeDiseases: overrides?.activeDiseases ?? [],
          customNickname: overrides?.nickname ?? ''
        }
      }
    }
  };
}

describe('care-notification-engine', () => {
  it('computes minutes until threshold crossing accurately', () => {
    expect(computeMinutesUntilThreshold(25, 25, 6)).toBe(0);
    expect(computeMinutesUntilThreshold(18, 25, 6)).toBe(0);
    expect(computeMinutesUntilThreshold(30, 25, 6)).toBe(50);
    expect(computeMinutesUntilThreshold(25.001, 25, 60)).toBe(1);
  });

  it('returns empty alerts for unhatched eggs or deceased creatures', () => {
    const eggSnapshot = makeHatchedSnapshot({
      stage: 'ovo',
      hunger: 5,
      health: 10
    });
    const eggEval = evaluateCharacterCareAlerts(eggSnapshot, NOW_MS);
    expect(eggEval.immediateAlerts).toHaveLength(0);
    expect(eggEval.scheduledAlerts).toHaveLength(0);
    expect(eggEval.activeWarningCount).toBe(0);
    expect(eggEval.activeCriticalCount).toBe(0);
    expect(formatCareSummaryBanner(eggEval)).toBeNull();

    const deadSnapshot = makeHatchedSnapshot({
      stage: 'adulto',
      healthCondition: 'deceased',
      hunger: 0,
      health: 0
    });
    const deadEval = evaluateCharacterCareAlerts(deadSnapshot, NOW_MS);
    expect(deadEval.immediateAlerts).toHaveLength(0);
    expect(deadEval.scheduledAlerts).toHaveLength(0);
  });

  it('schedules future warning and critical alarms when all needs are healthy', () => {
    const snapshot = makeHatchedSnapshot({
      hunger: 55,
      thirst: 60,
      energy: 70,
      happiness: 80,
      hygiene: 90,
      health: 95
    });

    const evaluation = evaluateCharacterCareAlerts(snapshot, NOW_MS);
    expect(evaluation.immediateAlerts).toHaveLength(0);
    // 5 needs x 2 (warning + critical)
    expect(evaluation.scheduledAlerts).toHaveLength(10);
    expect(evaluation.scheduledAlerts[0].triggerAtMs).toBeLessThanOrEqual(
      evaluation.scheduledAlerts[1].triggerAtMs
    );
    expect(evaluation.scheduledAlerts[0].body).toContain('caiu para 25%');
    expect(evaluation.scheduledAlerts[0].characterName).toBe('Ignisauro');
  });

  it('emits warning and critical alerts, respects custom nickname, and sorts critical first', () => {
    const snapshot = makeHatchedSnapshot({
      nickname: 'Rexy',
      hunger: CARE_APPROACHING_CRITICAL_THRESHOLD, // warning immediate + critical scheduled
      thirst: CARE_CRITICAL_THRESHOLD, // critical immediate
      energy: 20, // warning immediate
      happiness: 85,
      hygiene: 85,
      health: HEALTH_APPROACHING_CRITICAL_THRESHOLD // warning immediate
    });

    const evaluation = evaluateCharacterCareAlerts(snapshot, NOW_MS);
    expect(evaluation.activeCriticalCount).toBe(1);
    expect(evaluation.activeWarningCount).toBe(3);
    expect(evaluation.immediateAlerts[0].reason).toBe('thirst');
    expect(evaluation.immediateAlerts[0].severity).toBe('critical');
    expect(evaluation.immediateAlerts[0].characterName).toBe('Rexy');
    expect(evaluation.immediateAlerts[0].title).toContain('nível crítico');
    expect(evaluation.immediateAlerts[0].body).toContain('Sede em 15%');
    expect(evaluation.immediateAlerts[1].severity).toBe('warning');
    expect(evaluation.immediateAlerts[1].currentValue).toBe(20);
    expect(evaluation.immediateAlerts[2].currentValue).toBe(25);
    expect(evaluation.immediateAlerts[3].reason).toBe('health');

    const banner = formatCareSummaryBanner(evaluation);
    expect(banner).toContain('(+3 alerta(s))');
  });

  it('emits single-alert banner and critical health/disease alerts', () => {
    const healthSnapshot = makeHatchedSnapshot({
      health: HEALTH_CRITICAL_THRESHOLD
    });
    const healthEval = evaluateCharacterCareAlerts(healthSnapshot, NOW_MS);
    expect(healthEval.immediateAlerts).toHaveLength(1);
    expect(healthEval.immediateAlerts[0].reason).toBe('health');
    expect(healthEval.immediateAlerts[0].severity).toBe('critical');

    const singleBanner = formatCareSummaryBanner(healthEval);
    expect(singleBanner).not.toContain('alerta(s)');
    expect(singleBanner).toContain('Saúde');

    const sickSnapshot = makeHatchedSnapshot({
      activeDiseases: [
        {
          id: 'parasitic_infection',
          name: 'Infecção Parasitária',
          description: 'Causada por falta de higiene.',
          remedyFoodId: 'antiseptic-spore-salve',
          contractedAtMs: NOW_MS - 10_000
        }
      ]
    });
    const sickEval = evaluateCharacterCareAlerts(sickSnapshot, NOW_MS);
    expect(sickEval.immediateAlerts.some((a) => a.reason === 'disease')).toBe(true);
    expect(sickEval.immediateAlerts[0].title).toContain('Infecção Parasitária');
  });
});
