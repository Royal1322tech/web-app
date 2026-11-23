import { expect, test, type Page, type Request } from "@playwright/test";
import { classifyRoomsError, confirmedPrice, isHotelHid, rateIsSelectable, toRoomsRequest } from "../src/features/hotels/api/b2b-hotel-rooms";
import type { HotelSearchCriteria } from "../src/features/home/schemas/hotel-search.schema";
import { ApiError } from "../src/lib/api/client";

/*
 * Hotel rooms → select → prebook against MOCKED replies that follow the backend handoff contract.
 * Nothing here reaches staging: the build on port 4176 calls api.royal.test and every request is
 * answered below. Real staging behaviour is checked separately (see docs/b2b-hotel-rooms.md).
 */
const APP = "http://127.0.0.1:4176";
const COMPANY = "8f14e45f-ceea-467a-9575-3c4b1f0b5c1a";
const TOKEN = "12|mocked-sanctum-token";
const HID = 8675779;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, X-Locale", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const ROOMS = [{ adults: 2, childAges: [] }, { adults: 1, childAges: [7] }];
const query = (overrides: Record<string, string> = {}) => new URLSearchParams({ destination: "dubai", nationality: "EG", checkIn: "2030-12-10", checkOut: "2030-12-12", rooms: JSON.stringify(ROOMS), ...overrides }).toString();
const roomsUrl = (hid: number | string = HID, params = query()) => `${APP}/hotels/rooms/${hid}?${params}`;

const profile = { message: "ok", data: { user: { id: 7, name: "Laila Hassan", email: "laila@example.com" }, company: { id: COMPANY, name: "Nile Gate Tours", legal_name: "Nile Gate Tours LLC", display_name: "Nile Gate Tours", status: "approved", account_currency: "USD", preferred_locale: "en", country_code: "EG", city: "Alexandria", address: "1 Corniche Road", business_type: "travel_agency", registration_no: "CR-1", tax_no: null, employee_count: 12 }, membership: { role_code: "company_admin", status: "active" } } };

const price = (selling: string | null, extra: Record<string, unknown> = {}) => ({ verified: true, selling_price: selling, agency_purchase_price: selling ? "103.00" : null, currency: "USD", price_on_request: false, taxes_at_property: [] as { amount: string; currency: string }[], ...extra });
const rate = (index: number, overrides: Record<string, unknown> = {}) => ({ rate_index: index, room_name: `Test Room ${index + 1}`, bedding_type: "double", meal_name: "breakfast", has_breakfast: true, price: price("108.15"), selectable: true, booking_enabled: false, ...overrides });
const roomsReply = (rooms: unknown[] = [rate(0)], extra: Record<string, unknown> = {}) => ({ json: { hotel_hid: HID, rooms_token: "rooms-token-A", expires_in_seconds: 900, total: rooms.length, rooms, ...extra } });
const selectReply = (extra: Record<string, unknown> = {}) => ({ json: { selection_token: "selection-token-B", expires_in_seconds: 600, room_name: "Test Room 1", price: price("108.15"), next_step: "prebook", ...extra } });
const prebookReply = (extra: Record<string, unknown> = {}) => ({ json: { status: "rechecked", review_token: "review-token-C", expires_in_seconds: 600, price_changed: false, review_required: true, room_name: "Test Room 1", price: price("108.15"), booking_enabled: false, message: "Room rechecked; review required.", ...extra } });

type Reply = { status?: number; json?: unknown; abort?: boolean; delay?: Promise<void>; headers?: Record<string, string> };
type Handler = (request: Request, call: number) => Reply;

/** A signed-in company session and mocked rooms, select and prebook endpoints. */
async function mockFlow(page: Page, handlers: { rooms?: Handler; select?: Handler; prebook?: Handler; search?: Handler }, locale: "en" | "ar" = "en") {
  const calls: Record<"rooms" | "select" | "prebook" | "search", Request[]> = { rooms: [], select: [], prebook: [], search: [] };
  const unexpected: string[] = [];
  await page.addInitScript(({ token, companyId, locale }) => {
    if (!sessionStorage.getItem("royal-travel.b2b-session.v1")) sessionStorage.setItem("royal-travel.b2b-session.v1", JSON.stringify({ token, expiresAt: Date.now() + 3_600_000, companyId }));
    localStorage.setItem("royal-vacation.locale", locale);
  }, { token: TOKEN, companyId: COMPANY, locale });
  await page.route("https://api.royal.test/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const path = new URL(request.url()).pathname;
    if (path === "/api/v1/b2b/me") return route.fulfill({ status: 200, headers: cors, json: profile });
    if (path === "/api/v1/foundation-check") return route.fulfill({ status: 200, headers: cors, json: { locale: "en", direction: "ltr" } });
    const key = path === "/api/v1/b2b/hotels/search" ? "search" : /^\/api\/v1\/b2b\/hotels\/[^/]+\/rooms$/.test(path) ? "rooms" : path === "/api/v1/b2b/hotels/rooms/select" ? "select" : path === "/api/v1/b2b/hotels/rooms/prebook" ? "prebook" : null;
    if (!key || request.method() !== "POST" || !handlers[key]) { unexpected.push(`${request.method()} ${path}`); return route.fulfill({ status: 500, headers: cors, json: {} }); }
    calls[key].push(request);
    const reply = handlers[key]!(request, calls[key].length);
    if (reply.delay) await reply.delay;
    if (reply.abort) return route.abort("connectionrefused");
    return route.fulfill({ status: reply.status ?? 200, headers: { ...cors, ...reply.headers }, json: reply.json ?? {} });
  });
  return { calls, unexpected };
}

const ok = { rooms: () => roomsReply(), select: () => selectReply(), prebook: () => prebookReply() };
const state = (page: Page) => page.locator("[data-rooms-page] [data-rooms-state]").first();

/** Tokens must never reach storage or the URL. */
async function expectNoTokensStored(page: Page) {
  const leaked = await page.evaluate(() => {
    const stored = [localStorage, sessionStorage].flatMap((store) => Object.keys(store).map((key) => store.getItem(key) ?? ""));
    return [location.href, document.cookie, ...stored].some((value) => /rooms-token|selection-token|review-token/.test(value));
  });
  expect(leaked).toBe(false);
}

test.describe("rooms contract (no browser)", () => {
  const criteria: HotelSearchCriteria = { destination: "dubai", nationality: "EG", checkIn: "2030-12-10", checkOut: "2030-12-12", rooms: [{ adults: 2, childAges: [] }, { adults: 1, childAges: [7] }] };
  test("builds the rooms body from the search, without company_id", () => {
    expect(toRoomsRequest(criteria, { language: "en", currency: "USD" })).toEqual({ checkin: "2030-12-10", checkout: "2030-12-12", residency: "eg", language: "en", currency: "USD", guests: [{ adults: 2, children: [] }, { adults: 1, children: [7] }] });
    expect(toRoomsRequest({ ...criteria, nationality: undefined }, { language: "en", currency: "USD" })).toBeNull();
    expect(toRoomsRequest({ ...criteria, checkOut: criteria.checkIn }, { language: "en", currency: "USD" })).toBeNull();
    expect(toRoomsRequest({ ...criteria, rooms: Array.from({ length: 9 }, () => ({ adults: 1, childAges: [] })) }, { language: "en", currency: "USD" })).toBeNull();
    expect(toRoomsRequest({ ...criteria, rooms: [{ adults: 9, childAges: [] }] }, { language: "en", currency: "USD" })).toBeNull();
    expect(toRoomsRequest({ ...criteria, rooms: [{ adults: 1, childAges: [18] }] }, { language: "en", currency: "USD" })).toBeNull();
    expect(toRoomsRequest(criteria, { language: "en", currency: "EUR" as "USD" })).toBeNull();
  });
  test("hotel IDs must be positive integers", () => {
    for (const value of [1, 8675779]) expect(isHotelHid(value)).toBe(true);
    for (const value of [0, -3, 1.5, Number.NaN, "8675779", null, undefined]) expect(isHotelHid(value)).toBe(false);
  });
  test("a price is confirmed only when verified, not on request, with currency and amount; booking_enabled doesn't block selection", () => {
    expect(confirmedPrice(price("108.15"))).toEqual({ amount: "108.15", currency: "USD", agencyAmount: "103.00", propertyTaxes: [] });
    expect(confirmedPrice(price("108.15", { verified: false }))).toBeNull();
    expect(confirmedPrice(price("108.15", { price_on_request: true }))).toBeNull();
    expect(confirmedPrice(price(null))).toBeNull();
    expect(confirmedPrice(price("108.15", { currency: null }))).toBeNull();
    const base = { rate_index: 0, room_name: "x", bedding_type: null, meal_name: null, has_breakfast: null, price: price("108.15"), selectable: true, booking_enabled: false };
    expect(rateIsSelectable(base)).toBe(true);
    expect(rateIsSelectable({ ...base, selectable: false })).toBe(false);
    expect(rateIsSelectable({ ...base, price: price("108.15", { verified: false }) })).toBe(false);
  });
  test("statuses map to the contract's behaviours", () => {
    const cases: [number, string][] = [[401, "signed_out"], [403, "forbidden"], [404, "token_invalid"], [409, "unbookable"], [410, "expired"], [422, "validation"], [503, "supplier_unavailable"], [500, "unexpected"]];
    for (const [status, kind] of cases) expect(classifyRoomsError(new ApiError(status === 422 ? "validation" : "server", status))).toBe(kind);
    expect(classifyRoomsError(new ApiError("network"))).toBe("network");
    expect(classifyRoomsError(new ApiError("timeout"))).toBe("timeout");
    expect(classifyRoomsError(new ApiError("rate_limited", 429))).toBe("rate_limited");
  });
});

test.describe("from search results to rooms", () => {
  const searchUrl = `${APP}/search?${query()}`;
  const hotel = (index: number, hid: number | null) => ({ result_index: index, ...(hid ? { hid } : {}), name: `Search Hotel ${index + 1}`, address: "1 Test Street", stars: 4, image: null, rooms: [], pricing_status: "unverified", booking_enabled: false });
  const search = () => ({ json: { success: true, code: "HOTEL_SEARCH_PREVIEW", data: { hotels: [hotel(0, HID), hotel(1, null)], total: 2, page: 1, per_page: 20, currency: "USD", pricing_verified: false, booking_enabled: false } } });

  test("taxes paid at the property are shown under the confirmed price, never added to it", async ({ page }) => {
    const withTaxes = price("118.55", { agency_purchase_price: "111.00", taxes_at_property: [{ amount: "23.00", currency: "AED" }, { amount: "bad", currency: "AED" }] });
    await mockFlow(page, { ...ok, rooms: () => roomsReply([rate(0, { price: withTaxes })]) });
    await page.goto(roomsUrl());
    const cell = page.locator("[data-rate-index='0'] [data-price=confirmed]");
    await expect(cell).toContainText("USD 118.55");
    await expect(cell.locator("[data-property-taxes]")).toHaveText("Plus taxes paid at the property: AED 23.00");
    await expect(page.getByText("Agency price: USD 111.00")).toBeVisible();
  });

  test("a hotel with a real hid opens its rooms; one without offers no rooms request", async ({ page }) => {
    const api = await mockFlow(page, { search, ...ok });
    await page.goto(searchUrl);
    const cards = page.locator("[data-live-hotel]");
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(1).getByRole("link")).toHaveCount(0);
    await expect(cards.nth(1).getByText("Room rates aren't available for this hotel yet.")).toBeVisible();
    await cards.nth(0).getByRole("link", { name: "View rooms" }).click();
    await expect(page).toHaveURL(new RegExp(`/hotels/rooms/${HID}\\?`));
    await expect(page.getByRole("heading", { level: 1, name: "Search Hotel 1" })).toBeVisible();
    await expect(state(page)).toHaveAttribute("data-rooms-state", "rates");
    expect(api.calls.rooms).toHaveLength(1);
    expect(new URL(api.calls.rooms[0].url()).pathname).toBe(`/api/v1/b2b/hotels/${HID}/rooms`);
    // result_index is never used as an ID.
    expect(api.calls.rooms.some((request) => /\/hotels\/[01]\/rooms/.test(request.url()))).toBe(false);
  });
});

test.describe("rooms → price check → review (mocked API)", () => {
  test("the rooms request is authenticated, serialises the stay and never sends company_id", async ({ page }) => {
    const api = await mockFlow(page, ok);
    await page.goto(roomsUrl());
    await expect(state(page)).toHaveAttribute("data-rooms-state", "rates");
    const request = api.calls.rooms[0];
    expect(request.headers()["authorization"]).toBe(`Bearer ${TOKEN}`);
    expect(request.headers()["accept"]).toBe("application/json");
    expect(request.headers()["content-type"]).toContain("application/json");
    expect(request.postDataJSON()).toEqual({ checkin: "2030-12-10", checkout: "2030-12-12", residency: "eg", language: "en", currency: "USD", guests: [{ adults: 2, children: [] }, { adults: 1, children: [7] }] });
    await expect(page.locator("dl[aria-label='Your stay']")).toContainText("2 rooms, 3 adults, 1 child");
    expect(api.unexpected).toEqual([]);
  });

  test("full flow: select, recheck and review; tokens chain, stay in memory, and no booking action appears", async ({ page }) => {
    const api = await mockFlow(page, ok);
    await page.goto(roomsUrl());
    await page.getByRole("button", { name: "Select room" }).click();
    await expect(state(page)).toHaveAttribute("data-rooms-state", "review");
    await expect(page.getByRole("heading", { name: "Review your room" })).toBeFocused();
    await expect(page.locator("[data-rooms-state=review] [data-price=confirmed]")).toContainText("USD 108.15");
    await expect(page.getByText("Agency price: USD 103.00")).toBeVisible();
    await expect(page.getByText("This is a price check, not a reservation.", { exact: false })).toBeVisible();
    expect(api.calls.select[0].postDataJSON()).toEqual({ rooms_token: "rooms-token-A", rate_index: 0 });
    expect(api.calls.prebook[0].postDataJSON()).toEqual({ selection_token: "selection-token-B" });
    for (const request of [...api.calls.rooms, ...api.calls.select, ...api.calls.prebook]) {
      expect(JSON.stringify(request.postDataJSON())).not.toContain("company_id");
      expect(request.headers()["authorization"]).toBe(`Bearer ${TOKEN}`);
    }
    // Only a booking DRAFT can be created here: no booking, payment or reservation action.
    await expect(page.getByRole("button", { name: /^(book|pay|reserve)|book now|confirm booking/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Create booking draft" })).toBeVisible();
    await expect(page.getByRole("link", { name: /book now|pay/i })).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(/rooms-token|selection-token|review-token/);
    await expectNoTokensStored(page);
    // The steps show where the user is.
    await expect(page.locator("ol[aria-label=Progress] [aria-current=step]")).toContainText("Review");
    // This page is connected to the account, so no "sample data" banner.
    await expect(page.locator(".api-data-notice")).toHaveCount(0);
  });

  test("prices: verified ones show exactly as sent; unverified, on-request, missing and non-selectable rates can't be chosen", async ({ page }) => {
    const rooms = [
      rate(0, { price: price("1234.50", { currency: "EGP", agency_purchase_price: "1200.00" }) }),
      rate(1, { price: price("99.00", { verified: false }) }),
      rate(2, { price: price(null, { price_on_request: true }) }),
      rate(3, { price: price(null) }),
      rate(4, { selectable: false }),
      rate(5, { booking_enabled: false, room_name: null, meal_name: null, bedding_type: null, has_breakfast: null }),
    ];
    await mockFlow(page, { ...ok, rooms: () => roomsReply(rooms) });
    await page.goto(roomsUrl());
    const row = (index: number) => page.locator(`[data-rate-index="${index}"]`);
    await expect(row(0).locator("[data-price=confirmed]")).toContainText("EGP 1234.50");
    await expect(row(0).getByRole("button", { name: "Select room" })).toBeEnabled();
    await expect(row(1).getByText("Price unavailable")).toBeVisible();
    await expect(row(1).getByRole("button", { name: "Select room" })).toBeDisabled();
    await expect(row(1).getByText("Selectable once the price is confirmed")).toBeVisible();
    // The price state appears once per rate; the reason under the button doesn't repeat it.
    await expect(row(2).getByText("Price on request")).toHaveCount(1);
    await expect(row(2).getByText("Selectable once the price is confirmed")).toBeVisible();
    await expect(row(2).getByRole("button", { name: "Select room" })).toBeDisabled();
    await expect(row(3).getByText("Price unavailable")).toBeVisible();
    await expect(row(3).getByRole("button", { name: "Select room" })).toBeDisabled();
    await expect(row(4).getByRole("button", { name: "Select room" })).toBeDisabled();
    await expect(row(4).getByText("This rate can't be selected")).toBeVisible();
    // booking_enabled: false never blocks selection; missing optional fields are labelled, not invented.
    await expect(row(5).getByRole("button", { name: "Select room" })).toBeEnabled();
    await expect(row(5).getByText("Room type not provided")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("99.00");
    // Token lifetimes are described as validity, never as a hold on rates or prices.
    await expect(page.getByText(/This rate list is valid for/)).toBeVisible();
    await expect(page.getByText(/held for/i)).toHaveCount(0);
  });

  test("a changed price must be accepted explicitly, with old and new amounts shown", async ({ page }) => {
    await mockFlow(page, { ...ok, prebook: () => prebookReply({ price_changed: true, price: price("121.40") }) });
    await page.goto(roomsUrl());
    await page.getByRole("button", { name: "Select room" }).click();
    await expect(state(page)).toHaveAttribute("data-rooms-state", "review-price-changed");
    await expect(page.getByRole("heading", { name: "The price has changed" })).toBeFocused();
    await expect(page.getByText("Previous price")).toBeVisible();
    await expect(page.locator("s")).toHaveText("USD 108.15");
    const accept = page.getByRole("button", { name: "Accept new price" });
    await expect(accept).toBeDisabled();
    await page.getByLabel(/I accept the new price of USD 121\.40/).check();
    await accept.click();
    await expect(page.getByText("New price accepted.")).toBeVisible();
    await expect(state(page)).toHaveAttribute("data-rooms-state", "review");
    await expect(page.locator("[data-emphasis] strong")).toHaveText("USD 121.40");
  });

  test("a recheck without a confirmed price stops the flow", async ({ page }) => {
    await mockFlow(page, { ...ok, prebook: () => prebookReply({ price: price("108.15", { verified: false }) }) });
    await page.goto(roomsUrl());
    await page.getByRole("button", { name: "Select room" }).click();
    await expect(state(page)).toHaveAttribute("data-rooms-state", "review-unverified");
    await expect(page.getByRole("heading", { name: "This price can't be confirmed" })).toBeVisible();
  });

  test("a double click sends one selection and one recheck", async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const api = await mockFlow(page, { ...ok, select: () => ({ ...selectReply(), delay: held }) });
    await page.goto(roomsUrl());
    const select = page.getByRole("button", { name: "Select room" });
    await select.dblclick();
    await expect(state(page)).toHaveAttribute("data-rooms-state", "selecting");
    release();
    await expect(state(page)).toHaveAttribute("data-rooms-state", "review");
    expect(api.calls.select).toHaveLength(1);
    expect(api.calls.prebook).toHaveLength(1);
  });

  test("a reply that arrives after the user went back is ignored", async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const api = await mockFlow(page, { ...ok, prebook: () => ({ ...prebookReply(), delay: held }) });
    await page.goto(roomsUrl());
    await page.getByRole("button", { name: "Select room" }).click();
    await expect(state(page)).toHaveAttribute("data-rooms-state", "rechecking");
    // Changing the stay starts again from fresh rates, and the old recheck must not land on it.
    await page.goto(roomsUrl(HID, query({ checkOut: "2030-12-13" })));
    await expect(state(page)).toHaveAttribute("data-rooms-state", "rates");
    release();
    await page.waitForTimeout(300);
    await expect(state(page)).toHaveAttribute("data-rooms-state", "rates");
    expect(api.calls.rooms.at(-1)!.postDataJSON().checkout).toBe("2030-12-13");
  });

  test("expired rates can't be selected and refresh with a new rooms request", async ({ page }) => {
    await page.clock.install();
    const api = await mockFlow(page, { ...ok, rooms: () => roomsReply([rate(0)], { expires_in_seconds: 5 }) });
    await page.goto(roomsUrl());
    await expect(state(page)).toHaveAttribute("data-rooms-state", "rates");
    await page.clock.runFor(6000);
    await expect(state(page)).toHaveAttribute("data-rooms-state", "rates-expired");
    await expect(page.getByRole("button", { name: "Select room" })).toBeDisabled();
    await page.getByRole("button", { name: "Refresh rates" }).click();
    await expect.poll(() => api.calls.rooms.length).toBe(2);
    expect(api.calls.select).toHaveLength(0);
  });

  test("an expired review price check asks for fresh rates", async ({ page }) => {
    await page.clock.install();
    await mockFlow(page, { ...ok, prebook: () => prebookReply({ expires_in_seconds: 5 }) });
    await page.goto(roomsUrl());
    await page.getByRole("button", { name: "Select room" }).click();
    await expect(state(page)).toHaveAttribute("data-rooms-state", "review");
    await page.clock.runFor(6000);
    await expect(state(page)).toHaveAttribute("data-rooms-state", "review-expired");
    await expect(page.getByText("This price check has expired.", { exact: false })).toBeVisible();
  });

  const selectFailures: [number, string, string][] = [
    [404, "token_invalid", "This room choice is no longer valid"],
    [409, "unbookable", "This rate can't be booked anymore"],
    [410, "expired", "These rates have expired"],
  ];
  for (const [status, kind, title] of selectFailures) {
    test(`select ${status}: "${title}" and Refresh rates loads new rates`, async ({ page }) => {
      const api = await mockFlow(page, { ...ok, select: () => ({ status, json: { message: "x" } }) });
      await page.goto(roomsUrl());
      await page.getByRole("button", { name: "Select room" }).click();
      await expect(state(page)).toHaveAttribute("data-rooms-state", kind);
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
      await page.getByRole("button", { name: "Refresh rates" }).click();
      await expect(state(page)).toHaveAttribute("data-rooms-state", "rates");
      expect(api.calls.rooms).toHaveLength(2);
      expect(api.calls.prebook).toHaveLength(0);
    });
  }

  test("prebook 503 offers a safe retry of the recheck with the same selection", async ({ page }) => {
    const api = await mockFlow(page, { ...ok, prebook: (_, call) => (call === 1 ? { status: 503, json: { message: "x" } } : prebookReply()) });
    await page.goto(roomsUrl());
    await page.getByRole("button", { name: "Select room" }).click();
    await expect(state(page)).toHaveAttribute("data-rooms-state", "supplier_unavailable");
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(state(page)).toHaveAttribute("data-rooms-state", "review");
    expect(api.calls.select).toHaveLength(1);
    expect(api.calls.prebook.map((request) => request.postDataJSON())).toEqual([{ selection_token: "selection-token-B" }, { selection_token: "selection-token-B" }]);
  });

  const roomsFailures: [string, Reply, string][] = [
    ["forbidden", { status: 403, json: { message: "Forbidden." } }, "Hotel rooms aren't enabled for your account"],
    ["validation", { status: 422, json: { message: "x", errors: { checkin: ["bad"] } } }, "Check your stay details"],
    ["supplier_unavailable", { status: 503, json: { message: "x" } }, "The supplier isn't responding"],
    ["network", { abort: true }, "Can't reach the hotel service"],
    ["unexpected", { status: 200, json: { rooms: [] } }, "Room rates can't be displayed"],
    ["token_invalid", { status: 404, json: { message: "x" } }, "Rooms for this hotel weren't found"],
  ];
  for (const [kind, reply, title] of roomsFailures) {
    test(`rooms failure ${kind}: its own message and no rates`, async ({ page }) => {
      await mockFlow(page, { ...ok, rooms: () => reply });
      await page.goto(roomsUrl());
      await expect(state(page)).toHaveAttribute("data-rooms-state", kind);
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
      await expect(page.getByRole("button", { name: "Select room" })).toHaveCount(0);
    });
  }

  test("rooms 429: a rate-limit message (EN/AR), Try again waits for Retry-After, then one new request", async ({ page }) => {
    const limited: Reply = { status: 429, json: { message: "Too Many Attempts." }, headers: { "Access-Control-Expose-Headers": "Retry-After", "Retry-After": "3" } };
    const api = await mockFlow(page, { ...ok, rooms: (_, call) => (call === 1 ? limited : roomsReply()) });
    await page.goto(roomsUrl());
    await expect(state(page)).toHaveAttribute("data-rooms-state", "rate_limited");
    await expect(page.getByRole("heading", { name: "Too many requests" })).toBeVisible();
    await expect(page.getByText("We received a response we couldn't read")).toHaveCount(0);
    const retry = page.getByRole("button", { name: "Try again" });
    await expect(retry).toBeDisabled();
    await expect(page.getByText(/You can try again in [1-3] seconds\./)).toBeVisible();
    expect(api.calls.rooms).toHaveLength(1);
    await expect(retry).toBeEnabled({ timeout: 5000 });
    await retry.click();
    await expect(page.getByRole("button", { name: "Select room" }).first()).toBeVisible();
    expect(api.calls.rooms).toHaveLength(2);
  });

  test("rooms 429 in Arabic: RTL rate-limit message and a disabled retry", async ({ page }) => {
    await mockFlow(page, { ...ok, rooms: () => ({ status: 429, json: { message: "Too Many Attempts." }, headers: { "Access-Control-Expose-Headers": "Retry-After", "Retry-After": "30" } }) }, "ar");
    await page.goto(roomsUrl());
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "طلبات كثيرة" })).toBeVisible();
    await expect(page.getByRole("button", { name: "إعادة المحاولة" })).toBeDisabled();
  });

  test("a rooms reply for a different hotel is rejected", async ({ page }) => {
    await mockFlow(page, { ...ok, rooms: () => roomsReply([rate(0)], { hotel_hid: 1 }) });
    await page.goto(roomsUrl());
    await expect(state(page)).toHaveAttribute("data-rooms-state", "unexpected");
  });

  test("a 401 ends the session and returns to sign-in", async ({ page }) => {
    await mockFlow(page, { ...ok, rooms: () => ({ status: 401, json: { message: "Unauthenticated." } }) });
    await page.goto(roomsUrl());
    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(() => sessionStorage.getItem("royal-travel.b2b-session.v1"))).toBeNull();
  });

  test("an empty room list says so", async ({ page }) => {
    await mockFlow(page, { ...ok, rooms: () => roomsReply([]) });
    await page.goto(roomsUrl());
    await expect(state(page)).toHaveAttribute("data-rooms-state", "empty");
    await expect(page.getByRole("heading", { name: "No rooms are available for these dates" })).toBeVisible();
  });

  test("invalid hotel IDs and invalid stays send nothing", async ({ page }) => {
    const api = await mockFlow(page, ok);
    for (const url of [roomsUrl("0"), roomsUrl("abc"), roomsUrl("-5"), roomsUrl(HID, query({ checkIn: "2020-01-01" })), roomsUrl(HID, query({ nationality: "" }))]) {
      await page.goto(url);
      await expect(page.getByRole("heading", { name: "These rooms can't be shown" })).toBeVisible();
    }
    expect(api.calls.rooms).toHaveLength(0);
  });

  test("signed out: no rooms request", async ({ page }) => {
    const calls: string[] = [];
    await page.route("https://api.royal.test/**", (route) => {
      if (route.request().url().includes("/rooms")) calls.push(route.request().url());
      return route.fulfill({ status: 200, headers: cors, json: { locale: "en", direction: "ltr" } });
    });
    await page.goto(roomsUrl());
    await expect(page).toHaveURL(/\/(login|welcome)/);
    expect(calls).toEqual([]);
  });

  test("Arabic: RTL, language ar sent, and amounts stay exactly as sent", async ({ page }) => {
    const api = await mockFlow(page, { ...ok, prebook: () => prebookReply({ price_changed: true, price: price("121.40") }) }, "ar");
    await page.goto(roomsUrl());
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(state(page)).toHaveAttribute("data-rooms-state", "rates");
    expect(api.calls.rooms[0].postDataJSON().language).toBe("ar");
    expect(api.calls.rooms[0].headers()["x-locale"]).toBe("ar");
    await expect(page.locator("[data-rate-index='0'] [data-price=confirmed]")).toContainText("USD 108.15");
    await page.getByRole("button", { name: "اختيار الغرفة" }).click();
    await expect(page.getByRole("heading", { name: "تغيّر السعر" })).toBeVisible();
    await expect(page.getByText("هذا تحقق من السعر وليس حجزًا", { exact: false })).toBeVisible();
  });

  for (const locale of ["en", "ar"] as const) {
    for (const width of [320, 390, 768, 1024, 1440]) {
      test(`${locale} ${width}px: rates and review fit with touch-sized actions`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        const rooms = [rate(0, { room_name: "Executive Panoramic Suite With Separate Living Room And Sea View Balcony" }), rate(1, { price: price(null, { price_on_request: true }) })];
        await mockFlow(page, { ...ok, rooms: () => roomsReply(rooms), prebook: () => prebookReply({ price_changed: true, price: price("121.40") }) }, locale);
        await page.goto(roomsUrl());
        await expect(state(page)).toHaveAttribute("data-rooms-state", "rates");
        const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(await overflow()).toBeLessThanOrEqual(1);
        for (const button of await page.locator("[data-rate-index] button").all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await page.locator("[data-rate-index='0'] button").click();
        await expect(state(page)).toHaveAttribute("data-rooms-state", "review-price-changed");
        expect(await overflow()).toBeLessThanOrEqual(1);
      });
    }
  }
});
