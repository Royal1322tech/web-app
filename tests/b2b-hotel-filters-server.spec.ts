import { expect, test, type Page, type Request } from "@playwright/test";

/*
 * Server-side hotel search filters against MOCKED responses (build on port 4177 with
 * VITE_HOTEL_SEARCH_FILTERS=server). Never contacts staging. The filter fields follow the backend
 * team's example request; these tests pin what the frontend sends and how it uses the reply.
 */
const APP = "http://127.0.0.1:4177";
const COMPANY = "8f14e45f-ceea-467a-9575-3c4b1f0b5c1a";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, X-Locale", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const rooms = encodeURIComponent(JSON.stringify([{ adults: 2, childAges: [] }]));
const searchUrl = `${APP}/search?destination=dubai&nationality=EG&checkIn=2030-12-06&checkOut=2030-12-09&rooms=${rooms}`;
const profile = { message: "ok", data: { user: { id: 7, name: "Laila Hassan", email: "laila@example.com" }, company: { id: COMPANY, name: "Nile Gate Tours", legal_name: "Nile Gate Tours LLC", display_name: "Nile Gate Tours", status: "approved", account_currency: "USD", preferred_locale: "en", country_code: "EG", city: "Alexandria", address: "1 Corniche Road", business_type: "travel_agency", registration_no: "CR-1", tax_no: null, employee_count: 12 }, membership: { role_code: "company_admin", status: "active" } } };

type Body = Record<string, unknown> & { filters?: Record<string, unknown>; page?: number };
/** Fictional hotels. Stars deliberately don't match the filters: the page must show the server's answer as is. */
const hotel = (i: number) => ({ result_index: i, hid: 5000 + i, name: `Test Hotel ${i + 1}`, address: `${i + 1} Test Street, ${i % 2 ? "Deira" : "Jumeirah"}, Dubai`, stars: 3, image: null, rooms: [{ room_name: "Room", meal_name: "breakfast", has_breakfast: true, bedding_type: null, selling_price: null, booking_enabled: false }], pricing_status: "unverified", booking_enabled: false });
const reply = (total: number, page = 1) => ({ success: true, code: "HOTEL_SEARCH_PREVIEW", message: "x", data: { hotels: Array.from({ length: Math.max(0, Math.min(20, total - (page - 1) * 20)) }, (_, i) => hotel((page - 1) * 20 + i)), total, page, per_page: 20, currency: "USD", supplier_currency: "USD", pricing_verified: false, booking_enabled: false } });

async function signedIn(page: Page, totalFor: (body: Body) => number, locale: "en" | "ar" = "en") {
  const bodies: Body[] = [];
  await page.addInitScript(({ companyId, locale }) => {
    if (!sessionStorage.getItem("royal-travel.b2b-session.v1")) sessionStorage.setItem("royal-travel.b2b-session.v1", JSON.stringify({ token: "12|mocked", expiresAt: Date.now() + 3_600_000, companyId }));
    localStorage.setItem("royal-vacation.locale", locale);
  }, { companyId: COMPANY, locale });
  await page.route("https://api.royal.test/**", async (route) => {
    const request: Request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const path = new URL(request.url()).pathname;
    if (path === "/api/v1/b2b/me") return route.fulfill({ headers: cors, json: profile });
    if (path === "/api/v1/b2b/hotels/search") {
      const body = request.postDataJSON() as Body;
      bodies.push(body);
      return route.fulfill({ headers: cors, json: reply(totalFor(body), body.page ?? 1) });
    }
    return route.fulfill({ headers: cors, json: { locale: "en", direction: "ltr" } });
  });
  return bodies;
}

const settle = (page: Page) => page.waitForTimeout(700); // longer than the 400 ms settle delay

test.describe("B2B hotel search: server-side filters (mocked API)", () => {
  test("filters go in the request, reset to page 1, settle into one search, and use the server's totals", async ({ page }) => {
    const bodies = await signedIn(page, (body) => (body.filters ? 23 : 88));
    await page.goto(searchUrl);
    const cards = page.locator("[data-live-hotel]");
    const filters = page.getByRole("group", { name: "Hotel filters" });
    await expect(cards).toHaveCount(20);
    expect(bodies).toHaveLength(1);
    expect(bodies[0].filters).toBeUndefined();
    expect(bodies[0].sort).toBe("recommended");

    // Go to page 2, then filter: the next search is page 1 of the filtered results.
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Page 2 of 5").first()).toBeVisible();
    expect(bodies[1]).toMatchObject({ page: 2, per_page: 20 });

    await filters.getByRole("checkbox", { name: "5 stars" }).check();
    await filters.getByRole("checkbox", { name: "4 stars" }).check();
    await filters.getByLabel("Hotel name or address").pressSequentially("Hilton", { delay: 40 });
    await settle(page);
    await expect(page.getByRole("heading", { name: "23 hotels in Dubai" })).toBeVisible();
    expect(bodies).toHaveLength(3); // one search for all those changes
    expect(bodies[2].page).toBeUndefined();
    expect(bodies[2].filters).toEqual({ hotel_name: "Hilton", stars: [4, 5] });
    await expect(page.getByText("Page 1 of 2").first()).toBeVisible();
    // The server's hotels are shown as returned (3-star hotels stay; the page isn't filtered again).
    await expect(cards).toHaveCount(20);
    await expect(page.getByText(/hotels on this page match/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Filters/ })).toBeHidden(); // desktop: sidebar shown

    // Filters stay across pages and go with each page request.
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Page 2 of 2").first()).toBeVisible();
    expect(bodies[3]).toMatchObject({ page: 2, filters: { hotel_name: "Hilton", stars: [4, 5] } });
    await expect(filters.getByRole("checkbox", { name: "5 stars" })).toBeChecked();

    // Board, area (one at a time), amenities and packaging.
    await filters.getByRole("checkbox", { name: "Bed & Breakfast" }).check();
    await filters.getByRole("checkbox", { name: /Jumeirah/ }).check();
    await filters.getByRole("checkbox", { name: /Deira/ }).check();
    await expect(filters.getByRole("checkbox", { name: /Jumeirah/ })).not.toBeChecked();
    const amenities = filters.locator("details", { has: page.getByText("Amenities", { exact: true }) });
    await amenities.locator("summary").click();
    await amenities.getByRole("button", { name: "View More" }).click();
    await amenities.getByRole("checkbox", { name: "Air Conditioning" }).check();
    await amenities.getByRole("checkbox", { name: "Gym" }).check();
    const packaging = filters.locator("details", { has: page.getByText("Product packaging", { exact: true }) });
    await packaging.locator("summary").click();
    await packaging.getByRole("radio", { name: "With Package" }).check();
    await settle(page);
    await expect(page.getByText("Page 1 of 2").first()).toBeVisible();
    expect(bodies.at(-1)).toEqual(expect.objectContaining({ filters: { hotel_name: "Hilton", area: "Deira", stars: [4, 5], board: ["breakfast"], amenities: ["air_conditioning", "gym"], package_type: "with_package" }, sort: "recommended" }));
    expect(bodies.at(-1)?.page).toBeUndefined();

    // Breakfast is not a server field: it narrows the loaded page and sends nothing.
    const sent = bodies.length;
    await filters.getByRole("checkbox", { name: "Breakfast available" }).check();
    await settle(page);
    expect(bodies).toHaveLength(sent);
    await expect(page.getByText("20 of 20 hotels on this page match")).toBeVisible();

    // Reset clears everything with one search for the unfiltered results.
    await filters.getByRole("button", { name: "Reset filters" }).click();
    await settle(page);
    await expect(page.getByRole("heading", { name: "88 hotels in Dubai" })).toBeVisible();
    expect(bodies).toHaveLength(sent + 1);
    expect(bodies.at(-1)?.filters).toBeUndefined();
    await expect(page.getByText("Page 1 of 5").first()).toBeVisible();

    // Hotel cards keep their hid-based View rooms links.
    await expect(cards.first().getByRole("link", { name: /View rooms/ })).toHaveAttribute("href", /\/hotels\/rooms\/5000\?/);
  });

  test("sorting is sent to the API (stars_desc, name_asc), starts again at page 1 and keeps the filters", async ({ page }) => {
    const bodies = await signedIn(page, () => 45);
    await page.goto(searchUrl);
    const filters = page.getByRole("group", { name: "Hotel filters" });
    await expect(page.locator("[data-live-hotel]")).toHaveCount(20);
    await filters.getByRole("checkbox", { name: "4 stars" }).check();
    await settle(page);
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Page 2 of 3").first()).toBeVisible();
    await page.getByLabel("Sort by").selectOption("stars");
    await settle(page);
    await expect(page.getByText("Page 1 of 3").first()).toBeVisible();
    expect(bodies.at(-1)).toMatchObject({ sort: "stars_desc", filters: { stars: [4] } });
    expect(bodies.at(-1)?.page).toBeUndefined();
    await page.getByLabel("Sort by").selectOption("name");
    await settle(page);
    expect(bodies.at(-1)).toMatchObject({ sort: "name_asc" });
    // The page keeps the API's order (no second, local sort).
    await expect(page.locator("[data-live-hotel] h3").first()).toHaveText("Test Hotel 1");
  });

  test("board and packaging use the exact API values; a 429 waits for Retry-After before Retry", async ({ page }) => {
    let failNext = false;
    const bodies: Body[] = [];
    await page.addInitScript(({ companyId }) => {
      sessionStorage.setItem("royal-travel.b2b-session.v1", JSON.stringify({ token: "12|mocked", expiresAt: Date.now() + 3_600_000, companyId }));
      localStorage.setItem("royal-vacation.locale", "en");
    }, { companyId: COMPANY });
    await page.route("https://api.royal.test/**", async (route) => {
      const request = route.request();
      const headers = { ...cors, "Access-Control-Expose-Headers": "Retry-After" };
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      const path = new URL(request.url()).pathname;
      if (path === "/api/v1/b2b/me") return route.fulfill({ headers, json: profile });
      if (path === "/api/v1/b2b/hotels/search") {
        const body = request.postDataJSON() as Body;
        bodies.push(body);
        if (failNext) { failNext = false; return route.fulfill({ status: 429, headers: { ...headers, "Retry-After": "2" }, json: { message: "Too Many Attempts." } }); }
        return route.fulfill({ headers, json: reply(body.filters ? 5 : 30) });
      }
      return route.fulfill({ headers, json: {} });
    });
    await page.goto(searchUrl);
    const filters = page.getByRole("group", { name: "Hotel filters" });
    await expect(page.locator("[data-live-hotel]")).toHaveCount(20);
    await filters.getByRole("checkbox", { name: "Room Only" }).check();
    const packaging = filters.locator("details", { has: page.getByText("Product packaging", { exact: true }) });
    await packaging.locator("summary").click();
    await packaging.getByRole("radio", { name: "Without Package" }).check();
    await settle(page);
    expect(bodies.at(-1)?.filters).toEqual({ board: ["nomeal"], package_type: "without_package" });
    // Only the amenities the API filters on are offered.
    const amenities = filters.locator("details", { has: page.getByText("Amenities", { exact: true }) });
    await amenities.locator("summary").click();
    await amenities.getByRole("button", { name: "View More" }).click();
    await expect(amenities.getByRole("checkbox")).toHaveCount(6);
    await expect(amenities.getByRole("checkbox", { name: "Pool" })).toHaveCount(0);

    failNext = true;
    await filters.getByRole("checkbox", { name: "5 stars" }).check();
    await settle(page);
    await expect(page.getByText(/You can try again in \d seconds/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible({ timeout: 4000 });
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.locator("[data-live-hotel]")).toHaveCount(5);
  });

  test("a filtered search with no hotels keeps the sidebar so the filters can be reset", async ({ page }) => {
    const bodies = await signedIn(page, (body) => (body.filters ? 0 : 3));
    await page.goto(searchUrl);
    const filters = page.getByRole("group", { name: "Hotel filters" });
    await filters.getByRole("checkbox", { name: "1 star" }).check();
    await settle(page);
    await expect(page.locator("[data-search-state=no-match]")).toHaveText("No hotels match these filters.");
    await expect(page.getByText("No hotels found")).toHaveCount(0);
    await filters.getByRole("button", { name: "Reset filters" }).click();
    await settle(page);
    await expect(page.locator("[data-live-hotel]")).toHaveCount(3);
    expect(bodies.map((body) => Boolean(body.filters))).toEqual([false, true, false]);
  });

  test("Arabic RTL: filters send the same fields with language ar, and the phone panel works", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    const bodies = await signedIn(page, (body) => (body.filters ? 4 : 30), "ar");
    await page.goto(searchUrl);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.getByRole("button", { name: /^التصفية/ }).click();
    const filters = page.getByRole("group", { name: "تصفية الفنادق" });
    await filters.getByRole("checkbox", { name: "مبيت وإفطار" }).check();
    await settle(page);
    await expect(page.getByRole("heading", { name: "4 فندق في دبي" })).toBeVisible();
    expect(bodies.at(-1)).toMatchObject({ language: "ar", filters: { board: ["breakfast"] } });
    await expect(filters.getByRole("checkbox", { name: "مبيت وإفطار" })).toBeChecked(); // the panel stayed open with its state
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
});
