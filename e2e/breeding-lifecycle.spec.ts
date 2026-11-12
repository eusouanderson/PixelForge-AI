import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SAVE_STORAGE_KEY = 'pixelforge_virtual_creatures_save_v1';

async function seedAdultDinosaur(
  page: Page,
  speciesId: 'ignisauro' | 'terrassauro',
  sex: 'male' | 'female'
): Promise<void> {
  await expect(page.getByTestId('active-character-name')).toBeVisible();
  await page.waitForFunction(
    (key) => Boolean(window.localStorage.getItem(key)),
    SAVE_STORAGE_KEY
  );

  const mutatedJson = await page.evaluate(
    ({ key, targetSpecies, targetSex }) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        throw new Error('Save snapshot was not initialized before seeding.');
      }
      const snapshot = JSON.parse(raw) as Record<string, unknown>;
      const characters = snapshot.characters as Record<string, Record<string, unknown>>;
      const targetRecord = characters[targetSpecies];
      if (!targetRecord) {
        throw new Error(`Missing species record: ${targetSpecies}`);
      }

      const runtime = targetRecord.runtime as Record<string, unknown>;
      const progression = targetRecord.progression as Record<string, unknown>;
      const genetics = targetRecord.genetics as Record<string, unknown>;

      runtime.currentStage = 'adulto';
      runtime.ageHours = 480;
      runtime.currentAnimation = 'idle';
      progression.currentStage = 'adulto';
      progression.level = 16;
      genetics.sex = targetSex;

      snapshot.starterCharacterId = targetSpecies;
      snapshot.activeCharacterId = targetSpecies;
      snapshot.activeCreatureInstanceId = targetSpecies;
      snapshot.lastSavedAtMs = Date.now();

      return JSON.stringify(snapshot);
    },
    { key: SAVE_STORAGE_KEY, targetSpecies: speciesId, targetSex: sex }
  );

  // Navigate to a scriptless same-origin URL first so "/" unmounts and flushes visibilitychange
  // BEFORE writing the seeded snapshot, preventing stale in-memory state from overwriting storage.
  await page.goto('/version.json');
  await page.evaluate(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: SAVE_STORAGE_KEY, value: mutatedJson }
  );

  await page.goto('/');
  await expect(page.getByTestId('active-stage-badge')).toHaveText('adulto');
}

test.describe('PixelForge P2P Breeding -> Egg Incubation -> Hatching -> Collection E2E', () => {
  test('breeds between two live browser tabs over BroadcastChannel, incubates won egg, hatches newborn into collection, switches dinosaurs, and persists on reload', async ({
    context
  }) => {
    // Tab A uses real localStorage; Tab B isolates storage into per-tab sessionStorage while sharing BroadcastChannel!
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    await pageB.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get: () => window.sessionStorage
      });
    });

    await pageA.goto('/');
    await seedAdultDinosaur(pageA, 'ignisauro', 'male');
    await expect(pageA.getByTestId('active-character-name')).toHaveText('Ignisauro');

    await pageB.goto('/');
    await seedAdultDinosaur(pageB, 'terrassauro', 'female');
    await expect(pageB.getByTestId('active-character-name')).toHaveText('Terrassauro');

    // Open Genetics tab on both tabs and connect over P2P BroadcastChannel room
    await pageA.getByTestId('nav-tab-genetics').click();
    await pageB.getByTestId('nav-tab-genetics').click();

    await pageA.getByTestId('p2p-connect-btn').click();
    await pageB.getByTestId('p2p-connect-btn').click();

    await expect(pageA.getByTestId('confirm-breeding-btn')).toBeEnabled({ timeout: 10000 });
    await expect(pageB.getByTestId('confirm-breeding-btn')).toBeEnabled({ timeout: 10000 });

    // Confirm breeding on both devices -> fair cryptographic consensus produces exactly ONE egg
    await pageA.getByTestId('confirm-breeding-btn').click();
    await pageB.getByTestId('confirm-breeding-btn').click();

    const outcomeA = pageA
      .getByTestId('breeding-egg-created-card')
      .or(pageA.getByTestId('breeding-partner-won-card'));
    const outcomeB = pageB
      .getByTestId('breeding-egg-created-card')
      .or(pageB.getByTestId('breeding-partner-won-card'));

    await expect(outcomeA).toBeVisible({ timeout: 10000 });
    await expect(outcomeB).toBeVisible({ timeout: 10000 });

    const aWon = await pageA.getByTestId('breeding-egg-created-card').isVisible();
    const winnerPage = aWon ? pageA : pageB;
    const loserPage = aWon ? pageB : pageA;
    const starterSpeciesId = aWon ? 'ignisauro' : 'terrassauro';
    const starterDisplayName = aWon ? 'Ignisauro' : 'Terrassauro';

    await expect(winnerPage.getByTestId('breeding-egg-created-card')).toBeVisible();
    await expect(loserPage.getByTestId('breeding-partner-won-card')).toBeVisible();
    await expect(loserPage.getByTestId('open-collection-modal-btn')).toContainText('1');

    // Non-winner can cleanly reset for a second breeding round
    await loserPage.getByTestId('new-breeding-session-btn').click();
    await expect(loserPage.getByTestId('p2p-connect-btn')).toBeVisible();

    // Winner clicks post-breeding CTA -> starts incubation immediately & navigates to Nursery
    await winnerPage.getByTestId('post-breeding-incubate-btn').click();
    await expect(winnerPage.getByTestId('nursery-tab-panel')).toBeVisible();

    const eggCard = winnerPage.locator('[data-testid^="egg-card-"]').first();
    await expect(eggCard).toBeVisible();
    const eggCardTestId = await eggCard.getAttribute('data-testid');
    expect(eggCardTestId).toBeTruthy();
    const eggId = (eggCardTestId as string).replace(/^egg-card-/, '');

    await expect(winnerPage.getByTestId(`egg-status-${eggId}`)).toContainText('Incubando');

    // Run accessibility scan on Nursery panel
    const nurseryA11y = await new AxeBuilder({ page: winnerPage })
      .disableRules(['color-contrast'])
      .analyze();
    expect(nurseryA11y.violations).toEqual([]);

    // Warm egg (+30s each click over 3 min max) until Ready to Hatch
    const warmBtn = winnerPage.getByTestId(`warm-egg-btn-${eggId}`);
    const hatchReadyBtn = winnerPage.getByTestId(`hatch-ready-btn-${eggId}`);
    for (let clickIdx = 0; clickIdx < 8; clickIdx++) {
      await expect(warmBtn.or(hatchReadyBtn)).toBeVisible();
      if (await hatchReadyBtn.isVisible()) break;
      await warmBtn.click();
    }

    await expect(winnerPage.getByTestId(`egg-status-${eggId}`)).toContainText('Pronto');
    await expect(hatchReadyBtn).toBeVisible();

    // Hatch egg with custom nickname -> enters player's collection as baby
    await hatchReadyBtn.click();
    await expect(winnerPage.getByTestId(`hatch-confirm-box-${eggId}`)).toBeVisible();
    await winnerPage.getByTestId(`hatch-nickname-input-${eggId}`).fill('Filhote E2E');
    await winnerPage.getByTestId(`confirm-hatch-btn-${eggId}`).click();

    await expect(winnerPage.getByTestId('hatch-celebration-card')).toBeVisible();
    await expect(winnerPage.getByTestId(`hatched-egg-record-${eggId}`)).toBeVisible();

    // Focus newly hatched dinosaur -> care & feed works normally
    await winnerPage.getByTestId('go-to-hatched-baby-btn').click();
    await expect(winnerPage.getByTestId('active-character-name')).toHaveText('Filhote E2E');
    await expect(winnerPage.getByTestId('active-stage-badge')).toHaveText('baby');

    await winnerPage.getByTestId('feed-btn-thermal-spring-water').click();
    await expect(winnerPage.getByTestId('feedback-banner')).toContainText('Água Cristalina');

    // Switch back and forth between starter parent and newborn baby via HUD Collection Switcher Modal
    await winnerPage.getByTestId('open-collection-modal-btn').click();
    const modal = winnerPage.getByTestId('collection-switcher-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Meus Dinossauros (2)');
    await expect(modal).toContainText(starterDisplayName);
    await expect(modal).toContainText('Filhote E2E');

    const modalA11y = await new AxeBuilder({ page: winnerPage })
      .disableRules(['color-contrast'])
      .analyze();
    expect(modalA11y.violations).toEqual([]);

    await winnerPage.getByTestId(`modal-collection-creature-${starterSpeciesId}`).click();
    await expect(winnerPage.getByTestId('active-character-name')).toHaveText(starterDisplayName);
    await expect(winnerPage.getByTestId('active-stage-badge')).toHaveText('adulto');

    await winnerPage.getByTestId('open-collection-modal-btn').click();
    await winnerPage.getByTestId(`modal-collection-creature-creature-${eggId}`).click();
    await expect(winnerPage.getByTestId('active-character-name')).toHaveText('Filhote E2E');
    await expect(winnerPage.getByTestId('active-stage-badge')).toHaveText('baby');

    // Reload browser tab -> newborn baby, parent in collection, and hatched egg remain persisted without duplication
    await winnerPage.reload();
    await expect(winnerPage.getByTestId('active-character-name')).toHaveText('Filhote E2E');
    await expect(winnerPage.getByTestId('active-stage-badge')).toHaveText('baby');

    await winnerPage.getByTestId('nav-tab-sheet').click();
    const sheetCollection = winnerPage.getByTestId('player-collection-card');
    await expect(sheetCollection).toContainText('2 criatura(s)');
    await expect(sheetCollection).toContainText(starterDisplayName);
    await expect(sheetCollection).toContainText('Filhote E2E');

    await winnerPage.getByTestId('nav-tab-genetics').click();
    await winnerPage.getByTestId('subtab-nursery').click();
    await expect(winnerPage.getByTestId(`hatched-egg-record-${eggId}`)).toBeVisible();
    await expect(winnerPage.getByTestId(`confirm-hatch-btn-${eggId}`)).toHaveCount(0);

    await pageA.close();
    await pageB.close();
  });
});
