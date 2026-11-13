import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { selectLanguage } from "./helpers/header";

/* Footer mobile-apps panel: honest "coming soon" store badges that never link anywhere. */

const copy = {
  en: { heading: "Get the Royal Vacation App", soon: "Coming Soon", description: "Our iOS and Android apps are on the way.", badges: ["Coming to the App Store", "Coming to Google Play"] },
  ar: { heading: "احصل على تطبيق رويال فاكيشن", soon: "قريبًا", description: "تطبيقاتنا على iOS و Android في الطريق.", badges: ["سيتوفر على App Store", "سيتوفر على Google Play"] },
} as const;

for (const locale of ["en", "ar"] as const) {
  for (const width of [320, 390, 768, 1024, 1280, 1440, 1920]) {
    test(`footer apps panel fits and stays inert at ${width}px in ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/login");
      if (locale === "ar") {
        await selectLanguage(page, "ar");
        await page.keyboard.press("Escape");
      }
      const footer = page.locator("footer");
      const apps = footer.locator('section[aria-labelledby="footer-apps-title"]');
      await apps.scrollIntoViewIfNeeded();
      const text = copy[locale];

      await expect(apps.getByRole("heading", { name: text.heading })).toBeVisible();
      await expect(apps.getByText(text.soon, { exact: true })).toBeVisible();
      await expect(apps).toContainText(text.description);
      const badges = apps.locator("li");
      await expect(badges).toHaveCount(2);
      for (const [index, label] of text.badges.entries()) {
        await expect(badges.nth(index)).toHaveText(new RegExp(label.replace(/\s+/g, "\\s*")));
      }

      // No fake listings: nothing in the panel is a link, an image or focusable.
      await expect(apps.locator("a, img, button, [tabindex]")).toHaveCount(0);

      // Nothing overflows the page, the panel or a badge.
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      const panel = (await apps.boundingBox())!;
      for (const box of await badges.evaluateAll((items) => items.map((item) => {
        const rect = item.getBoundingClientRect();
        // The store name keeps clear of the badge's edges (at least its 8px padding).
        const name = item.querySelector("strong")!.getBoundingClientRect();
        const inside = name.left >= rect.left + 8 && name.right <= rect.right - 8;
        return { left: rect.left, right: rect.right, clipped: item.scrollWidth > item.clientWidth + 1, inside };
      }))) {
        expect(box.clipped).toBe(false);
        expect(box.inside).toBe(true);
        expect(box.left).toBeGreaterThanOrEqual(panel.x - 1);
        expect(box.right).toBeLessThanOrEqual(panel.x + panel.width + 1);
      }

      // The existing footer links are unchanged.
      await expect(footer.locator('nav a')).toHaveCount(4);
      await expect(footer.locator('a[href="https://wa.me/201070724143"]')).toBeVisible();
      await expect(footer.locator('a[href="mailto:royal.travel@royalvacation.online"]')).toBeVisible();

      if (width === 390 || width === 1440) {
        expect((await new AxeBuilder({ page }).include("footer").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
      }
    });
  }
}
