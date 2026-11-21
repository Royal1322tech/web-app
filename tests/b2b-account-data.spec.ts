import { expect, test, type Page } from "@playwright/test";

/*
 * Price request history (GET /b2b/price-reduction-requests) and loyalty points (GET /b2b/loyalty)
 * in the API build on port 4176, against MOCKED responses. Never contacts staging.
 */
const APP = "http://127.0.0.1:4176";
const COMPANY = "8f14e45f-ceea-467a-9575-3c4b1f0b5c1a";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, X-Locale", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const profile = { message: "ok", data: { user: { id: 7, name: "Laila Hassan", email: "laila@example.com" }, company: { id: COMPANY, name: "Nile Gate Tours", legal_name: "Nile Gate Tours LLC", display_name: "Nile Gate Tours", status: "approved", account_currency: "USD", preferred_locale: "en", country_code: "EG", city: "Alexandria", address: "1 Corniche Road", business_type: "travel_agency", registration_no: "CR-1", tax_no: null, employee_count: 12 }, membership: { role_code: "company_admin", status: "active" } } };
type Reply = { status?: number; json?: unknown };
const laravelPage = (items: unknown[], page: number, last: number, total: number) => ({ success: true, data: { current_page: page, data: items, first_page_url: "x", from: items.length ? 1 : null, last_page: last, last_page_url: "x", links: [], next_page_url: null, path: "x", per_page: 15, prev_page_url: null, to: items.length || null, total } });
const requestItem = (n: number, extra: Record<string, unknown> = {}) => ({ id: `id-${n}`, request_no: `RP-00000000000${n}`, status: "new", hotel_name: `Test Hotel ${n}`, room_name: "Deluxe King", checkin: "2030-12-06", checkout: "2030-12-09", currency: "USD", requested_price: "180.50", created_at: "2030-11-20T10:00:00.000000Z", ...extra });

async function signedIn(page: Page, handlers: { requests?: (url: URL) => Reply; loyalty?: () => Reply }, locale: "en" | "ar" = "en") {
  const calls: string[] = [];
  await page.addInitScript(({ companyId, locale }) => {
    if (!sessionStorage.getItem("royal-travel.b2b-session.v1")) sessionStorage.setItem("royal-travel.b2b-session.v1", JSON.stringify({ token: "12|mocked", expiresAt: Date.now() + 3_600_000, companyId }));
    localStorage.setItem("royal-vacation.locale", locale);
  }, { companyId: COMPANY, locale });
  await page.route("https://api.royal.test/**", (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const url = new URL(request.url());
    calls.push(`${request.method()} ${url.pathname}${url.search}`);
    if (url.pathname === "/api/v1/b2b/me") return route.fulfill({ headers: cors, json: profile });
    if (url.pathname === "/api/v1/b2b/price-reduction-requests" && handlers.requests) { const r = handlers.requests(url); return route.fulfill({ status: r.status ?? 200, headers: cors, json: r.json ?? {} }); }
    if (url.pathname === "/api/v1/b2b/loyalty" && handlers.loyalty) { const r = handlers.loyalty(); return route.fulfill({ status: r.status ?? 200, headers: cors, json: r.json ?? {} }); }
    return route.fulfill({ headers: cors, json: { locale: "en", direction: "ltr" } });
  });
  return calls;
}
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe("price request history (mocked API)", () => {
  test("lists the backend's requests with their numbers and statuses, and pages through them", async ({ page }) => {
    const calls = await signedIn(page, { requests: (url) => url.searchParams.get("page") === "2"
      ? { json: laravelPage([requestItem(16, { status: "approved", hotel_name: null })], 2, 2, 16) }
      : { json: laravelPage(Array.from({ length: 15 }, (_, i) => requestItem(i + 1)), 1, 2, 16) } });
    await page.goto(`${APP}/price-requests`);
    const list = page.locator("[data-requests-state=list]");
    await expect(list.locator("li")).toHaveCount(15);
    await expect(list).toContainText("16 requests");
    await expect(list.locator("li").first()).toContainText("RP-000000000001");
    await expect(list.locator("li").first()).toContainText("New");
    await expect(list.locator("li").first()).toContainText("Test Hotel 1");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(list.locator("li")).toHaveCount(1);
    await expect(list.locator("li")).toContainText("Approved");
    await expect(page.getByText("Page 2 of 2")).toBeVisible();
    expect(calls).toContain("GET /api/v1/b2b/price-reduction-requests?page=2");
    expect(calls.filter((call) => call.startsWith("POST"))).toHaveLength(0);
  });

  test("empty, error and retry states; Arabic phone layout fits", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    let call = 0;
    await signedIn(page, { requests: () => (++call === 1 ? { status: 503, json: { message: "x" } } : { json: laravelPage([], 1, 1, 0) }) }, "ar");
    await page.goto(`${APP}/price-requests`);
    await expect(page.locator("[data-requests-state=unavailable]")).toBeVisible();
    await page.getByRole("button", { name: /إعادة المحاولة|Retry/ }).click();
    await expect(page.locator("[data-requests-state=empty]")).toContainText("لا توجد طلبات أسعار بعد");
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test("403 has no retry", async ({ page }) => {
    await signedIn(page, { requests: () => ({ status: 403, json: { message: "Forbidden." } }) });
    await page.goto(`${APP}/price-requests`);
    await expect(page.locator("[data-requests-state=forbidden]")).toContainText("can't view price requests");
    await expect(page.getByRole("button", { name: /Retry/ })).toHaveCount(0);
  });
});

test.describe("loyalty points (mocked API)", () => {
  test("shows the backend's balances and transactions; no redemption while it's disabled", async ({ page }) => {
    const transactions = [
      { id: 1, type: "earned", status: "available", description: "Booking RV-1001", points: 120, created_at: "2030-11-02T08:00:00Z" },
      { id: 2, type: "adjustment", status: "pending", description: null, points: -20, created_at: "2030-11-03T08:00:00Z" },
    ];
    const calls = await signedIn(page, { loyalty: () => ({ json: { company_id: COMPANY, balances: { pending: 40, available: 1250 }, transactions, redemption_enabled: false } }) });
    await page.goto(`${APP}/points`);
    await expect(page.locator("[data-points=available]")).toContainText("1,250");
    await expect(page.locator("[data-points=pending]")).toContainText("40");
    const list = page.locator(".points-list li");
    await expect(list).toHaveCount(2);
    await expect(list.first()).toContainText("Booking RV-1001");
    await expect(list.first()).toContainText("+120");
    await expect(list.nth(1)).toContainText("-20");
    await expect(page.getByText("Points can't be redeemed yet.")).toBeVisible();
    await expect(page.getByRole("button", { name: /redeem/i })).toHaveCount(0);
    await expect(page.getByText(/Pending sample entry|Sample/)).toHaveCount(0); // no example records
    expect(calls).toContain("GET /api/v1/b2b/loyalty");
  });

  test("no transactions: a clear empty state; the Wallet shows the same real balances", async ({ page }) => {
    await signedIn(page, { loyalty: () => ({ json: { company_id: COMPANY, balances: { pending: 0, available: 0 }, transactions: [], redemption_enabled: false } }) });
    await page.goto(`${APP}/points`);
    await expect(page.locator("[data-loyalty-state=empty]")).toContainText("No points activity yet");
    await page.goto(`${APP}/wallet`);
    const card = page.locator(".loyalty-summary");
    await expect(card).toContainText("Available");
    await expect(card.locator("dd").first()).toHaveText("0");
    await expect(card.getByRole("link", { name: "View points activity" })).toHaveAttribute("href", "/points");
  });

  test("errors: 403 explains itself without retry; 503 can retry; Arabic phone fits", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    let call = 0;
    await signedIn(page, { loyalty: () => (++call === 1 ? { status: 503, json: {} } : { json: { company_id: COMPANY, balances: { pending: 5, available: 10 }, transactions: [], redemption_enabled: false } }) }, "ar");
    await page.goto(`${APP}/points`);
    await expect(page.locator("[data-loyalty-state=unavailable]")).toBeVisible();
    await page.getByRole("button", { name: /إعادة المحاولة|Retry/ }).click();
    await expect(page.locator("[data-points=available]")).toContainText("10");
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});
