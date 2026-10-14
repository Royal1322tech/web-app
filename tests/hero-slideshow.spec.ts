import { visit } from "./helpers/demo-login";
import { expect, test } from '@playwright/test';

for (const width of [375, 1440]) {
  test(`hero automatically crossfades without visible controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await visit(page, '/');
    const hero = page.getByRole('region', { name: 'Royal Vacation agency platform', exact: true });
    const slides = hero.locator('[data-active]');
    await expect(slides).toHaveCount(3);
    await expect(hero.getByRole('button', { name: /slideshow|Show slide/ })).toHaveCount(0);
    await expect(hero.getByRole('group', { name: 'Hero slideshow' })).toHaveCount(0);
    const heading = hero.getByRole('heading', { level: 1 });
    await page.locator(".route-entrance").evaluate(async el => { await Promise.all(el.getAnimations().map(animation => animation.finished)); });
    await page.evaluate(() => document.fonts.ready);
    const before = await heading.boundingBox();
    await expect(slides.nth(1)).toHaveAttribute('data-active', 'true', { timeout: 12000 });
    await expect(slides.nth(1)).toHaveCSS('transition-duration', '0.8s');
    expect(await heading.boundingBox()).toEqual(before);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(slides.nth(1)).toHaveAttribute('data-motion', 'false');
    await expect(slides.nth(1).locator('img')).toHaveCSS('animation-play-state', 'paused');
    await page.waitForTimeout(8300);
    await expect(slides.nth(1)).toHaveAttribute('data-active', 'true');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(slides.nth(1)).toHaveAttribute('data-motion', 'true');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(slides.nth(1)).toHaveAttribute('data-motion', 'false');
    await expect(slides.nth(1).locator('img')).toHaveCSS('animation-name', 'none');
    await expect(slides.nth(1)).toHaveCSS('transition-duration', '0s');
    await page.screenshot({ path: `test-results/hero-clean-${width}.png` });
  });
}
