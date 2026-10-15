import { visit } from "./helpers/demo-login";
import { openHeaderTools, closeHeaderMenu } from "./helpers/header";
import { test, expect } from "@playwright/test";

for (const width of [375, 1024, 1440, 1869, 1920]) {
  test(`header actions and homepage stay centered at ${width}px in both languages`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await visit(page, "/");
    for (const locale of ["en", "ar"]) {
      const header = page.locator("header");
      await openHeaderTools(page);
      await header.locator("select").selectOption(locale);
      const controls = header.locator(
        'select, a[href="/notifications"], a[href="/booking/summary"], button[aria-label="Account menu"], button[aria-label="قائمة الحساب"]',
      );
      await expect(controls).toHaveCount(4);
      for (const control of await controls.all()) {
        await expect(control).toBeInViewport({ ratio: 1 });
        const box = await control.boundingBox();
        expect(box!.width).toBeGreaterThan(20);
        expect(box!.height).toBeGreaterThanOrEqual(44);
        // Trial click verifies that the control is not covered or clipped.
        await control.click({ trial: true });
      }
      for (const region of [
        header,
        page.locator("#hotel-search"),
        page.locator('section[aria-labelledby="deals-title"]'),
        page.locator('section[class*="partnerSection"]'),
        page.locator('section[class*="section"]').last(),
      ]) {
        await expect(region).toHaveCount(1);
        const box = await region.boundingBox();
        expect(
          Math.abs(box!.x + box!.width / 2 - width / 2),
        ).toBeLessThanOrEqual(1);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width + 1);
      const carLink = header.locator('nav a[href="/car-rental"]');
      await expect(carLink).toBeVisible();
      await expect(carLink).toHaveCSS("font-size", "15px");
      await expect(carLink).toHaveCSS("font-weight", "700");
      await closeHeaderMenu(page);
      if (width === 1869 || width === 375)
        await page.screenshot({
          path: `test-results/header-${locale}-${width}.png`,
        });
    }
    for (const route of ["/notifications", "/booking/summary", "/agency"]) {
      await openHeaderTools(page);
      if (route === "/agency") await page.getByRole("button", { name: /Account menu|قائمة الحساب/ }).click();
      await page.locator(`header a[href="${route}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${route}$`));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });
}
