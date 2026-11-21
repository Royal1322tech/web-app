import { expect, test } from "@playwright/test";
import { countries } from "../src/features/agency-registration/data/countries";
import { visit } from "./helpers/demo-login";
import { assessCancellation, snapshotCancellationPolicy } from "../src/features/demo/cancellation-assessment";
import type { CancellationPolicy } from "../src/features/hotels/cancellation-policy";

test("cancellation assessment uses only captured structured policy terms", async () => {
  const freePolicy: CancellationPolicy = { kind: "free", deadline: "2030-11-19T23:59:59Z" };
  expect(assessCancellation(freePolicy, new Date("2030-11-19T12:00:00Z")).freeCancellation).toBe(true);
  const afterDeadline = assessCancellation(freePolicy, new Date("2030-11-20T00:00:00Z"));
  expect(afterDeadline.freeCancellation).toBe(false);
  expect(afterDeadline.cancellationFee).toBeUndefined();

  const penaltyPolicy: CancellationPolicy = {
    kind: "conditional",
    rules: [{ cancelledOnOrAfter: "2030-11-01T00:00:00Z", charge: { kind: "amount", amount: 60, currency: "USD" } }],
    noShow: { en: "One-night charge applies.", ar: "تُطبق رسوم ليلة واحدة." },
  };
  expect(assessCancellation(penaltyPolicy, new Date("2030-11-20T00:00:00Z")).cancellationFee).toEqual({ amount: 60, currency: "USD" });
  expect(assessCancellation(undefined, new Date()).policyAvailable).toBe(false);
  const percentage = assessCancellation({ kind: "conditional", rules: [{ charge: { kind: "percentage", percentage: 25 } }] }, new Date());
  expect(percentage.cancellationFee).toBeUndefined();
  expect(percentage.cancellationFeeDescription).toEqual({ kind: "percentage", percentage: 25 });

  const source = { kind: "conditional", rules: [{ charge: { kind: "amount", amount: 20, currency: "USD" } }] } satisfies CancellationPolicy;
  const snapshot = snapshotCancellationPolicy(source)!;
  source.rules![0].charge = { kind: "amount", amount: 500, currency: "USD" };
  expect(assessCancellation(snapshot, new Date()).cancellationFee?.amount).toBe(20);
});

test("nationality catalog contains ISO country codes and excludes a global pseudo-country", async () => {
  expect(countries).toHaveLength(249);
  expect(new Set(countries.map((country) => country.value)).size).toBe(249);
  expect(countries.every((country) => /^[A-Z]{2}$/.test(country.value))).toBe(true);
  expect(countries.some((country) => String(country.label) === "Global")).toBe(false);
});

for (const width of [375, 768, 1440]) {
  test(`public login landing exposes the supplied video and navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const mediaRequests: string[] = [];
    page.on("request", request => { if (request.url().endsWith("royal-promo.mp4")) mediaRequests.push(request.url()); });
    await page.goto("/login");
    const heading = page.getByRole("heading", { name: "Login to your account", exact: true });
    await expect(heading).toBeVisible();
    await expect(page.getByRole("heading", { name: "Travel, thoughtfully arranged." })).toHaveCount(0);
    await expect(heading).toHaveCSS("color", "rgb(16, 45, 82)");
    const hero = await page.locator("section[class*=hero]").boundingBox();
    const card = await page.locator("#login").boundingBox();
    expect(Math.abs((hero!.x + hero!.width / 2) - (card!.x + card!.width / 2))).toBeLessThanOrEqual(1);
    // The hero extends to the top of the page behind the floating header; the first view below the
    // header stays compact.
    const header = (await page.locator("header").first().boundingBox())!;
    expect(hero!.y).toBeLessThanOrEqual(0.5);
    expect(hero!.y + hero!.height - (header.y + header.height)).toBeLessThan(660);
    await expect(page.locator("header .brand-logo")).toBeVisible();
    await expect(page.locator("#login .brand-logo")).toHaveCount(0);
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Forgot My Password?", exact: true })).toHaveAttribute("href", "/forgot-password");
    await expect(page.getByText("Don't have an account?", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Register with us", exact: true })).toHaveAttribute("href", "/register/agency");
    await expect(page.locator("#login .login-form__forgot")).toHaveCSS("align-self", "flex-end");
    const buttonWidth = await page.locator("#login .login-form > .button").evaluate((button) => button.getBoundingClientRect().width);
    const formWidth = await page.locator("#login .login-form").evaluate((form) => form.getBoundingClientRect().width);
    expect(Math.abs(buttonWidth - formWidth)).toBeLessThanOrEqual(1);
    const video = page.getByLabel("Royal Vacation promotional video");
    await expect(video).toHaveAttribute("controls", "");
    await expect(video).toHaveAttribute("preload", "none");
    await expect(video.locator("source")).toHaveAttribute("src", "/videos/royal-promo.mp4");
    await expect(video.locator("track")).toHaveAttribute("src", "/videos/royal-promo.en.vtt");
    expect(mediaRequests).toEqual([]);
    // Below 760px the links sit behind a menu button; from 760px they fit inline beside the logo.
    if (width < 760) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(page.locator("header > a[href='/login']")).toBeVisible();
      await expect(page.locator("#public-navigation").getByRole("link", { name: "Home", exact: true })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Partner With Us", exact: true })).toHaveCount(0);
      if (width < 700) {
        await page.getByRole("link", { name: "Our Products" }).click();
        await expect(page).toHaveURL(/#products$/);
      } else {
        await page.getByRole("button", { name: "Close navigation" }).click();
      }
    } else {
      await expect(page.getByRole("button", { name: "Open navigation" })).toBeHidden();
      await expect(page.locator("#public-navigation").getByRole("link", { name: "Our Products" })).toBeVisible();
      await expect(page.locator("header > a[href='/login']")).toBeVisible();
      await expect(page.locator("#public-navigation").getByRole("link", { name: "Home", exact: true })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Partner With Us", exact: true })).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/public-login-${width}.png`, fullPage: true });
    if (width === 375 || width === 1440) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `test-results/public-login-hero-${width}.png` });
    }
  });
}

test("Arabic public login hero keeps RTL alignment and fits mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await page.addInitScript(() => localStorage.setItem("royal-vacation.locale", "ar"));
  await page.goto("/login");
  await expect(page.locator("div[lang='ar'][dir='rtl']")).toBeVisible();
  await expect(page.getByRole("heading", { name: "رحلات تُرتب بعناية." })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "تسجيل الدخول إلى حسابك", exact: true })).toBeVisible();
  await expect(page.getByLabel("البريد الإلكتروني", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.screenshot({ path: "test-results/public-login-hero-375-ar.png" });
});

test("nationality stays synchronized through the navbar, hotel search, and hotel details", async ({ page }) => {
  await visit(page, "/");
  const header = page.locator("header");
  await header.getByRole("button", { name: "Nationality and currency" }).click();
  const preferences = page.getByRole("region", { name: "Nationality and currency" });
  await preferences.getByLabel("Select nationality").selectOption("JP");
  await expect(page.locator("#search-nationality")).toHaveValue("JP");
  await page.locator("#destination").selectOption("Alexandria");
  await page.locator("#check-in").fill("2030-11-20");
  await page.locator("#check-out").fill("2030-11-22");
  await page.locator("#hotel-search button[type=submit]").click();
  await expect(page).toHaveURL(/nationality=JP/);
  await page.locator('a[href^="/hotels/eastern-al-montazah?"]').first().click();
  // Search results and hotel details share the search form, so wait for the details page itself.
  await expect(page).toHaveURL(/\/hotels\/eastern-al-montazah\?/);
  await expect(page.locator("[class*=gallery]").first()).toBeAttached();
  await expect(page.locator("#search-nationality")).toHaveValue("JP");
  const searchPosition = await page.locator("#hotel-search").evaluate((node) => node.compareDocumentPosition(document.querySelector("[class*=gallery]")!));
  expect(searchPosition & 4).toBeTruthy();
  await expect(page.locator("#hotel-search")).toHaveCount(1);
  await page.reload();
  await expect(page.locator("#search-nationality")).toHaveValue("JP");
});

test("group quotation is a main navigation destination and not a profile subtab", async ({ page }) => {
  await visit(page, "/bookings");
  await expect(page.locator("header nav").getByRole("link", { name: "Group Quotation" })).toBeVisible();
  await expect(page.locator(".workspace-nav").getByRole("link", { name: "Group quotation" })).toHaveCount(0);
  await page.locator("header nav").getByRole("link", { name: "Group Quotation" }).click();
  await expect(page).toHaveURL(/\/group-quotation$/);
  await expect(page.getByRole("textbox", { name: "Destination / route", exact: true })).toBeVisible();
});

test("voucher shows booking guests and references without prices or invented hotel contact", async ({ page }) => {
  await visit(page, "/bookings/DEMO-1001/voucher");
  const voucher = page.locator(".voucher");
  await expect(voucher).toContainText("Sample Traveller A");
  await expect(voucher).toContainText("Sample Companion");
  await expect(voucher).toContainText("DEMO-1001");
  await expect(voucher).toContainText("NOT VALID FOR TRAVEL");
  await expect(voucher).not.toContainText("Stay total");
  await expect(voucher).not.toContainText("$555");
  await expect(voucher.locator('a[href^="tel:"]')).toHaveCount(0);
});

test("bookings without an invoice and accounting stay empty without supporting records", async ({ page }) => {
  // Only a pending or failed booking has no invoice; no number or amount is generated for it.
  await visit(page, "/bookings/DEMO-1005/invoice");
  await expect(page.getByRole("heading", { name: "Invoice not available" })).toBeVisible();
  await expect(page.getByText(/No invoice number or financial values have been generated/)).toBeVisible();
  await page.goto("/accounting-review");
  await expect(page.getByRole("heading", { name: "No payment reviews" })).toBeVisible();
  await expect(page.getByText(/No payment approval, reconciliation or settlement happens on this page/)).toBeVisible();
});

test("booking summary filters update results while preserving search and can be cleared", async ({ page }) => {
  await visit(page, "/bookings");
  const confirmed = page.getByRole("button", { name: /Confirmed/ });
  const fees = page.getByRole("button", { name: /Cancellation fees/ });
  await confirmed.click();
  await expect(confirmed).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("main article")).toHaveCount(2);
  await page.getByRole("button", { name: "Clear status card filter" }).click();
  await expect(confirmed).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("main article")).toHaveCount(5);
  await page.getByPlaceholder("Booking Number").fill("DEMO-1001");
  await page.getByRole("button", { name: "Search bookings" }).click();
  await confirmed.click();
  await expect(page.locator("main article")).toHaveCount(1);
  await fees.click();
  await expect(fees).toHaveAttribute("aria-pressed", "true");
  await expect(confirmed).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("main article")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear status card filter" }).click();
  await expect(page.locator("main article")).toHaveCount(1);
  await expect(page.getByPlaceholder("Booking Number")).toHaveValue("DEMO-1001");
});

test("landing, booking documents, and filters support Arabic RTL without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/login");
  await page.evaluate(() => localStorage.setItem("royal-vacation.locale", "ar"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("video track")).toHaveAttribute("src", "/videos/royal-promo.ar.vtt");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.evaluate(() => localStorage.setItem("royal-vacation.locale", "en"));
  await page.reload();
  await visit(page, "/bookings");
  await page.evaluate(() => localStorage.setItem("royal-vacation.locale", "ar"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test("missing cancellation terms require an explicit local simulation and never claim a refund", async ({ page }) => {
  await visit(page, "/bookings/DEMO-1001");
  await expect(page.getByRole("button", { name: "Cancel booking" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel booking" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("DEMO-1001");
  await expect(dialog).toContainText("Cancellation terms unavailable");
  await expect(dialog).toContainText("Refund and cancellation fees cannot be determined.");
  await expect(dialog).toContainText("local cancellation simulation");
  await expect(dialog).not.toContainText("refund processed");
  await dialog.getByRole("button", { name: "Confirm simulated cancellation" }).click();
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(page.getByText("Cancellation simulated — supplier unchanged", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel booking" })).toHaveCount(0);

  await visit(page, "/bookings/DEMO-1003");
  await expect(page.getByRole("button", { name: "Cancel booking" })).toHaveCount(0);
});
