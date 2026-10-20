import { expect, test } from "@playwright/test";
import { visit } from "./helpers/demo-login";

for (const width of [375, 430, 768, 1024, 1440]) {
  for (const locale of ["en", "ar"] as const) {
    test(`public login card is spaced below navigation at ${width}px ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(value => localStorage.setItem("royal-vacation.locale", value), locale);
      await visit(page, "/login");
      const header = page.locator("header");
      const card = page.locator("#login");
      const headerBox = (await header.boundingBox())!;
      const cardBox = (await card.boundingBox())!;
      expect(cardBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height + 16);
      await expect(card.getByRole("heading", { name: locale === "en" ? "Login to your account" : "تسجيل الدخول إلى حسابك" })).toBeVisible();
      await expect(page.locator("#video-title")).toBeAttached();
      await expect(page.locator("video source[src='/videos/royal-promo.mp4']")).toBeAttached();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      if (width === 375 || width === 1440) await page.screenshot({ path: `test-results/public-login-${locale}-${width}.png`, fullPage: true });
    });
  }
}

test("login hero stays in document flow on a short laptop viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await visit(page, "/login");
  const header = (await page.locator("header").boundingBox())!;
  const card = (await page.locator("#login").boundingBox())!;
  expect(card.y).toBeGreaterThan(header.y + header.height);
  const hero = (await page.locator("main > section").first().boundingBox())!;
  expect(card.y + card.height).toBeLessThanOrEqual(hero.y + hero.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
});
