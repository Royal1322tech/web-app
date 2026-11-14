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
async function signedIn(page: Page, search: (request: Request, attempt: number) => Reply, locale: "en" | "ar" = "en") {
  const searches: Request[] = [];
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
    if (request.method() === "POST" && path === "/api/v1/b2b/hotels/search") {
      searches.push(request);
      const reply = search(request, searches.length);
      if (reply.abort) return route.abort("connectionrefused");
      return route.fulfill({ status: reply.status ?? 200, headers: cors, json: reply.json ?? {} });
    }
    unexpected.push(`${request.method()} ${path}`);
    return route.fulfill({ status: 500, headers: cors, json: {} });
  });
  return { searches, unexpected };
}

const supplierUnavailable: Reply = { status: 503, json: { success: false, code: "HOTEL_SUPPLIER_UNAVAILABLE", message: "Hotel search is currently unavailable.", data: { hotels: [], total: 0 } } };
const results = (total: number): Reply => ({ json: { success: true, data: { hotels: Array.from({ length: total }, (_, i) => ({ id: `h-${i}` })), total } } });
const state = (page: Page) => page.locator("#api-hotel-results [data-search-state]");

/** No sample hotel, illustrative price or demo notice may appear in API mode. */
async function expectNoSampleInventory(page: Page) {
  await expect(page.locator("#api-hotel-results article, #hotel-filters")).toHaveCount(0);
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
    expect(parseB2BHotelSearch({ success: true, data: { hotels: [{ id: "x" }], total: 1 } })).toEqual({ total: 1, hotels: [{ id: "x" }] });
    for (const value of [supplierUnavailable.json, {}, { message: "Unauthenticated." }, { success: true }, { success: true, data: { hotels: "x", total: 0 } }]) expect(() => parseB2BHotelSearch(value)).toThrow();
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
  test("the home form searches Dubai with the company token and coordinates, then shows the result count without sample hotels", async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const api = await signedIn(page, () => results(3));
    await page.route("https://api.royal.test/api/v1/b2b/hotels/search", async (route) => { await held; await route.fallback(); });
    await page.goto(APP + "/");
    await expect(page.locator("#destination option")).toHaveCount(8);
    const options = await page.locator("#destination option").allTextContents();
    expect(options.map((o) => o.trim())).toEqual(["Select destination", "Alexandria", "Cairo", "Hurghada", "Sharm El Sheikh", "Dubai", "Paris", "Los Angeles"]);
    await page.locator("#destination").selectOption("dubai");
    await page.locator("#check-in").fill("2030-12-06");
    await page.locator("#check-out").fill("2030-12-09");
    await page.locator("#hotel-search button[type=submit]").click();
    await expect(page).toHaveURL(/\/search\?destination=dubai/);
    await expect(page.locator("#api-hotel-results [aria-busy=true]")).toBeVisible();
    release();
    await expect(state(page)).toHaveAttribute("data-search-state", "results-pending");
    await expect(page.getByRole("heading", { name: "3 hotels found" })).toBeVisible();
    await expectNoSampleInventory(page);
    expect(api.searches).toHaveLength(1);
    const request = api.searches[0];
    expect(request.headers()["authorization"]).toBe(`Bearer ${TOKEN}`);
    expect(request.headers()["x-locale"]).toBe("en");
    expect(request.postDataJSON()).toEqual({ checkin: "2030-12-06", checkout: "2030-12-09", latitude: 25.2048, longitude: 55.2708, radius: 10000, residency: "eg", language: "en", currency: "USD", guests: [{ adults: 2, children: [] }] });
    expect(api.unexpected).toEqual([]);
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
    await expect(state(page)).toHaveAttribute("data-search-state", "results-pending");
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
    await expect(page.locator("#destination option[value=dubai]")).toHaveText("دبي");
    await expect(page.locator("#destination")).toHaveValue("los-angeles");
  });

  test("Arabic sends language ar; an unsupported preferred currency falls back to USD with a visible note", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("royal-vacation.travel-preferences", JSON.stringify({ currency: "AED", nationality: "EG" })));
    const api = await signedIn(page, () => results(0), "ar");
    await page.goto(searchUrl("paris"));
    await expect(state(page)).toHaveAttribute("data-search-state", "empty");
    expect(api.searches[0].postDataJSON()).toMatchObject({ language: "ar", currency: "USD", latitude: 48.8566, longitude: 2.3522 });
    expect(api.searches[0].headers()["x-locale"]).toBe("ar");
    await expect(page.getByRole("note").filter({ hasText: "AED" })).toBeVisible();
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
      if (width >= 1024) await expect(page.locator("#destination")).toHaveValue("dubai");
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
