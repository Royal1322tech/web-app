import { expect, test, type Page } from "@playwright/test";
import { visit } from "./helpers/demo-login";
import { formatAmount, formatMoney } from "../src/lib/money";

/*
 * UI/UX polish and stability update (43 approved items): regression checks for the changed
 * behaviour. API build (port 4176) against MOCKED responses; demo build (4173) for demo-only pages.
 */
const API = "http://127.0.0.1:4176";
const COMPANY = "8f14e45f-ceea-467a-9575-3c4b1f0b5c1a";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, X-Locale", "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS" };
const profile = { message: "ok", data: { user: { id: 7, name: "Laila Hassan", email: "laila@example.com", phone: null }, company: { id: COMPANY, name: "Nile Gate Tours", legal_name: "Nile Gate Tours LLC", display_name: "Nile Gate Tours", status: "approved", account_currency: "USD", preferred_locale: "en", country_code: "EG", city: "Alexandria", address: "1 Corniche Road", business_type: "travel_agency", registration_no: "CR-1", tax_no: null, employee_count: 12 }, membership: { role_code: "company_admin", status: "active" } } };
const finance = { account: { currency: "USD", wallet_cents: 50000, wallet_reserved_cents: 0, wallet_available_cents: 50000, credit_limit_cents: 0, credit_used_cents: 0, credit_available_cents: 0, credit_frozen: false, total_available_cents: 50000 }, entries: [] };
const unverified = { verified: false, selling_price: null, agency_purchase_price: null, currency: "USD", price_on_request: true };
const stay = `destination=dubai&nationality=EG&checkIn=2030-12-06&checkOut=2030-12-09&rooms=${encodeURIComponent(JSON.stringify([{ adults: 2, childAges: [] }]))}`;

async function signedIn(page: Page, locale: "en" | "ar" = "en") {
  await page.addInitScript(({ companyId, locale }) => {
    if (!sessionStorage.getItem("royal-travel.b2b-session.v1")) sessionStorage.setItem("royal-travel.b2b-session.v1", JSON.stringify({ token: "12|mocked", expiresAt: Date.now() + 3_600_000, companyId }));
    if (!localStorage.getItem("royal-vacation.locale")) localStorage.setItem("royal-vacation.locale", locale);
  }, { companyId: COMPANY, locale });
  await page.route("https://api.royal.test/**", (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const path = new URL(request.url()).pathname;
    if (path === "/api/v1/b2b/me") return route.fulfill({ headers: cors, json: profile });
    if (path === "/api/v1/b2b/finance") return route.fulfill({ headers: cors, json: finance });
    if (path === "/api/v1/b2b/loyalty") return route.fulfill({ headers: cors, json: { company_id: COMPANY, balances: { pending: 0, available: 40 }, transactions: [], redemption_enabled: false } });
    if (path === "/api/v1/b2b/hotels/4242/rooms") return route.fulfill({ headers: cors, json: { hotel_hid: 4242, rooms_token: "t".repeat(48), expires_in_seconds: 900, total: 1, rooms: [{ rate_index: 0, room_name: "Deluxe King", bedding_type: "double", meal_name: "breakfast", has_breakfast: true, price: unverified, selectable: false, booking_enabled: false }] } });
    return route.fulfill({ headers: cors, json: { locale: "en", direction: "ltr" } });
  });
}

test.describe("money formatting (no browser)", () => {
  test("two decimals for display only; values are never rounded or regrouped", () => {
    expect(formatAmount("46")).toBe("46.00");
    expect(formatAmount("46.2")).toBe("46.20");
    expect(formatAmount("1234.50")).toBe("1234.50");
    expect(formatAmount("10.125")).toBe("10.125"); // more precision than two places: shown as sent
    expect(formatAmount("n/a")).toBe("n/a");
    expect(formatMoney("55", "USD")).toBe("USD 55.00");
  });
});

test.describe("authenticated pages (mocked API)", () => {
  test("Reduce Price: same width as Select room, a downward trend icon, and the current price (on request) in the form", async ({ page }) => {
    await signedIn(page);
    await page.goto(`${API}/hotels/rooms/4242?${stay}`);
    const card = page.locator("[data-rate-index]").first();
    const select = (await card.getByRole("button", { name: "Select room" }).boundingBox())!;
    const reduce = (await card.locator("[data-reduce-price]").boundingBox())!;
    expect(Math.abs(select.width - reduce.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(select.x - reduce.x)).toBeLessThanOrEqual(1);
    await expect(card.locator("[data-reduce-price] path")).toHaveAttribute("d", "M3 7l6 6 4-4 8 9M14 18h7v-7");
    await card.locator("[data-reduce-price]").click();
    await expect(page.locator("[data-current-price=on-request]")).toHaveText("Price on request");
    // The upload area's lines don't run together.
    await expect(page.locator("label[for$=-document]")).toContainText("Choose a file or drag it here");
  });

  test("wallet balances come before loyalty points; an empty Transactions page links to the wallet", async ({ page }) => {
    await signedIn(page);
    await page.goto(`${API}/wallet`);
    const metric = (await page.locator("[data-metric]").first().boundingBox())!;
    const loyalty = (await page.locator(".loyalty-summary").boundingBox())!;
    expect(metric.y).toBeLessThan(loyalty.y);
    await page.goto(`${API}/transactions`);
    await expect(page.locator("[data-finance-state=no-entries]").getByRole("link", { name: "View wallet" })).toHaveAttribute("href", "/wallet");
  });

  test("no example records on authenticated invoices, accounting review or notifications; no example cart", async ({ page }) => {
    await signedIn(page);
    for (const path of ["/invoices", "/accounting-review", "/notifications"]) {
      await page.goto(`${API}${path}`);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator("main")).not.toContainText(/DEMO-\d+|Examples are built/);
    }
    await expect(page.locator('header a[href="/booking/summary"]')).toHaveCount(0);
  });

  test("account menu is grouped; the sidebar lists Customers and Price Requests", async ({ page }) => {
    await signedIn(page);
    await page.goto(`${API}/profile`);
    await page.getByRole("button", { name: "Account menu", exact: true }).click();
    const menu = page.getByRole("region", { name: "Account menu", exact: true });
    for (const group of ["Bookings", "Finance", "Account"]) await expect(menu.getByRole("group", { name: group })).toBeVisible();
    await page.keyboard.press("Escape");
    const sidebar = page.getByRole("navigation", { name: "Workspace navigation" });
    await expect(sidebar.getByRole("link", { name: "Customers", exact: true })).toHaveAttribute("href", "/customers");
    await expect(sidebar.getByRole("link", { name: "Price Requests", exact: true })).toHaveAttribute("href", "/price-requests");
  });

  test("password recovery forms are hidden until a recovery API exists; support is offered", async ({ page }) => {
    await page.goto(`${API}/forgot-password`);
    await expect(page.locator("[data-recovery-unavailable]")).toBeVisible();
    await expect(page.locator("form")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Contact Royal Vacation to reset your password" })).toHaveAttribute("href", "/contact");
  });

  test("sign-in explains email, password, company ID and the first-time code", async ({ page }) => {
    await page.goto(`${API}/login`);
    await expect(page.getByText(/email, password and company ID/)).toBeVisible();
    await expect(page.getByText(/one-time code/)).toBeVisible();
  });

  test("customer form marks the required fields the validation enforces", async ({ page }) => {
    await signedIn(page);
    await page.route("https://api.royal.test/api/v1/b2b/customers*", (route) => route.fulfill({ headers: cors, json: { current_page: 1, data: [], last_page: 1, per_page: 20, total: 0 } }));
    await page.goto(`${API}/customers`);
    await page.getByRole("button", { name: "Add customer" }).click();
    const form = page.locator("[data-new-customer]");
    await expect(form.locator("[data-required-note]")).toContainText("email or a phone number");
    await expect(form.getByLabel(/First name/)).toHaveAttribute("aria-required", "true");
    await expect(form.getByLabel(/Last name/)).toHaveAttribute("aria-required", "true");
    await expect(form.getByLabel("Email")).not.toHaveAttribute("aria-required", "true");
  });

  for (const [locale, width] of [["en", 320], ["ar", 390], ["en", 430]] as const) {
    test(`${locale} ${width}px: phone form fields use 16px text and pages fit`, async ({ page }) => {
      await page.setViewportSize({ width, height: 850 });
      await signedIn(page, locale);
      await page.goto(`${API}/`);
      const size = await page.locator("#check-in").evaluate((el) => getComputedStyle(el).fontSize);
      expect(parseFloat(size)).toBeGreaterThanOrEqual(16);
      for (const path of ["/", "/wallet", "/bookings?view=incomplete", `/hotels/rooms/4242?${stay}`]) {
        await page.goto(`${API}${path}`);
        await expect(page.locator("main")).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBeLessThanOrEqual(0);
      }
    });
  }
});

test.describe("demo build pages", () => {
  test("support number is shown in international format; the WhatsApp link is unchanged", async ({ page }) => {
    await visit(page, "/contact");
    await expect(page.locator('main a[href="https://wa.me/201070724143"]')).not.toHaveCount(0);
    await expect(page.locator("main")).toContainText("+20 107 072 4143");
    await expect(page.locator("main")).not.toContainText("+20 0107");
  });

  test("contact calling codes are searchable and start with the region's countries", async ({ page }) => {
    await visit(page, "/contact");
    const input = page.locator("#enquiry-phone-country");
    await input.click();
    const options = page.locator("#enquiry-phone-country-listbox [role=option]");
    await expect(options.first()).toContainText("Egypt (+20)");
    await input.fill("Saudi");
    await expect(options.first()).toContainText("Saudi Arabia (+966)");
  });

  test("car rental and group quotation date pickers follow their existing rules", async ({ page }) => {
    const today = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
    await visit(page, "/car-rental");
    const pickup = page.locator('form#rental-search-form input[type=date]').first();
    await expect(pickup).toHaveAttribute("min", today);
    await visit(page, "/group-quotation");
    await expect(page.locator("#enquiry-start")).toHaveAttribute("min", today);
    await page.locator("#enquiry-start").fill("2031-03-10");
    await expect(page.locator("#enquiry-end")).toHaveAttribute("min", "2031-03-10"); // end may equal departure
  });
});
