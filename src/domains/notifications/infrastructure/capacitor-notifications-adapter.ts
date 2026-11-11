import { Capacitor, registerPlugin } from '@capacitor/core';
import type {
  NotificationPermissionState,
  NotificationsPort,
  PetCareNotificationPayload,
  ShowNotificationOptions
} from '../types';

export interface PetCareNotificationsNativePlugin {
  checkPermission(): Promise<{ state: NotificationPermissionState }>;
  requestPermission(): Promise<{ state: NotificationPermissionState }>;
  showNow(options: {
    id: number;
    title: string;
    body: string;
    severity: string;
    allowInForeground?: boolean;
  }): Promise<{ displayed: boolean }>;
  schedulePending(options: {
    notifications: ReadonlyArray<{
      id: number;
      title: string;
      body: string;
      severity: string;
      triggerAtMs: number;
    }>;
  }): Promise<{ scheduledCount: number }>;
  cancelAll(): Promise<{ cancelled: boolean }>;
}

export const NativePetCareNotifications = registerPlugin<PetCareNotificationsNativePlugin>(
  'PetCareNotifications'
);

export interface WebNotificationApiLike {
  readonly permission: 'default' | 'granted' | 'denied';
  requestPermission(): Promise<'default' | 'granted' | 'denied'>;
  create(title: string, options: { body: string; tag: string }): void;
}

export interface CapacitorNotificationsAdapterOptions {
  readonly isNativeOverride?: boolean;
  readonly nativePluginOverride?: PetCareNotificationsNativePlugin;
  readonly webNotificationApiOverride?: WebNotificationApiLike | null;
  readonly isForegroundOverride?: () => boolean;
}

export function resolveDefaultForegroundCheck(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'visible';
}

export function resolveWebNotificationApi(): WebNotificationApiLike | null {
  if (typeof globalThis.Notification !== 'function') {
    return null;
  }
  const NotificationCtor = globalThis.Notification;
  return {
    get permission() {
      return NotificationCtor.permission;
    },
    requestPermission: () => NotificationCtor.requestPermission(),
    create: (title, options) => {
      new NotificationCtor(title, options);
    }
  };
}

function mapBrowserPermission(
  raw: 'default' | 'granted' | 'denied'
): NotificationPermissionState {
  if (raw === 'granted') return 'granted';
  if (raw === 'denied') return 'denied';
  return 'prompt';
}

export class CapacitorNotificationsAdapter implements NotificationsPort {
  private readonly isNative: boolean;
  private readonly nativePlugin: PetCareNotificationsNativePlugin;
  private readonly webApi: WebNotificationApiLike | null;
  private readonly isForegroundCheck: () => boolean;
  private webTimers: Array<ReturnType<typeof setTimeout>> = [];

  constructor(options: CapacitorNotificationsAdapterOptions = {}) {
    this.isNative = options.isNativeOverride ?? Capacitor.isNativePlatform();
    this.nativePlugin = options.nativePluginOverride ?? NativePetCareNotifications;
    this.webApi =
      options.webNotificationApiOverride !== undefined
        ? options.webNotificationApiOverride
        : resolveWebNotificationApi();
    this.isForegroundCheck = options.isForegroundOverride ?? resolveDefaultForegroundCheck;
  }

  public isSupported(): boolean {
    return this.isNative || this.webApi !== null;
  }

  public async checkPermission(): Promise<NotificationPermissionState> {
    if (this.isNative) {
      try {
        const res = await this.nativePlugin.checkPermission();
        return res.state;
      } catch {
        return 'denied';
      }
    }
    if (!this.webApi) return 'denied';
    return mapBrowserPermission(this.webApi.permission);
  }

  public async requestPermission(): Promise<NotificationPermissionState> {
    if (this.isNative) {
      try {
        const res = await this.nativePlugin.requestPermission();
        return res.state;
      } catch {
        return 'denied';
      }
    }
    if (!this.webApi) return 'denied';
    try {
      const res = await this.webApi.requestPermission();
      return mapBrowserPermission(res);
    } catch {
      return 'denied';
    }
  }

  public async showNow(
    notification: PetCareNotificationPayload,
    options: ShowNotificationOptions = {}
  ): Promise<boolean> {
    const allowInForeground = Boolean(options.allowInForeground);
    if (!allowInForeground && this.isForegroundCheck()) {
      return false;
    }

    if (this.isNative) {
      try {
        const res = await this.nativePlugin.showNow({
          id: notification.id,
          title: notification.title,
          body: notification.body,
          severity: notification.severity,
          allowInForeground
        });
        return res.displayed;
      } catch {
        return false;
      }
    }
    if (!this.webApi || this.webApi.permission !== 'granted') {
      return false;
    }
    try {
      this.webApi.create(notification.title, {
        body: notification.body,
        tag: `pixelforge-care-${notification.id}`
      });
      return true;
    } catch {
      return false;
    }
  }

  public async schedulePending(
    notifications: readonly PetCareNotificationPayload[]
  ): Promise<void> {
    if (this.isNative) {
      try {
        await this.nativePlugin.schedulePending({
          notifications: notifications.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            severity: n.severity,
            triggerAtMs: n.triggerAtMs
          }))
        });
      } catch {
        // Ignore native scheduler error safely without blocking gameplay
      }
      return;
    }

    this.clearWebTimers();
    if (!this.webApi || this.webApi.permission !== 'granted') return;

    const nowMs = Date.now();
    // Cap browser setTimeout at 24h (~2^31-1 ms safe range for Node/browsers)
    const maxTimeoutMs = 24 * 60 * 60 * 1000;
    for (const item of notifications) {
      const delayMs = item.triggerAtMs - nowMs;
      if (delayMs > 0 && delayMs <= maxTimeoutMs) {
        const handle = setTimeout(() => {
          void this.showNow(item);
        }, delayMs);
        this.webTimers.push(handle);
      }
    }
  }

  public async cancelAll(): Promise<void> {
    this.clearWebTimers();
    if (this.isNative) {
      try {
        await this.nativePlugin.cancelAll();
      } catch {
        // Ignore native cancel failure safely
      }
    }
  }

  private clearWebTimers(): void {
    for (const handle of this.webTimers) {
      clearTimeout(handle);
    }
    this.webTimers = [];
  }
}
