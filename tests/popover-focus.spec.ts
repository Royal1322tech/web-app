import { test, expect } from '@playwright/test';
import { visit } from './helpers/demo-login';
import { openHeaderTools } from './helpers/header';

for (const width of [430, 768]) {
  test(`preference labels retain their panel during pointer activation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await visit(page, '/');
    await openHeaderTools(page);
    await page.getByRole('button', { name: 'Nationality and currency', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Nationality and currency', exact: true });
    for (const name of ['Egypt', 'EGP']) {
      const label = panel.locator('label').filter({ has: page.getByRole('radio', { name, exact: true }) });
      const bounds = (await label.boundingBox())!;
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await page.mouse.down();
      // Model a held pointer across a rendering frame: label activation is on release.
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await expect(panel).toBeVisible();
      await page.mouse.up();
      await expect(panel.getByRole('radio', { name, exact: true })).toBeChecked();
    }
  });
}
