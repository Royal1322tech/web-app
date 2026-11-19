import { expect, test, type Page, type Request } from "@playwright/test";
import { guestSlots, isIdempotencyKey, newIdempotencyKey } from "../src/features/hotels/api/b2b-booking-draft";

/*
 * Booking draft after a confirmed price check, against MOCKED replies that follow the contract the
 * deployed API validated (staging, 2026-11-19): body {review_token, guests[{first_name, last_name,
 * guest_type, is_lead}]} and an Idempotency-Key header. The build on port 4176 calls api.royal.test; no
 * request reaches staging. A draft is never a reservation or a payment.
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

async function mockFlow(page: Page, draft: (request: Request, call: number) => Reply, options: { prebook?: Record<string, unknown>; locale?: "en" | "ar" } = {}) {
  const calls: Record<"rooms" | "draft", Request[]> = { rooms: [], draft: [] };
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

const created: Reply = { status: 201, json: { message: "Booking draft created.", data: { status: "draft" } } };
async function toReview(page: Page, rooms = ROOMS) {
  await page.goto(roomsUrl(rooms));
  await page.getByRole("button", { name: "Select room" }).click();
  await expect(page.locator("[data-draft-state=form]")).toBeVisible();
}
async function fillNames(page: Page, names: [string, string][]) {
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
    await page.getByRole("button", { name: "Create booking draft" }).click();
    await expect(page.getByRole("heading", { name: "Booking Draft Created" })).toBeFocused();
    await expect(page.getByText("A draft is not a confirmed reservation, and no payment has been taken.")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(confirmedWords);
    expect(calls.draft).toHaveLength(1);
    const request = calls.draft[0];
    expect(request.postDataJSON()).toEqual({
      review_token: REVIEW,
      guests: [
        { first_name: "Laila", last_name: "Hassan", guest_type: "adult", is_lead: true },
        { first_name: "Omar", last_name: "Hassan", guest_type: "adult", is_lead: false },
        { first_name: "Mona", last_name: "Said", guest_type: "adult", is_lead: false },
        { first_name: "Youssef", last_name: "Said", guest_type: "child", is_lead: false },
      ],
    });
    expect(isIdempotencyKey(request.headers()["idempotency-key"])).toBe(true);
    expect(request.headers()["authorization"]).toBe(`Bearer ${TOKEN}`);
    expect(JSON.stringify(request.postDataJSON())).not.toContain("company_id");
  });

  test("the lead guest can be any adult, and exactly one is sent", async ({ page }) => {
    const calls = await mockFlow(page, () => created);
    await toReview(page);
    await fillNames(page, FOUR);
    await page.locator("[data-guest]").nth(2).getByLabel("Lead guest").check();
    await page.getByRole("button", { name: "Create booking draft" }).click();
    await expect(page.getByRole("heading", { name: "Booking Draft Created" })).toBeVisible();
    expect(calls.draft[0].postDataJSON().guests.map((guest: { is_lead: boolean }) => guest.is_lead)).toEqual([false, false, true, false]);
    await expect(page.locator("[data-guest=r1-c0]").getByLabel("Lead guest")).toHaveCount(0);
  });

  test("missing names are flagged before anything is sent", async ({ page }) => {
    const calls = await mockFlow(page, () => created);
    await toReview(page);
    await fillNames(page, [["Laila", ""]]);
    await page.getByRole("button", { name: "Create booking draft" }).click();
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
    const button = page.getByRole("button", { name: "Create booking draft" });
    await button.click();
    await expect(page.locator("[data-draft-failure=network]")).toBeVisible();
    await button.click();
    await expect.poll(() => calls.draft.length).toBe(2);
    await expect(page.locator("[data-draft-failure=network]")).toBeVisible();
    const key = (n: number) => calls.draft[n].headers()["idempotency-key"];
    expect(key(1)).toBe(key(0));
    // A changed submission is a new request with a new key.
    await page.locator("[data-guest]").nth(1).getByLabel("First name").fill("Omar Ali");
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
    await page.getByRole("button", { name: "Create booking draft" }).click();
    await expect(page.locator("[data-draft-failure=expired]")).toHaveText("This price check has expired. Refresh the rates and choose the room again.");
    await expect(page.getByText("Review expired. Please prebook again.")).toHaveCount(0);
    await page.locator("[data-draft-state=form]").getByRole("button", { name: "Refresh rates" }).click();
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
      await page.getByRole("button", { name: "Create booking draft" }).click();
      await expect(page.locator(`[data-draft-failure=${kind}]`)).toHaveText(text);
      await expect(page.getByText("SERVER WORDING")).toHaveCount(0);
    });
  }

  test("422: guest field errors are shown next to the right guest", async ({ page }) => {
    await mockFlow(page, () => ({ status: 422, json: { message: "x", errors: { "guests.1.first_name": ["bad"], "guests.3.last_name": ["bad"] } } }));
    await toReview(page);
    await fillNames(page, FOUR);
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
    await page.getByRole("button", { name: "Create booking draft" }).click();
    await expect(page.locator("[data-draft-failure=rate_limited]")).toContainText(/You can try again in 0:4[45]/);
    await expect(page.getByRole("button", { name: "Create booking draft" })).toBeDisabled();
    expect(calls.draft).toHaveLength(1);
  });

  test("401 ends the session and returns to sign-in", async ({ page }) => {
    await mockFlow(page, () => ({ status: 401, json: { message: "Unauthenticated." } }));
    await toReview(page);
    await fillNames(page, FOUR);
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
    await page.getByLabel(/I accept the new price/).check();
    await page.getByRole("button", { name: "Accept new price" }).click();
    await expect(page.locator("[data-draft-state=form]")).toBeVisible();
  });

  test("Arabic and phone width: right to left, fits, and the draft message is in Arabic", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await mockFlow(page, () => created, { locale: "ar" });
    await page.goto(roomsUrl([{ adults: 1, childAges: [] }]));
    await page.getByRole("button", { name: "اختيار الغرفة" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const row = page.locator("[data-guest]").first();
    await row.getByLabel("الاسم الأول").fill("ليلى");
    await row.getByLabel("اسم العائلة").fill("حسن");
    await page.getByRole("button", { name: "إنشاء مسودة حجز" }).click();
    await expect(page.getByRole("heading", { name: "تم إنشاء مسودة الحجز" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
});
