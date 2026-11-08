import { describe, it, expect } from 'vitest';
import { createNewGameSaveSnapshot } from '../domain/persistence-engine';
import {
  selectActiveCharacterUseCase,
  feedActiveCharacterUseCase,
  performCharacterActivityUseCase,
  purchaseFoodItemUseCase,
  reviveDeceasedCharacterUseCase,
  hatchCharacterEggUseCase,
  updateSettingsUseCase
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

    // Feeding when hungry and ready to evolve triggers stage evolution (ovo -> baby)
    const eggReadySnap = {
      ...favFeed.snapshot,
      characters: {
        ...favFeed.snapshot.characters,
        ignisauro: {
          ...favFeed.snapshot.characters.ignisauro,
          needs: {
            ...favFeed.snapshot.characters.ignisauro.needs,
            hunger: 50
          },
          runtime: {
            ...favFeed.snapshot.characters.ignisauro.runtime,
            currentStage: 'ovo' as const,
            activeDiseases: []
          },
          progression: {
            ...favFeed.snapshot.characters.ignisauro.progression,
            currentStage: 'ovo' as const
          }
        }
      }
    };
    const evolvedByFeed = feedActiveCharacterUseCase(eggReadySnap, 'volcanic-roast-meat', 2500);
    expect(evolvedByFeed.snapshot.characters.ignisauro.runtime.currentStage).toBe('baby');

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
});
