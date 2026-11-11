import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('PixelForge Virtual Creatures Mobile Portrait E2E & Accessibility', () => {
  test('renders mobile portrait game with random creature, feeds, views character sheet, and passes axe-core a11y checks', async ({
    page
  }) => {
    await page.goto('/');

    const charTitle = page.getByTestId('active-character-name');
    await expect(charTitle).toBeVisible();

    // Ensure manual selectors for other dinosaurs, stages, or animations do not exist
    await expect(page.getByTestId('nav-tab-roster')).toHaveCount(0);
    await expect(page.getByTestId('stage-btn-adulto')).toHaveCount(0);
    await expect(page.getByTestId('anim-btn-comendo')).toHaveCount(0);

    // Initially renders intact egg with countdown and keeps dev tools hidden
    await expect(page.getByTestId('active-stage-badge')).toHaveText('ovo');
    await expect(page.getByTestId('egg-countdown-label')).toBeVisible();
    await expect(page.getByTestId('sim-offline-6h')).toHaveCount(0);
    await expect(page.getByTestId('reset-save-btn')).toHaveCount(0);

    // Open Individual Character Sheet (Ficha) — no companion switcher allowed here
    await page.getByTestId('nav-tab-sheet').click();
    await expect(page.getByTestId('tab-content-sheet')).toContainText('Ficha Oficial');
    await expect(page.getByTestId('companion-selector-card')).toHaveCount(0);

    // Enable Developer Mode in Ajustes -> hatch egg via dev button -> feed creature
    await page.getByTestId('nav-tab-settings').click();
    await page.getByTestId('toggle-dev-mode-btn').click();
    await expect(page.getByTestId('companion-selector-card')).toBeVisible();
    await page.getByTestId('hatch-egg-btn').click();
    await expect(page.getByTestId('active-stage-badge')).toHaveText('baby');

    await page.getByTestId('nav-tab-feed').click();
    await page.getByTestId('feed-btn-thermal-spring-water').click();
    await expect(page.getByTestId('feedback-banner')).toContainText('Água Cristalina da Nascente');

    // Accessibility check
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
