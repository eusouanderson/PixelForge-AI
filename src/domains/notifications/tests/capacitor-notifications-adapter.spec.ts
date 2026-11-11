import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PetCareNotificationPayload } from '../types';
import {
  CapacitorNotificationsAdapter,
  type PetCareNotificationsNativePlugin,
  resolveWebNotificationApi,
  type WebNotificationApiLike
} from '../infrastructure/capacitor-notifications-adapter';

const SAMPLE_PAYLOAD: PetCareNotificationPayload = {
  id: 1102,
  reason: 'hunger',
  severity: 'critical',
  characterId: 'ignisauro',
  characterName: 'Ignisauro',
  title: 'Fome crítica',
  body: 'Alimente agora.',
  currentValue: 12,
  threshold: 15,
  triggerAtMs: 1_760_000_060_000
};

describe('capacitor-notifications-adapter', () => {
  const originalNotification = globalThis.Notification;

  afterEach(() => {
    vi.useRealTimers();
    if (originalNotification === undefined) {
      Reflect.deleteProperty(globalThis, 'Notification');
    } else {
      Object.defineProperty(globalThis, 'Notification', {
        value: originalNotification,
        configurable: true,
        writable: true
      });
    }
  });

  it('resolves globalThis.Notification when available and returns null otherwise', async () => {
    Reflect.deleteProperty(globalThis, 'Notification');
    expect(resolveWebNotificationApi()).toBeNull();

    const created: Array<{ title: string; body?: string; tag?: string }> = [];
    class MockNotification {
      public static permission: NotificationPermission = 'default';
      public static requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
      constructor(title: string, options?: NotificationOptions) {
        created.push({ title, body: options?.body, tag: options?.tag });
      }
    }

    Object.defineProperty(globalThis, 'Notification', {
      value: MockNotification,
      configurable: true,
      writable: true
    });

    const api = resolveWebNotificationApi();
    expect(api).not.toBeNull();
    expect(api?.permission).toBe('default');
    expect(await api?.requestPermission()).toBe('granted');
    api?.create('Olá', { body: 'Corpo', tag: 'tag-1' });
    expect(created).toEqual([{ title: 'Olá', body: 'Corpo', tag: 'tag-1' }]);
  });

  it('routes calls through native plugin when running on native platform', async () => {
    const nativePlugin: PetCareNotificationsNativePlugin = {
      checkPermission: vi.fn(async () => ({ state: 'granted' as const })),
      requestPermission: vi.fn(async () => ({ state: 'prompt' as const })),
      showNow: vi.fn(async () => ({ displayed: true })),
      schedulePending: vi.fn(async () => ({ scheduledCount: 1 })),
      cancelAll: vi.fn(async () => ({ cancelled: true }))
    };

    const adapter = new CapacitorNotificationsAdapter({
      isNativeOverride: true,
      nativePluginOverride: nativePlugin,
      webNotificationApiOverride: null,
      isForegroundOverride: () => false
    });

    expect(adapter.isSupported()).toBe(true);
    expect(await adapter.checkPermission()).toBe('granted');
    expect(await adapter.requestPermission()).toBe('prompt');
    expect(await adapter.showNow(SAMPLE_PAYLOAD)).toBe(true);

    // Foreground suppression blocks automatic OS alerts unless allowInForeground is true
    const fgNativeAdapter = new CapacitorNotificationsAdapter({
      isNativeOverride: true,
      nativePluginOverride: nativePlugin,
      webNotificationApiOverride: null,
      isForegroundOverride: () => true
    });
    expect(await fgNativeAdapter.showNow(SAMPLE_PAYLOAD)).toBe(false);
    expect(await fgNativeAdapter.showNow(SAMPLE_PAYLOAD, { allowInForeground: true })).toBe(true);
    await adapter.schedulePending([SAMPLE_PAYLOAD]);
    expect(nativePlugin.schedulePending).toHaveBeenCalledTimes(1);
    await adapter.cancelAll();
    expect(nativePlugin.cancelAll).toHaveBeenCalledTimes(1);
  });

  it('handles native plugin failures gracefully', async () => {
    const failingNative: PetCareNotificationsNativePlugin = {
      checkPermission: vi.fn(async () => {
        throw new Error('native err');
      }),
      requestPermission: vi.fn(async () => {
        throw new Error('native err');
      }),
      showNow: vi.fn(async () => {
        throw new Error('native err');
      }),
      schedulePending: vi.fn(async () => {
        throw new Error('native err');
      }),
      cancelAll: vi.fn(async () => {
        throw new Error('native err');
      })
    };

    const adapter = new CapacitorNotificationsAdapter({
      isNativeOverride: true,
      nativePluginOverride: failingNative,
      webNotificationApiOverride: null,
      isForegroundOverride: () => false
    });

    expect(await adapter.checkPermission()).toBe('denied');
    expect(await adapter.requestPermission()).toBe('denied');
    expect(await adapter.showNow(SAMPLE_PAYLOAD)).toBe(false);
    await expect(adapter.schedulePending([SAMPLE_PAYLOAD])).resolves.toBeUndefined();
    await expect(adapter.cancelAll()).resolves.toBeUndefined();
  });

  it('handles unsupported environment when web Notification API is missing', async () => {
    const unsupportedFg = new CapacitorNotificationsAdapter({
      isNativeOverride: false,
      webNotificationApiOverride: null,
      isForegroundOverride: () => false
    });
    expect(await unsupportedFg.showNow(SAMPLE_PAYLOAD)).toBe(false);

    const adapter = new CapacitorNotificationsAdapter({
      isNativeOverride: false,
      webNotificationApiOverride: null,
      isForegroundOverride: () => false
    });

    expect(adapter.isSupported()).toBe(false);
    expect(await adapter.checkPermission()).toBe('denied');
    expect(await adapter.requestPermission()).toBe('denied');
    expect(await adapter.showNow(SAMPLE_PAYLOAD)).toBe(false);
    await expect(adapter.schedulePending([SAMPLE_PAYLOAD])).resolves.toBeUndefined();
    await expect(adapter.cancelAll()).resolves.toBeUndefined();
  });

  it('handles browser Notification permission states, immediate display, and timer scheduling', async () => {
    vi.useFakeTimers();
    const baseNow = 1_760_000_000_000;
    vi.setSystemTime(baseNow);

    let permission: 'default' | 'granted' | 'denied' = 'default';
    let shouldThrowCreate = false;
    let shouldRejectRequest = false;
    const shown: Array<{ title: string; body: string; tag: string }> = [];

    const webApi: WebNotificationApiLike = {
      get permission() {
        return permission;
      },
      requestPermission: async () => {
        if (shouldRejectRequest) throw new Error('blocked');
        return permission;
      },
      create: (title, options) => {
        if (shouldThrowCreate) throw new Error('blocked');
        shown.push({ title, body: options.body, tag: options.tag });
      }
    };

    const adapter = new CapacitorNotificationsAdapter({
      isNativeOverride: false,
      webNotificationApiOverride: webApi,
      isForegroundOverride: () => false
    });

    expect(adapter.isSupported()).toBe(true);
    expect(await adapter.checkPermission()).toBe('prompt');
    expect(await adapter.showNow(SAMPLE_PAYLOAD)).toBe(false);

    permission = 'denied';
    expect(await adapter.checkPermission()).toBe('denied');
    expect(await adapter.requestPermission()).toBe('denied');

    shouldRejectRequest = true;
    expect(await adapter.requestPermission()).toBe('denied');
    shouldRejectRequest = false;

    permission = 'granted';
    expect(await adapter.checkPermission()).toBe('granted');
    expect(await adapter.requestPermission()).toBe('granted');

    expect(await adapter.showNow(SAMPLE_PAYLOAD)).toBe(true);
    expect(shown).toHaveLength(1);

    shouldThrowCreate = true;
    expect(await adapter.showNow(SAMPLE_PAYLOAD)).toBe(false);
    shouldThrowCreate = false;

    await adapter.schedulePending([
      { ...SAMPLE_PAYLOAD, id: 1, triggerAtMs: baseNow - 1000 }, // past -> skipped
      { ...SAMPLE_PAYLOAD, id: 2, triggerAtMs: baseNow + 48 * 3600 * 1000 }, // >24h -> skipped
      { ...SAMPLE_PAYLOAD, id: 3, triggerAtMs: baseNow + 5000 } // valid 5s timer
    ]);

    vi.advanceTimersByTime(4999);
    expect(shown).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(shown).toHaveLength(2);

    // Rescheduling replaces previous pending timers and cancelAll clears them
    await adapter.schedulePending([{ ...SAMPLE_PAYLOAD, id: 4, triggerAtMs: baseNow + 20_000 }]);
    await adapter.schedulePending([{ ...SAMPLE_PAYLOAD, id: 5, triggerAtMs: baseNow + 25_000 }]);
    await adapter.cancelAll();
    vi.advanceTimersByTime(30_000);
    expect(shown).toHaveLength(2);
  });

  it('uses Capacitor defaults when no overrides are passed', () => {
    Reflect.deleteProperty(globalThis, 'Notification');
    const adapter = new CapacitorNotificationsAdapter();
    expect(typeof adapter.isSupported()).toBe('boolean');
  });
});
