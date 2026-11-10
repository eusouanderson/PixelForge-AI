import { describe, expect, it, vi } from 'vitest';
import { createNewGameSaveSnapshot } from '@/domains/persistence/domain/persistence-engine';
import type { GameSaveSnapshot } from '@/domains/persistence/types';
import { CareNotificationService } from '../application/care-notification-service';
import type {
  NotificationPermissionState,
  NotificationsPort,
  PetCareNotificationPayload
} from '../types';

const NOW_MS = 1_760_000_000_000;

function createMemoryPort(initialPermission: NotificationPermissionState = 'granted') {
  let permission: NotificationPermissionState = initialPermission;
  const shown: PetCareNotificationPayload[] = [];
  let scheduled: readonly PetCareNotificationPayload[] = [];
  let cancelCount = 0;
  let showShouldSucceed = true;

  const port: NotificationsPort = {
    isSupported: () => true,
    checkPermission: vi.fn(async () => permission),
    requestPermission: vi.fn(async () => {
      permission = initialPermission === 'denied' ? 'denied' : 'granted';
      return permission;
    }),
    showNow: vi.fn(async (payload) => {
      if (!showShouldSucceed) return false;
      shown.push(payload);
      return true;
    }),
    schedulePending: vi.fn(async (items) => {
      scheduled = items;
    }),
    cancelAll: vi.fn(async () => {
      cancelCount++;
      scheduled = [];
    })
  };

  return {
    port,
    shown,
    getScheduled: () => scheduled,
    getCancelCount: () => cancelCount,
    setPermission: (next: NotificationPermissionState) => {
      permission = next;
    },
    setShowShouldSucceed: (next: boolean) => {
      showShouldSucceed = next;
    }
  };
}

function makeSnapshot(opts?: {
  enabled?: boolean;
  hunger?: number;
  nickname?: string;
}): GameSaveSnapshot {
  const base = createNewGameSaveSnapshot(NOW_MS, 'ignisauro');
  const active = base.characters.ignisauro;
  return {
    ...base,
    settings: {
      ...base.settings,
      notificationsEnabled: opts?.enabled ?? true
    },
    characters: {
      ...base.characters,
      ignisauro: {
        ...active,
        needs: {
          ...active.needs,
          hunger: opts?.hunger ?? 90,
          thirst: 90,
          energy: 90,
          happiness: 90,
          hygiene: 90,
          health: 95
        },
        runtime: {
          ...active.runtime,
          currentStage: 'baby',
          healthCondition: 'healthy',
          customNickname: opts?.nickname ?? ''
        }
      }
    }
  };
}

describe('CareNotificationService', () => {
  it('constructs with default adapter and supports subscribe/unsubscribe', () => {
    const defaultService = new CareNotificationService();
    const seen: number[] = [];
    const unsubscribe = defaultService.subscribe((state) => {
      seen.push(state.dispatchedCount);
    });
    expect(seen).toEqual([0]);
    expect(defaultService.getState().enabled).toBe(true);
    unsubscribe();
    defaultService.dispose();
  });

  it('initializes, deduplicates within cooldown, resets when recovered, and escalates severity', async () => {
    const mock = createMemoryPort('granted');
    const service = new CareNotificationService(mock.port, 30 * 60_000);
    const states: boolean[] = [];
    const unsubscribe = service.subscribe((s) => states.push(s.enabled));

    // Warning alert triggers once
    const warningSnap = makeSnapshot({ hunger: 22 });
    await service.initialize(warningSnap, NOW_MS);
    expect(mock.shown).toHaveLength(1);
    expect(service.getState().dispatchedCount).toBe(1);
    expect(mock.getScheduled().length).toBeGreaterThan(0);

    // Same warning within cooldown does NOT duplicate
    await service.syncFromSnapshot(warningSnap, NOW_MS + 5 * 60_000);
    expect(mock.shown).toHaveLength(1);

    // Escalating to critical notifies immediately because severity key changed
    const criticalSnap = makeSnapshot({ hunger: 10 });
    await service.syncFromSnapshot(criticalSnap, NOW_MS + 6 * 60_000);
    expect(mock.shown).toHaveLength(2);
    expect(mock.shown[1].severity).toBe('critical');

    // Recovering above threshold clears cooldown so dropping again notifies even before 30m
    const recoveredSnap = makeSnapshot({ hunger: 90 });
    await service.syncFromSnapshot(recoveredSnap, NOW_MS + 7 * 60_000);
    await service.syncFromSnapshot(warningSnap, NOW_MS + 8 * 60_000);
    expect(mock.shown).toHaveLength(3);

    // Repeating after full cooldown notifies again
    await service.syncFromSnapshot(warningSnap, NOW_MS + 40 * 60_000);
    expect(mock.shown).toHaveLength(4);

    // Failed showNow does not count or record cooldown
    mock.setShowShouldSucceed(false);
    await service.syncFromSnapshot(criticalSnap, NOW_MS + 41 * 60_000);
    expect(service.getState().dispatchedCount).toBe(4);

    unsubscribe();
    service.dispose();
    expect(states.length).toBeGreaterThan(1);
  });

  it('cancels alarms when disabled and skips dispatch when permission is not granted', async () => {
    const mock = createMemoryPort('denied');
    const service = new CareNotificationService(mock.port);

    await service.syncFromSnapshot(makeSnapshot({ enabled: true, hunger: 10 }), NOW_MS);
    expect(mock.shown).toHaveLength(0);

    await service.syncFromSnapshot(makeSnapshot({ enabled: false, hunger: 10 }), NOW_MS);
    expect(mock.getCancelCount()).toBe(1);
    expect(service.getState().enabled).toBe(false);
  });

  it('handles requestPermissionAndSync and sendTestNotification across permission states', async () => {
    const promptMock = createMemoryPort('prompt');
    const service = new CareNotificationService(promptMock.port);

    // prompt -> requestPermission promotes to granted -> sends test notification with custom nickname
    const sent = await service.sendTestNotification(makeSnapshot({ nickname: 'Draco' }), NOW_MS);
    expect(sent).toBe(true);
    expect(promptMock.shown[0].title).toContain('Draco');
    expect(service.getState().dispatchedCount).toBe(1);

    // Already granted -> skips requestPermission and falls back to activeCharacterId
    promptMock.setShowShouldSucceed(false);
    const failedDisplay = await service.sendTestNotification(makeSnapshot(), NOW_MS + 1000);
    expect(failedDisplay).toBe(false);
    expect(service.getState().dispatchedCount).toBe(1);

    // Denied -> cannot send test notification
    const deniedMock = createMemoryPort('denied');
    const deniedService = new CareNotificationService(deniedMock.port);
    expect(await deniedService.sendTestNotification(makeSnapshot(), NOW_MS)).toBe(false);

    const afterReq = await service.requestPermissionAndSync(makeSnapshot({ hunger: 90 }), NOW_MS);
    expect(afterReq.permission).toBe('granted');
  });
});
