import { selectLanguage } from "./helpers/header";
import { visit } from "./helpers/demo-login";
import { test, expect } from "@playwright/test";
import { openHeaderTools, closeHeaderMenu } from "./helpers/header";
for (const width of [320, 375, 390, 430, 768, 1440])
  test(`compact header, CTA-free hero and homepage ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await visit(page, "/");
    for (const locale of ["en", "ar"]) {
      await openHeaderTools(page);
      await selectLanguage(page, locale);
      await closeHeaderMenu(page);
      const header = await page.locator("header").boundingBox();
      if (width < 600) expect(header!.height).toBeLessThan(85);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      const hero = page.locator('section[aria-label]').first();
      await expect(hero.locator('a[href="#hotel-search"]')).toHaveCount(0);
      await expect(hero.getByRole("link", { name: /Find a hotel|Become a partner/ })).toHaveCount(0);
      if (width < 600) {
        const search = (await page.locator("#hotel-search").boundingBox())!;
        expect(search.y).toBeLessThan(570);
      }
      if (width < 1200) {
        const toggle = page.locator(
          'header button[aria-controls~="home-navigation"]',
        );
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        await expect(
          page.locator('header a[href="/car-rental"]'),
        ).toBeVisible();
        await page.getByRole("button", { name: /Account menu|قائمة الحساب/ }).focus();
        await page.keyboard.press("Escape");
        await expect(toggle).toBeFocused();
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
      }
      await page.locator("#hotel-search").scrollIntoViewIfNeeded();
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
