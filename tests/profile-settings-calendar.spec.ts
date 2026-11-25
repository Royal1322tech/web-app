import { expect, test, type Page, type Request } from "@playwright/test";
import { addDays, adjustedCheckOut, isCalendarDay, minCheckOut, nightsBetween, stayDateIssue, toLocalDay } from "../src/lib/stay-dates";

/*
 * Stay dates, Account Settings, breadcrumbs and the hidden Agency Profile / Favourites in the API
 * build (port 4176) against MOCKED responses. Nothing reaches staging.
 */
const APP = "http://127.0.0.1:4176";
const COMPANY = "8f14e45f-ceea-467a-9575-3c4b1f0b5c1a";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, X-Locale", "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS" };
const profile = { message: "ok", data: { user: { id: 7, name: "Laila Hassan", email: "laila@example.com", phone: null }, company: { id: COMPANY, name: "Nile Gate Tours", legal_name: "Nile Gate Tours LLC", display_name: "Nile Gate Tours", status: "approved", account_currency: "USD", preferred_locale: "en", country_code: "EG", city: "Alexandria", address: "1 Corniche Road", business_type: "travel_agency", registration_no: "CR-1", tax_no: null, employee_count: 12 }, membership: { role_code: "company_admin", status: "active" } } };
const empty = { current_page: 1, data: [], last_page: 1, per_page: 20, total: 0 };
const searchReply = { success: true, code: "HOTEL_SEARCH_PREVIEW", message: "x", data: { hotels: [], total: 0, page: 1, per_page: 20, currency: "USD", supplier_currency: "USD", pricing_verified: false, booking_enabled: false } };
const booking = { booking_id: "b0000000-0000-4000-8000-000000000001", booking_no: "HTL-TEST0000000001", status: "draft", currency: "USD", customer_total: "118.55", check_in: "2030-12-06", check_out: "2030-12-09", rooms_count: 1, customer: null, created_at: "2030-11-01T10:00:00Z", guests: [] };

async function signedIn(page: Page, locale: "en" | "ar" = "en") {
  const searches: Request[] = [];
  await page.addInitScript(({ companyId, locale }) => {
    if (!sessionStorage.getItem("royal-travel.b2b-session.v1")) sessionStorage.setItem("royal-travel.b2b-session.v1", JSON.stringify({ token: "12|mocked", expiresAt: Date.now() + 3_600_000, companyId }));
    if (!localStorage.getItem("royal-vacation.locale")) localStorage.setItem("royal-vacation.locale", locale);
  }, { companyId: COMPANY, locale });
  await page.route("https://api.royal.test/**", (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const path = new URL(request.url()).pathname;
    if (path === "/api/v1/b2b/me") return route.fulfill({ headers: cors, json: profile });
    if (path === "/api/v1/b2b/hotels/search") { searches.push(request); return route.fulfill({ headers: cors, json: searchReply }); }
    if (path === `/api/v1/b2b/bookings/${booking.booking_id}`) return route.fulfill({ headers: cors, json: { data: booking } });
    if (path.endsWith("/tickets") || path.includes("/bookings/my-")) return route.fulfill({ headers: cors, json: empty });
    return route.fulfill({ headers: cors, json: { locale: "en", direction: "ltr" } });
  });
  return { searches };
}
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe("stay dates (no browser)", () => {
  test("local calendar days, month, year and leap-year transitions", () => {
    expect(toLocalDay(new Date(2030, 0, 5))).toBe("2030-01-05");
    expect(addDays("2030-01-31", 1)).toBe("2030-02-01");
    expect(addDays("2030-12-31", 1)).toBe("2031-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29"); // leap year
    expect(addDays("2030-02-28", 1)).toBe("2030-03-01");
    expect(isCalendarDay("2028-02-29")).toBe(true);
    expect(isCalendarDay("2030-02-29")).toBe(false);
    expect(isCalendarDay("2030-13-01")).toBe(false);
    expect(nightsBetween("2030-03-30", "2030-04-02")).toBe(3); // across a month (and DST in many zones)
    expect(nightsBetween("2030-12-31", "2031-01-01")).toBe(1);
  });

  test("check-in today or later; check-out at least one night later; invalid check-out moves, valid stays", () => {
    const today = "2030-11-25";
    expect(stayDateIssue("2030-11-24", "2030-11-26", today)).toBe("check_in_past");
    expect(stayDateIssue("2030-11-25", "2030-11-26", today)).toBeNull(); // today is allowed
    expect(stayDateIssue("2030-11-26", "2030-11-27", today)).toBeNull();
    expect(stayDateIssue("2030-11-26", "2030-11-26", today)).toBe("check_out_not_after");
    expect(stayDateIssue("2030-11-26", "2030-11-25", today)).toBe("check_out_not_after");
    expect(stayDateIssue("2030-02-30", "2030-03-02", today)).toBe("check_in_missing");
    expect(minCheckOut("2030-11-25")).toBe("2030-11-26");
    expect(adjustedCheckOut("2030-11-28", "2030-11-27")).toBe("2030-11-29");
    expect(adjustedCheckOut("2030-11-28", "2030-11-28")).toBe("2030-11-29");
    expect(adjustedCheckOut("2030-11-26", "2030-11-30")).toBe("2030-11-30");
  });
});

test.describe("hotel search dates (mocked API)", () => {
  test.use({ timezoneId: "UTC" });

  test("past check-in is blocked, today allowed, check-out follows check-in, and nights are shown", async ({ page }) => {
    await page.clock.install({ time: new Date("2030-11-25T10:00:00Z") });
    const { searches } = await signedIn(page);
    await page.goto(`${APP}/search?destination=dubai&nationality=EG&checkIn=2030-12-06&checkOut=2030-12-09&rooms=${encodeURIComponent('[{"adults":2,"childAges":[]}]')}`);
    const checkIn = page.locator("#check-in"), checkOut = page.locator("#check-out");
    await expect(checkIn).toHaveAttribute("min", "2030-11-25");
    await expect(checkOut).toHaveAttribute("min", "2030-12-07");
    const before = searches.length;

    // Typing a past date (manual input) is refused before anything is sent.
    await checkIn.fill("2030-11-24");
    await page.locator("#hotel-search button[type=submit]").click();
    await expect(page.getByText("Check-in cannot be in the past.")).toBeVisible();
    expect(searches.length).toBe(before);

    // Today is allowed; a check-out that's no longer after check-in moves to the next day.
    await checkIn.fill("2030-11-25");
    await expect(checkOut).toHaveValue("2030-12-09"); // still valid: kept
    await checkIn.fill("2030-12-10");
    await expect(checkOut).toHaveValue("2030-12-11");
    await expect(checkOut).toHaveAttribute("min", "2030-12-11");
    await expect(page.locator("[data-nights]")).toHaveText("1 night");
    await checkOut.fill("2030-12-10");
    await page.locator("#hotel-search button[type=submit]").click();
    await expect(page.getByText("Check-out must be after check-in.")).toBeVisible();
    await checkOut.fill("2030-12-13");
    await expect(page.locator("[data-nights]")).toHaveText("3 nights");
  });

  test("the minimum check-in moves at local midnight", async ({ page }) => {
    await page.clock.install({ time: new Date("2030-02-28T23:59:30Z") });
    await signedIn(page);
    await page.goto(`${APP}/`);
    await expect(page.locator("#check-in")).toHaveAttribute("min", "2030-02-28");
    await page.clock.runFor(60_000);
    await expect(page.locator("#check-in")).toHaveAttribute("min", "2030-03-01");
  });

  test("past dates restored from a link never reach the API", async ({ page }) => {
    await page.clock.install({ time: new Date("2030-11-25T10:00:00Z") });
    const { searches } = await signedIn(page);
    await page.goto(`${APP}/search?destination=dubai&nationality=EG&checkIn=2030-11-20&checkOut=2030-11-22&rooms=${encodeURIComponent('[{"adults":2,"childAges":[]}]')}`);
    await expect(page.getByRole("heading", { name: "Start a hotel search" })).toBeVisible();
    await page.goto(`${APP}/hotels/rooms/4242?destination=dubai&nationality=EG&checkIn=2030-11-20&checkOut=2030-11-22&rooms=${encodeURIComponent('[{"adults":2,"childAges":[]}]')}`);
    await expect(page.getByRole("heading", { name: "These rooms can't be shown" })).toBeVisible();
    expect(searches.filter((r) => r.postDataJSON().checkin === "2030-11-20")).toHaveLength(0);
  });
});

test.describe("local calendar day, not UTC", () => {
  test.use({ timezoneId: "Pacific/Kiritimati" }); // UTC+14: already the next day locally

  test("today's minimum uses the local date", async ({ page }) => {
    await page.clock.install({ time: new Date("2030-11-25T12:00:00Z") });
    await signedIn(page);
    await page.goto(`${APP}/`);
    await expect(page.locator("#check-in")).toHaveAttribute("min", "2030-11-26");
  });
});

test.describe("account settings (mocked API)", () => {
  test("language, nationality and currency apply at once, stay in sync with the header and persist", async ({ page }) => {
    const { searches } = await signedIn(page);
    await page.goto(`${APP}/account/settings`);
    const settings = page.locator("[data-account-settings]");
    await expect(settings.getByText(/require backend integration/)).toHaveCount(0); // no developer placeholder

    await settings.locator("label", { hasText: "العربية" }).click();
    await expect(settings.getByRole("radio", { name: /العربية/ })).toBeChecked();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1, name: "إعدادات الحساب" })).toBeVisible();
    await settings.locator("label", { hasText: "English" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    await page.locator("#settings-nationality").click();
    await page.locator("#settings-nationality").fill("Saudi");
    await page.getByRole("option", { name: /Saudi Arabia/ }).click();
    await page.locator("#settings-currency").click();
    await page.locator("#settings-currency").fill("Euro");
    await page.getByRole("option", { name: /EUR/ }).click();
    await expect(settings.locator("[data-currency-fallback]")).toContainText("USD");
    await expect(settings.getByRole("status").filter({ hasText: "Saved on this device" })).toBeVisible();

    // The header shows the same preferences; a reload keeps them.
    await expect(page.locator("header")).toContainText("Saudi Arabia");
    await expect(page.locator("header")).toContainText("EUR");
    await page.reload();
    await expect(page.locator("#settings-nationality")).toHaveValue(/Saudi Arabia/);

    // Unsupported currencies are never sent to hotel search: EUR searches in USD, residency follows nationality.
    await page.goto(`${APP}/search?destination=dubai&nationality=SA&checkIn=2030-12-06&checkOut=2030-12-09&rooms=${encodeURIComponent('[{"adults":2,"childAges":[]}]')}`);
    await expect.poll(() => searches.length).toBeGreaterThan(0);
    expect(searches.at(-1)!.postDataJSON()).toMatchObject({ currency: "USD", residency: "sa" });
  });

  for (const [locale, width] of [["ar", 375], ["en", 768], ["en", 1280], ["ar", 1920]] as const) {
    test(`${locale} ${width}px: settings and profile fit without sideways scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await signedIn(page, locale);
      for (const path of ["/account/settings", "/profile"]) {
        await page.goto(`${APP}${path}`);
        await expect(page.locator("main h1")).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
        expect(await overflow(page), path).toBeLessThanOrEqual(0);
      }
    });
  }
});

test.describe("breadcrumbs and hidden features (mocked API)", () => {
  test("one breadcrumb: Home, parents as links, the current page marked; Arabic labels", async ({ page }) => {
    await signedIn(page);
    await page.goto(`${APP}/bookings/${booking.booking_id}`);
    const crumb = page.locator("[data-breadcrumb]");
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toHaveCount(1);
    await expect(crumb.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    await expect(crumb.getByRole("link", { name: "My bookings" })).toHaveAttribute("href", "/bookings");
    await expect(crumb.locator("[aria-current=page]")).toHaveText("Booking details");
    await expect(crumb.locator("li")).toHaveCount(3);
    await page.goto(`${APP}/contact`);
    await expect(crumb.locator("[aria-current=page]")).toHaveText("Contact Us");
    await page.evaluate(() => { localStorage.setItem("royal-vacation.locale", "ar"); });
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(`${APP}/bookings/${booking.booking_id}`);
    await expect(crumb.getByRole("link", { name: "الرئيسية" })).toBeVisible();
    await expect(crumb.locator("[aria-current=page]")).toHaveText("تفاصيل الحجز");
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test("Agency Profile and Favourites are hidden from navigation, and their routes redirect", async ({ page }) => {
    await signedIn(page);
    await page.goto(`${APP}/profile`);
    await expect(page.locator('a[href="/agency"], a[href="/agency/edit"], a[href="/favourites"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Account menu", exact: true }).click();
    await expect(page.getByRole("region", { name: "Account menu", exact: true }).getByRole("link", { name: /Agency Profile|Favourites/ })).toHaveCount(0);
    await page.goto(`${APP}/agency`);
    await expect(page).toHaveURL(/\/profile$/);
    await page.goto(`${APP}/favourites`);
    await expect(page).toHaveURL(new RegExp(`${APP}/$`));
  });
});
