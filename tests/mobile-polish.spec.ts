import { test, expect } from "@playwright/test";
import { openHeaderTools, closeHeaderMenu } from "./helpers/header";
for (const width of [320, 375, 390, 430, 768, 1440])
  test(`compact header, SVG CTA and homepage ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    for (const locale of ["en", "ar"]) {
      await openHeaderTools(page);
      await page.locator("header select").selectOption(locale);
      await closeHeaderMenu(page);
      const header = await page.locator("header").boundingBox();
      if (width < 600) expect(header!.height).toBeLessThan(85);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      const cta = page
        .locator('a[href="#hotel-search"]')
        .filter({ has: page.locator("svg") });
      await expect(cta).toHaveCount(1);
      await expect(cta.locator("svg path")).toHaveAttribute(
        "d",
        "M6 18 18 6M6 6h12v12",
      );
      expect(await cta.textContent()).not.toMatch(/[↗↘]/);
      if (width < 1200) {
        const toggle = page.locator(
          'header button[aria-controls~="home-navigation"]',
        );
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        await expect(
          page.locator('header a[href="/car-rental"]'),
        ).toBeVisible();
        await page.locator('header a[href="/welcome"]').focus();
        await page.keyboard.press("Escape");
        await expect(toggle).toBeFocused();
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
      }
      await cta.click();
      await expect(page.locator("#hotel-search")).toBeInViewport();
      await page.evaluate(() => scrollTo(0, 0));
      await expect(page.locator("header")).toBeInViewport({ ratio: 1 });
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      await page.screenshot({
        path: `test-results/polished-home-${locale}-${width}.png`,
      });
    }
  });
