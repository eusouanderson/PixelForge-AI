import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SAVE_STORAGE_KEY = 'pixelforge_virtual_creatures_save_v1';

async function seedAdultFighter(
  page: Page,
  speciesId: 'ignisauro' | 'terrassauro',
  sex: 'male' | 'female',
  initialCoins = 200
): Promise<void> {
  await expect(page.getByTestId('active-character-name')).toBeVisible();
  await page.waitForFunction(
    (key) => Boolean(window.localStorage.getItem(key)),
    SAVE_STORAGE_KEY
  );

  const mutatedJson = await page.evaluate(
    ({ key, targetSpecies, targetSex, coins }) => {
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
      runtime.isSleeping = false;
      progression.currentStage = 'adulto';
      progression.level = 16;
      genetics.sex = targetSex;

      snapshot.wallet = {
        amberCoins: coins,
        totalEarned: coins,
        totalSpent: 0
      };

      snapshot.starterCharacterId = targetSpecies;
      snapshot.activeCharacterId = targetSpecies;
      snapshot.activeCreatureInstanceId = targetSpecies;
      snapshot.lastSavedAtMs = Date.now();

      return JSON.stringify(snapshot);
    },
    { key: SAVE_STORAGE_KEY, targetSpecies: speciesId, targetSex: sex, coins: initialCoins }
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

test.describe('PixelForge Automated P2P Battle Arena E2E Lifecycle', () => {
  test('discovers peer over BroadcastChannel room, wagers Amber coins, simulates deterministic battle on canvas, claims rewards, and persists combat history', async ({
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

    // 1. Initialize and seed adult fighters with 200 Amber Coins
    await pageA.goto('/');
    await seedAdultFighter(pageA, 'ignisauro', 'male', 200);
    await expect(pageA.getByTestId('active-character-name')).toHaveText('Ignisauro');

    await pageB.goto('/');
    await seedAdultFighter(pageB, 'terrassauro', 'female', 200);
    await expect(pageB.getByTestId('active-character-name')).toHaveText('Terrassauro');

    // 2. Both navigate to Arena bottom navigation tab
    await pageA.getByTestId('nav-tab-arena').click();
    await pageB.getByTestId('nav-tab-arena').click();

    await expect(pageA.getByTestId('battle-arena-modal')).toBeVisible();
    await expect(pageB.getByTestId('battle-arena-modal')).toBeVisible();

    await expect(pageA.getByTestId('current-wallet-display')).toContainText('200 Âmbar');
    await expect(pageB.getByTestId('current-wallet-display')).toContainText('200 Âmbar');

    // 3. Connect to battle room BATALHA-777 and initiate discovery
    await pageB.getByTestId('start-battle-discovery-btn').click();
    await pageA.getByTestId('start-battle-discovery-btn').click();

    // 4. Opponents discover each other in real-time
    const pageAChallengeBtn = pageA.locator('[data-testid^="challenge-peer-"]').first();
    const pageBChallengeBtn = pageB.locator('[data-testid^="challenge-peer-"]').first();

    await expect(pageAChallengeBtn).toBeVisible({ timeout: 10000 });
    await expect(pageBChallengeBtn).toBeVisible({ timeout: 10000 });

    // 5. Page A selects 50 Amber Coins wager and challenges Page B
    await pageA.getByTestId('wager-btn-50').click();
    await pageAChallengeBtn.click();

    await expect(pageA.getByTestId('awaiting-confirmation-view')).toBeVisible();
    await expect(pageA.getByTestId('awaiting-confirmation-view')).toContainText('50 Âmbar');

    // 6. Page B receives challenge invitation and accepts
    await expect(pageB.getByTestId('incoming-invite-card')).toBeVisible({ timeout: 10000 });
    await expect(pageB.getByTestId('incoming-invite-card')).toContainText('50 Âmbar em jogo');
    await expect(pageB.getByTestId('incoming-invite-card')).toContainText('Ignisauro');

    await pageB.getByTestId('accept-battle-invite-btn').click();

    // 7. Both enter Battle Arena Canvas Viewport
    await expect(pageA.getByTestId('battle-arena-canvas-container')).toBeVisible({ timeout: 10000 });
    await expect(pageB.getByTestId('battle-arena-canvas-container')).toBeVisible({ timeout: 10000 });

    await expect(pageA.getByTestId('fighter1-hp')).toBeVisible();
    await expect(pageB.getByTestId('fighter1-hp')).toBeVisible();

    // 8. Test playback speed toggle and skip battle animation to finish instantly
    await pageA.getByTestId('toggle-battle-speed-btn').click();
    await expect(pageA.getByTestId('toggle-battle-speed-btn')).toContainText('2x');

    await pageA.getByTestId('skip-battle-animation-btn').click();
    await pageB.getByTestId('skip-battle-animation-btn').click();

    // 9. Both reach synchronized deterministic outcome view
    await expect(pageA.getByTestId('battle-result-view')).toBeVisible({ timeout: 10000 });
    await expect(pageB.getByTestId('battle-result-view')).toBeVisible({ timeout: 10000 });

    const aWon = await pageA.getByTestId('battle-result-view').getByText('Vitória Gloriosa!').isVisible();
    const winnerPage = aWon ? pageA : pageB;
    const loserPage = aWon ? pageB : pageA;

    await expect(winnerPage.getByTestId('battle-result-view').getByText('Vitória Gloriosa!')).toBeVisible();
    await expect(loserPage.getByTestId('battle-result-view').getByText('Derrota na Arena')).toBeVisible();

    // 10. Claim rewards and conclude match
    await winnerPage.getByTestId('finish-and-claim-btn').click();
    await loserPage.getByTestId('finish-and-claim-btn').click();

    // 11. Verify economic settlement in wallet display:
    // Winner: 200 - 50 + 90 = 240 Âmbar
    // Loser:  200 - 50 = 150 Âmbar
    await expect(winnerPage.getByTestId('current-wallet-display')).toContainText('240 Âmbar');
    await expect(loserPage.getByTestId('current-wallet-display')).toContainText('150 Âmbar');

    // 12. Open Battle History Modal and verify career stats
    await winnerPage.getByTestId('open-history-btn').click();
    await expect(winnerPage.getByTestId('battle-history-modal')).toBeVisible();
    await expect(winnerPage.getByTestId('stat-total-battles')).toHaveText('1');
    await expect(winnerPage.getByTestId('stat-wins')).toHaveText('1');
    await expect(winnerPage.getByTestId('stat-losses')).toHaveText('0');
    await expect(winnerPage.getByTestId('stat-win-rate')).toHaveText('100%');

    await loserPage.getByTestId('open-history-btn').click();
    await expect(loserPage.getByTestId('battle-history-modal')).toBeVisible();
    await expect(loserPage.getByTestId('stat-total-battles')).toHaveText('1');
    await expect(loserPage.getByTestId('stat-wins')).toHaveText('0');
    await expect(loserPage.getByTestId('stat-losses')).toHaveText('1');
    await expect(loserPage.getByTestId('stat-win-rate')).toHaveText('0%');

    // 13. Accessibility scan with axe-core on Arena and Battle History
    const historyA11y = await new AxeBuilder({ page: winnerPage })
      .disableRules(['color-contrast'])
      .analyze();
    expect(historyA11y.violations).toEqual([]);

    await winnerPage.getByTestId('close-battle-history-btn').click();
    await expect(winnerPage.getByTestId('battle-history-modal')).toHaveCount(0);

    // 14. Reload winner page to ensure persistent storage across restarts
    await winnerPage.reload();
    await expect(winnerPage.getByTestId('active-character-name')).toBeVisible();
    await winnerPage.getByTestId('nav-tab-arena').click();
    await expect(winnerPage.getByTestId('current-wallet-display')).toContainText('240 Âmbar');
    await winnerPage.getByTestId('open-history-btn').click();
    await expect(winnerPage.getByTestId('stat-total-battles')).toHaveText('1');
    await expect(winnerPage.getByTestId('stat-wins')).toHaveText('1');
    await winnerPage.getByTestId('close-battle-history-btn').click();

    await pageA.close();
    await pageB.close();
  });
});
