import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { visit } from "./helpers/demo-login";

for (const locale of ["en", "ar"] as const) {
  test(`best hotels city filter keeps an accessible name without a visible label in ${locale}`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem("royal-vacation.locale", value), locale);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await visit(page, "/");
    const city = page.getByRole("combobox", { name: locale === "en" ? "City" : "المدينة", exact: true });
    await city.scrollIntoViewIfNeeded();
    await expect(city).toBeVisible();
    const label = page.locator('label[for="hotel-city"] > span');
    await expect(label).toHaveClass(/sr-only/);
    expect((await label.boundingBox())!.width).toBeLessThanOrEqual(1);
    const bottoms = await page.evaluate(() => {
      const select = document.getElementById("hotel-city")!.getBoundingClientRect();
      const button = document.querySelector("form:has(#hotel-city) button[type=submit]")!.getBoundingClientRect();
      return [select.bottom, button.bottom];
    });
    expect(Math.abs(bottoms[0] - bottoms[1])).toBeLessThan(2);
  });

  test(`login landing places the partner call to action before Why Choose in ${locale}`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem("royal-vacation.locale", value), locale);
    await page.goto("/login");
    await expect(page.locator("#partner-cta-title")).toBeAttached();
    await expect(page.locator("#strengths-title")).toBeAttached();
    const order = await page.evaluate(() => {
      const cta = document.getElementById("partner-cta-title")!;
      const why = document.getElementById("strengths-title")!;
      return cta.compareDocumentPosition(why) & Node.DOCUMENT_POSITION_FOLLOWING;
    });
    expect(order).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
}

test("group quotation keeps the main navigation without the workspace navigation", async ({ page }) => {
  await visit(page, "/group-quotation");
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Workspace navigation" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
});
