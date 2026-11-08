import { describe, it, expect } from 'vitest';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  SystemClock,
  createNewGameSaveSnapshot,
  simulateOfflineProgressOnSnapshot,
  validateAndMigrateSaveSnapshot
} from '../domain/persistence-engine';
import {
  LocalStorageGameSaveRepository,
  resolveDefaultStorageAdapter
} from '../infrastructure/local-storage-save-repository';

describe('persistence domain engine, offline simulation, and save repository', () => {
  it('provides SystemClock and creates initial save snapshot for all 8 characters', () => {
    const clock = new SystemClock();
    expect(clock.nowMs()).toBeGreaterThan(1000000);

    const snapshot = createNewGameSaveSnapshot(100000);
    expect(snapshot.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(snapshot.activeCharacterId).toBe('ignisauro');
    expect(Object.keys(snapshot.characters).length).toBe(8);
  });

  it('simulates offline elapsed time across minutes, hours, days, and handles clock skew safely', () => {
    const snapshot = createNewGameSaveSnapshot(100000);

    // Clock skew (now < lastSavedAtMs) should clamp elapsed time to 0 and update timestamp
    const skewed = simulateOfflineProgressOnSnapshot(snapshot, 50000);
    expect(skewed.lastSavedAtMs).toBe(50000);
    expect(skewed.characters.ignisauro.needs.hunger).toBe(
      snapshot.characters.ignisauro.needs.hunger
    );

    // 3 hours later (3 * 3600 * 1000 = 10_800_000 ms)
    const after3Hours = simulateOfflineProgressOnSnapshot(snapshot, 100000 + 10_800_000);
    expect(after3Hours.characters.ignisauro.runtime.ageHours).toBe(3);
    expect(after3Hours.characters.ignisauro.needs.hunger).toBeLessThan(
      snapshot.characters.ignisauro.needs.hunger
    );
  });

  it('validates and migrates legacy or corrupted save snapshots safely', () => {
    const valid = createNewGameSaveSnapshot(1000);
    expect(validateAndMigrateSaveSnapshot(valid, 2000).schemaVersion).toBe(
      CURRENT_SAVE_SCHEMA_VERSION
    );

    // Legacy v0 snapshot missing some characters or fields gets migrated cleanly
    const legacy = {
      schemaVersion: 0,
      activeCharacterId: 'glacissauro',
      lastSavedAtMs: 1500,
      characters: {
        glacissauro: valid.characters.glacissauro
      }
    };
    const migrated = validateAndMigrateSaveSnapshot(legacy, 2000);
    expect(migrated.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(migrated.activeCharacterId).toBe('glacissauro');
    expect(Object.keys(migrated.characters).length).toBe(8);

    // Completely invalid input falls back to a fresh save snapshot
    const fallback = validateAndMigrateSaveSnapshot('corrupted-json', 5000);
    expect(fallback.activeCharacterId).toBe('ignisauro');
    expect(fallback.lastSavedAtMs).toBe(5000);

    const invalidActiveId = validateAndMigrateSaveSnapshot(
      { schemaVersion: 1, activeCharacterId: 'invalid-dino', lastSavedAtMs: -50 },
      6000
    );
    expect(invalidActiveId.activeCharacterId).toBe('ignisauro');
    expect(invalidActiveId.lastSavedAtMs).toBe(6000);
  });

  it('persists, loads, recovers from corrupted JSON, and clears snapshots in LocalStorageGameSaveRepository', async () => {
    const defaultRepo = new LocalStorageGameSaveRepository();
    expect(await defaultRepo.loadSave()).toBeNull();

    const customStorage = resolveDefaultStorageAdapter();
    const repo = new LocalStorageGameSaveRepository('test_save_key', customStorage);
    expect(await repo.loadSave()).toBeNull();

    const snapshot = createNewGameSaveSnapshot(10000);
    await repo.saveSnapshot(snapshot);

    const loaded = await repo.loadSave();
    expect(loaded).not.toBeNull();
    expect(loaded?.activeCharacterId).toBe('ignisauro');

    // Corrupted JSON recovers without throwing
    customStorage.setItem('test_save_key', '{bad-json');
    const recovered = await repo.loadSave();
    expect(recovered).toBeNull();

    await repo.clearSave();
    expect(await repo.loadSave()).toBeNull();

    // Also test browser localStorage branch when window.localStorage has getItem
    const fakeBrowserStorage = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined
    };
    Object.defineProperty(window, 'localStorage', {
      value: fakeBrowserStorage,
      configurable: true
    });
    expect(resolveDefaultStorageAdapter()).toBe(fakeBrowserStorage);
  });
});
