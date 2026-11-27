import { selectLanguage } from "./helpers/header";
import { visit } from "./helpers/demo-login";
import { openHeaderTools, closeHeaderMenu } from "./helpers/header";
import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { readFile } from "node:fs/promises";

// The owner removed the animated airplane: the hero shows its photographs and a gentle zoom only.
for (const width of [375, 768, 1440, 1920]) {
  test(`hero has no animated airplane and a stable background at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await visit(page, "/");
    const background = page.locator(
      'section[aria-label] img[src="/images/home/hero/maldives-ai.png"]',
    ).first();
    await expect(background).toBeVisible();
    await expect(page.locator("[data-hero-flight]")).toHaveCount(0);
    await expect(page.locator('img[src*="/flight/airplane"]')).toHaveCount(0);
    await expect(
      page.locator('img[src="/images/home/daytime-hero.png"]'),
    ).toHaveCount(0);
    await page.locator(".route-entrance").evaluate(async (el) => {
      await Promise.all(el.getAnimations().map((a) => a.finished));
    });
    const header = await page.locator("header").boundingBox();
    // Keyboard focus in the hero pauses the rotation and the zoom, so the background holds still.
    await expect(page.getByRole("button", { name: /image rotation/ })).toHaveCount(0);
    await page.locator("section[aria-label='Royal Vacation agency platform'] header a").first().focus();
    await page.keyboard.press("Tab"); // keyboard focus (focus-visible) inside the hero
    await expect(background).toHaveCSS("animation-play-state", "paused");
    // A pause is applied on the next frame: wait until the browser reports it settled (not pending)
    // before measuring, so a slow machine doesn't record the last frame of motion.
    await background.evaluate((img) => Promise.all(img.getAnimations().map((a) => a.ready)));
    await expect.poll(() => background.evaluate((img) => img.getAnimations().every((a) => a.playState === "paused" && !a.pending))).toBe(true);
    const box = await background.boundingBox();
    await page.waitForTimeout(600);
    expect(await background.boundingBox()).toEqual(box);
    expect(await page.locator("header").boundingBox()).toEqual(header);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
    await page.screenshot({ path: `test-results/hero-clean-plate-${width}.png` });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(background).toHaveCSS("transform", "none");
    await expect(background).toHaveCSS("animation-name", "none");
    await openHeaderTools(page);
    await page.getByRole("button", { name: /Account menu|قائمة الحساب/ }).click();
    await page.locator('header a[href="/profile"]').click();
    await expect(page).toHaveURL(/\/profile$/);
  });
}

test("reduced motion shows the still first photograph without an airplane in English and Arabic", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await visit(page, "/");
    for (const locale of ["en", "ar"]) {
      await openHeaderTools(page);
      await selectLanguage(page, locale);
      await closeHeaderMenu(page);
      await expect(page.locator("[data-hero-flight]")).toHaveCount(0);
      await expect(page.locator("[data-slide] img")).toHaveCount(1);
      await expect(page.locator('[data-slide="0"] img')).toHaveCSS("animation-name", "none");
      await expect(page.getByRole("button", { name: /image rotation|تبديل الصور/ })).toHaveCount(0);
      await page.screenshot({
        path: `test-results/hero-static-${locale}-${width}.png`,
      });
    }
  }
});

test("airplane source and responsive outputs preserve real alpha transparency", async () => {
  const source = "public/images/home/flight/airplane.png";
  const metadata = await sharp(source).metadata();
  expect(metadata.hasAlpha).toBe(true);
  const manifest = JSON.parse(
    await readFile("src/generated/image-sources.json", "utf8"),
  ) as Record<string, string>;
  for (const variant of manifest["/images/home/flight/airplane.png"].split(
    ", ",
  )) {
    expect(
      (await sharp(`public${variant.split(" ")[0]}`).metadata()).hasAlpha,
    ).toBe(true);
  }

  const { data, info } = await sharp(source)
    .extractChannel("alpha")
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect(data[0]).toBe(0);
  expect(data[info.width - 1]).toBe(0);
  expect(
    [...data].filter((alpha) => alpha === 0).length / data.length,
  ).toBeGreaterThan(0.5);
});
