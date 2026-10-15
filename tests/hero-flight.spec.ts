import { visit } from "./helpers/demo-login";
import { openHeaderTools, closeHeaderMenu } from "./helpers/header";
import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { readFile } from "node:fs/promises";

for (const width of [375, 768, 1440, 1920]) {
  test(`single decorative airplane stays in the sky at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await visit(page, "/");
    const plane = page.locator("[data-hero-flight] img");
    const sky = page.locator("[data-hero-flight]");
    const background = page.locator(
      'section[aria-label] img[src="/images/home/flight/hero-clean.png"]',
    ).first();
    await expect(plane).toHaveCount(1);
    await expect(
      page.locator('img[src="/images/home/daytime-hero.png"]'),
    ).toHaveCount(0);
    await expect(sky).toHaveAttribute("aria-hidden", "true");
    await expect(sky).toHaveCSS("pointer-events", "none");
    await expect(plane).toHaveCSS("animation-iteration-count", "1");
    await expect
      .poll(() => plane.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    await page.locator(".route-entrance").evaluate(async (el) => {
      await Promise.all(el.getAnimations().map((a) => a.finished));
    });
    const header = await page.locator("header").boundingBox();
    const heading = await page.getByRole("heading", { level: 1 }).boundingBox();
    await background.evaluate(async el => {
      el.getAnimations().forEach(a => a.pause());
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const bg = await background.boundingBox();
    let previousX = -Infinity;
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      await plane.evaluate((el, progress) => {
        const animation = el.getAnimations()[0];
        animation.pause();
        const timing = animation.effect!.getTiming();
        animation.currentTime =
          Number(timing.delay) + Number(timing.duration) * progress;
      }, progress);
      const box = (await plane.boundingBox())!;
      expect(box.x).toBeGreaterThan(previousX);
      previousX = box.x;
      expect(box.y + box.height).toBeLessThan(heading!.y);
      expect(await page.locator("header").boundingBox()).toEqual(header);
      expect(await background.boundingBox()).toEqual(bg);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width + 1);
      if (progress === 0.5)
        await page.screenshot({
          path: `test-results/hero-flight-${width}.png`,
        });
    }
    await expect(plane).toHaveCSS("opacity", "0");
    await page.mouse.move(width * 0.8, 300);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(background).toHaveCSS("transform", "none");
    await expect(background).toHaveCSS("animation-name", "none");
    await openHeaderTools(page);
    await page.getByRole("button", { name: /Account menu|قائمة الحساب/ }).click();
    await page.locator('header a[href="/agency"]').click();
    await expect(page).toHaveURL(/\/agency$/);
  });
}

test("reduced motion shows one static airplane in English and Arabic", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await visit(page, "/");
    for (const locale of ["en", "ar"]) {
      await openHeaderTools(page);
      await page.locator("header select").selectOption(locale);
      await closeHeaderMenu(page);
      const plane = page.locator("[data-hero-flight] img");
      await expect(plane).toHaveCSS("animation-name", "none");
      await expect(plane).toHaveCSS("opacity", "1");
      // A scaled image can report 0.99999988 due to intersection rounding.
      await expect(plane).toBeInViewport({ ratio: 0.9999 });
      const planeBox = (await plane.boundingBox())!;
      expect(planeBox.x).toBeGreaterThanOrEqual(0);
      expect(planeBox.x + planeBox.width).toBeLessThanOrEqual(width);
      const titleBox = (await page
        .getByRole("heading", { level: 1 })
        .boundingBox())!;
      expect(planeBox.y + planeBox.height).toBeLessThan(titleBox.y);
      await page.screenshot({
        path: `test-results/hero-flight-static-${locale}-${width}.png`,
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
