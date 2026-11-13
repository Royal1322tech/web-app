import { expect, test, type Page } from "@playwright/test";
import { selectLanguage } from "./helpers/header";

/* Layout refinements to the public sign-in page and the agency registration steps. */

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Geometry read immediately after navigation, with no waiting for animations or fonts. */
async function landingGeometry(page: Page) {
  return page.evaluate(() => {
    const hero = document.querySelector("main > section")!.getBoundingClientRect();
    const header = document.querySelector("header")!.getBoundingClientRect();
    const card = document.getElementById("login")!.getBoundingClientRect();
    // The page's top-left corner, beside the floating header, must already be the hero. (The page is
    // at most 1440px wide and centred, so on wider windows its edge is inside the window.)
    const page = document.querySelector("main")!.parentElement!.getBoundingClientRect();
    const corner = document.elementFromPoint(page.left + 2, 2);
    return { heroTop: hero.top, headerTop: header.top, headerHeight: header.height, headerBottom: header.bottom, cardTop: card.top, cornerIsHero: !!corner?.closest("main > section") };
  });
}

for (const locale of ["en", "ar"] as const) {
  test(`the sign-in hero starts at the top edge with no strip above it, from the first frame, in ${locale}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("royal-vacation.locale", value), locale);
    for (const width of [320, 390, 430, 700, 701, 759, 760, 768, 980, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/login");
      await page.locator("#login").waitFor();
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      const geometry = await landingGeometry(page);
      expect(geometry.heroTop, `${width}px`).toBeLessThanOrEqual(0.5);
      expect(geometry.cornerIsHero, `${width}px`).toBe(true);
      // The bar has one fixed height per breakpoint, so the space the hero reserves always matches it.
      expect(geometry.headerHeight, `${width}px`).toBe(width <= 700 ? 62 : 72);
      expect(geometry.headerTop, `${width}px`).toBe(width <= 700 ? 8 : 12);
      expect(geometry.cardTop, `${width}px`).toBeGreaterThan(geometry.headerBottom);
      expect(await overflow(page), `${width}px`).toBeLessThanOrEqual(1);
    }
  });
}

test("the sign-in page does not play the shared route slide, which would uncover the page edge", async ({ page }) => {
  await page.goto("/login");
  expect(await page.locator(".route-entrance").evaluate((element) => element.getAnimations().length)).toBe(0);
  // Other routes keep their entrance.
  await page.goto("/contact");
  expect(await page.locator(".route-entrance").evaluate((element) => getComputedStyle(element).animationName)).toBe("route-in");
});

test("the hero stays at the top edge while web fonts are still loading", async ({ page }) => {
  // Delay the web fonts so the first frames use fallback fonts, as on a slow first visit.
  await page.route(/\.(woff2?|ttf)(\?|$)/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.locator("#login").waitFor();
    const early = await landingGeometry(page);
    expect(early.heroTop, `${width}px`).toBeLessThanOrEqual(0.5);
    expect(early.cornerIsHero, `${width}px`).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    const settled = await landingGeometry(page);
    // Nothing moves when the real fonts arrive.
    expect(settled.cardTop, `${width}px`).toBe(early.cardTop);
    expect(settled.headerHeight, `${width}px`).toBe(early.headerHeight);
  }
});

for (const width of [760, 820, 980]) {
  test(`tablet navbar at ${width}px keeps the links inline on one row`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await expect(page.locator('header button[aria-controls="public-navigation"]')).toBeHidden();
    const links = page.locator("#public-navigation > a");
    await expect(links).toHaveCount(3);
    const tops = await links.evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    const header = (await page.locator("header").first().boundingBox())!;
    expect(header.height).toBeLessThan(90);
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });
}

for (const locale of ["en", "ar"] as const) {
  test(`phone menu opens over the page and closes with Escape in ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    if (locale === "ar") {
      await selectLanguage(page, "ar");
      await page.keyboard.press("Escape");
    }
    const toggle = page.locator('header button[aria-controls="public-navigation"]');
    const before = (await page.locator("#login").boundingBox())!.y;
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const link = page.locator("#public-navigation > a").first();
    await expect(link).toBeVisible();
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    // The panel overlays the page instead of pushing the sign-in card down.
    expect((await page.locator("#login").boundingBox())!.y).toBe(before);
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
    await expect(link).toBeHidden();
    // A tap outside the header also closes it.
    await toggle.click();
    await page.mouse.click(195, 700);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
}

test("the company ID help text lines up with its field", async ({ page }) => {
  await page.goto("/login");
  const help = page.locator(".login-form__field-help");
  test.skip(!(await help.count()), "Company ID entry is only shown in real sign-in builds.");
  expect(await help.evaluate((element) => getComputedStyle(element).textAlign)).toMatch(/start|left/);
});

for (const width of [320, 360, 390, 430]) {
  test(`registration steps on a ${width}px phone stay aligned and name the current step`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/register/agency/company");
    const caption = page.locator(".registration-progress__caption");
    await expect(caption).toBeVisible();
    await expect(caption).toContainText("Step 1 of 4");
    await expect(caption).toContainText("Company Information");
    const tops = await page.locator(".registration-progress .step-number").evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    // The accessible step list still names every step.
    await expect(page.getByRole("list", { name: "Registration progress" }).locator("li")).toHaveCount(4);
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });
}

test("registration shows the per-step labels, not the phone caption, on wider screens", async ({ page }) => {
  for (const width of [768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/register/agency/company");
    await expect(page.locator(".registration-progress__caption")).toBeHidden();
    await expect(page.locator(".registration-progress .step-label").first()).toBeVisible();
  }
});

test("registration caption is translated and right-to-left in Arabic", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/register/agency/company");
  await page.getByRole("button", { name: /^(Language|اللغة)$/ }).click();
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await expect(page.locator("main.registration-page")).toHaveAttribute("dir", "rtl");
  await expect(page.locator(".registration-progress__caption")).toContainText("الخطوة 1 من 4");
  expect(await overflow(page)).toBeLessThanOrEqual(1);
});
