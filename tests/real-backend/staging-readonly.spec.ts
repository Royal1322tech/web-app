import { expect, test, type Page } from "@playwright/test";
import { selectLanguage } from "../helpers/header";

/*
 * REAL staging API, opt-in, read-only. Runs only when ROYAL_STAGING_READONLY=1.
 *
 * The API-mode test build (port 4174) calls https://api.royal.test; this harness forwards an allowlist of
 * requests that cannot change anything to https://staging-api.royalis.tech and returns the real
 * responses. Staging allows CORS only for https://staging.royalis.tech, so the harness adds the CORS
 * header for the local origin. Any request outside the allowlist is blocked and fails the test.
 *
 * Login uses an address under example.com and a random company ID, so no OTP is ever sent. The auth
 * routes share a low rate limit (about 5 requests a minute), so run this file on its own.
 */
const STAGING = "https://staging-api.royalis.tech";
const enabled = process.env.ROYAL_STAGING_READONLY === "1";
const allowed = new Set(["GET /api/v1/foundation-check", "POST /api/v1/b2b/auth/login", "GET /api/v1/b2b/me"]);
const FAKE_COMPANY = "00000000-0000-4000-8000-000000000000";

test.skip(!enabled, "Set ROYAL_STAGING_READONLY=1 to run read-only checks against the staging API.");
test.describe.configure({ mode: "serial" });
test.use({ baseURL: "http://127.0.0.1:4174" });
// A relayed request may still be in flight when a test ends.
test.afterEach(({ page }) => page.unrouteAll({ behavior: "ignoreErrors" }));

async function relayToStaging(page: Page) {
  const seen: { key: string; status: number; bearer: boolean }[] = [];
  const blocked: string[] = [];
  await page.route("https://api.royal.test/**", async (route) => {
    const request = route.request();
    const origin = request.headers()["origin"] ?? "http://127.0.0.1:4174";
    const cors = { "access-control-allow-origin": origin, "access-control-allow-headers": "accept, authorization, content-type, x-locale", "access-control-allow-methods": "GET, POST, OPTIONS" };
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const url = new URL(request.url());
    const key = `${request.method()} ${url.pathname}`;
    if (!allowed.has(key)) {
      blocked.push(key);
      return route.abort("blockedbyclient");
    }
    if (key === "POST /api/v1/b2b/auth/login") {
      const body = request.postDataJSON() as { email?: string; company_id?: string };
      // Never forward a real-looking sign-in: it would email a code.
      if (!body.email?.endsWith("@example.com") || body.company_id !== FAKE_COMPANY) {
        blocked.push(`${key} (non-test credentials)`);
        return route.abort("blockedbyclient");
      }
    }
    const response = await route.fetch({ url: `${STAGING}${url.pathname}${url.search}`, headers: { ...request.headers(), origin: "https://staging.royalis.tech" } });
    seen.push({ key, status: response.status(), bearer: /^Bearer \S+$/.test(request.headers()["authorization"] ?? "") });
    return route.fulfill({ response, headers: { ...response.headers(), ...cors } });
  });
  return { seen, blocked };
}

test("the sign-in page reaches the real API and shows no service notice", async ({ page }) => {
  const api = await relayToStaging(page);
  await page.goto("/login");
  await expect.poll(() => api.seen.find((call) => call.key === "GET /api/v1/foundation-check")?.status).toBe(200);
  await expect(page.locator(".api-status-notice")).toHaveCount(0);
  expect(api.blocked).toEqual([]);
});

for (const locale of ["en", "ar"] as const) {
  test(`staging rejects unknown credentials and the form explains it in ${locale}`, async ({ page }) => {
    const api = await relayToStaging(page);
    await page.goto("/login");
    if (locale === "ar") await selectLanguage(page, "ar");
    await page.getByLabel(/^(Email|البريد الإلكتروني)$/).fill("nobody-frontend-check@example.com");
    await page.getByLabel(/^(Password|كلمة المرور)$/, { exact: true }).fill("Wrong-Password-1!");
    await page.getByLabel(/^(Company ID|معرّف الشركة)$/).fill(FAKE_COMPANY);
    await page.getByRole("button", { name: /^(Sign In|تسجيل الدخول)$/ }).click();
    // Staging checks the password hash before replying, which can take several seconds.
    await expect.poll(() => api.seen.find((call) => call.key === "POST /api/v1/b2b/auth/login")?.status ?? api.blocked.join(), { timeout: 30000 }).toBe(422);
    await expect(page.locator("form.login-form [role=status]")).toContainText(
      locale === "en" ? "Incorrect email or password, or the account isn't activated yet." : "البريد الإلكتروني أو كلمة المرور غير صحيحة، أو أن الحساب غير مفعّل بعد.",
    );
    expect(api.seen.find((call) => call.key === "POST /api/v1/b2b/auth/login")?.status).toBe(422);
    // Still on the credentials step: no code step without a real challenge.
    await expect(page.locator("#login-code")).toHaveCount(0);
    expect(api.blocked).toEqual([]);
  });
}

test("a stored session with a token staging rejects ends and returns to sign-in", async ({ page }) => {
  const api = await relayToStaging(page);
  await page.addInitScript((companyId) => {
    if (!sessionStorage.getItem("royal-travel.b2b-session.v1")) {
      sessionStorage.setItem("royal-travel.b2b-session.v1", JSON.stringify({ token: "invalid-frontend-check-token", expiresAt: Date.now() + 3_600_000, companyId }));
    }
  }, FAKE_COMPANY);
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Your session has ended. Please sign in again.")).toBeVisible();
  const me = api.seen.find((call) => call.key === "GET /api/v1/b2b/me");
  expect(me?.status).toBe(401);
  expect(me?.bearer).toBe(true);
  expect(await page.evaluate(() => sessionStorage.getItem("royal-travel.b2b-session.v1"))).toBeNull();
  expect(api.blocked).toEqual([]);
});
