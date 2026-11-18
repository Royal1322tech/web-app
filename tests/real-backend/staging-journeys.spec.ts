import { expect, test, type Browser, type Page, type Response } from "@playwright/test";

/*
 * REAL staging journeys: no mocks, opt-in, read-only. Run against the deployed site:
 *
 *   PLAYWRIGHT_BASE_URL=https://staging.royalis.tech ROYAL_STAGING_E2E=1 npx playwright test tests/real-backend/staging-journeys.spec.ts
 *
 * Public checks need nothing else. Signed-in checks also need a dedicated TEST company account:
 *   ROYAL_STAGING_EMAIL, ROYAL_STAGING_PASSWORD, ROYAL_STAGING_COMPANY_ID
 * Never use a customer account, and never commit these values.
 *
 * Safety: an allowlist guards every API call. Only these requests may reach the API: foundation-check,
 * sign-in (once per run, direct token, no email), /me, hotel search and sign-out. Anything else
 * (registration, activation codes, resend, bookings) is blocked and fails the test. Auth routes are
 * limited to about 5 requests a minute per IP, so run this file on its own, not in parallel.
 *
 * Frontend and backend results are reported separately. "[frontend]" checks that the page shows what
 * the API actually returned. "[backend]" checks that the API returned usable hotels. A supplier outage
 * fails only the backend check, with the real status and code in the message.
 */
const enabled = process.env.ROYAL_STAGING_E2E === "1";
const base = process.env.PLAYWRIGHT_BASE_URL ?? "";
const email = process.env.ROYAL_STAGING_EMAIL ?? "";
const password = process.env.ROYAL_STAGING_PASSWORD ?? "";
const companyId = process.env.ROYAL_STAGING_COMPANY_ID ?? "";
const API = "https://staging-api.royalis.tech";
const ALLOWED = new Set(["GET /api/v1/foundation-check", "POST /api/v1/b2b/auth/login", "GET /api/v1/b2b/me", "POST /api/v1/b2b/hotels/search", "POST /api/v1/b2b/auth/logout"]);

test.skip(!enabled, "BLOCKED: set ROYAL_STAGING_E2E=1 to run real staging journeys.");
test.skip(enabled && !/^https:\/\/staging\.royalis\.tech\/?$/.test(base), "BLOCKED: PLAYWRIGHT_BASE_URL must be https://staging.royalis.tech.");
test.describe.configure({ mode: "serial" });

/** Blocks every API call outside the allowlist and records what was sent. */
async function guard(page: Page) {
  const blocked: string[] = [];
  const sent: string[] = [];
  await page.route(`${API}/**`, (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.continue();
    const key = `${request.method()} ${new URL(request.url()).pathname}`;
    if (!ALLOWED.has(key)) { blocked.push(key); return route.abort("blockedbyclient"); }
    sent.push(key);
    return route.continue();
  });
  return { blocked, sent, logins: () => sent.filter((key) => key.endsWith("/auth/login")).length };
}

async function searchReply(response: Response) {
  const body = await response.json().catch(() => null) as { success?: boolean; code?: string; data?: { hotels?: unknown[]; total?: number } } | null;
  return { status: response.status(), code: body?.code ?? "(none)", hotels: body?.data?.hotels?.length ?? 0, total: body?.data?.total ?? 0 };
}

/** The screen state the frontend should show for a given API reply. */
function expectedState(reply: { status: number; code: string; total: number }) {
  if (reply.status === 200 && reply.code === "HOTEL_SEARCH_PREVIEW") return reply.total > 0 ? "results" : "empty";
  if (reply.code === "HOTEL_SEARCH_NOT_READY") return "not_ready";
  if (reply.code === "HOTEL_SUPPLIER_UNAVAILABLE") return "supplier_unavailable";
  if (reply.status === 403) return "forbidden";
  if (reply.status === 422) return "validation";
  if (reply.status === 429) return "rate_limited";
  return "unavailable";
}

test.describe("public pages on staging (no sign-in)", () => {
  test("[frontend] activation, sign-in, welcome and protected routes behave without a session", async ({ page }) => {
    const api = await guard(page);
    await page.goto("/activate-account?email=owner%40example.com&company_id=00000000-0000-4000-8000-000000000000&otp=111111");
    await expect(page.getByRole("heading", { level: 1, name: "Activate your account" })).toBeVisible();
    await expect(page).not.toHaveURL(/otp=/);
    await expect(page.locator("#activate-email")).toHaveValue("owner@example.com");

    const check = page.waitForResponse((response) => response.url().endsWith("/api/v1/foundation-check"));
    await page.goto("/login");
    expect((await check).status(), "[backend] foundation-check").toBe(200);
    await expect(page.getByLabel("Company ID")).toBeVisible();
    await expect(page.locator(".api-status-notice")).toHaveCount(0);

    for (const path of ["/search?destination=dubai", "/bookings", "/no-such-page"]) {
      await page.goto(path);
      await expect(page, `${path} without a session`).toHaveURL(/\/welcome/);
    }
    expect(api.blocked).toEqual([]);
    expect(api.logins()).toBe(0);
  });
});

test.describe("signed-in journey on staging (test account)", () => {
  test.skip(!email || !password || !companyId, "BLOCKED: set ROYAL_STAGING_EMAIL, ROYAL_STAGING_PASSWORD and ROYAL_STAGING_COMPANY_ID for a dedicated test company.");

  let page: Page;
  let api: Awaited<ReturnType<typeof guard>>;
  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    page = await browser.newPage();
    api = await guard(page);
  });
  test.afterAll(async () => { await page?.close(); });

  test("[frontend] sign in once with Email, Password and Company ID (direct token, no code)", async () => {
    await page.goto("/login");
    await page.getByLabel(/^Email$/).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Company ID").fill(companyId);
    const login = page.waitForResponse((response) => response.url().endsWith("/api/v1/b2b/auth/login"));
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    const reply = await login;
    expect(reply.status(), `[backend] login answered ${reply.status()}`).toBe(200);
    await expect(page).toHaveURL(/\/$/);
    expect(api.logins()).toBe(1);
  });

  test("home default search: [frontend] shows what the API returned; [backend] returns hotels", async () => {
    const searched = page.waitForResponse((response) => response.url().endsWith("/api/v1/b2b/hotels/search"));
    await page.goto("/");
    const reply = await searchReply(await searched);
    test.info().annotations.push({ type: "staging reply", description: JSON.stringify(reply) });
    await expect(page.locator("[data-live-home=featured]"), "[frontend] home section state").toHaveAttribute("data-search-state", expectedState(reply), { timeout: 70_000 });
    if (expectedState(reply) === "results") await expect(page.locator("[data-live-home=featured] [data-live-hotel]").first()).toBeVisible();
    else await expect(page.locator("[data-live-hotel]")).toHaveCount(0);
    expect.soft(reply, `[backend] hotel search should return hotels; got HTTP ${reply.status} ${reply.code}`).toMatchObject({ status: 200, code: "HOTEL_SEARCH_PREVIEW" });
  });

  test("search results for Dubai: [frontend] state matches the reply; one request; [backend] returns hotels", async () => {
    const before = api.sent.filter((key) => key.endsWith("/hotels/search")).length;
    const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
    const rooms = encodeURIComponent(JSON.stringify([{ adults: 2, childAges: [] }]));
    const searched = page.waitForResponse((response) => response.url().endsWith("/api/v1/b2b/hotels/search"));
    await page.goto(`/search?destination=dubai&nationality=EG&checkIn=${day(30)}&checkOut=${day(33)}&rooms=${rooms}`);
    const reply = await searchReply(await searched);
    test.info().annotations.push({ type: "staging reply", description: JSON.stringify(reply) });
    await expect(page.locator("#api-hotel-results [data-search-state]"), "[frontend] results state").toHaveAttribute("data-search-state", expectedState(reply), { timeout: 70_000 });
    if (expectedState(reply) === "results") {
      await expect(page.locator("#api-hotel-results [data-live-hotel]")).toHaveCount(reply.hotels);
      await expect(page.getByRole("heading", { name: new RegExp(`^${reply.total} hotels? in Dubai$`) })).toBeVisible();
    }
    expect(api.sent.filter((key) => key.endsWith("/hotels/search")).length - before, "[frontend] one search request").toBe(1);
    expect.soft(reply, `[backend] hotel search should return hotels; got HTTP ${reply.status} ${reply.code}`).toMatchObject({ status: 200, code: "HOTEL_SEARCH_PREVIEW" });
  });

  test("[frontend] sign out revokes the session and closes private pages", async () => {
    await page.getByRole("button", { name: "Account menu" }).click();
    const logout = page.waitForResponse((response) => response.url().endsWith("/api/v1/b2b/auth/logout"));
    await page.getByRole("button", { name: "Sign Out" }).click();
    expect((await logout).status(), "[backend] logout").toBe(200);
    await expect(page).toHaveURL(/\/welcome$/);
    await page.goto("/search?destination=dubai");
    await expect(page).toHaveURL(/\/welcome/);
    expect(api.blocked).toEqual([]);
    expect(api.logins()).toBe(1);
  });
});
