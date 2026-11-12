import { getCharacterSpeciesById } from '@/domains/characters/domain/character-registry';
import { DEFAULT_DECAY_RATES_PER_HOUR } from '@/domains/pet-needs/domain/pet-needs-engine';
import type { NeedDecayRatesPerHour } from '@/domains/pet-needs/types';
import type { GameSaveSnapshot } from '@/domains/persistence/types';
import { resolveActiveCreatureContext } from '@/domains/persistence/domain/persistence-engine';
import type {
  CareAlertReason,
  CareAlertSeverity,
  CareNotificationEvaluation,
  PetCareNotificationPayload
} from '../types';

export const CARE_APPROACHING_CRITICAL_THRESHOLD = 25;
export const CARE_CRITICAL_THRESHOLD = 15;
export const HEALTH_APPROACHING_CRITICAL_THRESHOLD = 45;
export const HEALTH_CRITICAL_THRESHOLD = 35;

interface DecayNeedDescriptor {
  readonly key: keyof NeedDecayRatesPerHour;
  readonly label: string;
  readonly actionHint: string;
  readonly idBase: number;
}

const DECAY_NEED_DESCRIPTORS: readonly DecayNeedDescriptor[] = [
  {
    key: 'hunger',
    label: 'Fome',
    actionHint: 'Alimente na aba Alimentar antes que perca saúde.',
    idBase: 1100
  },
  {
    key: 'thirst',
    label: 'Sede',
    actionHint: 'Dê Água Cristalina da Nascente na aba Alimentar.',
    idBase: 1200
  },
  {
    key: 'energy',
    label: 'Energia',
    actionHint: 'Deixe descansar na aba Cuidar para evitar exaustão.',
    idBase: 1300
  },
  {
    key: 'happiness',
    label: 'Felicidade',
    actionHint: 'Brinque ou faça carinho na aba Cuidar.',
    idBase: 1400
  },
  {
    key: 'hygiene',
    label: 'Higiene',
    actionHint: 'Dê um Banho Termal Purificador na aba Cuidar para evitar infecção.',
    idBase: 1500
  }
];

const HEALTH_ALERT_ID_BASE = 1600;
const DISEASE_ALERT_ID = 1702;

/**
 * Calculates how many minutes remain until a decaying need crosses targetThreshold.
 */
export function computeMinutesUntilThreshold(
  currentValue: number,
  targetThreshold: number,
  decayPerHour: number
): number {
  if (currentValue <= targetThreshold) return 0;
  const remainingDelta = currentValue - targetThreshold;
  return Math.max(1, Math.ceil((remainingDelta / decayPerHour) * 60));
}

function buildNeedNotification(
  id: number,
  characterId: GameSaveSnapshot['activeCharacterId'],
  characterName: string,
  reason: CareAlertReason,
  label: string,
  actionHint: string,
  severity: CareAlertSeverity,
  currentValue: number,
  threshold: number,
  triggerAtMs: number
): PetCareNotificationPayload {
  const roundedVal = Math.round(currentValue);
  const title =
    severity === 'critical'
      ? `🚨 ${characterName}: ${label} em nível crítico!`
      : `⚠️ ${characterName}: ${label} perto do crítico!`;

  const body =
    currentValue > threshold
      ? `${label} caiu para ${threshold}%. ${actionHint}`
      : `${label} em ${roundedVal}%. ${actionHint}`;

  return {
    id,
    reason,
    severity,
    characterId,
    characterName,
    title,
    body,
    currentValue: roundedVal,
    threshold,
    triggerAtMs
  };
}

/**
 * Evaluates immediate warning/critical care alerts and computes future predictive
 * notification timestamps based on current need levels and hourly decay rates.
 */
export function evaluateCharacterCareAlerts(
  snapshot: GameSaveSnapshot,
  nowMs: number
): CareNotificationEvaluation {
  const activeCtx = resolveActiveCreatureContext(snapshot);
  const charId = activeCtx.speciesId;
  const record = activeCtx.record;
  const species = getCharacterSpeciesById(charId);
  const characterName = record.runtime.customNickname || species.displayName;

  if (record.runtime.currentStage === 'ovo' || record.runtime.healthCondition === 'deceased') {
    return {
      immediateAlerts: [],
      scheduledAlerts: [],
      activeWarningCount: 0,
      activeCriticalCount: 0
    };
  }

  const immediateAlerts: PetCareNotificationPayload[] = [];
  const scheduledAlerts: PetCareNotificationPayload[] = [];

  for (const desc of DECAY_NEED_DESCRIPTORS) {
    const val = record.needs[desc.key];
    const rate = DEFAULT_DECAY_RATES_PER_HOUR[desc.key];

    if (val <= CARE_CRITICAL_THRESHOLD) {
      immediateAlerts.push(
        buildNeedNotification(
          desc.idBase + 2,
          charId,
          characterName,
          desc.key,
          desc.label,
          desc.actionHint,
          'critical',
          val,
          CARE_CRITICAL_THRESHOLD,
          nowMs
        )
      );
      continue;
    }

    if (val <= CARE_APPROACHING_CRITICAL_THRESHOLD) {
      immediateAlerts.push(
        buildNeedNotification(
          desc.idBase + 1,
          charId,
          characterName,
          desc.key,
          desc.label,
          desc.actionHint,
          'warning',
          val,
          CARE_APPROACHING_CRITICAL_THRESHOLD,
          nowMs
        )
      );
      const minsToCritical = computeMinutesUntilThreshold(val, CARE_CRITICAL_THRESHOLD, rate);
      scheduledAlerts.push(
        buildNeedNotification(
          desc.idBase + 2,
          charId,
          characterName,
          desc.key,
          desc.label,
          desc.actionHint,
          'critical',
          val,
          CARE_CRITICAL_THRESHOLD,
          nowMs + minsToCritical * 60_000
        )
      );
      continue;
    }

    const minsToWarning = computeMinutesUntilThreshold(val, CARE_APPROACHING_CRITICAL_THRESHOLD, rate);
    scheduledAlerts.push(
      buildNeedNotification(
        desc.idBase + 1,
        charId,
        characterName,
        desc.key,
        desc.label,
        desc.actionHint,
        'warning',
        val,
        CARE_APPROACHING_CRITICAL_THRESHOLD,
        nowMs + minsToWarning * 60_000
      )
    );

    const minsToCritical = computeMinutesUntilThreshold(val, CARE_CRITICAL_THRESHOLD, rate);
    scheduledAlerts.push(
      buildNeedNotification(
        desc.idBase + 2,
        charId,
        characterName,
        desc.key,
        desc.label,
        desc.actionHint,
        'critical',
        val,
        CARE_CRITICAL_THRESHOLD,
        nowMs + minsToCritical * 60_000
      )
    );
  }

  const healthVal = record.needs.health;
  if (healthVal <= HEALTH_CRITICAL_THRESHOLD) {
    immediateAlerts.push(
      buildNeedNotification(
        HEALTH_ALERT_ID_BASE + 2,
        charId,
        characterName,
        'health',
        'Saúde',
        'Trate rapidamente com alimentos nutritivos e remédios na aba Alimentar.',
        'critical',
        healthVal,
        HEALTH_CRITICAL_THRESHOLD,
        nowMs
      )
    );
  } else if (healthVal <= HEALTH_APPROACHING_CRITICAL_THRESHOLD) {
    immediateAlerts.push(
      buildNeedNotification(
        HEALTH_ALERT_ID_BASE + 1,
        charId,
        characterName,
        'health',
        'Saúde',
        'Atenção à saúde do companheiro antes que caia para nível crítico.',
        'warning',
        healthVal,
        HEALTH_APPROACHING_CRITICAL_THRESHOLD,
        nowMs
      )
    );
  }

  if (record.runtime.activeDiseases.length > 0) {
    const primaryDisease = record.runtime.activeDiseases[0];
    immediateAlerts.push({
      id: DISEASE_ALERT_ID,
      reason: 'disease',
      severity: 'critical',
      characterId: charId,
      characterName,
      title: `🩺 ${characterName} está doente (${primaryDisease.name})!`,
      body: `Aplique o remédio específico na aba Alimentar para evitar perda contínua de saúde.`,
      currentValue: healthVal,
      threshold: HEALTH_CRITICAL_THRESHOLD,
      triggerAtMs: nowMs
    });
  }

  immediateAlerts.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'critical' ? -1 : 1;
    }
    return a.currentValue - b.currentValue;
  });

  scheduledAlerts.sort((a, b) => a.triggerAtMs - b.triggerAtMs);

  let activeWarningCount = 0;
  let activeCriticalCount = 0;
  for (const alert of immediateAlerts) {
    if (alert.severity === 'critical') activeCriticalCount++;
    else activeWarningCount++;
  }

  return {
    immediateAlerts,
    scheduledAlerts,
    activeWarningCount,
    activeCriticalCount
  };
}

export function formatCareSummaryBanner(evaluation: CareNotificationEvaluation): string | null {
  if (evaluation.immediateAlerts.length === 0) return null;
  const primary = evaluation.immediateAlerts[0];
  const extraCount = evaluation.immediateAlerts.length - 1;
  return extraCount > 0
    ? `${primary.title} ${primary.body} (+${extraCount} alerta(s))`
    : `${primary.title} ${primary.body}`;
}
