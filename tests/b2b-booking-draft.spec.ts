import { expect, test, type Page, type Request } from "@playwright/test";
import { guestSlots, isIdempotencyKey, newIdempotencyKey } from "../src/features/hotels/api/b2b-booking-draft";

/*
 * Booking draft and confirmation after a confirmed price check, against MOCKED replies that follow the
 * API release of 2026-11-25: draft body {review_token, customer_id | customer, contact_email,
 * contact_phone, guests[{first_name, last_name, guest_type, room_index, age?, gender?, is_lead,
 * nationality_code?}]} with an Idempotency-Key; then POST /bookings/{id}/confirm {accept_price: true}
 * and GET /bookings/{id}/status. The build on port 4176 calls api.royal.test; no request reaches
 * staging, and nothing is booked or charged.
 */
const APP = "http://127.0.0.1:4176";
const COMPANY = "8f14e45f-ceea-467a-9575-3c4b1f0b5c1a";
const TOKEN = "12|mocked-sanctum-token";
const REVIEW = "c".repeat(48);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, X-Locale, Idempotency-Key", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Expose-Headers": "Retry-After" };
const ROOMS = [{ adults: 2, childAges: [] }, { adults: 1, childAges: [7] }];
const roomsUrl = (rooms = ROOMS) => `${APP}/hotels/rooms/8675779?${new URLSearchParams({ destination: "dubai", nationality: "EG", checkIn: "2030-12-10", checkOut: "2030-12-12", rooms: JSON.stringify(rooms) })}`;
const profile = { message: "ok", data: { user: { id: 7, name: "Laila Hassan", email: "laila@example.com" }, company: { id: COMPANY, name: "Nile Gate Tours", legal_name: "Nile Gate Tours LLC", display_name: "Nile Gate Tours", status: "approved", account_currency: "USD", preferred_locale: "en", country_code: "EG", city: "Alexandria", address: "1 Corniche Road", business_type: "travel_agency", registration_no: "CR-1", tax_no: null, employee_count: 12 }, membership: { role_code: "company_admin", status: "active" } } };
const price = { verified: true, selling_price: "108.15", agency_purchase_price: "103.00", currency: "USD", price_on_request: false };
type Reply = { status?: number; json?: unknown; abort?: boolean; headers?: Record<string, string>; delay?: Promise<void> };
const CUSTOMER = "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d";
/** The company's customers (GET /b2b/customers): one fictional customer. */
const customers = { current_page: 1, data: [{ id: CUSTOMER, first_name: "Nour", last_name: "Adel", email: "nour@example.test", phone: null, created_at: "2030-11-01T10:00:00+00:00", updated_at: "2030-11-01T10:00:00+00:00" }], last_page: 1, per_page: 20, total: 1 };

type Handler = (request: Request, call: number) => Reply;
async function mockFlow(page: Page, draft: Handler, options: { prebook?: Record<string, unknown>; locale?: "en" | "ar"; confirm?: Handler; status?: Handler; finance?: Handler } = {}) {
  const calls: Record<"rooms" | "draft" | "confirm" | "status" | "finance", Request[]> = { rooms: [], draft: [], confirm: [], status: [], finance: [] };
  await page.addInitScript(({ token, companyId, locale }) => {
    if (!sessionStorage.getItem("royal-travel.b2b-session.v1")) sessionStorage.setItem("royal-travel.b2b-session.v1", JSON.stringify({ token, expiresAt: Date.now() + 3_600_000, companyId }));
    localStorage.setItem("royal-vacation.locale", locale);
  }, { token: TOKEN, companyId: COMPANY, locale: options.locale ?? "en" });
  await page.route("https://api.royal.test/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const path = new URL(request.url()).pathname;
    if (path === "/api/v1/b2b/me") return route.fulfill({ headers: cors, json: profile });
    if (path === "/api/v1/foundation-check") return route.fulfill({ headers: cors, json: { locale: "en", direction: "ltr" } });
    if (path.endsWith("/rooms")) { calls.rooms.push(request); return route.fulfill({ headers: cors, json: { hotel_hid: 8675779, rooms_token: "a".repeat(48), expires_in_seconds: 900, total: 1, rooms: [{ rate_index: 0, room_name: "Test Room", bedding_type: "double", meal_name: "breakfast", has_breakfast: true, price, selectable: true, booking_enabled: false }] } }); }
    if (path.endsWith("/rooms/select")) return route.fulfill({ headers: cors, json: { selection_token: "b".repeat(48), expires_in_seconds: 600, room_name: "Test Room", price, next_step: "prebook" } });
    if (path.endsWith("/rooms/prebook")) return route.fulfill({ headers: cors, json: { status: "rechecked", review_token: REVIEW, expires_in_seconds: 600, price_changed: false, review_required: true, room_name: "Test Room", price, booking_enabled: false, message: "Room rechecked; review required.", ...options.prebook } });
    if (path === "/api/v1/b2b/customers" && request.method() === "GET") return route.fulfill({ headers: cors, json: customers });
    for (const [key, pattern] of [["confirm", /^\/api\/v1\/b2b\/bookings\/[^/]+\/confirm$/], ["status", /^\/api\/v1\/b2b\/bookings\/[^/]+\/status$/], ["finance", /^\/api\/v1\/b2b\/finance$/]] as const) {
      const handler = options[key];
      if (handler && pattern.test(path)) {
        calls[key].push(request);
        const reply = handler(request, calls[key].length);
        if (reply.delay) await reply.delay;
        if (reply.abort) return route.abort("connectionrefused");
        return route.fulfill({ status: reply.status ?? 200, headers: { ...cors, ...reply.headers }, json: reply.json ?? {} });
      }
    }
    if (path === "/api/v1/b2b/bookings/draft") {
      calls.draft.push(request);
      const reply = draft(request, calls.draft.length);
      if (reply.delay) await reply.delay;
      if (reply.abort) return route.abort("connectionrefused");
      return route.fulfill({ status: reply.status ?? 201, headers: { ...cors, ...reply.headers }, json: reply.json ?? {} });
    }
    return route.fulfill({ status: 500, headers: cors, json: {} });
  });
  return calls;
}

const created: Reply = { status: 201, json: { customer_id: CUSTOMER, order_id: "o-1", order_no: "ORD-TEST0000000001", booking_id: "b6f0c1d2-0000-4000-8000-000000000001", booking_no: "HTL-TEST0000000001", status: "draft", currency: "USD", customer_total: "108.15", agency_purchase_price: "103.00", next_step: "confirm", payment_collected: false, supplier_booking_created: false } };
const BOOKING = "b6f0c1d2-0000-4000-8000-000000000001";
const state = (status: string, confirmation_state: string | null, confirmed_at: string | null = null): Reply => ({ json: { booking_id: BOOKING, status, confirmation_state, confirmed_at } });
/** Rooms → price check → step 1 (Summary) → step 2 (Guest details). Nothing is drafted on the way. */
async function toReview(page: Page, rooms = ROOMS) {
  await page.goto(roomsUrl(rooms));
  await page.getByRole("button", { name: "Select room" }).click();
  await page.getByRole("button", { name: "Continue to guest details" }).click();
  await expect(page.locator("[data-draft-state=form]")).toBeVisible();
}
const continueFromGuests = (page: Page) => page.getByRole("button", { name: /^(Continue to cancellation policy|المتابعة إلى سياسة الإلغاء)$/ }).click();
/** Step 2 → step 3 (Cancellation policy) → step 4 (Payment details), where the draft is created. */
async function toPayment(page: Page) {
  await continueFromGuests(page);
  await page.getByRole("button", { name: /^(Continue to Payment Details|المتابعة إلى بيانات الدفع)$/ }).click();
  await expect(page.locator("[data-booking-step=payment]")).toBeVisible();
}
async function chooseCustomer(page: Page) {
  await page.locator("[data-customer-picker]").getByRole("radio", { name: "Nour Adel" }).check();
}
async function fillContact(page: Page) {
  await page.getByLabel("Contact phone").fill("+201000000001");
}
async function fillNames(page: Page, names: [string, string][]) {
  await chooseCustomer(page);
  await fillContact(page);
  const rows = page.locator("[data-guest]");
  for (let i = 0; i < names.length; i++) {
    await rows.nth(i).getByLabel("First name").fill(names[i][0]);
    await rows.nth(i).getByLabel("Last name").fill(names[i][1]);
  }
}
const FOUR: [string, string][] = [["Laila", "Hassan"], ["Omar", "Hassan"], ["Mona", "Said"], ["Youssef", "Said"]];
const confirmedWords = /Booking Confirmed|Payment Successful|Reservation Confirmed/i;

test.describe("booking draft contract (no browser)", () => {
  test("guests follow the occupancy: adults then children per room; keys are valid and unique", () => {
    expect(guestSlots([{ adults: 2, children: [] }, { adults: 1, children: [7] }]).map((slot) => `${slot.room}${slot.type[0]}${slot.number}`)).toEqual(["1a1", "1a2", "2a1", "2c1"]);
    const keys = new Set(Array.from({ length: 50 }, newIdempotencyKey));
    expect(keys.size).toBe(50);
    for (const key of keys) expect(isIdempotencyKey(key)).toBe(true);
    expect(isIdempotencyKey("short")).toBe(false);
    expect(isIdempotencyKey("has spaces in it here!!")).toBe(false);
    expect(isIdempotencyKey("a".repeat(129))).toBe(false);
  });
});

test.describe("booking draft (mocked API)", () => {
  test("creates a draft with the review token, every guest and one lead, and never claims a reservation", async ({ page }) => {
    const calls = await mockFlow(page, () => created);
    await toReview(page);
    // Adults-only rooms are sent with an empty children list.
    expect(calls.rooms[0].postDataJSON().guests).toEqual([{ adults: 2, children: [] }, { adults: 1, children: [7] }]);
    await expect(page.locator("[data-guest]")).toHaveCount(4);
    await fillNames(page, FOUR);
    await toPayment(page);
    await page.getByRole("button", { name: "Create booking draft" }).click();
    await expect(page.getByRole("heading", { name: "Booking Draft Created" })).toBeFocused();
    await expect(page.getByText("A draft is not a confirmed reservation, and no payment has been taken.")).toBeVisible();
    await expect(page.getByText("HTL-TEST0000000001")).toBeVisible();
    await expect(page.getByRole("link", { name: "View booking" })).toHaveAttribute("href", "/bookings/b6f0c1d2-0000-4000-8000-000000000001");
    await expect(page.locator("body")).not.toContainText(confirmedWords);
    expect(calls.draft).toHaveLength(1);
    const request = calls.draft[0];
    expect(request.postDataJSON()).toEqual({
      review_token: REVIEW,
      customer_id: CUSTOMER,
      contact_email: "laila@example.com",
      contact_phone: "+201000000001",
      guests: [
        { first_name: "Laila", last_name: "Hassan", guest_type: "adult", room_index: 0, is_lead: true, nationality_code: "EG" },
        { first_name: "Omar", last_name: "Hassan", guest_type: "adult", room_index: 0, is_lead: false, nationality_code: "EG" },
        { first_name: "Mona", last_name: "Said", guest_type: "adult", room_index: 1, is_lead: false, nationality_code: "EG" },
        { first_name: "Youssef", last_name: "Said", guest_type: "child", room_index: 1, age: 7, is_lead: false, nationality_code: "EG" },
      ],
    });
    // The draft is followed by the confirmation step: both prices, clearly told apart; nothing charged yet.
    const panel = page.locator("[data-confirm-view=draft]");
    await expect(panel.locator("[data-price=agency]")).toContainText("USD 103.00");
    await expect(panel.locator("[data-price=agency]")).toContainText("charged to your wallet");
    await expect(panel.locator("[data-price=customer]")).toContainText("USD 108.15");
    await expect(panel.getByRole("button", { name: "Confirm booking" })).toBeDisabled();
    expect(isIdempotencyKey(request.headers()["idempotency-key"])).toBe(true);
    expect(request.headers()["authorization"]).toBe(`Bearer ${TOKEN}`);
    expect(JSON.stringify(request.postDataJSON())).not.toContain("company_id");
  });

  test("the lead guest can be any adult, and exactly one is sent", async ({ page }) => {
    const calls = await mockFlow(page, () => created);
    await toReview(page);
    await fillNames(page, FOUR);
    await page.locator("[data-guest]").nth(2).getByLabel("Lead guest").check();
    await toPayment(page);
    await page.getByRole("button", { name: "Create booking draft" }).click();
    await expect(page.getByRole("heading", { name: "Booking Draft Created" })).toBeVisible();
    expect(calls.draft[0].postDataJSON().guests.map((guest: { is_lead: boolean }) => guest.is_lead)).toEqual([false, false, true, false]);
    await expect(page.locator("[data-guest=r1-c0]").getByLabel("Lead guest")).toHaveCount(0);
  });

  test("a customer is required: an existing one is chosen, or a new one is sent with the draft", async ({ page }) => {
    const calls = await mockFlow(page, () => created);
    await toReview(page);
    const rows = page.locator("[data-guest]");
    for (let i = 0; i < 4; i++) { await rows.nth(i).getByLabel("First name").fill(FOUR[i][0]); await rows.nth(i).getByLabel("Last name").fill(FOUR[i][1]); }
    await fillContact(page);
    // Checked locally when leaving the guest details: nothing is sent.
    await continueFromGuests(page);
    await expect(page.getByText("Choose a customer.")).toBeVisible();
    expect(calls.draft).toHaveLength(0);

    const picker = page.locator("[data-customer-picker]");
    await picker.getByRole("radio", { name: "New customer" }).check();
    await picker.getByLabel("First name").fill("Hana");
    await picker.getByLabel("Last name").fill("Fouad");
    await continueFromGuests(page);
    await expect(page.getByText("Enter an email or a phone number.")).toBeVisible();
    await picker.getByLabel("Phone").fill("+201001234567");
    await toPayment(page);
    await page.getByRole("button", { name: "Create booking draft" }).click();
    await expect(page.getByRole("heading", { name: "Booking Draft Created" })).toBeVisible();
    const body = calls.draft[0].postDataJSON();
    expect(body.customer).toEqual({ first_name: "Hana", last_name: "Fouad", phone: "+201001234567" });
    expect(body).not.toHaveProperty("customer_id");
  });

  test("missing names are flagged before anything is sent", async ({ page }) => {
    const calls = await mockFlow(page, () => created);
    await toReview(page);
    await fillNames(page, [["Laila", ""]]);
    await continueFromGuests(page);
    await expect(page.locator("[data-booking-step=guests]")).toBeVisible();
    await expect(page.getByText("Enter the last name.").first()).toBeVisible();
    await expect(page.getByText("Enter the first name.").first()).toBeVisible();
    expect(calls.draft).toHaveLength(0);
  });

  test("a double click sends one request", async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const calls = await mockFlow(page, () => ({ ...created, delay: held }));
    await toReview(page);
    await fillNames(page, FOUR);
    await toPayment(page);
    await page.getByRole("button", { name: "Create booking draft" }).dblclick();
    await expect(page.getByRole("button", { name: "Creating draft…" })).toBeDisabled();
    release();
    await expect(page.getByRole("heading", { name: "Booking Draft Created" })).toBeVisible();
    expect(calls.draft).toHaveLength(1);
  });

  test("retrying the same submission reuses the Idempotency-Key; changing it uses a new one", async ({ page }) => {
    const calls = await mockFlow(page, (_, call) => (call <= 2 ? { abort: true } : call === 3 ? { status: 503, json: { message: "x" } } : created));
    await toReview(page);
    await fillNames(page, FOUR);
    await toPayment(page);
    const button = page.getByRole("button", { name: "Create booking draft" });
    await button.click();
    await expect(page.locator("[data-draft-failure=network]")).toBeVisible();
    await button.click();
    await expect.poll(() => calls.draft.length).toBe(2);
    await expect(page.locator("[data-draft-failure=network]")).toBeVisible();
    const key = (n: number) => calls.draft[n].headers()["idempotency-key"];
    expect(key(1)).toBe(key(0));
    // A changed submission is a new request with a new key.
    await page.getByRole("list", { name: "Booking progress" }).getByRole("button", { name: /Guest details/ }).click();
    await page.locator("[data-guest]").nth(1).getByLabel("First name").fill("Omar Ali");
    await toPayment(page);
    await button.click();
    await expect(page.locator("[data-draft-failure=unavailable]")).toBeVisible();
    expect(key(2)).not.toBe(key(1));
    await button.click();
    await expect(page.getByRole("heading", { name: "Booking Draft Created" })).toBeVisible();
    expect(key(3)).toBe(key(2));
    expect(calls.draft).toHaveLength(4);
  });

  test("410: the review expired; Refresh rates starts again with a new rooms request", async ({ page }) => {
    const calls = await mockFlow(page, () => ({ status: 410, json: { message: "Review expired. Please prebook again." } }));
    await toReview(page);
    await fillNames(page, FOUR);
    await toPayment(page);
    await page.getByRole("button", { name: "Create booking draft" }).click();
    await expect(page.locator("[data-draft-failure=expired]")).toHaveText("This price check has expired. Refresh the rates and choose the room again.");
    await expect(page.getByText("Review expired. Please prebook again.")).toHaveCount(0);
    await page.locator("[data-booking-step=payment]").getByRole("button", { name: "Refresh rates" }).click();
    await expect.poll(() => calls.rooms.length).toBe(2);
    await expect(page.locator("body")).not.toContainText(confirmedWords);
  });

  for (const [status, kind, text] of [
    [409, "conflict", "This room can't be drafted anymore. Choose another room or refresh the rates."],
    [403, "forbidden", "Your account can't create booking drafts."],
    [500, "unavailable", "Booking drafts can't be created right now. Please try again later."],
  ] as const) {
    test(`${status}: its own message, no server wording`, async ({ page }) => {
      await mockFlow(page, () => ({ status, json: { message: "SERVER WORDING" } }));
      await toReview(page);
      await fillNames(page, FOUR);
      await toPayment(page);
      await page.getByRole("button", { name: "Create booking draft" }).click();
      await expect(page.locator(`[data-draft-failure=${kind}]`)).toHaveText(text);
      await expect(page.getByText("SERVER WORDING")).toHaveCount(0);
    });
  }

  test("422: guest field errors are shown next to the right guest", async ({ page }) => {
    await mockFlow(page, () => ({ status: 422, json: { message: "x", errors: { "guests.1.first_name": ["bad"], "guests.3.last_name": ["bad"] } } }));
    await toReview(page);
    await fillNames(page, FOUR);
    await toPayment(page);
    await page.getByRole("button", { name: "Create booking draft" }).click();
    await expect(page.locator("[data-draft-failure=validation]")).toBeVisible();
    await expect(page.locator("[data-guest=r0-a1]").getByText("Check this name.")).toBeVisible();
    await expect(page.locator("[data-guest=r1-c0]").getByText("Check this name.")).toBeVisible();
    await expect(page.locator("[data-guest=r0-a0] .field-error")).toHaveCount(0);
  });

  test("429 with a readable Retry-After counts down and blocks; without it, no countdown", async ({ page }) => {
    const calls = await mockFlow(page, (_, call) => ({ status: 429, json: { message: "Too Many Attempts." }, headers: (call === 1 ? { "Retry-After": "45" } : { "Access-Control-Expose-Headers": "" }) as Record<string, string> }));
    await toReview(page);
    await fillNames(page, FOUR);
    await toPayment(page);
    await page.getByRole("button", { name: "Create booking draft" }).click();
    await expect(page.locator("[data-draft-failure=rate_limited]")).toContainText(/You can try again in 0:4[45]/);
    await expect(page.getByRole("button", { name: "Create booking draft" })).toBeDisabled();
    expect(calls.draft).toHaveLength(1);
  });

  test("401 ends the session and returns to sign-in", async ({ page }) => {
    await mockFlow(page, () => ({ status: 401, json: { message: "Unauthenticated." } }));
    await toReview(page);
    await fillNames(page, FOUR);
    await toPayment(page);
    await page.getByRole("button", { name: "Create booking draft" }).click();
    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(() => sessionStorage.getItem("royal-travel.b2b-session.v1"))).toBeNull();
  });

  test("a changed price must be accepted before guest details appear", async ({ page }) => {
    await mockFlow(page, () => created, { prebook: { price_changed: true, price: { ...price, selling_price: "120.00" } } });
    await page.goto(roomsUrl());
    await page.getByRole("button", { name: "Select room" }).click();
    await expect(page.getByRole("heading", { name: "The price has changed" })).toBeVisible();
    await expect(page.locator("[data-draft-state=form]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Continue to guest details" })).toBeDisabled();
    await page.getByLabel(/I accept the new price/).check();
    await page.getByRole("button", { name: "Accept new price" }).click();
    await page.getByRole("button", { name: "Continue to guest details" }).click();
    await expect(page.locator("[data-draft-state=form]")).toBeVisible();
  });

  test("Arabic and phone width: right to left, fits, and the draft message is in Arabic", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await mockFlow(page, () => created, { locale: "ar" });
    await page.goto(roomsUrl([{ adults: 1, childAges: [] }]));
    await page.getByRole("button", { name: "اختيار الغرفة" }).click();
    await page.getByRole("button", { name: "المتابعة إلى بيانات الضيوف" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.locator("[data-customer-picker]").getByRole("radio", { name: "Nour Adel" }).check();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await page.getByLabel("هاتف التواصل").fill("+201000000001");
    const row = page.locator("[data-guest]").first();
    await row.getByLabel("الاسم الأول").fill("ليلى");
    await row.getByLabel("اسم العائلة").fill("حسن");
    await toPayment(page);
    await page.getByRole("button", { name: "إنشاء مسودة حجز" }).click();
    await expect(page.getByRole("heading", { name: "تم إنشاء مسودة الحجز" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
});

test.describe("booking confirmation (mocked API)", () => {
  async function toDraft(page: Page) {
    await toReview(page);
    await fillNames(page, FOUR);
    await toPayment(page);
    await page.getByRole("button", { name: "Create booking draft" }).click();
    await expect(page.locator("[data-confirm-view=draft]")).toBeVisible();
  }
  const accept = (page: Page) => page.getByLabel(/I accept the agency purchase price of USD 103\.00/).check();

  test("the price must be accepted; a double click sends one confirm, and only a confirmed reply says confirmed", async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const calls = await mockFlow(page, () => created, { confirm: () => ({ ...state("confirmed", "confirmed", "2030-12-01T10:00:00.000000Z"), delay: held }) });
    await toDraft(page);
    const button = page.getByRole("button", { name: "Confirm booking" });
    await expect(button).toBeDisabled();
    await accept(page);
    await button.dblclick();
    await expect(page.getByRole("button", { name: "Confirming…" })).toBeDisabled();
    release();
    await expect(page.locator("[data-confirm-view=confirmed]")).toContainText("Booking confirmed");
    expect(calls.confirm).toHaveLength(1);
    expect(new URL(calls.confirm[0].url()).pathname).toBe(`/api/v1/b2b/bookings/${BOOKING}/confirm`);
    expect(calls.confirm[0].postDataJSON()).toEqual({ accept_price: true });
    expect(calls.confirm[0].headers()["authorization"]).toBe(`Bearer ${TOKEN}`);
  });

  test("200 with processing isn't shown as confirmed; the status is polled until the backend confirms", async ({ page }) => {
    const calls = await mockFlow(page, () => created, { confirm: () => state("draft", "processing"), status: () => state("confirmed", "confirmed", "2030-12-01T10:00:00.000000Z") });
    await toDraft(page);
    await accept(page);
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.locator("[data-confirm-view=processing]")).toContainText("Supplier processing");
    await expect(page.locator("body")).not.toContainText(confirmedWords);
    await expect(page.locator("[data-confirm-view=confirmed]")).toBeVisible({ timeout: 15000 });
    expect(calls.status.length).toBeGreaterThanOrEqual(1);
    expect(calls.confirm).toHaveLength(1);
  });

  test("an unknown outcome is never resent automatically: the status is read; Check with supplier reconciles once", async ({ page }) => {
    const calls = await mockFlow(page, () => created, { confirm: (_, call) => (call === 1 ? { abort: true } : state("draft", "processing")), status: () => state("draft", "finish_unknown") });
    await toDraft(page);
    await accept(page);
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.locator("[data-confirm-failure=uncertain]")).toBeVisible();
    await expect(page.locator("[data-confirm-view=uncertain]")).toContainText("Outcome not confirmed yet");
    expect(calls.confirm).toHaveLength(1);
    expect(calls.status).toHaveLength(1);
    await expect(page.getByRole("button", { name: "Confirm booking" })).toHaveCount(0);
    await page.getByRole("button", { name: "Check with supplier" }).click();
    await expect(page.locator("[data-confirm-view=processing]")).toBeVisible();
    expect(calls.confirm).toHaveLength(2);
  });

  for (const [name, reply, failure, text] of [
    ["insufficient wallet (422 errors.wallet)", { status: 422, json: { message: "x", errors: { wallet: ["Insufficient"] } } }, "insufficient_funds", "doesn't have enough available balance"],
    ["sandbox disabled (403)", { status: 403, json: { message: "SERVER WORDING" } }, "disabled", "isn't available for your account or on this environment"],
    ["expired prebook (410)", { status: 410, json: { message: "SERVER WORDING" } }, "expired", "has expired"],
  ] as const) {
    test(`${name}: its own message, nothing shown as confirmed`, async ({ page }) => {
      const calls = await mockFlow(page, () => created, { confirm: () => reply, status: () => state("draft", null) });
      await toDraft(page);
      await accept(page);
      await page.getByRole("button", { name: "Confirm booking" }).click();
      await expect(page.locator(`[data-confirm-failure=${failure}]`)).toContainText(text);
      await expect(page.getByText("SERVER WORDING")).toHaveCount(0);
      await expect(page.locator("body")).not.toContainText(confirmedWords);
      expect(calls.confirm).toHaveLength(1);
      if (failure === "insufficient_funds") await expect(page.locator("[data-confirm-failure]").getByRole("link", { name: "View wallet" })).toHaveAttribute("href", "/wallet");
    });
  }

  test("409 (already confirming or a legacy draft): the status is read instead of confirming again", async ({ page }) => {
    const calls = await mockFlow(page, () => created, { confirm: () => ({ status: 409, json: { message: "x" } }), status: () => state("draft", "form_unknown") });
    await toDraft(page);
    await accept(page);
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.locator("[data-confirm-failure=conflict]")).toBeVisible();
    await expect(page.locator("[data-confirm-view=manual_review]")).toContainText("Manual review");
    expect(calls.confirm).toHaveLength(1);
    expect(calls.status).toHaveLength(1);
  });

  test("non-USD drafts can't be confirmed here", async ({ page }) => {
    await mockFlow(page, () => ({ status: 201, json: { ...(created.json as object), currency: "EGP" } }));
    await toReview(page);
    await fillNames(page, FOUR);
    await toPayment(page);
    await page.getByRole("button", { name: "Create booking draft" }).click();
    await expect(page.locator("[data-confirm-blocked=currency]")).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm booking" })).toHaveCount(0);
  });

  test("Arabic at 375px: the confirmation step is right to left and fits", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await mockFlow(page, () => created, { locale: "ar", confirm: () => state("draft", "finish_unknown") });
    await page.goto(roomsUrl([{ adults: 1, childAges: [] }]));
    await page.getByRole("button", { name: "اختيار الغرفة" }).click();
    await page.getByRole("button", { name: "المتابعة إلى بيانات الضيوف" }).click();
    await page.locator("[data-customer-picker]").getByRole("radio", { name: "Nour Adel" }).check();
    await page.getByLabel("هاتف التواصل").fill("+201000000001");
    const row = page.locator("[data-guest]").first();
    await row.getByLabel("الاسم الأول").fill("Laila");
    await row.getByLabel("اسم العائلة").fill("Hassan");
    await toPayment(page);
    await page.getByRole("button", { name: "إنشاء مسودة حجز" }).click();
    await expect(page.locator("[data-price=agency]")).toContainText("سعر شراء الوكالة");
    await page.getByLabel(/أوافق على سعر شراء الوكالة/).check();
    await page.getByRole("button", { name: "تأكيد الحجز" }).click();
    await expect(page.locator("[data-confirm-view=uncertain]")).toContainText("لم تتأكد النتيجة بعد");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
});
