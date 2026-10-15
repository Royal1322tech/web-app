import { selectLanguage } from "./helpers/header";
import { test, expect } from "@playwright/test";
import { visit } from "./helpers/demo-login";
import { openHeaderTools, closeHeaderMenu } from "./helpers/header";

for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  test(`Welcome flight, search nationality and footer fit ${width}px in both languages`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const flight = page.locator(".welcome-flight");
    await expect(flight.locator("svg.brand-emblem")).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".welcome-flight .brand-plane")).toHaveCSS("animation-name", "welcome-flight");
    await page.locator(".route-entrance").evaluate(async el => { await Promise.all(el.getAnimations({ subtree: true }).filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished)); });
    const bounds = (await flight.boundingBox())!;
    for (const selector of [".welcome-content h1", ".account-options"]) {
      const other = (await page.locator(selector).boundingBox())!;
      expect(bounds.y + bounds.height <= other.y || bounds.x + bounds.width <= other.x || bounds.x >= other.x + other.width).toBe(true);
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".welcome-flight .brand-plane")).toHaveCSS("animation-name", "none");
    await visit(page, "/");
    await openHeaderTools(page);
    await page.getByRole("button", { name: "Nationality and currency", exact: true }).click();
    await page.locator("label").filter({ has: page.getByRole("radio", { name: "Egypt", exact: true }) }).click();
    await expect(page.getByRole("radio", { name: "Egypt", exact: true })).toBeChecked();
    await page.keyboard.press("Escape");
    await page.reload();
    await expect(page.locator("#search-nationality")).toHaveValue("EG");
    const preferences = await page.evaluate(() => localStorage.getItem("royal-vacation.travel-preferences"));
    for (const locale of ["en", "ar"]) {
      await openHeaderTools(page);
      await selectLanguage(page, locale);
      await closeHeaderMenu(page);
      await page.locator("#search-nationality").selectOption("SA");
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      expect(await page.evaluate(() => localStorage.getItem("royal-vacation.travel-preferences"))).toBe(preferences);
      await page.locator("#destination").selectOption("Alexandria");
      await page.locator("#check-in").fill("2030-11-20");
      await page.locator("#check-out").fill("2030-11-22");
      await page.locator("#hotel-search button[type=submit]").click();
      await expect(page).toHaveURL(/nationality=SA/);
      await expect(page.locator("#search-nationality")).toHaveValue("SA");
      await page.reload();
      await expect(page.locator("#search-nationality")).toHaveValue("SA");
      await page.locator('a[href^="/hotels/eastern-al-montazah?"]').first().click();
      await expect(page).toHaveURL(/\/hotels\/eastern-al-montazah\?.*nationality=SA/);
      await expect(page.locator("#search-nationality")).toHaveValue("SA");
      await visit(page, "/");
      const footer = page.locator("footer");
      for (const href of ["mailto:royal.travel@royalvacation.online", "https://wa.me/201070724143"]) {
        const link = footer.locator(`a[href="${href}"]`);
        await link.scrollIntoViewIfNeeded();
        await expect(link).toBeVisible();
        const box = (await link.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        await link.focus();
        await expect(link).toHaveCSS("outline-style", "solid");
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: `test-results/final-footer-${locale}-${width}.png` });
    }
  });
}
