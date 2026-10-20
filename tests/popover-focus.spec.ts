import { test, expect } from '@playwright/test';
import { visit } from './helpers/demo-login';
import { openHeaderTools } from './helpers/header';

for (const width of [430, 768]) {
  test(`preference controls remain usable inside the open panel at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await visit(page, '/');
    await openHeaderTools(page);
    await page.getByRole('button', { name: 'Nationality and currency', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Nationality and currency', exact: true });
    const nationality = panel.getByLabel('Select nationality', { exact: true });
    await nationality.selectOption('JP');
    await expect(nationality).toHaveValue('JP');
    await expect(panel).toBeVisible();
    await panel.getByText('EGP', { exact: true }).click();
    await expect(panel.getByRole('radio', { name: 'EGP', exact: true })).toBeChecked();
    await expect(panel).toBeVisible();
  });
}
