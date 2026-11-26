import { pickDate } from "./helpers/date-picker";
import { expect, test, type Page, type Request } from "@playwright/test";
import { classifyB2BSearchError, parseB2BHotelSearch, toB2BHotelSearchRequest } from "../src/features/hotels/api/b2b-hotel-search";
import { findDestination, searchDestinations } from "../src/features/hotels/data/destinations";
import type { HotelSearchCriteria } from "../src/features/home/schemas/hotel-search.schema";
import { ApiError } from "../src/lib/api/client";

/*
 * Company (B2B) hotel search against MOCKED responses. These tests never contact staging: the build
 * on port 4176 points at api.royal.test, which does not resolve, and every request is answered here.
 * The request body and the success envelope are provisional (see b2b-hotel-search.ts); these tests
 * pin what the frontend sends and how it reacts, not what the real backend accepts.
 */
const APP = "http://127.0.0.1:4176";
const COMPANY = "8f14e45f-ceea-467a-9575-3c4b1f0b5c1a";
const TOKEN = "12|mocked-sanctum-token";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, X-Locale", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const rooms = encodeURIComponent(JSON.stringify([{ adults: 2, childAges: [] }]));
const searchUrl = (destination: string, nationality = "EG") =>
  `${APP}/search?destination=${encodeURIComponent(destination)}&nationality=${nationality}&checkIn=2030-12-06&checkOut=2030-12-09&rooms=${rooms}`;

const profile = {
  message: "Profile retrieved successfully.",
  data: {
    user: { id: 7, name: "Laila Hassan", email: "laila@example.com" },
    company: { id: COMPANY, name: "Nile Gate Tours", legal_name: "Nile Gate Tours LLC", display_name: "Nile Gate Tours", status: "approved", account_currency: "USD", preferred_locale: "en", country_code: "EG", city: "Alexandria", address: "1 Corniche Road", business_type: "travel_agency", registration_no: "CR-1", tax_no: null, employee_count: 12 },
    membership: { role_code: "company_admin", status: "active" },
  },
};

type Reply = { status?: number; json?: unknown; abort?: boolean };

/** A signed-in company session (verified through the mocked /me) and a mocked hotel search. */
/** GET /b2b/destinations (API release 2026-11-25): staging's sandbox-known cities, plus a region. */
const destinationRows = [
  { id: "dubai", type: "city", name: "Dubai", country: "United Arab Emirates", country_code: "AE", parent: null },
  { id: "paris", type: "city", name: "Paris", country: "France", country_code: "FR", parent: null },
  { id: "region:6053839", type: "region", name: "Dubai Marina", country: "United Arab Emirates", country_code: "AE", parent: "Dubai" },
];
const destinationsReply = (request: Request): Reply => {
  const query = new URL(request.url()).searchParams.get("q")?.toLowerCase() ?? "";
  const ar = new URL(request.url()).searchParams.get("language") === "ar";
  const rows = destinationRows.filter((row) => row.name.toLowerCase().startsWith(query) || (ar && query === "دبي" && row.id === "dubai"));
  return { json: { success: true, code: "OK", scope: "sandbox_known", data: rows.map((row) => (ar && row.id === "dubai" ? { ...row, name: "دبي", country: "الإمارات العربية المتحدة" } : row)) } };
};

async function signedIn(page: Page, search: (request: Request, attempt: number) => Reply, locale: "en" | "ar" = "en", destinations: (request: Request, attempt: number) => Reply = destinationsReply) {
  const searches: Request[] = [];
  const lookups: Request[] = [];
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
    if (request.method() === "GET" && path === "/api/v1/b2b/destinations") {
      lookups.push(request);
      const reply = destinations(request, lookups.length);
      if (reply.abort) return route.abort("connectionrefused");
      return route.fulfill({ status: reply.status ?? 200, headers: cors, json: reply.json ?? {} });
    }
    if (request.method() === "POST" && path === "/api/v1/b2b/hotels/search") {
      searches.push(request);
      const reply = search(request, searches.length);
      if (reply.abort) return route.abort("connectionrefused");
      return route.fulfill({ status: reply.status ?? 200, headers: cors, json: reply.json ?? {} });
    }
    unexpected.push(`${request.method()} ${path}`);
    return route.fulfill({ status: 500, headers: cors, json: {} });
  });
  return { searches, lookups, unexpected };
}

const supplierUnavailable: Reply = { status: 503, json: { success: false, code: "HOTEL_SUPPLIER_UNAVAILABLE", message: "Hotel search is currently unavailable.", data: { hotels: [], total: 0 } } };
type HotelFixture = Record<string, unknown>;
/** A hotel in the confirmed response shape. Fictional test data only. */
const hotel = (index: number, overrides: HotelFixture = {}): HotelFixture => ({
  result_index: index,
  name: `Test Hotel ${index + 1}`,
  address: `${index + 1} Test Street`,
  stars: 4,
  image: null,
  rooms: [{ room_name: "Junior Suite", meal_name: "breakfast", has_breakfast: true, bedding_type: null, selling_price: null, booking_enabled: false }],
  pricing_status: "unverified",
  booking_enabled: false,
  ...overrides,
});
/** The confirmed HOTEL_SEARCH_PREVIEW envelope. */
const preview = ({ total, page = 1, perPage = 20, hotels, ...flags }: { total: number; page?: number; perPage?: number; hotels?: HotelFixture[]; pricing_verified?: boolean; booking_enabled?: boolean; currency?: string }): Reply => ({
  json: {
    success: true,
    code: "HOTEL_SEARCH_PREVIEW",
    message: "Hotel availability preview. Prices are not yet verified.",
    data: {
      hotels: hotels ?? Array.from({ length: Math.max(0, Math.min(perPage, total - (page - 1) * perPage)) }, (_, i) => hotel((page - 1) * perPage + i)),
      total, page, per_page: perPage, currency: flags.currency ?? "USD", supplier_currency: "USD",
      pricing_verified: flags.pricing_verified ?? false, booking_enabled: flags.booking_enabled ?? false,
    },
  },
});
const results = (total: number): Reply => preview({ total });
const state = (page: Page) => page.locator("#api-hotel-results [data-search-state]");

/** No sample hotel, illustrative price or demo notice may appear in API mode. */
async function expectNoSampleInventory(page: Page) {
  await expect(page.locator("#hotel-filters")).toHaveCount(0);
  await expect(page.getByText(/Illustrative|توضيحية|Eastern Al Montazah|Royal Azure/)).toHaveCount(0);
}

test.describe("B2B hotel search: mapping (no browser)", () => {
  const criteria: HotelSearchCriteria = { destination: "dubai", nationality: "EG", checkIn: "2030-12-06", checkOut: "2030-12-09", rooms: [{ adults: 2, childAges: [] }] };
  const en = { language: "en", currency: "USD" } as const;

  test("keeps the Egyptian destinations and adds Dubai, Paris and Los Angeles with the exact coordinates", () => {
    expect(searchDestinations.map((d) => d.id)).toEqual(["Alexandria", "Cairo", "Hurghada", "Sharm El Sheikh", "dubai", "paris", "los-angeles"]);
    expect(searchDestinations.slice(0, 4).every((d) => d.country.code === "EG" && d.name.en === d.id)).toBe(true);
    expect(findDestination("dubai")).toMatchObject({ name: { en: "Dubai", ar: "دبي" }, country: { code: "AE" }, point: { latitude: 25.2048, longitude: 55.2708 } });
    expect(findDestination("paris")).toMatchObject({ name: { en: "Paris", ar: "باريس" }, country: { code: "FR" }, point: { latitude: 48.8566, longitude: 2.3522 } });
    expect(findDestination("los-angeles")).toMatchObject({ name: { en: "Los Angeles", ar: "لوس أنجلوس" }, country: { code: "US" }, point: { latitude: 34.0522, longitude: -118.2437 } });
  });

  test("sends coordinates, never the city name; residency comes from nationality, not the destination", () => {
    expect(toB2BHotelSearchRequest(criteria, findDestination("dubai")!.point, en)).toEqual({
      checkin: "2030-12-06", checkout: "2030-12-09", latitude: 25.2048, longitude: 55.2708, radius: 10000,
      residency: "eg", language: "en", currency: "USD", guests: [{ adults: 2, children: [] }],
    });
    const la = toB2BHotelSearchRequest({ ...criteria, destination: "los-angeles", nationality: "SA", rooms: [{ adults: 1, childAges: [0, 17] }, { adults: 3, childAges: [] }] }, findDestination("los-angeles")!.point, { language: "ar", currency: "SAR" });
    expect(la).toMatchObject({ latitude: 34.0522, longitude: -118.2437, residency: "sa", language: "ar", currency: "SAR", guests: [{ adults: 1, children: [0, 17] }, { adults: 3, children: [] }] });
    expect(JSON.stringify(la)).not.toMatch(/angeles/i);
  });

  test("returns null rather than guessing", () => {
    const point = findDestination("paris")!.point;
    expect(toB2BHotelSearchRequest({ ...criteria, nationality: undefined }, point, en)).toBeNull();
    expect(toB2BHotelSearchRequest({ ...criteria, nationality: "EGY" }, point, en)).toBeNull();
    expect(toB2BHotelSearchRequest(criteria, { latitude: 91, longitude: 0 }, en)).toBeNull();
    expect(toB2BHotelSearchRequest(criteria, { latitude: 0, longitude: -181 }, en)).toBeNull();
    expect(toB2BHotelSearchRequest(criteria, point, { language: "fr" as "en", currency: "USD" })).toBeNull();
    expect(toB2BHotelSearchRequest(criteria, point, { language: "en", currency: "EUR" as "USD" })).toBeNull();
    expect(toB2BHotelSearchRequest({ ...criteria, checkOut: criteria.checkIn }, point, en)).toBeNull();
    expect(toB2BHotelSearchRequest({ ...criteria, rooms: [] }, point, en)).toBeNull();
    expect(toB2BHotelSearchRequest({ ...criteria, rooms: Array.from({ length: 10 }, () => ({ adults: 1, childAges: [] })) }, point, en)).toBeNull();
    expect(toB2BHotelSearchRequest({ ...criteria, rooms: [{ adults: 0, childAges: [] }] }, point, en)).toBeNull();
    expect(toB2BHotelSearchRequest({ ...criteria, rooms: [{ adults: 7, childAges: [] }] }, point, en)).toBeNull();
    expect(toB2BHotelSearchRequest({ ...criteria, rooms: [{ adults: 2, childAges: [1, 2, 3, 4, 5] }] }, point, en)).toBeNull();
    expect(toB2BHotelSearchRequest({ ...criteria, rooms: [{ adults: 2, childAges: [18] }] }, point, en)).toBeNull();
    expect(toB2BHotelSearchRequest({ ...criteria, rooms: [{ adults: 2, childAges: [null as unknown as number] }] }, point, en)).toBeNull();
  });

  test("accepts only the known envelope and never reads hotel fields; classifies failures", () => {
    const parsed = parseB2BHotelSearch(preview({ total: 88, hotels: [hotel(0), { result_index: 1, name: 42, stars: "five", rooms: "x", image: "" }] }).json);
    expect(parsed).toMatchObject({ total: 88, page: 1, perPage: 20, currency: "USD", pricingVerified: false, bookingEnabled: false });
    expect(parsed.hotels[0]).toEqual({ result_index: 0, hid: null, name: "Test Hotel 1", address: "1 Test Street", stars: 4, image: null, rooms: [{ room_name: "Junior Suite", meal_name: "breakfast", has_breakfast: true, bedding_type: null, selling_price: null, booking_enabled: false }], pricing_status: "unverified", booking_enabled: false });
    // A malformed record keeps its place; each bad field becomes null rather than a guess.
    expect(parsed.hotels[1]).toEqual({ result_index: 1, hid: null, name: null, address: null, stars: null, image: null, rooms: [], pricing_status: null, booking_enabled: null });
    expect(parsed).not.toHaveProperty("supplierCurrency");
    // A positive integer hid is read; anything else becomes null and is never derived from result_index.
    const withHid = parseB2BHotelSearch(preview({ total: 3, hotels: [hotel(0, { hid: 8675779 }), hotel(1, { hid: "8675779" }), hotel(2, { hid: 0 })] }).json);
    expect(withHid.hotels.map((h) => h.hid)).toEqual([8675779, null, null]);
    for (const value of [supplierUnavailable.json, {}, { message: "Unauthenticated." }, { success: true }, { success: true, data: { hotels: "x", total: 0 } }, { success: true, data: { hotels: [], total: 0 } }]) expect(() => parseB2BHotelSearch(value)).toThrow();
    expect(classifyB2BSearchError(new ApiError("unavailable", 503, {}, "HOTEL_SUPPLIER_UNAVAILABLE"))).toBe("supplier_unavailable");
    expect(classifyB2BSearchError(new ApiError("server", 409, {}, "HOTEL_SEARCH_NOT_READY"))).toBe("not_ready");
    expect(classifyB2BSearchError(new ApiError("unauthorized", 401))).toBe("signed_out");
    expect(classifyB2BSearchError(new ApiError("forbidden", 403))).toBe("forbidden");
    expect(classifyB2BSearchError(new ApiError("validation", 422))).toBe("validation");
    expect(classifyB2BSearchError(new ApiError("rate_limited", 429))).toBe("rate_limited");
    expect(classifyB2BSearchError(new ApiError("timeout"))).toBe("timeout");
    expect(classifyB2BSearchError(new ApiError("invalid_response", 200))).toBe("unexpected");
  });
});

test.describe("B2B hotel search: the search page (mocked API)", () => {
  test("the home form finds Dubai through destination autocomplete, searches with the company token, then shows the result count without sample hotels", async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const api = await signedIn(page, () => results(3));
    await page.route("https://api.royal.test/api/v1/b2b/hotels/search", async (route) => { await held; await route.fallback(); });
    await page.goto(APP + "/");
    const input = page.locator("#destination");
    await input.pressSequentially("Dub", { delay: 30 });
    await expect(page.locator("[data-destination-autocomplete]").getByRole("option", { name: /Dubai/ }).first()).toBeVisible();
    // One request after typing settles (400 ms debounce), with the query, language and limit.
    expect(api.lookups).toHaveLength(1);
    expect(Object.fromEntries(new URL(api.lookups[0].url()).searchParams)).toEqual({ q: "Dub", language: "en", limit: "10" });
    expect(api.lookups[0].headers()["authorization"]).toBe(`Bearer ${TOKEN}`);
    await page.locator("[data-destination-autocomplete]").getByRole("option", { name: /^Dubai United Arab Emirates/ }).click();
    await expect(input).toHaveValue("Dubai, United Arab Emirates");
    await pickDate(page, "check-in", "2030-12-06");
    await pickDate(page, "check-out", "2030-12-09");
    await page.locator("#hotel-search button[type=submit]").click();
    await expect(page).toHaveURL(/\/search\?destination=dubai/);
    await expect(page.locator("#api-hotel-results [aria-busy=true]")).toBeVisible();
    release();
    await expect(state(page)).toHaveAttribute("data-search-state", "results");
    await expect(page.getByRole("heading", { name: "3 hotels in Dubai" })).toBeVisible();
    await expect(page.locator("#api-hotel-results [data-live-hotel]")).toHaveCount(3);
    await expectNoSampleInventory(page);
    // The home page ran its own default search first; the user's search is the one with their dates.
    const mine = api.searches.filter((r) => r.postDataJSON().checkin === "2030-12-06");
    expect(mine).toHaveLength(1);
    const request = mine[0];
    expect(request.headers()["authorization"]).toBe(`Bearer ${TOKEN}`);
    expect(request.headers()["x-locale"]).toBe("en");
    // Dubai is also a built-in destination, so the proven coordinates body is kept for it.
    expect(request.postDataJSON()).toEqual({ checkin: "2030-12-06", checkout: "2030-12-09", latitude: 25.2048, longitude: 55.2708, radius: 10000, residency: "eg", language: "en", currency: "USD", guests: [{ adults: 2, children: [] }] });
    expect(api.unexpected).toEqual([]);
  });

  test("a region from autocomplete is searched by its ID (never its name), and its name is shown", async ({ page }) => {
    const api = await signedIn(page, () => results(2));
    await page.goto(APP + "/");
    await page.locator("#destination").pressSequentially("Dubai M", { delay: 20 });
    await page.locator("[data-destination-autocomplete]").getByRole("option", { name: /Dubai Marina/ }).click();
    await pickDate(page, "check-in", "2030-12-06");
    await pickDate(page, "check-out", "2030-12-09");
    await page.locator("#hotel-search button[type=submit]").click();
    await expect(page).toHaveURL(/destination=region%3A6053839/);
    await expect(page.getByRole("heading", { name: /2 hotels in Dubai Marina/ })).toBeVisible();
    const mine = api.searches.filter((r) => r.postDataJSON().checkin === "2030-12-06");
    expect(mine[0].postDataJSON()).toEqual({ checkin: "2030-12-06", checkout: "2030-12-09", destination: "region:6053839", residency: "eg", language: "en", currency: "USD", guests: [{ adults: 2, children: [] }] });
  });

  test("autocomplete: stale replies are ignored, short queries send nothing, and empty, error and keyboard states work", async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const api = await signedIn(page, () => results(0), "en", (request, attempt) => {
      if (attempt === 1) return { ...destinationsReply(request) };
      if (new URL(request.url()).searchParams.get("q") === "Zz") return { json: { success: true, code: "OK", scope: "sandbox_known", data: [] } };
      if (new URL(request.url()).searchParams.get("q") === "Err") return { status: 503, json: { success: false, code: "DESTINATION_SEARCH_UNAVAILABLE" } };
      return destinationsReply(request);
    });
    await page.route("https://api.royal.test/api/v1/b2b/destinations?q=Pa*", async (route) => { await held; await route.fallback(); });
    await page.goto(APP + "/");
    const input = page.locator("#destination");
    await input.fill("D");
    await page.waitForTimeout(600);
    expect(api.lookups).toHaveLength(0);
    await expect(page.getByText("Type at least 2 letters.")).toBeVisible();
    // "Pa" is held; typing on to "Dubai" makes it stale, so only Dubai's results are shown.
    await input.fill("Pa");
    await page.waitForTimeout(500);
    await input.fill("Dubai");
    await expect(page.locator("[data-destination-autocomplete]").getByRole("option", { name: /^Dubai United Arab Emirates/ })).toBeVisible();
    release();
    await page.waitForTimeout(300);
    await expect(page.locator("[data-destination-autocomplete]").getByRole("option", { name: /Paris/ })).toHaveCount(0);
    await input.press("ArrowDown");
    await expect(input).toHaveAttribute("aria-activedescendant", /option-0$/);
    await input.press("Enter");
    await expect(input).toHaveValue("Dubai, United Arab Emirates");
    await input.fill("Zz");
    await expect(page.locator("[data-destination-state=empty]")).toBeVisible();
    await input.fill("Err");
    await expect(page.locator("[data-destination-state=unavailable]")).toContainText("Destination search isn't available right now");
  });

  for (const [id, latitude, longitude] of [["paris", 48.8566, 2.3522], ["los-angeles", 34.0522, -118.2437], ["Cairo", 30.0444, 31.2357]] as const) {
    test(`${id} sends its coordinates`, async ({ page }) => {
      const api = await signedIn(page, () => results(0));
      await page.goto(searchUrl(id, "SA"));
      await expect(state(page)).toHaveAttribute("data-search-state", "empty");
      expect(api.searches[0].postDataJSON()).toMatchObject({ latitude, longitude, residency: "sa", radius: 10000 });
      await expect(page.getByRole("heading", { name: "No hotels found" })).toBeVisible();
    });
  }

  test("supplier unavailable: explains, retries on request and never falls back to sample hotels", async ({ page }) => {
    const api = await signedIn(page, (_, attempt) => (attempt === 1 ? supplierUnavailable : results(2)));
    await page.goto(searchUrl("dubai"));
    await expect(state(page)).toHaveAttribute("data-search-state", "supplier_unavailable");
    await expect(page.getByRole("heading", { name: "Hotel search is unavailable" })).toBeVisible();
    await expect(page.getByText("Hotel search is currently unavailable.")).toHaveCount(0); // server wording is never shown
    await expectNoSampleInventory(page);
    await expect(page.locator(".api-data-notice")).toHaveCount(0); // this page is connected, so no "sample data" banner
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(state(page)).toHaveAttribute("data-search-state", "results");
    await expect(page.locator("[data-live-hotel]")).toHaveCount(2);
    expect(api.searches).toHaveLength(2);
  });

  const failures: [string, Reply, string, boolean][] = [
    ["validation", { status: 422, json: { message: "x", errors: { latitude: ["bad"] } } }, "Check your search", false],
    ["rate_limited", { status: 429, json: { message: "Too Many Attempts." } }, "Too many searches", true],
    ["not_ready", { status: 409, json: { success: false, code: "HOTEL_SEARCH_NOT_READY" } }, "Search results aren't ready", true],
    ["forbidden", { status: 403, json: { message: "Forbidden." } }, "Hotel search isn't enabled for your account", false],
    ["network", { abort: true }, "Can't reach hotel search", true],
    ["unexpected", { status: 200, json: { hotels: [{ name: "x" }] } }, "Results can't be displayed", true],
  ];
  for (const [kind, reply, title, retry] of failures) {
    test(`${kind}: its own message${retry ? " with Retry" : ""}, no sample hotels`, async ({ page }) => {
      await signedIn(page, () => reply);
      await page.goto(searchUrl("paris"));
      await expect(state(page)).toHaveAttribute("data-search-state", kind);
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
      await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(retry ? 1 : 0);
      await expectNoSampleInventory(page);
    });
  }

  test("a 401 from the search ends the session and returns to sign-in", async ({ page }) => {
    await signedIn(page, () => ({ status: 401, json: { message: "Unauthenticated." } }));
    await page.goto(searchUrl("dubai"));
    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(() => sessionStorage.getItem("royal-travel.b2b-session.v1"))).toBeNull();
  });

  test("Arabic: city names, the search summary and messages are in Arabic", async ({ page }) => {
    await signedIn(page, () => supplierUnavailable, "ar");
    await page.goto(searchUrl("los-angeles"));
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "البحث عن الفنادق غير متاح" })).toBeVisible();
    await expect(page.getByRole("button", { name: "إعادة المحاولة" })).toBeVisible();
    await expect(page.locator("#destination")).toHaveValue("لوس أنجلوس");
  });

  test("Arabic autocomplete asks in Arabic and shows Arabic names", async ({ page }) => {
    const api = await signedIn(page, () => results(0), "ar");
    await page.goto(APP + "/");
    await page.locator("#destination").pressSequentially("دبي", { delay: 30 });
    await expect(page.locator("[data-destination-autocomplete]").getByRole("option", { name: /دبي/ })).toBeVisible();
    expect(new URL(api.lookups.at(-1)!.url()).searchParams.get("language")).toBe("ar");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });

  test("Arabic sends language ar; an unsupported preferred currency falls back to USD without a technical note", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("royal-vacation.travel-preferences", JSON.stringify({ currency: "AED", nationality: "EG" })));
    const api = await signedIn(page, () => results(0), "ar");
    await page.goto(searchUrl("paris"));
    await expect(state(page)).toHaveAttribute("data-search-state", "empty");
    expect(api.searches[0].postDataJSON()).toMatchObject({ language: "ar", currency: "USD", latitude: 48.8566, longitude: 2.3522 });
    expect(api.searches[0].headers()["x-locale"]).toBe("ar");
    await expect(page.getByText(/يدعم البحث عن الفنادق|supports USD/)).toHaveCount(0); // the fallback is silent
  });

  test("a supported preferred currency is sent as chosen", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("royal-vacation.travel-preferences", JSON.stringify({ currency: "EGP", nationality: "EG" })));
    const api = await signedIn(page, () => results(0));
    await page.goto(searchUrl("Hurghada"));
    await expect(state(page)).toHaveAttribute("data-search-state", "empty");
    expect(api.searches[0].postDataJSON()).toMatchObject({ currency: "EGP", latitude: 27.2579, longitude: 33.8116 });
  });

  test("signed out: the search page sends nothing and asks for sign-in", async ({ page }) => {
    const searches: string[] = [];
    await page.route("https://api.royal.test/**", (route) => {
      if (route.request().url().includes("hotels/search")) searches.push(route.request().url());
      return route.fulfill({ status: 200, headers: cors, json: { locale: "en", direction: "ltr" } });
    });
    await page.goto(searchUrl("dubai"));
    await expect(page).toHaveURL(/\/(login|welcome)/);
    expect(searches).toEqual([]);
  });

  for (const width of [360, 390, 768, 1440]) {
    test(`layout at ${width}px: no sideways scroll, form and message visible`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await signedIn(page, () => supplierUnavailable);
      await page.goto(searchUrl("dubai"));
      await expect(state(page)).toHaveAttribute("data-search-state", "supplier_unavailable");
      await expect(page.getByRole("heading", { name: "Hotel search is unavailable" })).toBeVisible();
      if (width >= 1024) await expect(page.locator("#destination")).toHaveValue("Dubai");
      else await expect(page.locator("[class*=searchSummary]").getByText("Dubai")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    });
  }
});

test.describe("Demo build (sample catalogue) is unchanged", () => {
  test("lists the new cities, sends no API request and shows the sample empty state for them", async ({ page }) => {
    const api: string[] = [];
    page.on("request", (r) => { if (/hotels\/search/.test(r.url())) api.push(r.url()); });
    const { visit } = await import("./helpers/demo-login");
    await visit(page, "/search?destination=dubai&nationality=EG&checkIn=2030-12-06&checkOut=2030-12-09&rooms=" + rooms);
    await expect(page.locator("#destination option[value=dubai]")).toHaveText("Dubai");
    await expect(page.getByText("No hotels match these filters. Try resetting the filters.")).toBeVisible();
    await expect(page.locator(".searchSummary, [class*=searchSummary]").first()).toContainText("Dubai");
    expect(api).toEqual([]);
  });
});

test.describe("B2B hotel search: hotel cards (mocked API)", () => {
  test("every hotel on the page becomes a card showing only what the API returned", async ({ page }) => {
    const hotels = [
      hotel(0, { name: "Harbour View", address: "1 Marina Walk", stars: 5, image: "https://cdn.example.test/t/{size}/h0.jpg", rooms: [
        { room_name: "Deluxe King", meal_name: "breakfast", has_breakfast: true, bedding_type: "King bed", selling_price: null, booking_enabled: false },
        { room_name: "Deluxe King", meal_name: "breakfast", has_breakfast: true, bedding_type: "King bed", selling_price: null, booking_enabled: false },
        { room_name: "Twin Room", meal_name: "nomeal", has_breakfast: false, bedding_type: null, selling_price: null, booking_enabled: false },
        { room_name: "Suite", meal_name: "half-board", has_breakfast: true, bedding_type: null, selling_price: null, booking_enabled: false },
        { room_name: "Family Room", meal_name: "full-board", has_breakfast: true, bedding_type: null, selling_price: null, booking_enabled: false },
      ] }),
      hotel(1, { name: null, address: null, stars: null, image: null, rooms: [] }),
      hotel(2, { image: "http://insecure.example.test/x.jpg", rooms: [{ room_name: null, meal_name: null, has_breakfast: false, bedding_type: null, selling_price: null, booking_enabled: false }] }),
    ];
    await page.route("https://cdn.example.test/**", (route) => route.fulfill({ status: 404 }));
    await signedIn(page, () => preview({ total: 3, hotels }));
    await page.goto(searchUrl("dubai"));
    const cards = page.locator("[data-live-hotel]");
    await expect(cards).toHaveCount(3);

    const first = cards.nth(0);
    await expect(first.getByRole("heading", { name: "Harbour View" })).toBeVisible();
    await expect(first.getByText("1 Marina Walk")).toBeVisible();
    await expect(first.getByLabel("5-star hotel")).toBeVisible();
    await expect(first.getByText("4 room options")).toBeVisible(); // the duplicate offer is counted once
    await expect(first.getByText("Breakfast available")).toBeVisible();
    // A compact summary: two room types, the rest behind "Show 2 more".
    await expect(first.locator("[class*=rooms] > ul > li")).toHaveCount(2);
    await first.getByText("Show 2 more").click();
    await expect(first.getByText("Deluxe King")).toBeVisible();
    await expect(first.getByText("Breakfast · King bed")).toBeVisible();
    await expect(first.getByText("Room only")).toBeVisible();
    await expect(first.getByText("Full board")).toBeVisible();
    // The image failed to load (404), so the branded placeholder replaces it.
    await expect(first.locator("[data-image-missing]")).toBeVisible();

    const second = cards.nth(1);
    await expect(second.getByRole("heading", { name: "Hotel name not provided" })).toBeVisible();
    await expect(second.locator("[aria-label$='-star hotel']")).toHaveCount(0);
    await expect(second.getByText("Room details not provided")).toBeVisible();
    await expect(second.locator("[data-image-missing]")).toBeVisible();

    const third = cards.nth(2);
    await expect(third.locator("img")).toHaveCount(0); // http images are never loaded
    await expect(third.getByText("No breakfast")).toBeVisible();
    await expect(third.getByText("Room type not provided")).toBeVisible();

    for (const card of await cards.all()) {
      // One concise state per card, and no development-stage banner above the results.
      await expect(card.getByText("Price on request")).toBeVisible();
      await expect(card.getByText(/Booking unavailable|aren't verified/)).toHaveCount(0);
      await expect(card.locator("a, button")).toHaveCount(0); // no details link and no booking action
    }
    await expect(page.getByText(/Availability preview|prices aren't verified/)).toHaveCount(0); // no development-stage banner
    await expect(cards.getByText(/\b(reviews?|guest rating|amenities|discount)\b/i)).toHaveCount(0);
    await expect(page.getByText("Hotel availability preview. Prices are not yet verified.")).toHaveCount(0); // server wording stays hidden
  });

  test("a price appears only when the search and the hotel are verified; booking needs both flags", async ({ page }) => {
    const rooms = (price: number | null) => [{ room_name: "Room", meal_name: "nomeal", has_breakfast: false, bedding_type: null, selling_price: price, booking_enabled: true }];
    const hotels = [
      hotel(0, { name: "Verified", pricing_status: "verified", booking_enabled: true, rooms: [...rooms(240.5), ...rooms(199)] }),
      hotel(1, { name: "Unverified hotel", pricing_status: "unverified", booking_enabled: true, rooms: rooms(150) }),
      hotel(2, { name: "No amount", pricing_status: "verified", booking_enabled: false, rooms: rooms(null) }),
    ];
    await signedIn(page, () => preview({ total: 3, hotels, pricing_verified: true, booking_enabled: true }));
    await page.goto(searchUrl("dubai"));
    const card = (name: string) => page.locator("[data-live-hotel]").filter({ has: page.getByRole("heading", { name, exact: true }) });
    await expect(card("Verified").getByText("$199.00")).toBeVisible();
    await expect(card("Verified").getByText("Bookable · contact us to book")).toBeVisible();
    await expect(card("Unverified hotel").getByText("Price on request")).toBeVisible();
    await expect(card("Unverified hotel").getByText("$150")).toHaveCount(0);
    await expect(card("No amount").getByText("Price on request")).toBeVisible();
    await expect(card("No amount").getByText("Bookable · contact us to book")).toHaveCount(0);
    await expect(page.getByText("Availability preview")).toHaveCount(0);
    await expect(page.locator("[data-live-hotel] a, [data-live-hotel] button")).toHaveCount(0);
  });

  test("with pricing_verified false, even a numeric selling price is not shown", async ({ page }) => {
    await signedIn(page, () => preview({ total: 1, hotels: [hotel(0, { pricing_status: "verified", rooms: [{ room_name: "Room", meal_name: null, has_breakfast: null, bedding_type: null, selling_price: 120, booking_enabled: true }], booking_enabled: true })] }));
    await page.goto(searchUrl("dubai"));
    await expect(page.locator("[data-live-hotel]").getByText("Price on request")).toBeVisible();
    await expect(page.getByText(/\$120/)).toHaveCount(0);
    await expect(page.getByText(/Availability preview|prices aren't verified/)).toHaveCount(0); // no development-stage banner
    await expect(page.getByText("Bookable · contact us to book")).toHaveCount(0);
  });
});

test.describe("B2B hotel search: pagination (mocked API)", () => {
  test("Next and Previous fetch backend pages with the full search body; visited pages aren't fetched again", async ({ page }) => {
    const api = await signedIn(page, (request) => {
      const body = request.postDataJSON();
      return preview({ total: 45, page: body.page ?? 1 });
    });
    await page.goto(searchUrl("paris", "SA"));
    const pager = page.getByRole("navigation", { name: "Result pages" });
    await expect(pager.getByText("Page 1 of 3")).toBeVisible();
    await expect(page.locator("[data-live-hotel]")).toHaveCount(20);
    await expect(pager.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(api.searches[0].postDataJSON()).not.toHaveProperty("page");

    await pager.getByRole("button", { name: "Next" }).click();
    await expect(pager.getByText("Page 2 of 3")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Test Hotel 21" })).toBeVisible();
    const second = api.searches[1].postDataJSON();
    expect(second).toEqual({ ...api.searches[0].postDataJSON(), page: 2, per_page: 20 });

    await pager.getByRole("button", { name: "Next" }).click();
    await expect(pager.getByText("Page 3 of 3")).toBeVisible();
    await expect(page.locator("[data-live-hotel]")).toHaveCount(5); // the last page holds 45 − 40
    await expect(page.getByRole("heading", { name: "Test Hotel 45" })).toBeVisible();
    await expect(pager.getByRole("button", { name: "Next" })).toBeDisabled();

    await pager.getByRole("button", { name: "Previous" }).click();
    await expect(pager.getByText("Page 2 of 3")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Test Hotel 21" })).toBeVisible();
    await pager.getByRole("button", { name: "Previous" }).click();
    await expect(page.getByRole("heading", { name: "Test Hotel 1", exact: true })).toBeVisible();
    expect(api.searches).toHaveLength(3); // pages 2 and 1 came from the cache
    expect(api.searches.map((r) => r.postDataJSON().latitude)).toEqual([48.8566, 48.8566, 48.8566]);
  });

  test("buttons are disabled while a page loads, so replies can't arrive out of order", async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    await signedIn(page, (request) => preview({ total: 60, page: request.postDataJSON().page ?? 1 }));
    await page.route("https://api.royal.test/api/v1/b2b/hotels/search", async (route) => {
      if (route.request().postDataJSON()?.page === 2) await held;
      await route.fallback();
    });
    await page.goto(searchUrl("dubai"));
    const pager = page.getByRole("navigation", { name: "Result pages" });
    await pager.getByRole("button", { name: "Next" }).click();
    await expect(page.locator("#api-hotel-results [aria-busy=true]")).toBeVisible();
    await expect(pager.getByRole("button", { name: "Next" })).toBeDisabled();
    await expect(pager.getByRole("button", { name: "Previous" })).toBeDisabled();
    release();
    await expect(page.getByRole("heading", { name: "Test Hotel 21" })).toBeVisible();
  });

  test("if the backend ignores the page request, it says so and stays on page 1", async ({ page }) => {
    await signedIn(page, () => preview({ total: 45, page: 1 }));
    await page.goto(searchUrl("dubai"));
    await page.getByRole("navigation", { name: "Result pages" }).getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Only the first page of results can be shown for this search.")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Result pages" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Test Hotel 1", exact: true })).toBeVisible();
  });

  test("if the backend rejects page fields, it says so and stays on page 1", async ({ page }) => {
    await signedIn(page, (request) => request.postDataJSON().page ? { status: 422, json: { message: "x", errors: { page: ["The page field is prohibited."] } } } : preview({ total: 45 }));
    await page.goto(searchUrl("dubai"));
    await page.getByRole("navigation", { name: "Result pages" }).getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Only the first page of results can be shown for this search.")).toBeVisible();
    await expect(page.locator("[data-live-hotel]")).toHaveCount(20);
  });

  test("a new search starts again at page 1 without page fields", async ({ page }) => {
    const api = await signedIn(page, (request) => preview({ total: 45, page: request.postDataJSON().page ?? 1 }));
    await page.goto(searchUrl("dubai"));
    await page.getByRole("navigation", { name: "Result pages" }).getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Page 2 of 3").first()).toBeVisible();
    await page.goto(searchUrl("los-angeles"));
    await expect(page.getByText("Page 1 of 3").first()).toBeVisible();
    const last = api.searches.at(-1)!.postDataJSON();
    expect(last).toMatchObject({ latitude: 34.0522, longitude: -118.2437 });
    expect(last).not.toHaveProperty("page");
  });

  test("a failed page offers Retry for that page", async ({ page }) => {
    let failed = false;
    await signedIn(page, (request) => {
      const requested = request.postDataJSON().page ?? 1;
      if (requested === 2 && !failed) { failed = true; return { status: 500, json: {} }; }
      return preview({ total: 45, page: requested });
    });
    await page.goto(searchUrl("dubai"));
    await page.getByRole("navigation", { name: "Result pages" }).getByRole("button", { name: "Next" }).click();
    await expect(state(page)).toHaveAttribute("data-search-state", "unavailable");
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByRole("heading", { name: "Test Hotel 21" })).toBeVisible();
  });

  test("the complete filter sidebar: real filters narrow the page, others never hide hotels", async ({ page }) => {
    const room = (meal: string | null, breakfast: boolean | null) => ({ room_name: "Room", meal_name: meal, has_breakfast: breakfast, bedding_type: null, selling_price: null, booking_enabled: false });
    const hotels = [
      hotel(0, { name: "Palm Court", stars: 5, address: "1 Palm Road, Jumeirah, Dubai", rooms: [room("breakfast", true), room("half-board", true)] }),
      hotel(1, { name: "City Inn", stars: 3, address: "2 Main Street, Deira, Dubai", rooms: [room("nomeal", false)] }),
      hotel(2, { name: "Palm Gardens", stars: 4, address: "3 Beach Road, Jumeirah, Dubai", rooms: [room("all-inclusive", true)] }),
      hotel(3, { name: null, stars: null, address: null, rooms: [] }),
    ];
    await signedIn(page, () => preview({ total: 4, hotels }));
    await page.goto(searchUrl("dubai"));
    const cards = page.locator("[data-live-hotel]");
    const filters = page.getByRole("group", { name: "Hotel filters" });
    await expect(cards).toHaveCount(4);
    // Every section of the original sidebar is present, in order.
    await expect(filters.locator("summary > span:first-child")).toHaveText(["Hotel Name", "Area / Location", "Top product", "Board", "Category", "Customer Review", "Establishment profile", "Amenities", "Price (USD)", "Product packaging"]);

    // Name or address.
    await filters.getByLabel("Hotel name or address").fill("palm");
    await expect(cards).toHaveCount(2);
    await expect(page.getByText("2 of 4 hotels on this page match")).toBeVisible();
    await filters.getByRole("button", { name: "Clear hotel name" }).click();
    await expect(cards).toHaveCount(4);

    // Areas come from the hotels' own addresses, never a fixed city list.
    const area = filters.locator("details", { has: page.getByText("Area / Location", { exact: true }) });
    await expect(area.getByRole("checkbox")).toHaveCount(2);
    await expect(area.locator("label")).toHaveText([/Jumeirah\s*2/, /Deira\s*1/]);
    await expect(filters.getByText(/Alexandria|Cairo|Hurghada|Sharm/)).toHaveCount(0);
    await area.getByRole("checkbox", { name: /Deira/ }).check();
    await expect(cards).toHaveCount(1);
    await area.getByRole("checkbox", { name: /Deira/ }).uncheck();

    // Board plans follow the real meal codes; plans no room offers are disabled.
    const board = filters.locator("details", { has: page.getByText("Board", { exact: true }) });
    await expect(board.getByRole("checkbox", { name: "Full Board" })).toBeDisabled();
    await expect(board.getByRole("checkbox", { name: "Ultra All Inclusive" })).toBeDisabled();
    await board.getByRole("checkbox", { name: "Half Board" }).check();
    await expect(cards).toHaveCount(1);
    await board.getByRole("checkbox", { name: "Room Only" }).check();
    await expect(cards).toHaveCount(2);
    await filters.getByRole("button", { name: "Reset filters" }).click();
    await board.getByRole("checkbox", { name: "Breakfast available" }).check();
    await expect(cards).toHaveCount(2);
    await filters.getByRole("button", { name: "Reset filters" }).click();

    // Category: star checkboxes; a hotel without a rating never matches.
    await filters.getByRole("checkbox", { name: "5 stars" }).check();
    await filters.getByRole("checkbox", { name: "3 stars" }).check();
    await expect(cards).toHaveCount(2);
    await filters.getByRole("button", { name: "Reset filters" }).click();
    await expect(cards).toHaveCount(4);
    await expect(filters.getByRole("button", { name: "Reset filters" })).toBeDisabled();

    // Sections the search has no data for are shown, disabled, and never hide a hotel.
    for (const title of ["Top product", "Customer Review", "Establishment profile", "Amenities", "Price (USD)", "Product packaging"]) {
      const section = filters.locator("details", { has: page.getByText(title, { exact: true }) });
      await expect(section).toHaveAttribute("data-disabled");
      await section.locator("summary").click();
      await expect(section.getByText(/Not available for these results\.|Available once prices are confirmed\./)).toBeVisible();
    }
    await expect(filters.getByRole("checkbox", { name: "Business Hotels" })).toBeDisabled();
    await expect(filters.getByRole("radio", { name: "Very Good 4+" })).toBeDisabled();
    await expect(filters.getByRole("checkbox", { name: "Pool" })).toBeDisabled();
    await expect(filters.getByRole("checkbox", { name: "Gym" })).toBeHidden();
    await filters.getByRole("button", { name: "View More" }).click();
    await expect(filters.getByRole("checkbox", { name: "Gym" })).toBeDisabled();
    await expect(filters.getByRole("button", { name: "View Less" })).toHaveAttribute("aria-expanded", "true");
    await expect(filters.getByLabel("Min.")).toBeDisabled();
    await expect(filters.getByRole("radio", { name: "With Package" })).toBeDisabled();
    await expect(cards).toHaveCount(4);
    await expect(filters.getByText(/Coming soon|Preview/i)).toHaveCount(0);
    // No price amount appears anywhere while prices are unverified.
    await expect(page.locator("[data-price=verified]")).toHaveCount(0);
  });

  test("the price range filters only verified prices, and only when the page has them", async ({ page }) => {
    const rooms = (price: number) => [{ room_name: "Room", meal_name: "nomeal", has_breakfast: false, bedding_type: null, selling_price: price, booking_enabled: true }];
    const hotels = [
      hotel(0, { name: "Low", pricing_status: "verified", rooms: rooms(90) }),
      hotel(1, { name: "High", pricing_status: "verified", rooms: rooms(400) }),
      hotel(2, { name: "On request", pricing_status: "unverified", rooms: rooms(120) }),
    ];
    await signedIn(page, () => preview({ total: 3, hotels, pricing_verified: true }));
    await page.goto(searchUrl("dubai"));
    const filters = page.getByRole("group", { name: "Hotel filters" });
    const price = filters.locator("details", { has: page.getByText("Price (USD)", { exact: true }) });
    await expect(price).toHaveAttribute("open", "");
    await expect(price).not.toHaveAttribute("data-disabled");
    await price.getByLabel("Max.").fill("200");
    await expect(page.locator("[data-live-hotel]")).toHaveCount(1);
    await expect(page.locator("[data-live-hotel] h3")).toHaveText("Low");
    await expect(page.getByText("1 of 3 hotels on this page match")).toBeVisible();
  });

  test("phone and tablet: the sidebar opens from a Filters button and closes with Show hotels", async ({ page }) => {
    await signedIn(page, () => preview({ total: 3 }));
    for (const width of [375, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(searchUrl("dubai"));
      const toggle = page.getByRole("button", { name: /^Filters/ });
      const panel = page.locator("#api-hotel-filters");
      await expect(panel).toBeHidden();
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(panel.getByRole("group", { name: "Hotel filters" })).toBeVisible();
      await panel.getByRole("checkbox", { name: "4 stars" }).check();
      await expect(toggle.locator("span").first()).toHaveText("1");
      await panel.getByRole("button", { name: "Show 3 hotels" }).click();
      await expect(panel).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    }
  });

  test("sorting uses only values the API returned: stars or name, missing values last; filters can match nothing", async ({ page }) => {
    const hotels = [hotel(0, { name: "Coral", stars: 3 }), hotel(1, { name: null, stars: 5 }), hotel(2, { name: "Atlas", stars: null }), hotel(3, { name: "Bay", stars: 4 })];
    await signedIn(page, () => preview({ total: 4, hotels }));
    await page.goto(searchUrl("dubai"));
    const names = () => page.locator("#api-hotel-results [data-live-hotel] h3").allInnerTexts();
    await expect(page.locator("#api-hotel-results [data-live-hotel]")).toHaveCount(4);
    expect(await names()).toEqual(["Coral", "Hotel name not provided", "Atlas", "Bay"]);
    const sort = page.getByLabel("Sort by");
    await expect(page.getByText("Filters and sorting apply to the hotels on this page.")).toHaveCount(0);
    await sort.selectOption("stars");
    expect(await names()).toEqual(["Hotel name not provided", "Bay", "Coral", "Atlas"]);
    await sort.selectOption("name");
    expect(await names()).toEqual(["Atlas", "Bay", "Coral", "Hotel name not provided"]);
    await sort.selectOption("recommended");
    expect(await names()).toEqual(["Coral", "Hotel name not provided", "Atlas", "Bay"]);
    await page.getByLabel("Hotel name or address").fill("no such hotel");
    await expect(page.getByText("0 of 4 hotels on this page match")).toBeVisible();
    await expect(page.locator("[data-search-state=no-match]")).toHaveText("No hotels on this page match these filters.");
    await page.getByRole("button", { name: "Reset filters" }).click();
    await expect(page.locator("#api-hotel-results [data-live-hotel]")).toHaveCount(4);
  });
});

test.describe("B2B hotel search: home page (mocked API)", () => {
  test("signed in: one default search fills both hotel sections with real results", async ({ page }) => {
    const api = await signedIn(page, () => preview({ total: 88 }));
    await page.goto(APP + "/");
    const featured = page.locator("[data-live-home=featured]");
    await expect(featured).toHaveAttribute("data-search-state", "results");
    await expect(featured.locator("[data-live-hotel]")).toHaveCount(10);
    await expect(featured.getByRole("heading", { name: "Test Hotel 1", exact: true })).toBeVisible();
    await expect(featured.getByText(/Available in Dubai, .* 2 adults · prices not yet verified/)).toBeVisible();
    await expect(featured.getByRole("link", { name: "See all 88 hotels" })).toHaveAttribute("href", /\/search\?destination=dubai&nationality=EG&checkIn=\d{4}-\d{2}-\d{2}/);

    const collection = page.locator("[data-live-home=collection]");
    await collection.scrollIntoViewIfNeeded();
    // The original section: illustration, heading, description, toolbar and sliding strip.
    await expect(collection.locator(".hotel-miniature")).toHaveCount(1);
    await expect(collection.getByRole("heading", { name: "Stay At Best Hotels", level: 2 })).toBeVisible();
    await expect(collection.getByText("Discover handpicked hotels tailored to your needs and budget")).toBeVisible();
    // Real hotels 11–18 from the same reply; the copies that keep the strip seamless are hidden from assistive technology.
    const visibleNames = await collection.locator(".hotel-miniature ~ * [data-live-hotel]:not([aria-hidden] [data-live-hotel]) h3").allInnerTexts();
    expect(visibleNames.slice(0, 8)).toEqual(Array.from({ length: 8 }, (_, i) => `Test Hotel ${i + 11}`));
    await expect(collection.locator("[data-collection-marquee]")).toHaveAttribute("data-running", "true");
    // No information line under the toolbar; the cards keep their own price and booking notices.
    await expect(collection.getByText(/Available in|prices not yet verified/)).toHaveCount(0);
    await expect(collection.locator(".hotel-miniature ~ p, [role=status]").filter({ hasText: /Available/ })).toHaveCount(0);
    await expect(collection.locator("[data-live-hotel]").first().getByText("Price on request")).toBeAttached();
    await expect(collection.locator("#hotel-city option")).toHaveCount(7);
    await expect(page.getByText(/Golden Rose Hotel|Illustrative/)).toHaveCount(0);

    // One request, shared by both sections: future dates, 3 nights, Dubai's coordinates.
    expect(api.searches).toHaveLength(1);
    const body = api.searches[0].postDataJSON();
    expect(body).toMatchObject({ latitude: 25.2048, longitude: 55.2708, radius: 10000, residency: "eg", language: "en", currency: "USD", guests: [{ adults: 2, children: [] }] });
    const days = (value: string) => Math.round((Date.parse(value) - Date.parse(new Date().toISOString().slice(0, 10))) / 86_400_000);
    expect(days(body.checkin)).toBeGreaterThanOrEqual(29);
    expect(days(body.checkout) - days(body.checkin)).toBe(3);
    expect(body).not.toHaveProperty("page");
  });

  test("Stay At Best Hotels slides to the left, pauses for touch, and its search opens real results", async ({ page }) => {
    await signedIn(page, (request) => preview({ total: 88, page: request.postDataJSON().page ?? 1 }));
    await page.goto(APP + "/");
    const collection = page.locator("[data-live-home=collection]");
    const strip = collection.locator("[data-collection-marquee]");
    // The strip is one element from loading to loaded; it starts moving once the hotels arrive.
    const before = await strip.elementHandle();
    await expect(collection).toHaveAttribute("data-search-state", "results");
    expect(await strip.evaluate((element, original) => element === original, before)).toBe(true);
    await strip.scrollIntoViewIfNeeded();
    await expect(strip).toHaveAttribute("data-running", "true");
    const offset = () => strip.locator("> div").evaluate((track) => new DOMMatrix(getComputedStyle(track).transform).m41);
    const start = await offset();
    await page.waitForTimeout(1200);
    expect(await offset()).toBeLessThan(start - 10); // moving toward the left
    await strip.dispatchEvent("touchstart");
    await expect(strip).toHaveAttribute("data-running", "false");
    await strip.dispatchEvent("touchend");
    await expect(strip).toHaveAttribute("data-running", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

    await page.locator("#hotel-city").selectOption("paris");
    // React Router 7 changes the URL before the new page has rendered, so the home page (with its own
    // Dubai cards and request) can still be on screen. Wait for the search that the click causes.
    const parisSearch = page.waitForRequest((request) => request.method() === "POST" && new URL(request.url()).pathname === "/api/v1/b2b/hotels/search");
    await page.locator("[data-live-home=collection]").getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/search\?destination=paris/);
    expect((await parisSearch).postDataJSON()).toMatchObject({ latitude: 48.8566, longitude: 2.3522 });
    await expect(page.locator("#api-hotel-results [data-live-hotel]").first()).toBeVisible();
  });

  test("Stay At Best Hotels holds still with reduced motion and still shows every hotel", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signedIn(page, () => preview({ total: 18 }));
    await page.goto(APP + "/");
    const collection = page.locator("[data-live-home=collection]");
    await collection.scrollIntoViewIfNeeded();
    await expect(collection.locator("[data-collection-marquee]")).toHaveAttribute("data-reduced", "true");
    const visible = collection.locator("[data-live-hotel]:visible");
    await expect(visible).toHaveCount(8);
    expect(await collection.locator("[data-collection-marquee] > div").evaluate((track) => getComputedStyle(track).animationName)).toBe("none");
  });

  test("a short result reuses the same hotels in the strip and sends no second request", async ({ page }) => {
    const api = await signedIn(page, () => preview({ total: 4 }));
    await page.goto(APP + "/");
    const collection = page.locator("[data-live-home=collection]");
    await collection.scrollIntoViewIfNeeded();
    await expect(collection).toHaveAttribute("data-search-state", "results");
    await expect(collection.getByRole("heading", { name: "Test Hotel 1", exact: true }).first()).toBeAttached();
    expect(api.searches).toHaveLength(1);
  });

  test("signed in: a failed default search explains itself, retries, and shows no sample hotels", async ({ page }) => {
    const api = await signedIn(page, (_, attempt) => (attempt === 1 ? supplierUnavailable : preview({ total: 2 })));
    await page.goto(APP + "/");
    const featured = page.locator("[data-live-home=featured]");
    await expect(featured).toHaveAttribute("data-search-state", "supplier_unavailable");
    await expect(featured.getByText("Hotel search is unavailable")).toBeVisible();
    await expect(page.getByText(/Golden Rose Hotel|Illustrative/)).toHaveCount(0);
    await featured.getByRole("button", { name: "Retry" }).click();
    await expect(page.locator("[data-live-home=featured]")).toHaveAttribute("data-search-state", "results");
    expect(api.searches).toHaveLength(2);
  });

  test("Arabic: live home sections in Arabic with the language sent", async ({ page }) => {
    const api = await signedIn(page, () => preview({ total: 12 }), "ar");
    await page.goto(APP + "/");
    await expect(page.locator("[data-live-home=featured]")).toHaveAttribute("data-search-state", "results");
    await expect(page.getByText(/المتاح في دبي/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "أقم في أفضل الفنادق" })).toBeVisible();
    await expect(page.locator("[data-live-home=collection]").getByText(/المتاح في/)).toHaveCount(0);
    expect(api.searches[0].postDataJSON().language).toBe("ar");
  });

  test("signed out: no hotel request and no hotel listings; the public page shows sign-in instead", async ({ page }) => {
    const searches: string[] = [];
    await page.route("https://api.royal.test/**", (route) => {
      if (route.request().url().includes("hotels/search")) searches.push(route.request().url());
      return route.fulfill({ status: 200, headers: cors, json: { locale: "en", direction: "ltr" } });
    });
    await page.goto(APP + "/");
    // Signed-out visitors get the public welcome screen with sign-in choices, not the hotel sections.
    await expect(page.getByRole("heading", { name: "Your Journey Starts Here" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Existing Partner/ })).toBeVisible();
    await expect(page.locator("[data-live-hotel], [data-live-home]")).toHaveCount(0);
    await page.waitForTimeout(500);
    expect(searches).toEqual([]);
  });
});

test.describe("B2B hotel search: responsive layout (mocked API)", () => {
  for (const locale of ["en", "ar"] as const) {
    for (const width of [320, 375, 430, 768, 1024, 1440, 1920]) {
      test(`${locale} ${width}px: results and home sections fit without sideways scroll`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        const long = hotel(0, { name: "The Exceptionally Long Named Grand Royal Palace Hotel And Residences Downtown", address: "Sheikh Mohammed bin Rashid Boulevard, Downtown Dubai, United Arab Emirates" });
        await signedIn(page, (request) => preview({ total: 45, page: request.postDataJSON().page ?? 1, hotels: request.postDataJSON().page ? undefined : [long, ...Array.from({ length: 19 }, (_, i) => hotel(i + 1))] }), locale);
        await page.goto(searchUrl("dubai"));
        await expect(page.locator("[data-live-hotel]")).toHaveCount(20);
        const fits = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(await fits()).toBeLessThanOrEqual(1);
        // Cards sit inside the viewport and the long name wraps instead of being cut off.
        const geometry = await page.locator("[data-live-hotel]").first().evaluate((card) => {
          const name = card.querySelector("h3")!;
          return { left: card.getBoundingClientRect().left, right: card.getBoundingClientRect().right, nameOverflow: name.scrollWidth - name.clientWidth };
        });
        expect(geometry.left).toBeGreaterThanOrEqual(0);
        expect(geometry.right).toBeLessThanOrEqual(width);
        expect(geometry.nameOverflow).toBeLessThanOrEqual(0);
        const pager = page.getByRole("navigation", { name: locale === "ar" ? "صفحات النتائج" : "Result pages" });
        await pager.scrollIntoViewIfNeeded();
        for (const button of await pager.getByRole("button").all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);

        await page.goto(APP + "/");
        await expect(page.locator("[data-live-home=featured]")).toHaveAttribute("data-search-state", "results");
        await page.locator("[data-live-home=collection]").scrollIntoViewIfNeeded();
        await expect(page.locator("[data-live-home=collection] [data-live-hotel]").first()).toBeVisible();
        expect(await fits()).toBeLessThanOrEqual(1);
      });
    }
  }
});

test.describe("Car Rental services", () => {
  for (const width of [320, 768, 1440]) {
    test(`${width}px: Self-Drive Rental and Airport Transfers only, balanced and within the page`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await signedIn(page, () => preview({ total: 0 }));
      await page.goto(APP + "/car-rental");
      const cards = page.locator(".rental-service-card");
      await expect(cards.locator("strong")).toHaveText(["Self-Drive Rental", "Airport Transfers"]);
      const boxes = await Promise.all((await cards.all()).map((card) => card.boundingBox()));
      if (width > 800) {
        expect(Math.abs(boxes[0]!.y - boxes[1]!.y)).toBeLessThan(2); // side by side
        expect(Math.abs(boxes[0]!.width - boxes[1]!.width)).toBeLessThan(2);
      } else {
        expect(boxes[1]!.y).toBeGreaterThan(boxes[0]!.y); // stacked
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await cards.filter({ hasText: "Airport Transfers" }).click();
      await expect(page).toHaveURL(/\/contact\?subject=airport-transfers$/);
    });
  }
});
