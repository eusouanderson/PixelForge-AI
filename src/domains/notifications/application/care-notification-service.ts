import type { GameSaveSnapshot } from '@/domains/persistence/types';
import {
  evaluateCharacterCareAlerts,
  formatCareSummaryBanner
} from '../domain/care-notification-engine';
import {
  CapacitorNotificationsAdapter,
  resolveDefaultForegroundCheck
} from '../infrastructure/capacitor-notifications-adapter';
import type {
  CareNotificationManagerState,
  NotificationsPort
} from '../types';

export const DEFAULT_NOTIFICATION_COOLDOWN_MS = 30 * 60 * 1000;

export interface CareNotificationServiceOptions {
  readonly initialAppInForeground?: boolean;
}

export class CareNotificationService {
  private readonly port: NotificationsPort;
  private readonly cooldownMs: number;
  private readonly lastNotifiedByKey = new Map<string, number>();
  private listeners: Array<(state: CareNotificationManagerState) => void> = [];
  private appInForeground: boolean;
  private state: CareNotificationManagerState;

  constructor(
    port: NotificationsPort = new CapacitorNotificationsAdapter(),
    cooldownMs: number = DEFAULT_NOTIFICATION_COOLDOWN_MS,
    options: CareNotificationServiceOptions = {}
  ) {
    this.port = port;
    this.cooldownMs = cooldownMs;
    this.appInForeground = options.initialAppInForeground ?? resolveDefaultForegroundCheck();
    this.state = {
      enabled: true,
      supported: port.isSupported(),
      appInForeground: this.appInForeground,
      permission: 'prompt',
      evaluation: {
        immediateAlerts: [],
        scheduledAlerts: [],
        activeWarningCount: 0,
        activeCriticalCount: 0
      },
      activeBannerText: null,
      dispatchedCount: 0,
      lastSyncedAtMs: null
    };
  }

  public getState(): CareNotificationManagerState {
    return this.state;
  }

  public subscribe(listener: (state: CareNotificationManagerState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((h) => h !== listener);
    };
  }

  private updateState(partial: Partial<CareNotificationManagerState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public async initialize(snapshot: GameSaveSnapshot, nowMs: number = Date.now()): Promise<void> {
    const permission = await this.port.checkPermission();
    this.updateState({ permission });
    await this.syncFromSnapshot(snapshot, nowMs);
  }

  public async requestPermissionAndSync(
    snapshot: GameSaveSnapshot,
    nowMs: number = Date.now()
  ): Promise<CareNotificationManagerState> {
    const permission = await this.port.requestPermission();
    this.updateState({ permission });
    await this.syncFromSnapshot(snapshot, nowMs);
    return this.state;
  }

  public async setAppForeground(
    inForeground: boolean,
    snapshot?: GameSaveSnapshot,
    nowMs: number = Date.now()
  ): Promise<void> {
    this.appInForeground = inForeground;
    if (snapshot) {
      await this.syncFromSnapshot(snapshot, nowMs);
      return;
    }
    if (inForeground) {
      await this.port.cancelAll();
    }
    this.updateState({ appInForeground: inForeground });
  }

  public async syncFromSnapshot(
    snapshot: GameSaveSnapshot,
    nowMs: number = Date.now()
  ): Promise<void> {
    const evaluation = evaluateCharacterCareAlerts(snapshot, nowMs);
    const activeBannerText = formatCareSummaryBanner(evaluation);
    const enabled = snapshot.settings.notificationsEnabled;
    const permission = await this.port.checkPermission();

    if (!enabled || this.appInForeground) {
      await this.port.cancelAll();
      this.updateState({
        enabled,
        permission,
        appInForeground: this.appInForeground,
        evaluation,
        activeBannerText,
        lastSyncedAtMs: nowMs
      });
      return;
    }

    const activeKeys = new Set<string>();
    for (const alert of evaluation.immediateAlerts) {
      activeKeys.add(`${alert.characterId}:${alert.reason}:${alert.severity}`);
    }

    // Clear cooldown keys for needs that have recovered above warning thresholds
    for (const existingKey of Array.from(this.lastNotifiedByKey.keys())) {
      if (!activeKeys.has(existingKey)) {
        this.lastNotifiedByKey.delete(existingKey);
      }
    }

    let dispatchedNow = 0;
    if (permission === 'granted') {
      for (const alert of evaluation.immediateAlerts) {
        const key = `${alert.characterId}:${alert.reason}:${alert.severity}`;
        const lastSentAt = this.lastNotifiedByKey.get(key);
        const onCooldown = lastSentAt !== undefined && nowMs - lastSentAt < this.cooldownMs;
        if (!onCooldown) {
          const displayed = await this.port.showNow(alert, { allowInForeground: false });
          if (displayed) {
            this.lastNotifiedByKey.set(key, nowMs);
            dispatchedNow++;
          }
        }
      }
      await this.port.schedulePending(evaluation.scheduledAlerts);
    }

    this.updateState({
      enabled: true,
      permission,
      appInForeground: this.appInForeground,
      evaluation,
      activeBannerText,
      dispatchedCount: this.state.dispatchedCount + dispatchedNow,
      lastSyncedAtMs: nowMs
    });
  }

  public async sendTestNotification(
    snapshot: GameSaveSnapshot,
    nowMs: number = Date.now()
  ): Promise<boolean> {
    let permission = await this.port.checkPermission();
    if (permission === 'prompt') {
      permission = await this.port.requestPermission();
    }
    this.updateState({ permission });
    if (permission !== 'granted') {
      return false;
    }

    const activeRecord = snapshot.characters[snapshot.activeCharacterId];
    const name = activeRecord.runtime.customNickname || snapshot.activeCharacterId;
    const sent = await this.port.showNow(
      {
        id: 1999,
        reason: 'hunger',
        severity: 'warning',
        characterId: snapshot.activeCharacterId,
        characterName: name,
        title: `🔔 PixelForge: Alertas ativos para ${name}!`,
        body: 'Você será avisado automaticamente com o app fechado ou minimizado quando uma necessidade se aproximar do nível crítico.',
        currentValue: activeRecord.needs.hunger,
        threshold: 25,
        triggerAtMs: nowMs
      },
      { allowInForeground: true }
    );

    if (sent) {
      this.updateState({ dispatchedCount: this.state.dispatchedCount + 1 });
    }
    return sent;
  }

  public dispose(): void {
    this.listeners = [];
    this.lastNotifiedByKey.clear();
  }
}
