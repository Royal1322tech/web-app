import { expect, type Page } from "@playwright/test";
export async function openHeaderTools(page: Page) {
  const language = page.locator("header select");
  await expect(language).toBeAttached();
  if (!(await language.isVisible()))
    await page
      .locator('header button[aria-controls~="home-navigation"]')
      .click();
}
export async function closeHeaderMenu(page: Page) {
  const toggle = page.locator(
    'header button[aria-controls~="home-navigation"]',
  );
  if (
    (await toggle.isVisible()) &&
    (await toggle.getAttribute("aria-expanded")) === "true"
  )
    await toggle.click();
}
