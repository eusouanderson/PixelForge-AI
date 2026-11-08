import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('PixelForge Virtual Creatures Mobile Portrait E2E & Accessibility', () => {
  test('renders mobile portrait game, switches dinosaurs, feeds, views character sheet, and passes axe-core a11y checks', async ({
    page
  }) => {
    await page.goto('/');

    const charTitle = page.getByTestId('active-character-name');
    await expect(charTitle).toHaveText('Ignisauro');

    // Feed Ignisauro its favorite food
    await page.getByTestId('feed-btn-volcanic-roast-meat').click();
    await expect(page.getByTestId('feedback-banner')).toContainText('Pernil Vulcânico Assado');

    // Switch to Glacissauro
    await page.getByTestId('select-char-glacissauro').click();
    await expect(charTitle).toHaveText('Glacissauro');

    // Open Individual Character Sheet (Ficha)
    await page.getByTestId('nav-tab-sheet').click();
    await expect(page.getByTestId('tab-content-sheet')).toContainText('Cryosaurus Glacius');

    // Accessibility check
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

