import { expect, test, type Page, type Request } from "@playwright/test";

/*
 * End-to-end user journeys across pages, against MOCKED API replies. These are browser journeys, not
 * backend integration tests: the build on port 4176 (real sign-in plus company hotel search) points at
 * api.royal.test, which never resolves, and every request is answered here. Replies follow the
 * backend contract, including the exact 503 HOTEL_SEARCH_NOT_READY body staging returns today.
 */
const APP = "http://127.0.0.1:4176";
const COMPANY = "8f14e45f-ceea-467a-9575-3c4b1f0b5c1a";
const TOKEN = "31|mocked-journey-token";
const EMAIL = "owner@example.com";
const PASSWORD = "Correct-Horse-9!";
const SESSION_KEY = "royal-travel.b2b-session.v1";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, X-Locale", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const rooms = encodeURIComponent(JSON.stringify([{ adults: 2, childAges: [] }]));
const searchPath = (destination: string, nationality = "AL") => `/search?destination=${destination}&nationality=${nationality}&checkIn=2030-12-06&checkOut=2030-12-15&rooms=${rooms}`;

/** Staging's reply when the supplier call fails (confirmed on the server, 2026-11-17). */
const NOT_READY = { status: 503, json: { success: false, code: "HOTEL_SEARCH_NOT_READY", message: "Hotel search is temporarily unavailable.", data: { hotels: [], total: 0 } } };
const CITY_BY_LATITUDE: Record<number, string> = { 25.2048: "Dubai", 48.8566: "Paris", 34.0522: "Los Angeles" };

type Reply = { status?: number; json?: unknown; abort?: boolean };
/** Fictional hotels named after the searched city, so a stale reply is easy to spot. */
function results(request: Request, total = 3): Reply {
  const city = CITY_BY_LATITUDE[request.postDataJSON().latitude] ?? "Elsewhere";
  return {
    json: {
      success: true, code: "HOTEL_SEARCH_PREVIEW", message: "Hotel availability preview. Prices are not yet verified.",
      data: {
        hotels: Array.from({ length: total }, (_, index) => ({ result_index: index, name: `${city} Test Hotel ${index + 1}`, address: `${index + 1} Test Street`, stars: 4, image: null, rooms: [], pricing_status: "unverified", booking_enabled: false })),
        total, page: 1, per_page: 20, currency: "USD", supplier_currency: "USD", pricing_verified: false, booking_enabled: false,
      },
    },
  };
}
const profile = {
  message: "Profile retrieved successfully.",
  data: {
    user: { id: 7, name: "Laila Hassan", email: EMAIL },
    company: { id: COMPANY, name: "Nile Gate Tours", legal_name: "Nile Gate Tours LLC", display_name: "Nile Gate Tours", status: "approved", account_currency: "USD", preferred_locale: "en", country_code: "EG", city: "Alexandria", address: "1 Corniche Road", business_type: "travel_agency", registration_no: "CR-1", tax_no: null, employee_count: 12 },
    membership: { role_code: "company_admin", status: "active" },
  },
};

/** Answers every API call. `search` decides each hotel search reply; anything unhandled is recorded. */
async function mockApi(page: Page, search: (request: Request, attempt: number) => Reply | Promise<Reply> = (request) => results(request), extra: Record<string, () => Reply> = {}) {
  const calls: string[] = [];
  const searches: Request[] = [];
  const unexpected: string[] = [];
  await page.route("https://api.royal.test/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const key = `${request.method()} ${new URL(request.url()).pathname.replace("/api/v1", "")}`;
    if (key === "GET /foundation-check") return route.fulfill({ status: 200, headers: cors, json: { locale: "en", direction: "ltr" } });
    calls.push(key);
    let reply: Reply | undefined;
    if (extra[key]) reply = extra[key]();
    else if (key === "POST /b2b/auth/login") reply = { json: { message: "Login successful.", token_type: "Bearer", access_token: TOKEN, expires_in: 3600, company_id: COMPANY, user: { id: 7, name: "Laila Hassan", email: EMAIL } } };
    else if (key === "GET /b2b/me") reply = { json: profile };
    else if (key === "POST /b2b/auth/logout") reply = { json: { message: "Logged out successfully." } };
    else if (key === "POST /b2b/hotels/search") { searches.push(request); reply = await search(request, searches.length); }
    if (!reply) { unexpected.push(key); return route.fulfill({ status: 500, headers: cors, json: {} }); }
    if (reply.abort) return route.abort("connectionrefused");
    return route.fulfill({ status: reply.status ?? 200, headers: cors, json: reply.json ?? {} });
  }, { times: undefined });
  return { calls, searches, unexpected, count: (key: string) => calls.filter((call) => call === key).length };
}

/** A company session that the mocked /me confirms. */
async function withSession(page: Page, locale: "en" | "ar" = "en") {
  await page.addInitScript(({ key, token, companyId, locale }) => {
    if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, JSON.stringify({ token, expiresAt: Date.now() + 3_600_000, companyId }));
    localStorage.setItem("royal-vacation.locale", locale);
  }, { key: SESSION_KEY, token: TOKEN, companyId: COMPANY, locale });
}

async function signIn(page: Page) {
  await page.getByLabel(/^Email$/).fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Company ID").fill(COMPANY);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
}

/** Below tablet width the search form is folded behind "Edit search"; at desktop it is always open. */
async function openSearchForm(page: Page) {
  const edit = page.getByRole("button", { name: "Edit search" });
  if (await edit.isVisible()) await edit.click();
}

const results$ = (page: Page) => page.locator("#api-hotel-results [data-search-state]");
const hotelNames = (page: Page) => page.locator("#api-hotel-results [data-live-hotel] h3");
const searchesFor = (api: { searches: Request[] }, latitude: number) => api.searches.filter((request) => request.postDataJSON().latitude === latitude).length;
const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe("journey: sign in, browse hotels, sign out (mocked API)", () => {
  test("sign in → home default search fails with staging's 503 → Retry → results → Stay At Best Hotels search → reload → sign out", async ({ page }) => {
    const api = await mockApi(page, (request, attempt) => (attempt === 1 ? NOT_READY : results(request, 12)));
    await page.goto(APP + "/login");
    await signIn(page);
    await expect(page).toHaveURL(`${APP}/`);

    // The home page sends one default search, shared by both sections, and both explain the 503.
    const featured = page.locator("[data-live-home=featured]");
    const collection = page.locator("[data-live-home=collection]");
    await expect(featured).toHaveAttribute("data-search-state", "not_ready");
    await expect(featured.getByText("Search results aren't ready")).toBeVisible();
    await expect(collection).toHaveAttribute("data-search-state", "not_ready");
    await expect(collection.getByText("Hotels couldn't be loaded right now. Use the search above to try again.")).toBeVisible();
    await expect(page.locator("[data-live-hotel]")).toHaveCount(0);
    expect(api.searches).toHaveLength(1);

    // Retry sends exactly one new request and "A world of stays" recovers from it. (Stay At Best
    // Hotels doesn't follow yet: see the known-defect test below.)
    await featured.getByRole("button", { name: "Retry" }).click();
    await expect(featured).toHaveAttribute("data-search-state", "results");
    await expect(featured.getByText("Dubai Test Hotel 1").first()).toBeVisible();
    expect(api.searches).toHaveLength(2);

    // Stay At Best Hotels: choose Paris and search; the results page shows Paris hotels only.
    await collection.locator("#hotel-city").selectOption("paris");
    const parisSearch = page.waitForRequest((request) => request.url().endsWith("/b2b/hotels/search") && request.postDataJSON()?.latitude === 48.8566);
    await collection.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/search\?destination=paris/);
    await parisSearch;
    await expect(results$(page)).toHaveAttribute("data-search-state", "results");
    await expect(hotelNames(page)).toHaveText(Array.from({ length: 12 }, (_, i) => `Paris Test Hotel ${i + 1}`));

    // A reload re-checks the session with the server and repeats only this search.
    const meBefore = api.count("GET /b2b/me");
    const parisBefore = searchesFor(api, 48.8566);
    await page.reload();
    await expect(results$(page)).toHaveAttribute("data-search-state", "results");
    expect(api.count("GET /b2b/me")).toBeGreaterThan(meBefore);
    expect(searchesFor(api, 48.8566)).toBe(parisBefore + 1);

    // Sign out revokes the token, clears the session and closes private pages, including via Back.
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page).toHaveURL(/\/welcome$/);
    expect(api.count("POST /b2b/auth/logout")).toBe(1);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), SESSION_KEY)).toBeNull();
    const searchesAtSignOut = api.searches.length;
    // Back lands on a public page (signed out, "/" is the welcome screen), never on private results.
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`^${APP}/(welcome)?$`));
    await expect(page.getByRole("heading", { name: "Your Journey Starts Here" })).toBeVisible();
    await expect(page.locator("[data-live-hotel], [data-live-home]")).toHaveCount(0);
    await page.goto(APP + searchPath("dubai"));
    await expect(page).toHaveURL(/\/welcome/);
    expect(api.searches).toHaveLength(searchesAtSignOut);
    expect(api.unexpected).toEqual([]);
  });

  test("KNOWN DEFECT: after Retry in A world of stays, Stay At Best Hotels still shows the error", async ({ page }) => {
    test.info().annotations.push({ type: "issue", description: "useDefaultHotelSearch keeps a separate retry counter per section, so the shared retry result never reaches the other section. Remove test.fail() once fixed." });
    test.fail();
    await withSession(page);
    const api = await mockApi(page, (request, attempt) => (attempt === 1 ? NOT_READY : results(request, 12)));
    await page.goto(APP + "/");
    const featured = page.locator("[data-live-home=featured]");
    await expect(featured).toHaveAttribute("data-search-state", "not_ready");
    await featured.getByRole("button", { name: "Retry" }).click();
    await expect(featured).toHaveAttribute("data-search-state", "results");
    expect(api.searches).toHaveLength(2);
    await expect(page.locator("[data-live-home=collection]")).toHaveAttribute("data-search-state", "results", { timeout: 3000 });
  });

  test("on a phone: sign in, search from the home form, and read results without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const api = await mockApi(page);
    await page.goto(APP + "/login");
    await signIn(page);
    await expect(page.locator("[data-live-home=featured]")).toHaveAttribute("data-search-state", "results");
    await page.locator("#destination").selectOption("dubai");
    await page.locator("#check-in").fill("2030-12-06");
    await page.locator("#check-out").fill("2030-12-15");
    await page.locator("#search-nationality").selectOption("AL");
    await page.locator("#hotel-search button[type=submit]").click();
    await expect(page).toHaveURL(/\/search\?destination=dubai.*nationality=AL/);
    await expect(results$(page)).toHaveAttribute("data-search-state", "results");
    await expect(hotelNames(page).first()).toHaveText("Dubai Test Hotel 1");
    const mine = api.searches.filter((request) => request.postDataJSON().checkin === "2030-12-06");
    expect(mine).toHaveLength(1);
    expect(mine[0].postDataJSON()).toMatchObject({ checkout: "2030-12-15", residency: "al", latitude: 25.2048 });
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
  });
});

test.describe("hotel search results: staging's real failure reply (mocked API)", () => {
  for (const locale of ["en", "ar"] as const) {
    test(`${locale}: 503 HOTEL_SEARCH_NOT_READY shows its own message and no hotels; Retry sends one request and recovers`, async ({ page }) => {
      await withSession(page, locale);
      const api = await mockApi(page, (request, attempt) => (attempt === 1 ? NOT_READY : results(request)));
      await page.goto(APP + searchPath("dubai"));
      await expect(results$(page)).toHaveAttribute("data-search-state", "not_ready");
      await expect(page.getByRole("alert").getByText(locale === "ar" ? "نتائج البحث غير جاهزة" : "Search results aren't ready")).toBeVisible();
      // The server's wording is never shown, and nothing pretends to be a hotel.
      await expect(page.getByText("Hotel search is temporarily unavailable.")).toHaveCount(0);
      await expect(page.locator("[data-live-hotel], [data-skeleton]")).toHaveCount(0);
      if (locale === "ar") await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      expect(api.searches).toHaveLength(1);

      await page.getByRole("button", { name: locale === "ar" ? "إعادة المحاولة" : "Retry" }).click();
      await expect(results$(page)).toHaveAttribute("data-search-state", "results");
      await expect(page.locator("#api-hotel-results [data-live-hotel]")).toHaveCount(3);
      expect(api.searches).toHaveLength(2);
      expect(api.searches[1].postDataJSON()).toEqual(api.searches[0].postDataJSON());
    });
  }

  test("a 500 shows the general unavailable message with Retry, and Retry failing again keeps the message", async ({ page }) => {
    await withSession(page);
    const api = await mockApi(page, () => ({ status: 500, json: { message: "Server Error" } }));
    await page.goto(APP + searchPath("dubai"));
    await expect(results$(page)).toHaveAttribute("data-search-state", "unavailable");
    await expect(page.getByText("Something went wrong on our side. Please try again later.")).toBeVisible();
    await page.getByRole("button", { name: "Retry" }).click();
    await expect.poll(() => api.searches.length).toBe(2);
    await expect(results$(page)).toHaveAttribute("data-search-state", "unavailable");
    await expect(page.getByText("Server Error")).toHaveCount(0);
  });
});

test.describe("hotel search results: navigation and races (mocked API)", () => {
  test("changing the destination while a search is still loading never shows the old destination's hotels", async ({ page }) => {
    await withSession(page);
    let releaseDubai!: () => void;
    const dubaiHeld = new Promise<void>((resolve) => { releaseDubai = resolve; });
    const api = await mockApi(page, async (request) => {
      if (request.postDataJSON().latitude === 25.2048) await dubaiHeld;
      return results(request);
    });
    await page.goto(APP + searchPath("dubai"));
    await expect(page.locator("#api-hotel-results [aria-busy=true]")).toBeVisible();

    await openSearchForm(page);
    await page.locator("#destination").selectOption("paris");
    await page.locator("#hotel-search button[type=submit]").click();
    await expect(page).toHaveURL(/destination=paris/);
    await expect(hotelNames(page)).toHaveText(["Paris Test Hotel 1", "Paris Test Hotel 2", "Paris Test Hotel 3"]);

    // The Dubai reply arrives late; it must be ignored.
    releaseDubai();
    await expect.poll(() => searchesFor(api, 25.2048)).toBe(1);
    await expect(page.getByRole("heading", { name: "3 hotels in Paris" })).toBeVisible();
    await expect(page.getByText(/Dubai Test Hotel/)).toHaveCount(0);
    await expect(hotelNames(page)).toHaveText(["Paris Test Hotel 1", "Paris Test Hotel 2", "Paris Test Hotel 3"]);
  });

  test("Back and Forward between two searches show each search's own hotels, one request per visit", async ({ page }) => {
    await withSession(page);
    const api = await mockApi(page);
    await page.goto(APP + searchPath("dubai"));
    await expect(hotelNames(page).first()).toHaveText("Dubai Test Hotel 1");
    await openSearchForm(page);
    await page.locator("#destination").selectOption("los-angeles");
    await page.locator("#hotel-search button[type=submit]").click();
    await expect(hotelNames(page).first()).toHaveText("Los Angeles Test Hotel 1");

    await page.goBack();
    await expect(page).toHaveURL(/destination=dubai/);
    await expect(page.getByRole("heading", { name: "3 hotels in Dubai" })).toBeVisible();
    await expect(page.getByText(/Los Angeles Test Hotel/)).toHaveCount(0);
    await page.goForward();
    await expect(page).toHaveURL(/destination=los-angeles/);
    await expect(page.getByRole("heading", { name: "3 hotels in Los Angeles" })).toBeVisible();
    await expect(page.getByText(/Dubai Test Hotel/)).toHaveCount(0);
    // Each visit sends exactly one search: two for Dubai (first visit, Back), two for Los Angeles.
    expect(searchesFor(api, 25.2048)).toBe(2);
    expect(searchesFor(api, 34.0522)).toBe(2);
  });
});

test.describe("routes in the real sign-in build (mocked API)", () => {
  test("an unknown address: signed in shows the 404 page with a way home; signed out goes to the welcome page", async ({ page, context }) => {
    await withSession(page);
    await mockApi(page);
    await page.goto(APP + "/no-such-page");
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await page.getByRole("link", { name: "Return home" }).click();
    await expect(page).toHaveURL(`${APP}/`);

    const visitor = await context.browser()!.newPage();
    await mockApi(visitor);
    await visitor.goto(APP + "/no-such-page");
    await expect(visitor).toHaveURL(/\/welcome$/);
    await visitor.close();
  });

  test("public pages open without a session and send no private requests", async ({ page }) => {
    const api = await mockApi(page);
    for (const [path, heading] of [["/welcome", "Your Journey Starts Here"], ["/activate-account", "Activate your account"], ["/register/agency", null], ["/contact", null]] as const) {
      await page.goto(APP + path);
      // /register/agency opens its first step.
      await expect(page).toHaveURL(new RegExp(`${path}(/company)?$`));
      if (heading) await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
    await page.goto(APP + "/login");
    await expect(page.getByLabel("Company ID")).toBeVisible();
    expect(api.calls.filter((call) => /\/b2b\/(me|hotels)/.test(call))).toEqual([]);
  });
});

test.describe("journey: activate the account, then sign in (mocked API)", () => {
  test("activation stores nothing and signs no one in; the owner then signs in with the same details", async ({ page }) => {
    const api = await mockApi(page, (request) => results(request), {
      "POST /b2b/auth/verify-otp": () => ({ json: { message: "Email verified successfully. Your company account is now active. You can log in using your email and password.", status: "active" } }),
    });
    await page.goto(`${APP}/activate-account?email=${encodeURIComponent(EMAIL)}&company_id=${COMPANY}`);
    await page.locator("#activate-code").click();
    await page.keyboard.type("123456");
    await page.getByRole("button", { name: "Verify and activate" }).click();
    await expect(page.getByRole("heading", { name: "Your account is active" })).toBeVisible();
    expect(await page.evaluate(() => ({ session: sessionStorage.length, local: Object.keys(localStorage).filter((key) => /session|token/i.test(key)) }))).toEqual({ session: 0, local: [] });
    expect(api.count("GET /b2b/me")).toBe(0);

    await page.getByRole("link", { name: "Go to Sign In" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await signIn(page);
    await expect(page).toHaveURL(`${APP}/`);
    await expect(page.locator("[data-live-home=featured]")).toHaveAttribute("data-search-state", "results");
    expect(api.count("POST /b2b/auth/verify-otp")).toBe(1);
    expect(api.count("POST /b2b/auth/login")).toBe(1);
    expect(api.unexpected).toEqual([]);
  });
});
