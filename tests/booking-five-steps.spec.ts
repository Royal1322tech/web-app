import { expect, test, type Page, type Request } from "@playwright/test";
import { visit } from "./helpers/demo-login";
import { openHeaderTools, selectLanguage } from "./helpers/header";

/*
 * The five booking steps after a price check (Summary, Guest details, Cancellation policy, Payment
 * details, Result), against MOCKED replies on the API build (port 4176 calls api.royal.test only).
 * Moving between steps sends nothing; the draft is created only by "Create booking draft", the wallet
 * is charged only by an accepted confirmation, and Result shows the backend's own state.
 */
const APP = "http://127.0.0.1:4176";
const COMPANY = "8f14e45f-ceea-467a-9575-3c4b1f0b5c1a";
const TOKEN = "12|mocked-sanctum-token";
const BOOKING = "b6f0c1d2-0000-4000-8000-000000000001";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, X-Locale, Idempotency-Key", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const profile = { message: "ok", data: { user: { id: 7, name: "Laila Hassan", email: "laila@example.com" }, company: { id: COMPANY, name: "Nile Gate Tours", legal_name: "Nile Gate Tours LLC", display_name: "Nile Gate Tours", status: "approved", account_currency: "USD", preferred_locale: "en", country_code: "EG", city: "Alexandria", address: "1 Corniche Road", business_type: "travel_agency", registration_no: "CR-1", tax_no: null, employee_count: 12 }, membership: { role_code: "company_admin", status: "active" } } };
const price = { verified: true, selling_price: "108.15", agency_purchase_price: "103.00", currency: "USD", price_on_request: false };
const customers = { current_page: 1, data: [{ id: "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d", first_name: "Nour", last_name: "Adel", email: "nour@example.test", phone: null, created_at: "2030-11-01T10:00:00+00:00", updated_at: "2030-11-01T10:00:00+00:00" }], last_page: 1, per_page: 20, total: 1 };
const draft = { customer_id: customers.data[0].id, order_id: "o-1", order_no: "ORD-TEST0000000001", booking_id: BOOKING, booking_no: "HTL-TEST0000000001", status: "draft", currency: "USD", customer_total: "108.15", agency_purchase_price: "103.00", next_step: "confirm", payment_collected: false, supplier_booking_created: false };
const roomsUrl = `${APP}/hotels/rooms/8675779?${new URLSearchParams({ destination: "dubai", nationality: "EG", checkIn: "2030-12-10", checkOut: "2030-12-12", rooms: JSON.stringify([{ adults: 1, childAges: [] }]) })}`;
const confirmedWords = /Booking Confirmed|Payment Successful|Reservation Confirmed/i;
type Calls = Record<"rooms" | "select" | "prebook" | "customers" | "draft" | "confirm" | "status", Request[]>;

async function mock(page: Page, options: { locale?: "en" | "ar"; confirm?: () => unknown; status?: () => unknown } = {}) {
  const calls: Calls = { rooms: [], select: [], prebook: [], customers: [], draft: [], confirm: [], status: [] };
  const unexpected: string[] = [];
  await page.addInitScript(({ token, companyId, locale }) => {
    if (!sessionStorage.getItem("royal-travel.b2b-session.v1")) sessionStorage.setItem("royal-travel.b2b-session.v1", JSON.stringify({ token, expiresAt: Date.now() + 3_600_000, companyId }));
    localStorage.setItem("royal-vacation.locale", locale);
  }, { token: TOKEN, companyId: COMPANY, locale: options.locale ?? "en" });
  await page.route("https://api.royal.test/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const path = new URL(request.url()).pathname;
    const reply = (json: unknown, status = 200) => route.fulfill({ status, headers: cors, json });
    if (path === "/api/v1/b2b/me") return reply(profile);
    if (path === "/api/v1/foundation-check") return reply({ locale: "en", direction: "ltr" });
    if (path.endsWith("/rooms")) { calls.rooms.push(request); return reply({ hotel_hid: 8675779, rooms_token: "a".repeat(48), expires_in_seconds: 900, total: 1, rooms: [{ rate_index: 0, room_name: "Test Room", bedding_type: "double", meal_name: "breakfast", has_breakfast: true, price, selectable: true, booking_enabled: false }] }); }
    if (path.endsWith("/rooms/select")) { calls.select.push(request); return reply({ selection_token: "b".repeat(48), expires_in_seconds: 600, room_name: "Test Room", price, next_step: "prebook" }); }
    if (path.endsWith("/rooms/prebook")) { calls.prebook.push(request); return reply({ status: "rechecked", review_token: "c".repeat(48), expires_in_seconds: 600, price_changed: false, review_required: true, room_name: "Test Room", price, booking_enabled: false }); }
    if (path === "/api/v1/b2b/customers" && request.method() === "GET") { calls.customers.push(request); return reply(customers); }
    if (path === "/api/v1/b2b/bookings/draft") { calls.draft.push(request); return reply(draft, 201); }
    if (/\/bookings\/[^/]+\/confirm$/.test(path) && options.confirm) { calls.confirm.push(request); return reply(options.confirm()); }
    if (/\/bookings\/[^/]+\/status$/.test(path) && options.status) { calls.status.push(request); return reply(options.status()); }
    unexpected.push(`${request.method()} ${path}`);
    return reply({}, 500);
  });
  return { calls, unexpected };
}

const progress = (page: Page) => page.getByRole("list", { name: /^(Booking progress|مراحل الحجز)$/ });
const current = (page: Page) => progress(page).locator("[aria-current=step]");
const button = (page: Page, en: string, ar: string) => page.getByRole("button", { name: new RegExp(`^(${en}|${ar})$`) });
const toGuests = (page: Page) => button(page, "Continue to guest details", "المتابعة إلى بيانات الضيوف").click();
const toPolicy = (page: Page) => button(page, "Continue to cancellation policy", "المتابعة إلى سياسة الإلغاء").click();
const toPayment = (page: Page) => button(page, "Continue to Payment Details", "المتابعة إلى بيانات الدفع").click();
async function fillGuest(page: Page) {
  await page.locator("[data-customer-picker]").getByRole("radio", { name: "Nour Adel" }).check();
  await page.locator("[data-draft-contact] input[type=tel]").fill("+201000000001");
  const row = page.locator("[data-guest]").first();
  await row.locator("input").nth(0).fill("Laila");
  await row.locator("input").nth(1).fill("Hassan");
}
const state = (status: string, confirmation_state: string | null, confirmed_at: string | null = null) => ({ booking_id: BOOKING, status, confirmation_state, confirmed_at });

test.describe("five booking steps (mocked API)", () => {
  test("the steps run in order, keep what was entered, and send nothing until Create booking draft", async ({ page }) => {
    const { calls, unexpected } = await mock(page, { confirm: () => state("draft", "processing"), status: () => state("confirmed", "confirmed", "2030-12-01T10:00:00.000000Z") });
    await page.goto(roomsUrl);
    await page.getByRole("button", { name: "Select room" }).click();
    await expect(progress(page).locator("li")).toHaveCount(5);
    await expect(current(page)).toContainText("Summary");
    await expect(page.locator("[data-booking-step=summary]")).toContainText("Test Room");
    await expect(page.locator("[data-booking-step=summary] [data-price=confirmed]")).toContainText("USD 108.15");
    const before = { rooms: calls.rooms.length, select: calls.select.length, prebook: calls.prebook.length };

    // 2. Guest details: checked locally; nothing sent.
    await toGuests(page);
    await expect(current(page)).toContainText("Guest details");
    await expect(page.locator("[data-booking-step=guests] h3")).toBeFocused();
    await toPolicy(page);
    await expect(page.getByText("Choose a customer.")).toBeVisible();
    await expect(current(page)).toContainText("Guest details");
    await fillGuest(page);
    await toPolicy(page);

    // 3. Cancellation policy: the API doesn't send one, so none is invented.
    await expect(current(page)).toContainText("Cancellation Policy");
    await expect(page.locator("[data-policy=not-provided]")).toContainText("Not provided for this rate");
    await expect(page.locator("[data-booking-step=policy]")).not.toContainText(/free cancellation|non-refundable|refundable until/i);

    // Back to an earlier step: the details are still there.
    await progress(page).getByRole("button", { name: /Guest details/ }).click();
    await expect(page.locator("[data-guest]").first().locator("input").nth(0)).toHaveValue("Laila");
    await expect(page.locator("[data-customer-picker]").getByRole("radio", { name: "Nour Adel" })).toBeChecked();
    await toPolicy(page);
    await toPayment(page);

    // 4. Payment details: the company wallet (the only method the API supports) and the checked prices.
    await expect(current(page)).toContainText("Payment Details");
    await expect(page.locator("[data-payment-method=wallet]")).toContainText("Company wallet");
    await expect(page.locator("[data-payment-unavailable]")).toBeVisible();
    await expect(page.locator("[data-price=agency-preview]")).toContainText("USD 103.00");
    await expect(page.locator("[data-price=customer-preview]")).toContainText("USD 108.15");
    // Moving through four steps sent nothing new.
    expect(calls.draft).toHaveLength(0);
    expect(calls.confirm).toHaveLength(0);
    expect({ rooms: calls.rooms.length, select: calls.select.length, prebook: calls.prebook.length }).toEqual(before);
    expect(calls.customers).toHaveLength(1);

    await page.getByRole("button", { name: "Create booking draft" }).click();
    await expect(page.getByRole("heading", { name: "Booking Draft Created" })).toBeVisible();
    expect(calls.draft).toHaveLength(1);
    // Once drafted, earlier steps are locked (the draft holds those details).
    await expect(progress(page).getByRole("button")).toHaveCount(0);
    await expect(current(page)).toContainText("Payment Details");
    const confirm = page.getByRole("button", { name: "Confirm booking" });
    await expect(confirm).toBeDisabled();
    expect(calls.confirm).toHaveLength(0);

    // 5. Result: only the backend's state. "Processing" isn't shown as confirmed.
    await page.getByLabel(/I accept the agency purchase price of USD 103\.00/).check();
    await confirm.click();
    await expect(current(page)).toContainText("Result");
    await expect(page.locator("[data-booking-step=result]")).toContainText("05 · RESULT");
    await expect(page.locator("[data-confirm-view=processing]")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(confirmedWords);
    await expect(page.locator("[data-confirm-view=confirmed]")).toContainText("Booking confirmed", { timeout: 15000 });
    expect(calls.confirm).toHaveLength(1);
    expect(unexpected).toEqual([]);
  });

  test("without a confirmation reply, Result never opens", async ({ page }) => {
    await mock(page);
    await page.goto(roomsUrl);
    await page.getByRole("button", { name: "Select room" }).click();
    await toGuests(page);
    await fillGuest(page);
    await toPolicy(page);
    await toPayment(page);
    await page.getByRole("button", { name: "Create booking draft" }).click();
    await expect(page.locator("[data-confirm-view=draft]")).toBeVisible();
    await expect(current(page)).toContainText("Payment Details");
    await expect(progress(page).locator("li").last()).not.toHaveAttribute("aria-current", "step");
  });

  for (const locale of ["en", "ar"] as const) {
    test(`${locale}: every step fits from 320px to 1920px with 44px actions and 16px phone fields`, async ({ page }) => {
      test.setTimeout(120_000);
      await mock(page, { locale });
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto(roomsUrl);
      await button(page, "Select room", "اختيار الغرفة").click();
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      const check = async (name: string) => {
        for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1366, 1440, 1920]) {
          await page.setViewportSize({ width, height: 900 });
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(overflow, `${name} ${width}px`).toBeLessThanOrEqual(0);
          for (const action of await page.locator("[data-booking-stage] :is(.button, button):visible").all()) {
            expect(Math.round((await action.boundingBox())!.height), `${name} ${width}px`).toBeGreaterThanOrEqual(44);
          }
          if (width < 768) for (const field of await page.locator("[data-booking-stage] :is(input:not([type=checkbox]):not([type=radio]), select):visible").all()) await expect(field).toHaveCSS("font-size", "16px");
          // The summary sits beside the steps on wide screens and under them below 1024px.
          const main = (await page.locator("[data-booking-stage] > div > div").first().boundingBox())!;
          const aside = (await page.locator("[data-booking-stage] aside").boundingBox())!;
          if (width >= 1024) expect(aside.y, `${name} ${width}px`).toBeLessThan(main.y + main.height);
          else expect(aside.y, `${name} ${width}px`).toBeGreaterThanOrEqual(main.y + main.height - 1);
        }
      };
      await check("summary");
      await toGuests(page);
      await check("guests");
      await fillGuest(page);
      await toPolicy(page);
      await check("policy");
      await toPayment(page);
      await check("payment");
    });
  }
});

test.describe("Points in the account navigation", () => {
  for (const locale of ["en", "ar"] as const) {
    test(`Points follows Wallet under Finance in the sidebar and the account menu (${locale})`, async ({ page }) => {
      const [wallet, points, finance] = locale === "ar" ? ["المحفظة", "النقاط", "المالية"] : ["Wallet", "Points", "Finance"];
      await visit(page, "/tickets"); // a page with the workspace sidebar
      if (locale === "ar") await selectLanguage(page, "ar");
      for (const width of [1440, 1024, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        const sidebar = page.getByRole("navigation", { name: locale === "ar" ? "التنقل في مساحة العمل" : "Workspace navigation", exact: true });
        const group = sidebar.getByRole("group", { name: finance });
        await expect(group.getByRole("link").nth(0), `${width}px`).toHaveText(wallet);
        await expect(group.getByRole("link").nth(1), `${width}px`).toHaveText(points);
        await expect(group.getByRole("link", { name: points, exact: true })).toHaveAttribute("href", "/points");
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${width}px`).toBeLessThanOrEqual(0);
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      await openHeaderTools(page);
      await page.getByRole("button", { name: locale === "ar" ? "قائمة الحساب" : "Account menu", exact: true }).click();
      const menu = page.getByRole("region", { name: locale === "ar" ? "قائمة الحساب" : "Account menu", exact: true }).getByRole("group", { name: finance });
      await expect(menu.getByRole("link").nth(0)).toHaveText(wallet);
      await expect(menu.getByRole("link").nth(1)).toHaveText(points);
      await menu.getByRole("link", { name: points, exact: true }).click();
      await expect(page).toHaveURL(/\/points$/);
      await expect(page.locator("h1")).toBeVisible();
    });
  }
});
