import { expect, test, type Page } from "@playwright/test";

/*
 * Mobile navigation, language/preference menus and registration form state (API build on port 4176,
 * MOCKED API; never contacts staging).
 */
const APP = "http://127.0.0.1:4176";
const COMPANY = "8f14e45f-ceea-467a-9575-3c4b1f0b5c1a";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, X-Locale", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const profile = { message: "ok", data: { user: { id: 7, name: "Laila Hassan", email: "laila@example.com" }, company: { id: COMPANY, name: "Nile Gate Tours", legal_name: "Nile Gate Tours LLC", display_name: "Nile Gate Tours", status: "approved", account_currency: "USD", preferred_locale: "en", country_code: "EG", city: "Alexandria", address: "1 Corniche Road", business_type: "travel_agency", registration_no: "CR-1", tax_no: null, employee_count: 12 }, membership: { role_code: "company_admin", status: "active" } } };

async function mockApi(page: Page, { signedIn = true, locale = "en" }: { signedIn?: boolean; locale?: "en" | "ar" } = {}) {
  await page.addInitScript(({ companyId, signedIn, locale }) => {
    if (signedIn && !sessionStorage.getItem("royal-travel.b2b-session.v1")) sessionStorage.setItem("royal-travel.b2b-session.v1", JSON.stringify({ token: "12|mocked", expiresAt: Date.now() + 3_600_000, companyId }));
    if (!localStorage.getItem("royal-vacation.locale")) localStorage.setItem("royal-vacation.locale", locale);
  }, { companyId: COMPANY, signedIn, locale });
  await page.route("https://api.royal.test/**", (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (new URL(request.url()).pathname === "/api/v1/b2b/me") return route.fulfill({ headers: cors, json: profile });
    return route.fulfill({ status: 503, headers: cors, json: {} });
  });
}
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const gapBelow = (page: Page, trigger: string, panel: string) => page.evaluate(([t, p]) => {
  const a = document.querySelector(t)!.getBoundingClientRect(), b = document.querySelector(p)!.getBoundingClientRect();
  return { gap: b.top - a.bottom, left: b.left, right: b.right, width: innerWidth };
}, [trigger, panel] as const);

test.describe("mobile navigation", () => {
  for (const locale of ["en", "ar"] as const) {
    test(`${locale}: one column, locked background, Escape and outside tap close, focus returns`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await mockApi(page, { locale });
      await page.goto(`${APP}/search`);
      const toggle = page.getByRole("button", { name: locale === "en" ? "Open navigation" : "فتح القائمة" });
      await toggle.click();
      const nav = page.locator("#home-navigation");
      await expect(nav).toBeVisible();
      const links = nav.getByRole("link");
      await expect(links).toHaveCount(8);
      const lefts = await links.evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().left)));
      expect(new Set(lefts).size).toBe(1);
      await expect(nav.locator("[aria-current=page]")).toHaveCount(1);
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe("hidden");
      expect(await overflow(page)).toBeLessThanOrEqual(0);

      // A preference menu opens in place, right under its trigger, inside the screen.
      await page.locator("#header-tools .language-trigger").click();
      const placed = await gapBelow(page, "#header-tools .language-trigger", "#header-tools .language-panel");
      expect(placed.gap).toBeGreaterThanOrEqual(0);
      expect(placed.gap).toBeLessThanOrEqual(12);
      expect(placed.left).toBeGreaterThanOrEqual(0);
      expect(placed.right).toBeLessThanOrEqual(placed.width);
      // Escape closes the open panel first, then the menu, and focus goes back to the menu button.
      await page.keyboard.press("Escape");
      await expect(page.locator("#header-tools .language-panel")).toHaveCount(0);
      await expect(nav).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(nav).toBeHidden();
      await expect(page.getByRole("button", { name: locale === "en" ? "Open navigation" : "فتح القائمة" })).toBeFocused();
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe("hidden");

      // A tap outside the header closes it too.
      await toggle.click();
      await page.mouse.click(187, 790);
      await expect(nav).toBeHidden();
    });
  }

  test("a short screen scrolls the open menu to its last control", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 480 });
    await mockApi(page);
    await page.goto(`${APP}/search`);
    await page.getByRole("button", { name: "Open navigation" }).click();
    const account = page.getByRole("button", { name: "Account menu" });
    await account.scrollIntoViewIfNeeded();
    await expect(account).toBeInViewport();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test("choosing a language from the open menu switches to Arabic RTL and keeps the menu usable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockApi(page);
    await page.goto(`${APP}/search`);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.locator("#header-tools .language-trigger").click();
    await page.getByRole("button", { name: "العربية" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("#home-navigation")).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe("language and preference menus", () => {
  test("desktop: anchored under the trigger, keyboard selectable, Escape restores focus", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockApi(page);
    await page.goto(`${APP}/search`);
    const trigger = page.locator("#header-tools .language-trigger");
    await trigger.focus();
    await page.keyboard.press("Enter");
    const placed = await gapBelow(page, "#header-tools .language-trigger", "#header-tools .language-panel");
    expect(placed.gap).toBeGreaterThanOrEqual(4);
    expect(placed.gap).toBeLessThanOrEqual(12);
    await expect(page.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(page.locator(".language-panel")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    // Nationality and currency: the same anchored menu; selection is marked.
    await page.getByRole("button", { name: "Nationality and currency" }).click();
    const panel = page.getByRole("region", { name: "Nationality and currency" });
    await panel.locator("label", { hasText: "SAR" }).click();
    await expect(panel.getByRole("radio", { name: "SAR" })).toBeChecked();
    await page.mouse.click(10, 880);
    await expect(page.getByRole("region", { name: "Nationality and currency" })).toHaveCount(0);
  });

  for (const width of [320, 375]) {
    test(`registration at ${width}px: the language menu opens next to its trigger and keeps entered data`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 });
      await mockApi(page, { signedIn: false });
      await page.goto(`${APP}/register/agency/company`);
      await page.locator("#company-name").fill("Nile Gate Tours");
      await page.locator(".language-trigger").click();
      const placed = await gapBelow(page, ".language-trigger", ".language-panel");
      expect(placed.gap).toBeGreaterThanOrEqual(4);
      expect(placed.gap).toBeLessThanOrEqual(12);
      expect(placed.left).toBeGreaterThanOrEqual(0);
      expect(placed.right).toBeLessThanOrEqual(placed.width);
      await page.getByRole("button", { name: "العربية" }).click();
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(page.locator("#company-name")).toHaveValue("Nile Gate Tours");
      // Validation still runs, focuses the first invalid field, and the stepper marks the current step.
      await page.getByRole("button", { name: /التالي/ }).click();
      await expect(page.locator("#company-employeeCount")).toBeFocused();
      await expect(page.locator(".registration-progress [aria-current=step]")).toHaveCount(1);
      expect(await overflow(page)).toBeLessThanOrEqual(0);
    });
  }
});
