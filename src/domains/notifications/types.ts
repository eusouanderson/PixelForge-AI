import type { CharacterId } from '@/domains/characters/types';

export type CareAlertSeverity = 'warning' | 'critical';

export type CareAlertReason =
  | 'hunger'
  | 'thirst'
  | 'energy'
  | 'happiness'
  | 'hygiene'
  | 'health'
  | 'disease';

export interface PetCareNotificationPayload {
  readonly id: number;
  readonly reason: CareAlertReason;
  readonly severity: CareAlertSeverity;
  readonly characterId: CharacterId;
  readonly characterName: string;
  readonly title: string;
  readonly body: string;
  readonly currentValue: number;
  readonly threshold: number;
  readonly triggerAtMs: number;
}

export interface CareNotificationEvaluation {
  readonly immediateAlerts: readonly PetCareNotificationPayload[];
  readonly scheduledAlerts: readonly PetCareNotificationPayload[];
  readonly activeWarningCount: number;
  readonly activeCriticalCount: number;
}

export type NotificationPermissionState = 'granted' | 'denied' | 'prompt';

export interface ShowNotificationOptions {
  readonly allowInForeground?: boolean;
}

export interface NotificationsPort {
  isSupported(): boolean;
  checkPermission(): Promise<NotificationPermissionState>;
  requestPermission(): Promise<NotificationPermissionState>;
  showNow(
    notification: PetCareNotificationPayload,
    options?: ShowNotificationOptions
  ): Promise<boolean>;
  schedulePending(notifications: readonly PetCareNotificationPayload[]): Promise<void>;
  cancelAll(): Promise<void>;
}

export interface CareNotificationManagerState {
  readonly enabled: boolean;
  readonly supported: boolean;
  readonly appInForeground: boolean;
  readonly permission: NotificationPermissionState;
  readonly evaluation: CareNotificationEvaluation;
  readonly activeBannerText: string | null;
  readonly dispatchedCount: number;
  readonly lastSyncedAtMs: number | null;
}
