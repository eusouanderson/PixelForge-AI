import { describe, it, expect } from 'vitest';
import { createGenesisGenome } from '@/domains/genetics/domain/dna-engine';
import { crossGenomes } from '@/domains/genetics/domain/inheritance-engine';
import { createNewGameSaveSnapshot, resolveEggStatus } from '../domain/persistence-engine';
import {
  selectActiveCharacterUseCase,
  selectActiveCreatureUseCase,
  feedActiveCharacterUseCase,
  performCharacterActivityUseCase,
  purchaseFoodItemUseCase,
  reviveDeceasedCharacterUseCase,
  hatchCharacterEggUseCase,
  updateSettingsUseCase,
  recordBreedingResultUseCase,
  startEggIncubationUseCase,
  advanceIncubationUseCase,
  advanceAllIncubatingEggsUseCase,
  warmIncubatingEggUseCase,
  hatchBredEggAtomicUseCase,
  hatchBredEggUseCase,
  recordBattleResultUseCase,
  listOwnedCreatures
} from '../application/game-session-service';

describe('GameSessionService application use cases', () => {
  it('switches active character and updates settings immutably', () => {
    const start = createNewGameSaveSnapshot(1000, 'ignisauro');
    const switched = selectActiveCharacterUseCase(start, 'solassauro', 2000);
    expect(switched.activeCharacterId).toBe('solassauro');
    expect(switched.lastSavedAtMs).toBe(2000);

    const withSettings = updateSettingsUseCase(switched, { graphicsQuality: 'balanced' }, 3000);
    expect(withSettings.settings.graphicsQuality).toBe('balanced');
  });

  it('feeds active character with favorite, forbidden, out-of-stock, evolution, and deceased states', () => {
    let snap = createNewGameSaveSnapshot(1000, 'ignisauro');

    // Feeding an egg before hatching is blocked
    const eggBlocked = feedActiveCharacterUseCase(snap, 'volcanic-roast-meat', 1100);
    expect(eggBlocked.success).toBe(false);
    expect(eggBlocked.message).toContain('ovo ancestral');

    // Hatch egg into baby
    snap = hatchCharacterEggUseCase(snap, 1200);
    expect(snap.characters.ignisauro.runtime.currentStage).toBe('baby');

    // Out of stock item
    const outOfStock = feedActiveCharacterUseCase(snap, 'missing-food-id', 1500);
    expect(outOfStock.success).toBe(false);
    expect(outOfStock.message).toContain('Estoque');

    // Favorite food for ignisauro: volcanic-roast-meat
    const favFeed = feedActiveCharacterUseCase(snap, 'volcanic-roast-meat', 2000);
    expect(favFeed.success).toBe(true);
    expect(favFeed.reaction?.preference).toBe('favorite');
    expect(favFeed.snapshot.characters.ignisauro.attributes.strength).toBeGreaterThan(
      snap.characters.ignisauro.attributes.strength
    );

    // Feeding when already full (hunger = 100 after favFeed) triggers overeating_indigestion!
    const overfed = feedActiveCharacterUseCase(favFeed.snapshot, 'volcanic-roast-meat', 2200);
    expect(overfed.success).toBe(true);
    expect(overfed.reaction?.contractedDiseaseId).toBe('overeating_indigestion');

    // Feeding when hungry and ready to evolve triggers stage evolution (baby -> crianca)
    const babyReadySnap = {
      ...favFeed.snapshot,
      characters: {
        ...favFeed.snapshot.characters,
        ignisauro: {
          ...favFeed.snapshot.characters.ignisauro,
          needs: {
            ...favFeed.snapshot.characters.ignisauro.needs,
            hunger: 50,
            health: 80,
            happiness: 80
          },
          runtime: {
            ...favFeed.snapshot.characters.ignisauro.runtime,
            currentStage: 'baby' as const,
            ageHours: 25,
            activeDiseases: []
          },
          progression: {
            ...favFeed.snapshot.characters.ignisauro.progression,
            currentStage: 'baby' as const,
            level: 3,
            currentXp: 0,
            nextLevelXp: 300
          }
        }
      }
    };
    const evolvedByFeed = feedActiveCharacterUseCase(babyReadySnap, 'volcanic-roast-meat', 2500);
    expect(evolvedByFeed.snapshot.characters.ignisauro.runtime.currentStage).toBe('crianca');

    // Forbidden food for ignisauro: frosted-crystal-berry -> contracts food_poisoning and blocks evolution
    const forbFeed = feedActiveCharacterUseCase(evolvedByFeed.snapshot, 'frosted-crystal-berry', 3000);
    expect(forbFeed.success).toBe(true);
    expect(forbFeed.reaction?.preference).toBe('forbidden');
    expect(forbFeed.snapshot.characters.ignisauro.needs.health).toBeLessThan(100);
    expect(forbFeed.snapshot.characters.ignisauro.runtime.activeDiseases?.length).toBe(1);

    // Using wrong medicine does not cure food_poisoning
    const wrongMed = feedActiveCharacterUseCase(forbFeed.snapshot, 'nutri-vital-serum', 3200);
    expect(wrongMed.success).toBe(true);
    expect(wrongMed.snapshot.characters.ignisauro.runtime.activeDiseases?.length).toBe(1);

    // Using specific remedy (antitoxin-charcoal-extract) cures food_poisoning!
    const curedFeed = feedActiveCharacterUseCase(
      wrongMed.snapshot,
      'antitoxin-charcoal-extract',
      3500
    );
    expect(curedFeed.success).toBe(true);
    expect(curedFeed.message).toContain('Curou 1 enfermidade');
    expect(curedFeed.snapshot.characters.ignisauro.runtime.activeDiseases?.length).toBe(0);

    // Feeding while sleeping is blocked
    const sleepingFeedSnap = {
      ...snap,
      characters: {
        ...snap.characters,
        ignisauro: {
          ...snap.characters.ignisauro,
          runtime: {
            ...snap.characters.ignisauro.runtime,
            currentStage: 'baby' as const,
            sleepState: 'sleeping' as const
          }
        }
      }
    };
    const sleepFeed = feedActiveCharacterUseCase(sleepingFeedSnap, 'volcanic-roast-meat', 3600);
    expect(sleepFeed.success).toBe(false);
    expect(sleepFeed.message).toContain('dormindo');

    // Deceased character cannot eat
    snap = {
      ...snap,
      characters: {
        ...snap.characters,
        ignisauro: {
          ...snap.characters.ignisauro,
          needs: { ...snap.characters.ignisauro.needs, health: 0 },
          runtime: { ...snap.characters.ignisauro.runtime, healthCondition: 'deceased' }
        }
      }
    };
    const deadFeed = feedActiveCharacterUseCase(snap, 'volcanic-roast-meat', 4000);
    expect(deadFeed.success).toBe(false);
    expect(deadFeed.message).toContain('falecido');
  });

  it('executes activities, triggers stage evolution when eligible, and handles tired/deceased/sick states', () => {
    let snap = createNewGameSaveSnapshot(1000, 'ignisauro');

    // Attempting activity on an unhatched egg is blocked
    const eggAct = performCharacterActivityUseCase(snap, 'lava-sprint', 1100);
    expect(eggAct.success).toBe(false);
    expect(eggAct.message).toContain('ovo ancestral');

    // Boost ignisauro (in baby stage) ageHours to 25 and level to 2 with 190 XP so one activity levels up to 3 and evolves baby -> crianca!
    snap = {
      ...snap,
      characters: {
        ...snap.characters,
        ignisauro: {
          ...snap.characters.ignisauro,
          runtime: {
            ...snap.characters.ignisauro.runtime,
            currentStage: 'baby',
            ageHours: 25
          },
          progression: {
            ...snap.characters.ignisauro.progression,
            currentStage: 'baby',
            level: 2,
            currentXp: 190,
            nextLevelXp: 200
          }
        }
      }
    };

    const actRes = performCharacterActivityUseCase(snap, 'lava-sprint', 2000);
    expect(actRes.success).toBe(true);
    expect(actRes.leveledUp).toBe(true);
    expect(actRes.evolvedToStage).toBe('crianca');
    expect(actRes.snapshot.characters.ignisauro.runtime.currentStage).toBe('crianca');
    expect(actRes.snapshot.wallet.amberCoins).toBeGreaterThan(snap.wallet.amberCoins);

    // Sick character executing activity cannot evolve
    const sickSnap = {
      ...snap,
      characters: {
        ...snap.characters,
        ignisauro: {
          ...snap.characters.ignisauro,
          runtime: {
            ...snap.characters.ignisauro.runtime,
            activeDiseases: [
              {
                id: 'malnutrition' as const,
                name: 'Desnutrição',
                description: 'Falta de nutrientes',
                contractedAtMs: 1000,
                remedyFoodId: 'nutri-vital-serum'
              }
            ]
          }
        }
      }
    };
    const sickActRes = performCharacterActivityUseCase(sickSnap, 'lava-sprint', 2200);
    expect(sickActRes.evolvedToStage).toBeNull();

    // Second activity does not evolve immediately (exercises non-evolving activity branch)
    const normalActRes = performCharacterActivityUseCase(actRes.snapshot, 'purifying-bath', 2500);
    expect(normalActRes.success).toBe(true);
    expect(normalActRes.evolvedToStage).toBeNull();

    // Tired character fails activity requiring energy
    const tiredSnap = {
      ...actRes.snapshot,
      characters: {
        ...actRes.snapshot.characters,
        ignisauro: {
          ...actRes.snapshot.characters.ignisauro,
          needs: { ...actRes.snapshot.characters.ignisauro.needs, energy: 0 }
        }
      }
    };
    const tiredRes = performCharacterActivityUseCase(tiredSnap, 'lava-sprint', 3000);
    expect(tiredRes.success).toBe(false);

    // Sleeping character fails normal activity
    const sleepingActSnap = {
      ...actRes.snapshot,
      characters: {
        ...actRes.snapshot.characters,
        ignisauro: {
          ...actRes.snapshot.characters.ignisauro,
          runtime: {
            ...actRes.snapshot.characters.ignisauro.runtime,
            sleepState: 'sleeping' as const
          }
        }
      }
    };
    const sleepAct = performCharacterActivityUseCase(sleepingActSnap, 'lava-sprint', 3500);
    expect(sleepAct.success).toBe(false);
    expect(sleepAct.message).toContain('dormindo');

    // Deep slumber initiates a restful sleep session with dormindo animation
    const slumberRes = performCharacterActivityUseCase(actRes.snapshot, 'deep-slumber', 3600);
    expect(slumberRes.success).toBe(true);
    expect(slumberRes.snapshot.characters.ignisauro.runtime.sleepState).toBe('sleeping');
    expect(slumberRes.snapshot.characters.ignisauro.runtime.currentAnimation).toBe('dormindo');
    expect(slumberRes.snapshot.characters.ignisauro.runtime.sleepSession).toBeDefined();

    // Deceased character fails activity
    const deadSnap = {
      ...actRes.snapshot,
      characters: {
        ...actRes.snapshot.characters,
        ignisauro: {
          ...actRes.snapshot.characters.ignisauro,
          needs: { ...actRes.snapshot.characters.ignisauro.needs, health: 0 },
          runtime: {
            ...actRes.snapshot.characters.ignisauro.runtime,
            healthCondition: 'deceased' as const
          }
        }
      }
    };
    const deadAct = performCharacterActivityUseCase(deadSnap, 'lava-sprint', 4000);
    expect(deadAct.success).toBe(false);
  });

  it('purchases food items with Amber Coins and handles insufficient funds or full inventory', () => {
    const snap = createNewGameSaveSnapshot(1000, 'ignisauro');

    const bought = purchaseFoodItemUseCase(snap, 'volcanic-roast-meat', 2, 2000);
    expect(bought.success).toBe(true);
    expect(bought.snapshot.wallet.amberCoins).toBe(snap.wallet.amberCoins - 50);

    const poorSnap = {
      ...snap,
      wallet: { ...snap.wallet, amberCoins: 5 }
    };
    const failedBuy = purchaseFoodItemUseCase(poorSnap, 'volcanic-roast-meat', 1, 3000);
    expect(failedBuy.success).toBe(false);

    const invalidQtyBuy = purchaseFoodItemUseCase(snap, 'volcanic-roast-meat', 0, 3000);
    expect(invalidQtyBuy.success).toBe(false);
  });

  it('hatches egg stage character and revives deceased character', () => {
    let snap = createNewGameSaveSnapshot(1000, 'ignisauro');
    snap = {
      ...snap,
      characters: {
        ...snap.characters,
        ignisauro: {
          ...snap.characters.ignisauro,
          runtime: {
            ...snap.characters.ignisauro.runtime,
            currentStage: 'ovo',
            currentAnimation: 'eclosao'
          },
          progression: {
            ...snap.characters.ignisauro.progression,
            currentStage: 'ovo'
          }
        }
      }
    };

    const hatched = hatchCharacterEggUseCase(snap, 2000);
    expect(hatched.characters.ignisauro.runtime.currentStage).toBe('baby');
    expect(hatched.characters.ignisauro.runtime.currentAnimation).toBe('idle');

    // Hatching non-egg returns unchanged
    const hatchedAgain = hatchCharacterEggUseCase(hatched, 2500);
    expect(hatchedAgain.characters.ignisauro.runtime.currentStage).toBe('baby');

    // Revive deceased character
    const deadSnap = {
      ...hatched,
      characters: {
        ...hatched.characters,
        ignisauro: {
          ...hatched.characters.ignisauro,
          needs: {
            hunger: 0,
            thirst: 0,
            energy: 0,
            happiness: 0,
            hygiene: 0,
            health: 0
          },
          runtime: {
            ...hatched.characters.ignisauro.runtime,
            healthCondition: 'deceased' as const,
            emotionalState: 'deceased' as const,
            currentAnimation: 'morte' as const
          }
        }
      }
    };

    const revived = reviveDeceasedCharacterUseCase(deadSnap, 3000);
    expect(revived.characters.ignisauro.needs.health).toBe(100);
    expect(revived.characters.ignisauro.runtime.healthCondition).toBe('healthy');
    expect(revived.characters.ignisauro.runtime.currentAnimation).toBe('idle');

    // Reviving a character that died of old age (>= 720h) reincarnates it as a new egg (ovo)
    const oldDeadSnap = {
      ...deadSnap,
      characters: {
        ...deadSnap.characters,
        ignisauro: {
          ...deadSnap.characters.ignisauro,
          runtime: {
            ...deadSnap.characters.ignisauro.runtime,
            currentStage: 'adulto' as const,
            ageHours: 720,
            causeOfDeath: 'old_age' as const
          }
        }
      }
    };
    const reincarnated = reviveDeceasedCharacterUseCase(oldDeadSnap, 4000);
    expect(reincarnated.characters.ignisauro.runtime.currentStage).toBe('ovo');
    expect(reincarnated.characters.ignisauro.runtime.ageHours).toBe(0);
    expect(reincarnated.characters.ignisauro.runtime.currentAnimation).toBe('eclosao');
  });

  it('records breeding result, advances incubation and hatches bred egg', () => {
    const snap = createNewGameSaveSnapshot(1000, 'ignisauro');
    const dummyGenome = snap.characters.ignisauro.genetics;

    const historyRecord = {
      sessionId: 'sess-123',
      timestampMs: 1500,
      sireGenomeId: 'sire-id',
      damGenomeId: 'dam-id',
      sireSpecies: 'ignisauro' as const,
      damSpecies: 'terrassauro' as const,
      offspringGenomeId: 'child-genome-id',
      offspringSpecies: 'ignisauro' as const,
      winnerPeerId: 'my-peer',
      isLocalWinner: true,
      mutationCount: 0
    };

    const egg = {
      id: 'egg-test-1',
      genome: dummyGenome,
      targetSpecies: 'ignisauro' as const,
      incubationProgress: 0,
      maxIncubationHours: 2,
      isWarm: true,
      createdAtMs: 1500,
      isReadyToHatch: false
    };

    // 1. Record breeding result with egg won -> starts as 'available'
    const withEgg = recordBreedingResultUseCase(snap, historyRecord, egg, 1600);
    expect(withEgg.incubator).toHaveLength(1);
    expect(resolveEggStatus(withEgg.incubator[0])).toBe('available');
    expect(withEgg.genealogyArchive).toHaveLength(1);

    // Duplicate record of same egg id does not create duplicate egg entry
    const dedupedEgg = recordBreedingResultUseCase(withEgg, historyRecord, egg, 1650);
    expect(dedupedEgg.incubator).toHaveLength(1);

    // Record breeding result when remote won (no egg for local)
    const withoutEgg = recordBreedingResultUseCase(withEgg, { ...historyRecord, isLocalWinner: false }, null, 1700);
    expect(withoutEgg.incubator).toHaveLength(1);
    expect(withoutEgg.genealogyArchive).toHaveLength(2);

    // Cannot advance or hatch while still 'available' (incubation not started)
    const ignoredBeforeStart = advanceIncubationUseCase(withEgg, 'egg-test-1', 60, 1750);
    expect(ignoredBeforeStart.incubator[0].incubationProgress).toBe(0);
    const prematureHatch = hatchBredEggAtomicUseCase(withEgg, 'egg-test-1', 1760);
    expect(prematureHatch.success).toBe(false);
    expect(prematureHatch.snapshot.incubator).toHaveLength(1);

    // Ownership validation prevents incubating or hatching another player's egg
    const wrongOwnerIncubate = startEggIncubationUseCase(withEgg, 'egg-test-1', 1770, 'other-player');
    expect(wrongOwnerIncubate.success).toBe(false);
    expect(wrongOwnerIncubate.message).toContain('outro jogador');

    // 2. Start incubation safely -> status 'incubating', cannot start twice
    const started = startEggIncubationUseCase(withEgg, 'egg-test-1', 1780);
    expect(started.success).toBe(true);
    expect(resolveEggStatus(started.snapshot.incubator[0])).toBe('incubating');
    expect(started.snapshot.incubator[0].incubationStartedAtMs).toBe(1780);

    const doubleStart = startEggIncubationUseCase(started.snapshot, 'egg-test-1', 1790);
    expect(doubleStart.success).toBe(false);
    expect(doubleStart.message).toContain('já está em processo de incubação');

    // 3. Advance incubation
    const advanced1 = advanceIncubationUseCase(started.snapshot, 'egg-test-1', 60, 1800); // 1 hour
    expect(advanced1.incubator[0].incubationProgress).toBe(1);
    expect(advanced1.incubator[0].isReadyToHatch).toBe(false);

    // Warming advances progress smoothly
    const warmed = warmIncubatingEggUseCase(advanced1, 'egg-test-1', 1820);
    expect(warmed.success).toBe(true);
    expect(warmed.snapshot.incubator[0].incubationProgress).toBeGreaterThan(1);

    // Other egg id & non-positive elapsed ignored cleanly
    const unchanged = advanceIncubationUseCase(started.snapshot, 'other-id', 60, 1800);
    expect(unchanged.incubator[0].incubationProgress).toBe(0);
    expect(advanceIncubationUseCase(started.snapshot, 'egg-test-1', 0, 1800)).toBe(started.snapshot);
    expect(advanceAllIncubatingEggsUseCase(started.snapshot, 0, 1800)).toBe(started.snapshot);

    // Premature hatch while incubating fails & preserves egg
    const prematureDuringIncubating = hatchBredEggAtomicUseCase(advanced1, 'egg-test-1', 1850);
    expect(prematureDuringIncubating.success).toBe(false);
    expect(prematureDuringIncubating.snapshot.incubator).toHaveLength(1);

    const readyEggSnap = advanceAllIncubatingEggsUseCase(advanced1, 60, 1900); // 2 hours
    expect(readyEggSnap.incubator[0].incubationProgress).toBe(2);
    expect(readyEggSnap.incubator[0].isReadyToHatch).toBe(true);
    expect(resolveEggStatus(readyEggSnap.incubator[0])).toBe('ready_to_hatch');

    // Starting or warming already-ready egg refuses cleanly
    expect(startEggIncubationUseCase(readyEggSnap, 'egg-test-1', 1950).success).toBe(false);
    expect(warmIncubatingEggUseCase(readyEggSnap, 'egg-test-1', 1950).success).toBe(false);

    // 4. Hatch bred egg atomically -> creates creature in collection, preserves parent & retains egg as 'hatched'
    const hatchedResult = hatchBredEggAtomicUseCase(readyEggSnap, 'egg-test-1', 2000, 'Faísca Jr.');
    expect(hatchedResult.success).toBe(true);
    expect(hatchedResult.hatchedCreatureId).toBeDefined();
    const childId = hatchedResult.hatchedCreatureId!;
    const hatchedSnap = hatchedResult.snapshot;

    // Parent ignisauro in characters is NOT overwritten!
    expect(hatchedSnap.characters.ignisauro.runtime.currentStage).toBe('ovo');
    expect(hatchedSnap.characters.ignisauro.id).toBe('ignisauro');

    // Egg remains tracked as 'hatched' with hatchedCreatureId link
    expect(hatchedSnap.incubator).toHaveLength(1);
    expect(resolveEggStatus(hatchedSnap.incubator[0])).toBe('hatched');
    expect(hatchedSnap.incubator[0].hatchedCreatureId).toBe(childId);

    // Newborn exists in collection with BABY stage, nickname, originEggId and preserved genome
    const newborn = hatchedSnap.collection?.[childId];
    expect(newborn).toBeDefined();
    expect(newborn?.originEggId).toBe('egg-test-1');
    expect(newborn?.runtime.currentStage).toBe('baby');
    expect(newborn?.runtime.customNickname).toBe('Faísca Jr.');
    expect(newborn?.genetics).toBe(dummyGenome);
    expect(hatchedSnap.activeCreatureInstanceId).toBe(childId);

    // Cannot hatch or incubate or warm a hatched egg a second time
    expect(hatchBredEggUseCase(hatchedSnap, 'egg-test-1', 2050)).toBe(hatchedSnap);
    expect(startEggIncubationUseCase(hatchedSnap, 'egg-test-1', 2050).success).toBe(false);
    expect(warmIncubatingEggUseCase(hatchedSnap, 'egg-test-1', 2050).success).toBe(false);

    // Hatch non-existent egg returns snapshot untouched
    const fallbackSnap = hatchBredEggUseCase(hatchedSnap, 'non-existent-egg', 2100);
    expect(fallbackSnap).toBe(hatchedSnap);
  });

  it('integrates hatched bred offspring with normal feeding, activities, revival, collection selection, and egg validation guards', () => {
    const base = createNewGameSaveSnapshot(1000, 'ignisauro');
    const sire = createGenesisGenome('ignisauro', 'male', 1000, 'sire-g');
    const dam = createGenesisGenome('terrassauro', 'female', 1000, 'dam-g');
    const offspringGenome = crossGenomes(sire, dam, 2000, {}, 'child-gen-2');
    const hatchedSpecies = offspringGenome.species;

    const bredSnap = recordBreedingResultUseCase(
      base,
      {
        sessionId: 'sess-full',
        timestampMs: 2500,
        sireGenomeId: sire.genomeId,
        damGenomeId: dam.genomeId,
        sireSpecies: 'ignisauro',
        damSpecies: 'terrassauro',
        offspringGenomeId: offspringGenome.genomeId,
        offspringSpecies: hatchedSpecies,
        winnerPeerId: 'local-player',
        isLocalWinner: true,
        mutationCount: offspringGenome.mutations.length
      },
      {
        id: 'egg-full-1',
        ownerId: 'local-player',
        genome: offspringGenome,
        targetSpecies: hatchedSpecies,
        status: 'available',
        incubationProgress: 0,
        maxIncubationHours: 0.05,
        isWarm: true,
        createdAtMs: 2500,
        isReadyToHatch: false
      },
      2500
    );

    // Warm on 'available' egg cleanly starts incubation
    const autoStarted = warmIncubatingEggUseCase(bredSnap, 'egg-full-1', 2600);
    expect(autoStarted.success).toBe(true);
    expect(resolveEggStatus(autoStarted.snapshot.incubator[0])).toBe('incubating');

    // Warm to finish incubation
    let cur = autoStarted.snapshot;
    for (let i = 0; i < 6; i++) {
      cur = warmIncubatingEggUseCase(cur, 'egg-full-1', 2700 + i * 100).snapshot;
    }
    expect(resolveEggStatus(cur.incubator[0])).toBe('ready_to_hatch');

    const hatchRes = hatchBredEggAtomicUseCase(cur, 'egg-full-1', 4000);
    expect(hatchRes.success).toBe(true);
    const babyId = hatchRes.hatchedCreatureId!;

    // Owned collection now has BOTH founder ignisauro AND newborn bred offspring
    const owned = listOwnedCreatures(hatchRes.snapshot);
    expect(owned.length).toBeGreaterThanOrEqual(2);
    expect(owned.some((c) => c.creatureId === babyId && c.source === 'collection')).toBe(true);

    // Care workflow works identically on hatched collection baby (feed, activity, revive, switch)
    const fedBaby = feedActiveCharacterUseCase(hatchRes.snapshot, 'thermal-spring-water', 4100);
    expect(fedBaby.success).toBe(true);
    expect(fedBaby.snapshot.collection?.[babyId].progression.totalXpEarned).toBeGreaterThan(0);

    const trainedBaby = performCharacterActivityUseCase(fedBaby.snapshot, 'purifying-bath', 4200);
    expect(trainedBaby.success).toBe(true);

    // Switch back to starter ignisauro and then back to baby; invalid ID is a safe no-op
    const switchedStarter = selectActiveCreatureUseCase(trainedBaby.snapshot, 'ignisauro', 4300);
    expect(switchedStarter.activeCreatureInstanceId).toBe('ignisauro');
    expect(selectActiveCreatureUseCase(switchedStarter, 'does-not-exist', 4350)).toBe(switchedStarter);

    const backToBaby = selectActiveCreatureUseCase(switchedStarter, babyId, 4400);
    expect(backToBaby.activeCreatureInstanceId).toBe(babyId);
    const revivedBaby = reviveDeceasedCharacterUseCase(backToBaby, 4500);
    expect(revivedBaby.collection?.[babyId].runtime.healthCondition).toBe('healthy');

    // Guard validations: missing / wrong owner / invalid egg / duplicate collection collision
    expect(startEggIncubationUseCase(hatchRes.snapshot, 'missing-egg', 5000).success).toBe(false);
    expect(warmIncubatingEggUseCase(hatchRes.snapshot, 'missing-egg', 5000).success).toBe(false);

    const invalidEggSnap = {
      ...base,
      incubator: [
        {
          id: 'bad-egg',
          ownerId: 'local-player',
          genome: offspringGenome,
          targetSpecies: hatchedSpecies,
          status: 'available' as const,
          incubationProgress: 0,
          maxIncubationHours: 0,
          isWarm: true,
          createdAtMs: 1000,
          isReadyToHatch: false
        }
      ]
    };
    expect(startEggIncubationUseCase(invalidEggSnap, 'bad-egg', 5100).success).toBe(false);

    // Collision suffix guard when both base creature-id and -2 are already occupied
    const readyManualSnap = {
      ...base,
      playerId: undefined,
      collection: {
        'creature-egg-coll': {
          ...hatchRes.hatchedRecord!,
          originEggId: 'other-egg-1'
        },
        'creature-egg-coll-2': {
          ...hatchRes.hatchedRecord!,
          originEggId: 'other-egg-2'
        }
      },
      incubator: [
        {
          id: 'egg-coll',
          genome: sire,
          targetSpecies: 'ignisauro' as const,
          status: 'ready_to_hatch' as const,
          incubationProgress: 1,
          maxIncubationHours: 1,
          isWarm: true,
          createdAtMs: 1000,
          isReadyToHatch: true
        }
      ]
    };
    const collisionHatch = hatchBredEggAtomicUseCase(readyManualSnap, 'egg-coll', 5200);
    expect(collisionHatch.success).toBe(true);
    expect(collisionHatch.hatchedCreatureId).toBe('creature-egg-coll-3');

    // Hatching when collection is initially undefined and egg has no parents works cleanly
    const noCollectionSnap = {
      ...base,
      collection: undefined,
      incubator: readyManualSnap.incubator
    };
    const firstFromUndefined = hatchBredEggAtomicUseCase(noCollectionSnap, 'egg-coll', 5250);
    expect(firstFromUndefined.success).toBe(true);
    expect(firstFromUndefined.hatchedCreatureId).toBe('creature-egg-coll');

    // Guard against duplicate creature creation if collection already links to originEggId
    const staleReadyDuplicate = {
      ...base,
      collection: {
        'existing-child': {
          ...firstFromUndefined.hatchedRecord!,
          originEggId: 'egg-coll'
        }
      },
      incubator: readyManualSnap.incubator
    };
    const duplicateBlocked = hatchBredEggAtomicUseCase(staleReadyDuplicate, 'egg-coll', 5260);
    expect(duplicateBlocked.success).toBe(false);
    expect(duplicateBlocked.message).toContain('já eclodiu');

    // recordBreedingResultUseCase with missing playerId falls back to local-player
    const fallbackOwnerRecord = recordBreedingResultUseCase(
      { ...base, playerId: undefined },
      {
        sessionId: 'sess-owner',
        timestampMs: 5270,
        sireGenomeId: sire.genomeId,
        damGenomeId: dam.genomeId,
        sireSpecies: 'ignisauro',
        damSpecies: 'terrassauro',
        offspringGenomeId: offspringGenome.genomeId,
        offspringSpecies: hatchedSpecies,
        winnerPeerId: 'local-player',
        isLocalWinner: true,
        mutationCount: 0
      },
      {
        id: 'egg-no-owner',
        genome: offspringGenome,
        targetSpecies: hatchedSpecies,
        incubationProgress: 0,
        maxIncubationHours: 0.05,
        isWarm: true,
        createdAtMs: 5270,
        isReadyToHatch: false
      },
      5270
    );
    expect(fallbackOwnerRecord.incubator[0].ownerId).toBe('local-player');

    // Multi-egg incubator preserves sibling eggs cleanly across start, warm, and hatch transitions
    const multiEggSnap = {
      ...base,
      incubator: [
        {
          id: 'egg-multi-1',
          ownerId: 'local-player',
          genome: offspringGenome,
          targetSpecies: hatchedSpecies,
          status: 'available' as const,
          incubationProgress: 0,
          maxIncubationHours: 1 / 60,
          isWarm: true,
          createdAtMs: 6000,
          isReadyToHatch: false
        },
        {
          id: 'egg-multi-2',
          ownerId: 'local-player',
          genome: sire,
          targetSpecies: 'ignisauro' as const,
          status: 'available' as const,
          incubationProgress: 0,
          maxIncubationHours: 1 / 60,
          isWarm: true,
          createdAtMs: 6001,
          isReadyToHatch: false
        }
      ]
    };
    const m1 = startEggIncubationUseCase(multiEggSnap, 'egg-multi-1', 6100).snapshot;
    expect(resolveEggStatus(m1.incubator[1])).toBe('available');
    const m2 = warmIncubatingEggUseCase(m1, 'egg-multi-1', 6200).snapshot;
    expect(resolveEggStatus(m2.incubator[1])).toBe('available');
    const m3 = warmIncubatingEggUseCase(m2, 'egg-multi-1', 6300).snapshot;
    expect(resolveEggStatus(m3.incubator[0])).toBe('ready_to_hatch');
    const m4 = hatchBredEggAtomicUseCase(m3, 'egg-multi-1', 6400);
    expect(m4.success).toBe(true);
    expect(resolveEggStatus(m4.snapshot.incubator[0])).toBe('hatched');
    expect(resolveEggStatus(m4.snapshot.incubator[1])).toBe('available');

    // Hatching starter egg updates active starter cleanly too
    const starterHatched = hatchCharacterEggUseCase(base, 5300);
    expect(starterHatched.characters.ignisauro.runtime.currentStage).toBe('baby');

    // Egg produced by P2P BreedingService carries ephemeral 'peer-...' ownerId, which MUST bind to local playerId on save
    const p2pEggResult = recordBreedingResultUseCase(
      base,
      {
        sessionId: 'sess-p2p-bind',
        timestampMs: 7000,
        sireGenomeId: sire.genomeId,
        damGenomeId: dam.genomeId,
        sireSpecies: 'ignisauro',
        damSpecies: 'terrassauro',
        offspringGenomeId: offspringGenome.genomeId,
        offspringSpecies: hatchedSpecies,
        winnerPeerId: 'peer-z9x8c7v',
        isLocalWinner: true,
        mutationCount: 0
      },
      {
        id: 'egg-p2p-real-1',
        ownerId: 'peer-z9x8c7v',
        genome: offspringGenome,
        targetSpecies: hatchedSpecies,
        status: 'available',
        incubationProgress: 0,
        maxIncubationHours: 1 / 60,
        isWarm: true,
        createdAtMs: 7000,
        isReadyToHatch: false
      },
      7000
    );
    expect(p2pEggResult.incubator[0].ownerId).toBe('local-player');
    const startedP2p = startEggIncubationUseCase(p2pEggResult, 'egg-p2p-real-1', 7100);
    expect(startedP2p.success).toBe(true);
    let readyP2p = warmIncubatingEggUseCase(startedP2p.snapshot, 'egg-p2p-real-1', 7200).snapshot;
    readyP2p = warmIncubatingEggUseCase(readyP2p, 'egg-p2p-real-1', 7300).snapshot;
    const hatchedP2p = hatchBredEggAtomicUseCase(readyP2p, 'egg-p2p-real-1', 7400, 'Pyro Filhote');
    expect(hatchedP2p.success).toBe(true);
    expect(hatchedP2p.snapshot.collection?.[hatchedP2p.hatchedCreatureId!]?.runtime.currentStage).toBe('baby');
  });

  it('records battle outcomes, updates combat XP, streaks, levels, and appends to battle archive', () => {
    const start = createNewGameSaveSnapshot(1000, 'ignisauro');
    const historyVictory = {
      id: 'h-1',
      timestampMs: 2000,
      battleId: 'b-1',
      localPlayerId: 'p-local',
      opponentPlayerId: 'p-remote',
      opponentName: 'Adversário',
      localCreatureSpecies: 'ignisauro' as const,
      opponentCreatureSpecies: 'glacissauro' as const,
      result: 'victory' as const,
      wagerAmount: 50,
      rewardCoins: 90,
      combatXpGained: 120,
      roundsCount: 8
    };

    const nextWallet = { amberCoins: 240, totalEarned: 290, totalSpent: 50 };
    const snap1 = recordBattleResultUseCase(start, historyVictory, nextWallet, 2000);

    expect(snap1.battleArchive?.length).toBe(1);
    expect(snap1.wallet.amberCoins).toBe(240);
    const rec1 = snap1.characters.ignisauro.battleRecord!;
    expect(rec1.totalBattles).toBe(1);
    expect(rec1.wins).toBe(1);
    expect(rec1.losses).toBe(0);
    expect(rec1.currentStreak).toBe(1);
    expect(rec1.bestStreak).toBe(1);
    expect(rec1.combatXp).toBe(120);
    expect(rec1.combatLevel).toBe(1);
    expect(rec1.recentOpponents.length).toBe(1);

    // Second battle: victory -> level up at 240 XP (level 2)
    const historyVictory2 = {
      ...historyVictory,
      id: 'h-2',
      battleId: 'b-2'
    };
    const snap2 = recordBattleResultUseCase(snap1, historyVictory2, { amberCoins: 330, totalEarned: 380, totalSpent: 50 }, 3000);
    const rec2 = snap2.characters.ignisauro.battleRecord!;
    expect(rec2.totalBattles).toBe(2);
    expect(rec2.wins).toBe(2);
    expect(rec2.currentStreak).toBe(2);
    expect(rec2.bestStreak).toBe(2);
    expect(rec2.combatXp).toBe(240);
    expect(rec2.combatLevel).toBe(2);

    // Third battle: defeat resets currentStreak
    const historyDefeat = {
      ...historyVictory,
      id: 'h-3',
      battleId: 'b-3',
      result: 'defeat' as const,
      combatXpGained: 25
    };
    const snap3 = recordBattleResultUseCase(snap2, historyDefeat, snap2.wallet, 4000);
    const rec3 = snap3.characters.ignisauro.battleRecord!;
    expect(rec3.totalBattles).toBe(3);
    expect(rec3.losses).toBe(1);
    expect(rec3.currentStreak).toBe(0);
    expect(rec3.bestStreak).toBe(2);

    // Fourth battle: draw preserves currentStreak
    const historyDraw = {
      ...historyVictory,
      id: 'h-4',
      battleId: 'b-4',
      result: 'draw' as const,
      combatXpGained: 40
    };
    const snap4 = recordBattleResultUseCase(snap3, historyDraw, snap3.wallet, 5000);
    const rec4 = snap4.characters.ignisauro.battleRecord!;
    expect(rec4.totalBattles).toBe(4);
    expect(rec4.draws).toBe(1);
    expect(rec4.currentStreak).toBe(0);

    // Fallback when active character is somehow missing
    const missingSnap = { ...start, activeCharacterId: 'unknown' as unknown as import('@/domains/characters/types').CharacterId };
    const fallbackSnap = recordBattleResultUseCase(missingSnap, historyVictory, nextWallet, 6000);
    expect(fallbackSnap.battleArchive?.length).toBe(1);
  });
});
