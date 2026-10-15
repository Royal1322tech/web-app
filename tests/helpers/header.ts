import { expect, type Page } from "@playwright/test";
export async function openHeaderTools(page: Page) {
  const language = page.locator('header button[aria-label="Language"], header button[aria-label="اللغة"]');
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

export async function selectLanguage(page: Page, locale: string) {
  await openHeaderTools(page);
  await page.getByRole("button", { name: /^(Language|اللغة)$/ }).click();
  await page.getByRole("region", { name: /^(Language|اللغة)$/ }).getByRole("button", { name: locale === "ar" ? "العربية" : "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
}
