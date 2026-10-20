import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { visit } from "./helpers/demo-login";
import { selectLanguage, closeHeaderMenu } from "./helpers/header";
import { contactPhone, phoneCountries } from "../src/features/agency-registration/lib/phone";
import { filterHotels, defaultFilters } from "../src/features/hotels/lib/filter-hotels";
import { hotels } from "../src/features/hotels/data/hotels.fixture";
import { hotelBoardPlans } from "../src/features/hotels/lib/board-plans";

async function company(page: Page) {
  await page.getByLabel("Name of Company").fill("Phone Preview Agency");
  await page.getByLabel("Number of Employees").fill("12");
  await page.getByLabel("Country", { exact: false }).selectOption("EG");
  await page.getByLabel("Company Registration Number").fill("PREVIEW-1");
  await page.getByLabel("Address of Company").fill("Alexandria");
  await page.getByRole("button", { name: "Next", exact: true }).click();
}

test("phone metadata validates selected country and returns E.164 without a backend", () => {
  expect(phoneCountries.length).toBeGreaterThan(200);
  expect(contactPhone({ phoneCountry: "EG", callingCode: "+20", phone: "01001234567" })?.number).toBe("+201001234567");
  expect(contactPhone({ phoneCountry: "US", callingCode: "+1", phone: "2025550123" })?.number).toBe("+12025550123");
  for (const phone of ["111", "+12025550123", "call me 01001234567", "01001234567 ext 3"]) {
    expect(contactPhone({ phoneCountry: "EG", callingCode: "+20", phone })).toBeUndefined();
  }
});

test("board filters reflect normalized room-rate offers in the hotel catalog", () => {
  const expected = {
    "royal-azure-resort": ["room", "breakfast", "half-board"],
    "coral-bay-grand-resort": ["breakfast", "full-board", "all-inclusive"],
    "mediterranean-pearl-hotel": ["room", "breakfast", "ultra-all-inclusive"],
  } as const;
  for (const [hotelId, plans] of Object.entries(expected)) {
    const hotel = hotels.find(item => item.id === hotelId)!;
    expect(hotelBoardPlans(hotel)).toEqual(plans);
    for (const plan of plans) {
      expect(filterHotels(hotels, { ...defaultFilters, board: [plan] }, hotel.city.en, "recommended").map(item => item.id)).toContain(hotelId);
    }
  }
  expect(filterHotels(hotels, { ...defaultFilters, board: ["half-board"] }, "Alexandria", "recommended")).toEqual([]);
});

for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  for (const locale of ["en", "ar"] as const) {
    test(`international phone, independent nationality and retained steps ${width}px ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/welcome");
      if (locale === "ar") await page.getByRole("button", { name: "Switch to Arabic" }).click();
      await page.locator('a[href="/register/agency"]').click();
      await company(page);
      await page.getByLabel("Full Name").fill("Test Contact");
      await page.getByLabel("Nationality").selectOption("EG");
      await page.getByLabel("ID Number").fill("PREVIEW-2");
      await page.getByLabel("Email", { exact: false }).fill("phone@example.test");
      const trigger = page.getByRole("button", { name: /^(Phone country|دولة الهاتف)$/ });
      await trigger.click();
      const panel = page.getByRole("region", { name: /^(Phone country|دولة الهاتف)$/ });
      await expect(panel.locator(".phone-country-options button")).toHaveCount(phoneCountries.length);
      await expect.poll(() => panel.locator("img").evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
      await panel.getByRole("searchbox").fill("+44");
      const uk = panel.getByRole("button", { name: /United Kingdom|المملكة المتحدة/ });
      await expect(uk).toBeVisible();
      await uk.click();
      await expect(trigger).toContainText("+44");
      await expect(page.getByLabel("Nationality")).toHaveValue("EG");
      await page.getByLabel("Nationality").selectOption("SA");
      await expect(trigger).toContainText("+44");
      await page.locator("#contact-phone").fill("111");
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await expect(page.locator("#contact-phone-error")).toBeVisible();
      await expect(page).toHaveURL(/\/contact$/);
      await page.locator("#contact-phone").fill("02079460018");
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await expect(page).toHaveURL(/\/documents$/);
      await page.getByRole("link", { name: "Back", exact: true }).click();
      await expect(page.locator("#contact-phone")).toHaveValue("02079460018");
      await expect(trigger).toContainText("+44");
      await trigger.click();
      await panel.getByRole("searchbox").fill("United States");
      const us = panel.getByRole("button", { name: /United States|الولايات المتحدة/ });
      await us.focus();
      await page.keyboard.press("Enter");
      await expect(trigger).toContainText("+1");
      await trigger.click();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await trigger.click();
      await page.mouse.click(2, 2);
      await expect(panel).toHaveCount(0);
      await trigger.click();
      const bounds = (await panel.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect(await trigger.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      await page.screenshot({ path: `test-results/phone-${locale}-${width}.png`, animations: "disabled" });
    });
  }
}

test("Welcome orbit loops around the unchanged emblem without moving its layout", async ({ page }) => {
  await page.goto("/welcome");
  const logo = page.locator(".welcome-flight .brand-logo");
  const plane = logo.locator(".brand-plane");
  await expect(plane).toHaveCSS("animation-duration", "7s");
  await expect(plane).toHaveCSS("animation-iteration-count", "infinite");
  const sample = async (time: number) => plane.evaluate((element, time) => {
    const animation = element.getAnimations()[0]; animation.pause(); animation.currentTime = time;
    const bounds = element.getBoundingClientRect(); return { x: bounds.x, y: bounds.y };
  }, time);
  await page.locator(".route-entrance").evaluate(async el => { await Promise.all(el.getAnimations({ subtree: true }).filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished)); });
  const layout = await logo.boundingBox();
  const start = await sample(0);
  const half = await sample(3500);
  const end = await sample(7000);
  expect(Math.abs(start.x - half.x)).toBeGreaterThan(40);
  expect(end.x).toBeCloseTo(start.x, 1);
  expect(end.y).toBeCloseTo(start.y, 1);
  expect(await logo.boundingBox()).toEqual(layout);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(plane).toHaveCSS("animation-name", "none");
  await expect(plane).toHaveCSS("offset-path", "none");
});

for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  test(`language, supported filters, footer and readability ${width}px in both languages`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await visit(page, "/search?destination=Alexandria&nationality=EG&checkIn=2030-11-20&checkOut=2030-11-22&rooms=%5B%7B%22adults%22%3A2%2C%22childAges%22%3A%5B%5D%7D%5D");
    for (const locale of ["en", "ar"]) {
      await visit(page, "/search?destination=Alexandria&nationality=EG&checkIn=2030-11-20&checkOut=2030-11-22&rooms=%5B%7B%22adults%22%3A2%2C%22childAges%22%3A%5B%5D%7D%5D");
      await selectLanguage(page, locale);
      const language = page.getByRole("button", { name: /^(Language|اللغة)$/ });
      await language.click();
      const languagePanel = page.getByRole("region", { name: /^(Language|اللغة)$/ });
      await expect(languagePanel.getByRole("button", { pressed: true })).toHaveText(locale === "en" ? "English" : "العربية");
      await languagePanel.getByRole("button").first().focus();
      await page.keyboard.press("ArrowDown");
      await expect(languagePanel.getByRole("button").last()).toBeFocused();
      const box = (await languagePanel.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      await page.screenshot({ path: `test-results/language-${locale}-${width}.png`, animations: "disabled" });
      await page.keyboard.press("Escape");
      await expect(language).toBeFocused();
      await closeHeaderMenu(page);
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "en" ? "ltr" : "rtl");
      await expect(page.locator("#search-nationality")).toHaveValue("EG");
      const mobile = page.getByRole("button", { name: /^(Filters|التصفية)/ });
      if (await mobile.isVisible()) await mobile.click();
      const filters = page.getByRole("complementary", { name: /Hotel filters|تصفية الفنادق/ });
      await filters.getByRole("searchbox").fill("EASTERN");
      await filters.getByRole("checkbox", { name: "4 ★", exact: true }).check();
      await filters.getByRole("checkbox", { name: /Bed & Breakfast|مبيت وإفطار/ }).check();
      const unavailableBoards = locale === "en"
        ? ["Half Board", "Full Board", "All Inclusive"]
        : ["نصف إقامة", "إقامة كاملة", "شامل كليًا"];
      for (const name of unavailableBoards) await expect(filters.getByRole("checkbox", { name, exact: true })).toBeDisabled();
      await filters.getByRole("spinbutton", { name: /Min\.|الأدنى/ }).fill("100");
      await filters.getByRole("spinbutton", { name: /Max\.|الأقصى/ }).fill("120");
      const dialog = page.getByRole("dialog", { name: /Filters|التصفية/ });
      if (await dialog.isVisible()) await dialog.getByRole("button", { name: /Show 1 hotels|عرض 1 فنادق/ }).click();
      await expect(page.locator('article[class*="resultCard"]')).toHaveCount(1);
      await expect(page.locator('[class*="cardAddress"]').first()).toHaveCSS("font-size", "14px");
      if (await mobile.isVisible()) await mobile.click();
      await filters.getByRole("searchbox").fill("No such hotel");
      if (await dialog.isVisible()) await dialog.getByRole("button", { name: /Show 0 hotels|عرض 0 فنادق/ }).click();
      await expect(page.locator('article[class*="resultCard"]')).toHaveCount(0);
      await expect(page.getByText(/No hotels match|لا توجد فنادق تطابق/)).toBeVisible();
      if (await mobile.isVisible()) await mobile.click();
      await filters.getByRole("button", { name: /Reset filters|إعادة ضبط التصفية/ }).click();
      if (await dialog.isVisible()) await dialog.evaluate(el => el.scrollTo(0, 0));
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `test-results/filters-${locale}-${width}.png`, animations: "disabled" });
      if (await dialog.isVisible()) await page.keyboard.press("Escape");
      await expect(page.locator('article[class*="resultCard"]')).toHaveCount(3);
      await expect(page).toHaveURL(/nationality=EG/);
      await visit(page, "/");
      const footer = page.locator("footer");
      await footer.scrollIntoViewIfNeeded();
      await expect(footer.getByText(/Coming Soon|قريبًا/)).toBeVisible();
      expect((await new AxeBuilder({ page }).include("footer").analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await footer.screenshot({ path: `test-results/premium-footer-${locale}-${width}.png` });
    }
  });
}

test("city, amenities, price validation and language changes preserve combined filters", async ({ page }) => {
  await visit(page, "/search");
  const filters = page.getByRole("complementary", { name: /Hotel filters|تصفية الفنادق/ });
  await filters.getByRole("checkbox", { name: "Sharm El Sheikh", exact: true }).check();
  await filters.getByRole("checkbox", { name: "Room Only", exact: true }).check();
  await expect(page.locator('article[class*="resultCard"]')).toHaveCount(1);
  await filters.getByRole("searchbox").fill("AZURE");
  await selectLanguage(page, "ar");
  await expect(filters.getByRole("searchbox")).toHaveValue("AZURE");
  await expect(page.locator('article[class*="resultCard"]')).toHaveCount(1);
  await selectLanguage(page, "en");
  await filters.getByRole("button", { name: "Clear hotel name", exact: true }).click();
  await expect(filters.getByRole("searchbox")).toHaveValue("");
  await filters.getByRole("checkbox", { name: "Room Service", exact: true }).check();
  await expect(page.locator('article[class*="resultCard"]')).toHaveCount(1);
  await filters.getByRole("checkbox", { name: "Gym", exact: true }).check();
  await expect(page.locator('article[class*="resultCard"]')).toHaveCount(0);
  await filters.getByRole("button", { name: "Reset filters", exact: true }).click();
  await expect(page.locator('article[class*="resultCard"]')).toHaveCount(hotels.length);
  await filters.getByRole("spinbutton", { name: "Min.", exact: true }).fill("200");
  await filters.getByRole("spinbutton", { name: "Max.", exact: true }).fill("100");
  await expect(filters.getByRole("alert")).toHaveText("Minimum must not exceed maximum.");
  await expect(page.locator('article[class*="resultCard"]')).toHaveCount(0);
  await filters.getByRole("spinbutton", { name: "Min.", exact: true }).fill("-1");
  await expect(filters.getByRole("alert")).toHaveText("Prices must be zero or greater.");
  await filters.getByRole("button", { name: "Reset filters", exact: true }).click();
  await expect(page.locator('article[class*="resultCard"]')).toHaveCount(hotels.length);
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await page.mouse.click(2, 2);
  await expect(page.getByRole("region", { name: "Language", exact: true })).toHaveCount(0);
});
