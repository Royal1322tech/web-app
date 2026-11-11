import { expect, test, type Page } from "@playwright/test";
import { visit } from "./helpers/demo-login";
import { closeHeaderMenu, openHeaderTools, selectLanguage } from "./helpers/header";

const hero = (page: Page) => page.getByRole("region", { name: /Royal Vacation agency platform|منصة رويال فاكيشن للوكالات/ });

/** True when the topmost element at the centre of `box` belongs to `selector`. */
const topmostAt = (page: Page, box: { x: number; y: number; width: number; height: number }, selector: string) =>
  page.evaluate(([x, y, selector]) => !!document.elementFromPoint(Number(x), Number(y))?.closest(String(selector)), [box.x + box.width / 2, box.y + box.height / 2, selector] as const);

for (const locale of ["en", "ar"] as const) {
  test(`hero tagline, credit-free imagery and connected search in ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await visit(page, "/");
    await openHeaderTools(page);
    await selectLanguage(page, locale);
    await closeHeaderMenu(page);
    const region = hero(page);
    await expect(region.locator('p[class*="tagline"]')).toHaveText(locale === "en" ? "Your Gateway to Extraordinary Travel" : "بوابتك إلى رحلات استثنائية");
    await expect(region.locator('p[class*="lede"]')).toContainText(locale === "en" ? "seamless travel experiences" : "تجارب سفر سلسة");
    // The accessible page heading is unchanged.
    await expect(region.getByRole("heading", { level: 1 })).toHaveClass(/sr-only/);

    // The hero imagery needs no photo credit, so the hero carries no credit line or links.
    await expect(region.locator('p[class*="credit"]')).toHaveCount(0);
    await expect(region.locator('[class*="copy"] a, [class*="meta"] a')).toHaveCount(0);

    // The search card rises into the hero and is drawn above the photograph.
    const heroBox = (await region.boundingBox())!;
    const tabs = (await page.locator("#hotel-search nav").boundingBox())!;
    expect(tabs.y).toBeLessThan(heroBox.y + heroBox.height);
    expect(await topmostAt(page, tabs, "#hotel-search")).toBe(true);
    // The tagline stays clear of the search card.
    const search = (await page.locator("#hotel-search").boundingBox())!;
    const lede = (await region.locator('p[class*="lede"]').boundingBox())!;
    expect(lede.y + lede.height).toBeLessThanOrEqual(search.y);
  });
}

for (const width of [320, 390, 834, 1100, 1440]) {
  test(`homepage search fields share one height and the page never scrolls sideways at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await visit(page, "/");
    for (const locale of ["en", "ar"] as const) {
      await openHeaderTools(page);
      await selectLanguage(page, locale);
      await closeHeaderMenu(page);
      const heights = await page.locator("#hotel-search form").evaluate((form) =>
        [...form.querySelectorAll("input:not([type=hidden]), select, button[aria-haspopup]")]
          .map((element) => Math.round(element.getBoundingClientRect().height)));
      expect(new Set(heights).size, heights.join(",")).toBe(1);
      const submit = (await page.locator("#hotel-search button[type=submit]").boundingBox())!;
      expect(Math.round(submit.height)).toBe(heights[0]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    }
  });
}

test("header menus open above the overlapping search card", async ({ page }) => {
  // Phones: the expanded navigation extends past the hero, over the search card.
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, "/");
  await page.locator('header button[aria-controls~="home-navigation"]').click();
  const contact = page.locator('header nav a[href="/contact"]');
  await expect(contact).toBeVisible();
  const box = (await contact.boundingBox())!;
  expect(await topmostAt(page, box, "header")).toBe(true);
  await contact.click();
  await expect(page).toHaveURL(/\/contact$/);

  // Desktop: the account menu stays clickable above the hero and the search card.
  await page.setViewportSize({ width: 1440, height: 900 });
  await visit(page, "/");
  await page.getByRole("button", { name: "Account menu" }).click();
  const settings = page.locator('header a[href="/account/settings"]');
  await expect(settings).toBeVisible();
  expect(await topmostAt(page, (await settings.boundingBox())!, "header")).toBe(true);
  await settings.click();
  await expect(page).toHaveURL(/\/account\/settings$/);
});

test("search keeps its validation and query after the redesign", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await visit(page, "/");
  const search = page.locator("#hotel-search");
  await search.getByRole("button", { name: "Search", exact: true }).click();
  await expect(search.locator("#destination")).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL(/\/$/);
  await search.getByRole("link", { name: "Car Rental", exact: true }).click();
  await expect(page).toHaveURL(/\/car-rental$/);
});

test("the hero rotates the four supplied images in order and each one loads", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await visit(page, "/");
  const order = ["maldives-ai", "dubai-ai", "santorini-ai", "switzerland-ai"];
  await expect(page.locator("[data-slide]")).toHaveCount(4);
  for (const [position, name] of order.entries()) {
    const image = page.locator(`[data-slide="${position}"] img`);
    await expect(page.locator(`[data-slide="${position}"]`)).toHaveAttribute("data-active", "true", { timeout: 12000 });
    await expect(image).toHaveAttribute("src", `/images/home/hero/${name}.png`);
    // The browser picks an optimized WebP from the srcset, never the PNG source.
    await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).currentSrc)).toMatch(/\/optimized\/[0-9a-f]{16}-\d+\.webp$/);
    expect(await image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
});
