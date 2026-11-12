import { describe, it, expect } from 'vitest';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  SystemClock,
  createNewGameSaveSnapshot,
  listOwnedCreatures,
  normalizeBredEggRecord,
  resolveActiveCreatureContext,
  resolveEggStatus,
  simulateOfflineProgressOnSnapshot,
  validateAndMigrateSaveSnapshot
} from '../domain/persistence-engine';
import {
  recordBreedingResultUseCase,
  startEggIncubationUseCase,
  hatchBredEggAtomicUseCase
} from '../application/game-session-service';
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

    // Fresh snapshot starts with ONLY 1 creature (starter) and never auto-hatches unowned species offline
    expect(listOwnedCreatures(snapshot)).toHaveLength(1);
    expect(listOwnedCreatures(snapshot)[0].speciesId).toBe('ignisauro');

    // Simulating neglect (many hours offline) triggers diseases and eventually death by neglect/disease
    const neglected = simulateOfflineProgressOnSnapshot(snapshot, 100000 + 48 * 3600 * 1000);
    expect(neglected.characters.ignisauro.runtime.activeDiseases?.length).toBeGreaterThan(0);
    expect(neglected.characters.ignisauro.runtime.causeOfDeath).toBe('neglect_or_disease');
    expect(neglected.characters.glacissauro.runtime.currentStage).toBe('ovo');
    expect(listOwnedCreatures(neglected)).toHaveLength(1);

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

  it('persists, reloads, simulates offline progress and reconciles incubator eggs and collection babies safely', async () => {
    const memoryStorage = new MemoryKeyValueStorage();
    const repo = new LocalStorageGameSaveRepository('bred_lifecycle_test', memoryStorage);
    const startSnap = createNewGameSaveSnapshot(1000, 'ignisauro');
    const genome = startSnap.characters.ignisauro.genetics;

    // Normalize helper edge cases: legacy statuses & invalid fallback maxIncubationHours
    expect(
      resolveEggStatus({
        id: 'e1',
        genome,
        targetSpecies: 'ignisauro',
        incubationProgress: 0.02,
        maxIncubationHours: 0.05,
        isWarm: true,
        createdAtMs: 1000,
        isReadyToHatch: false
      })
    ).toBe('incubating');

    const normalizedPeerEgg = normalizeBredEggRecord(
      {
        id: 'e-peer',
        ownerId: 'peer-ephemeral-123',
        genome,
        targetSpecies: 'ignisauro',
        incubationProgress: 0,
        maxIncubationHours: 0.05,
        isWarm: true,
        createdAtMs: 1000,
        isReadyToHatch: false
      },
      'local-player'
    );
    expect(normalizedPeerEgg.ownerId).toBe('local-player');

    const normalizedBadHours = normalizeBredEggRecord(
      {
        id: 'e2',
        genome,
        targetSpecies: 'ignisauro',
        incubationProgress: 0,
        maxIncubationHours: 0,
        isWarm: true,
        createdAtMs: 1000,
        isReadyToHatch: false
      },
      'local-player'
    );
    expect(normalizedBadHours.maxIncubationHours).toBe(0.05);

    const withEggs = recordBreedingResultUseCase(
      startSnap,
      {
        sessionId: 's1',
        timestampMs: 1200,
        sireGenomeId: genome.genomeId,
        damGenomeId: genome.genomeId,
        sireSpecies: 'ignisauro',
        damSpecies: 'ignisauro',
        offspringGenomeId: genome.genomeId,
        offspringSpecies: 'ignisauro',
        winnerPeerId: 'local-player',
        isLocalWinner: true,
        mutationCount: 0
      },
      {
        id: 'egg-persist-1',
        ownerId: 'local-player',
        genome,
        targetSpecies: 'ignisauro',
        status: 'available',
        incubationProgress: 0,
        maxIncubationHours: 0.05,
        isWarm: true,
        createdAtMs: 1200,
        isReadyToHatch: false
      },
      1200
    );

    const incubatingSnap = startEggIncubationUseCase(withEggs, 'egg-persist-1', 1500).snapshot;

    // Simulate +10 minutes offline: egg finishes incubation and becomes ready_to_hatch
    const afterOffline = simulateOfflineProgressOnSnapshot(incubatingSnap, 1500 + 10 * 60_000);
    expect(resolveEggStatus(afterOffline.incubator[0])).toBe('ready_to_hatch');

    const hatched = hatchBredEggAtomicUseCase(afterOffline, 'egg-persist-1', 1500 + 11 * 60_000, 'Brasinha');
    expect(hatched.success).toBe(true);
    const babyId = hatched.hatchedCreatureId!;

    await repo.saveSnapshot(hatched.snapshot);
    const reloaded = await repo.loadSave();
    expect(reloaded).not.toBeNull();
    expect(reloaded?.collection?.[babyId]?.originEggId).toBe('egg-persist-1');
    expect(reloaded?.incubator[0]?.status).toBe('hatched');
    expect(resolveActiveCreatureContext(reloaded!).creatureId).toBe(babyId);
    expect(listOwnedCreatures(reloaded!).length).toBeGreaterThanOrEqual(2);

    // Offline progress also evolves/updates creatures inside collection
    const afterBabyOffline = simulateOfflineProgressOnSnapshot(reloaded!, reloaded!.lastSavedAtMs + 2 * 3600_000);
    expect(afterBabyOffline.collection?.[babyId]?.runtime.ageHours).toBe(2);

    // Migration ignores corrupted incubator or collection entries safely while reconciling hatched link
    const migratedReconcile = validateAndMigrateSaveSnapshot(
      {
        ...reloaded!,
        playerId: '',
        incubator: [
          null,
          {
            ...reloaded!.incubator[0],
            status: 'ready_to_hatch',
            isReadyToHatch: true
          }
        ],
        collection: {
          broken: null,
          [babyId]: {
            ...reloaded!.collection![babyId],
            id: undefined
          }
        }
      },
      99999
    );
    expect(migratedReconcile.incubator).toHaveLength(1);
    expect(migratedReconcile.incubator[0].status).toBe('hatched');
    expect(migratedReconcile.playerId).toBe('local-player');
    expect(migratedReconcile.collection?.broken).toBeUndefined();
    expect(migratedReconcile.collection?.[babyId]?.id).toBe(babyId);

    // Legacy snapshot without starterCharacterId, id fields, or collection works seamlessly
    const legacyNoCollection = {
      ...startSnap,
      starterCharacterId: undefined,
      collection: undefined,
      characters: {
        ...startSnap.characters,
        ignisauro: {
          ...startSnap.characters.ignisauro,
          id: undefined
        }
      }
    };
    expect(resolveActiveCreatureContext(legacyNoCollection).creatureId).toBe('ignisauro');
    expect(
      resolveActiveCreatureContext({ ...legacyNoCollection, activeCreatureInstanceId: undefined }).creatureId
    ).toBe('ignisauro');
    expect(listOwnedCreatures(legacyNoCollection).length).toBe(1);
    expect(simulateOfflineProgressOnSnapshot(legacyNoCollection, 120_000).collection).toEqual({});

    // Re-migrating an existing legacy character without `.id` populates `id: species.id` cleanly
    const migratedNoCharId = validateAndMigrateSaveSnapshot(legacyNoCollection, 120_000);
    expect(migratedNoCharId.characters.ignisauro.id).toBe('ignisauro');

    // Owned list NEVER exposes unowned species even if legacy save progressed them past 'ovo'
    const withUnownedProgressedSpecies = {
      ...startSnap,
      starterCharacterId: 'ignisauro' as const,
      activeCharacterId: 'glacissauro' as const,
      activeCreatureInstanceId: babyId,
      collection: {
        [babyId]: reloaded!.collection![babyId]
      },
      characters: {
        ...startSnap.characters,
        glacissauro: {
          ...startSnap.characters.glacissauro,
          runtime: {
            ...startSnap.characters.glacissauro.runtime,
            currentStage: 'adulto' as const
          }
        }
      }
    };
    const ownedFiltered = listOwnedCreatures(withUnownedProgressedSpecies);
    expect(ownedFiltered).toHaveLength(2);
    expect(ownedFiltered.some((e) => e.speciesId === 'glacissauro' && e.source === 'starter')).toBe(false);

    // When active creature IS a starter override (e.g. Dev preview), it appears alongside starter + collection and sorts non-active by createdAtMs
    const secondCollectionBaby = {
      ...reloaded!.collection![babyId],
      id: 'baby-extra-2',
      runtime: {
        ...reloaded!.collection![babyId].runtime,
        createdAtMs: 5000
      }
    };
    const withDevStarterOverride = {
      ...startSnap,
      starterCharacterId: 'ignisauro' as const,
      activeCharacterId: 'glacissauro' as const,
      activeCreatureInstanceId: 'glacissauro',
      collection: {
        [babyId]: reloaded!.collection![babyId],
        'baby-extra-2': secondCollectionBaby
      }
    };
    const devSortedOwned = listOwnedCreatures(withDevStarterOverride);
    expect(devSortedOwned).toHaveLength(4);
    expect(devSortedOwned[0].creatureId).toBe('glacissauro');
    const offlineDevOverride = simulateOfflineProgressOnSnapshot(withDevStarterOverride, 1000 + 3 * 3600_000);
    expect(offlineDevOverride.characters.ignisauro.runtime.currentStage).toBe('baby');
    expect(offlineDevOverride.characters.glacissauro.runtime.currentStage).toBe('baby');
    expect(offlineDevOverride.characters.terrassauro.runtime.currentStage).toBe('ovo');
  });
});
