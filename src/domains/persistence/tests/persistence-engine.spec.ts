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
  MemoryKeyValueStorage,
  resolveDefaultStorageAdapter
} from '../infrastructure/local-storage-save-repository';

describe('persistence domain engine, offline simulation, and save repository', () => {
  it('provides SystemClock and creates initial save snapshot with random or explicit character for all 11 species', () => {
    const clock = new SystemClock();
    expect(clock.nowMs()).toBeGreaterThan(1000000);

    const randomSnapshot = createNewGameSaveSnapshot(100000);
    expect(randomSnapshot.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(Object.keys(randomSnapshot.characters)).toContain(randomSnapshot.activeCharacterId);
    expect(Object.keys(randomSnapshot.characters).length).toBe(11);

    const explicitSnapshot = createNewGameSaveSnapshot(100000, 'ignisauro');
    expect(explicitSnapshot.activeCharacterId).toBe('ignisauro');
  });

  it('simulates offline elapsed time across minutes, hours, days, evolves when eligible, and handles clock skew safely', () => {
    const snapshot = createNewGameSaveSnapshot(100000, 'ignisauro');

    // Clock skew (now < lastSavedAtMs) should clamp elapsed time to 0 and update timestamp
    const skewed = simulateOfflineProgressOnSnapshot(snapshot, 50000);
    expect(skewed.lastSavedAtMs).toBe(50000);
    expect(skewed.characters.ignisauro.needs.hunger).toBe(
      snapshot.characters.ignisauro.needs.hunger
    );

    // 1 minute later (< 2 min incubation) keeps ovo intact with full needs
    const after1Min = simulateOfflineProgressOnSnapshot(snapshot, 100000 + 60_000);
    expect(after1Min.characters.ignisauro.runtime.currentStage).toBe('ovo');
    expect(after1Min.characters.ignisauro.needs.hunger).toBe(snapshot.characters.ignisauro.needs.hunger);

    // Deferring active egg hatch in live foreground loop preserves ovo until UI plays opening animation
    const deferred = simulateOfflineProgressOnSnapshot(snapshot, 100000 + 10_800_000, {
      deferActiveEggHatch: true
    });
    expect(deferred.characters.ignisauro.runtime.currentStage).toBe('ovo');

    // 3 hours later (3 * 3600 * 1000 = 10_800_000 ms) -> hatches ovo -> baby
    const after3Hours = simulateOfflineProgressOnSnapshot(snapshot, 100000 + 10_800_000);
    expect(after3Hours.characters.ignisauro.runtime.ageHours).toBe(3);
    expect(after3Hours.characters.ignisauro.runtime.currentStage).toBe('baby');
    expect(after3Hours.characters.ignisauro.needs.hunger).toBeLessThan(
      snapshot.characters.ignisauro.needs.hunger
    );

    // Another hour at level 1 stays at baby (non-evolving branch)
    const stillBaby = simulateOfflineProgressOnSnapshot(after3Hours, 100000 + 14_400_000);
    expect(stillBaby.characters.ignisauro.runtime.currentStage).toBe('baby');

    // Character at level 3 and 24+ hours evolving from baby -> crianca when offline time advances
    const readyToEvolve: typeof snapshot = {
      ...after3Hours,
      characters: {
        ...after3Hours.characters,
        ignisauro: {
          ...after3Hours.characters.ignisauro,
          runtime: {
            ...after3Hours.characters.ignisauro.runtime,
            ageHours: 23.5
          },
          progression: {
            ...after3Hours.characters.ignisauro.progression,
            level: 3
          }
        }
      }
    };
    const evolvedOffline = simulateOfflineProgressOnSnapshot(readyToEvolve, 100000 + 14_400_000);
    expect(evolvedOffline.characters.ignisauro.runtime.currentStage).toBe('crianca');

    // Simulating neglect (many hours offline) triggers diseases and eventually death by neglect/disease
    const neglected = simulateOfflineProgressOnSnapshot(snapshot, 100000 + 48 * 3600 * 1000);
    expect(neglected.characters.ignisauro.runtime.activeDiseases?.length).toBeGreaterThan(0);
    expect(neglected.characters.ignisauro.runtime.causeOfDeath).toBe('neglect_or_disease');

    // Simulating reaching 720 hours (30 days = 1 real-life month) causes natural death by old age
    const elderlySnap: typeof snapshot = {
      ...snapshot,
      characters: {
        ...snapshot.characters,
        ignisauro: {
          ...snapshot.characters.ignisauro,
          runtime: {
            ...snapshot.characters.ignisauro.runtime,
            currentStage: 'adulto',
            ageHours: 719.5
          }
        }
      }
    };
    const oldAgeSnap = simulateOfflineProgressOnSnapshot(elderlySnap, 100000 + 3600 * 1000);
    expect(oldAgeSnap.characters.ignisauro.runtime.healthCondition).toBe('deceased');
    expect(oldAgeSnap.characters.ignisauro.runtime.causeOfDeath).toBe('old_age');
    expect(oldAgeSnap.characters.ignisauro.needs.health).toBe(0);
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
    expect(Object.keys(migrated.characters).length).toBe(11);

    // Legacy v0/v1 snapshot missing genetics gets assigned permanent genetics & sex
    const legacyWithoutGenetics = {
      schemaVersion: 1,
      activeCharacterId: 'glacissauro',
      lastSavedAtMs: 1500,
      characters: {
        glacissauro: {
          runtime: {
            ...valid.characters.glacissauro.runtime,
            createdAtMs: 0
          },
          needs: valid.characters.glacissauro.needs,
          attributes: valid.characters.glacissauro.attributes,
          progression: valid.characters.glacissauro.progression
          // no genetics property
        }
      }
    };
    const migratedGenetics = validateAndMigrateSaveSnapshot(legacyWithoutGenetics, 2000);
    expect(migratedGenetics.characters.glacissauro.genetics).toBeDefined();
    expect(['male', 'female']).toContain(migratedGenetics.characters.glacissauro.genetics.sex);
    expect(migratedGenetics.characters.glacissauro.genetics.generation).toBe(1);

    // Completely invalid input falls back to a fresh save snapshot with a valid random character
    const fallback = validateAndMigrateSaveSnapshot('corrupted-json', 5000);
    expect(Object.keys(fallback.characters)).toContain(fallback.activeCharacterId);
    expect(fallback.lastSavedAtMs).toBe(5000);

    const invalidActiveId = validateAndMigrateSaveSnapshot(
      { schemaVersion: 1, activeCharacterId: 'invalid-dino', lastSavedAtMs: -50, settings: 'bad' },
      6000
    );
    expect(invalidActiveId.activeCharacterId).toBe('ignisauro');
    expect(invalidActiveId.lastSavedAtMs).toBe(6000);
    expect(invalidActiveId.settings.notificationsEnabled).toBe(true);
  });

  it('persists, loads, recovers from corrupted JSON, and clears snapshots in LocalStorageGameSaveRepository', async () => {
    const defaultRepo = new LocalStorageGameSaveRepository();
    await defaultRepo.clearSave();
    expect(await defaultRepo.loadSave()).toBeNull();

    // Explicitly exercise MemoryKeyValueStorage fallback on all Node versions (20 & 26)
    const fallbackStorage = resolveDefaultStorageAdapter(null);
    expect(fallbackStorage).toBeInstanceOf(MemoryKeyValueStorage);
    expect(fallbackStorage.getItem('missing')).toBeNull();
    fallbackStorage.setItem('k', 'v');
    expect(fallbackStorage.getItem('k')).toBe('v');
    fallbackStorage.removeItem('k');
    expect(fallbackStorage.getItem('k')).toBeNull();

    const repo = new LocalStorageGameSaveRepository('test_save_key', fallbackStorage);
    expect(await repo.loadSave()).toBeNull();

    const snapshot = createNewGameSaveSnapshot(10000, 'ignisauro');
    await repo.saveSnapshot(snapshot);

    const loaded = await repo.loadSave();
    expect(loaded).not.toBeNull();
    expect(loaded?.activeCharacterId).toBe('ignisauro');

    // Corrupted JSON recovers without throwing
    fallbackStorage.setItem('test_save_key', '{bad-json');
    const recovered = await repo.loadSave();
    expect(recovered).toBeNull();

    await repo.clearSave();
    expect(await repo.loadSave()).toBeNull();

    // Explicitly exercise valid Web Storage adapter branch
    const fakeBrowserStorage = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined
    };
    expect(resolveDefaultStorageAdapter(fakeBrowserStorage)).toBe(fakeBrowserStorage);
  });
});
