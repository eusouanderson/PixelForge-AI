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

    // Feed creature universal spring water
    await page.getByTestId('feed-btn-thermal-spring-water').click();
    await expect(page.getByTestId('feedback-banner')).toContainText('Água Cristalina da Nascente');

    // Open Individual Character Sheet (Ficha)
    await page.getByTestId('nav-tab-sheet').click();
    await expect(page.getByTestId('tab-content-sheet')).toContainText('Ficha Oficial');

    // Accessibility check
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
