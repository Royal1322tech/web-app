import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [375, 768, 1440]) {
  for (const locale of ["en", "ar"]) {
    test(`partner section layout and assets ${width}px ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(value => localStorage.setItem("royal-vacation.locale", value), locale);
      await page.goto("/");
      const section = page.locator('section[aria-labelledby="benefits-title"]');
      await section.scrollIntoViewIfNeeded();
      await section.evaluate(async el => {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished));
      });
      const cards = section.locator("article");
      await expect(cards).toHaveCount(4);
      const boxes = await cards.evaluateAll(elements => elements.map(el => {
        const box = el.getBoundingClientRect();
        return { width: box.width, height: box.height };
      }));
      for (const box of boxes) {
        expect(box.width).toBeCloseTo(boxes[0].width, 0);
        expect(box.height).toBeCloseTo(boxes[0].height, 0);
      }
      for (const img of await section.locator("img").all()) {
        await expect(img).toHaveAttribute("loading", "lazy");
        await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBeTruthy();
        await expect(img).toHaveAttribute("srcset", /webp/);
      }
      await expect(section.getByText(locale === "en" ? "Built for Travel Partners" : "مصممة لشركاء السفر")).toBeVisible();
      await expect(cards.last()).toContainText(locale === "en" ? "printable demo voucher" : "قسيمة");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect((await new AxeBuilder({ page }).include('section[aria-labelledby="benefits-title"]').analyze()).violations).toEqual([]);
      await section.screenshot({ path: `test-results/partners-${width}-${locale}.png` });
    });
  }
}

test("partner motion settles, parallax stays bounded, and reduced motion is static", async ({ page }) => {
  await page.goto("/");
  const section = page.locator('section[aria-labelledby="benefits-title"]');
  await section.scrollIntoViewIfNeeded();
  const drawing = section.locator(".travel-trail-draw");
  await expect(drawing).toHaveCSS("animation-duration", "2.8s");
  await section.evaluate(async el => {
    await Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished));
  });
  const cards = section.locator("article");
  await cards.first().hover();
  await expect(cards.first()).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, -3)");
  const photo = section.locator('img[src="/images/home/partner-travel.png"]');
  await photo.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 120));
  const visual = photo.locator("../..");
  await expect.poll(async () => visual.evaluate(el => el.style.getPropertyValue("--partner-drift"))).not.toBe("");
  expect(Math.abs(await visual.evaluate(el => parseFloat(el.style.getPropertyValue("--partner-drift"))))).toBeLessThanOrEqual(8);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(photo).toHaveCSS("transform", "none");
  await expect(drawing).toHaveCSS("animation-name", "none");
  await expect(cards.first()).toHaveCSS("animation-name", "none");
  await expect.poll(async () => visual.evaluate(el => el.style.getPropertyValue("--partner-drift"))).toBe("");
  await section.screenshot({ path: "test-results/partners-reduced-motion.png" });
});

test("partner content remains visible without IntersectionObserver", async ({ page }) => {
  await page.addInitScript(() => { Reflect.deleteProperty(window, "IntersectionObserver"); });
  await page.goto("/");
  const section = page.locator('section[aria-labelledby="benefits-title"]');
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator("h2")).toHaveCSS("opacity", "1");
  await expect(section.locator("article").first()).toHaveCSS("opacity", "1");
  await expect(section.locator(".travel-trail-draw")).toHaveCSS("stroke-dashoffset", "0px");
});
