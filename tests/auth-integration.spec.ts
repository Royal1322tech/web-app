import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Request } from "@playwright/test";
import { selectLanguage } from "./helpers/header";
import { parseRetryAfter } from "../src/lib/api/client";
import { attachIdDocument, fillCompanyStep, samplePdf } from "./helpers/registration";

/*
 * Real sign-in against MOCKED responses that follow the Laravel contract (royal-travel-backend
 * 8da6604). These tests never contact staging: the API-mode builds point at api.royal.test, which
 * does not resolve, and every request to it is answered here.
 */
const COMPANY = "8f14e45f-ceea-467a-9575-3c4b1f0b5c1a";
const OTHER_COMPANY = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";
const TOKEN = "12|mocked-sanctum-token";
const SESSION_KEY = "royal-travel.b2b-session.v1";

type Reply = { status?: number; json?: unknown; abort?: boolean; headers?: Record<string, string> };
type Handler = (request: Request) => Reply | Promise<Reply>;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, X-Locale", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };

const profile = (companyId = COMPANY) => ({
  message: "Profile retrieved successfully.",
  data: {
    user: { id: 7, name: "Laila Hassan", email: "laila@example.com" },
    company: { id: companyId, name: "Nile Gate Tours", legal_name: "Nile Gate Tours LLC", display_name: "Nile Gate Tours", status: "approved", account_currency: "USD", preferred_locale: "en", country_code: "EG", city: "Alexandria", address: "1 Corniche Road", business_type: "travel_agency", registration_no: "CR-1", tax_no: null, employee_count: 12 },
    membership: { role_code: "company_admin", status: "active" },
  },
});
const ok = {
  login: (): Reply => tokenReply(604800),
  me: (): Reply => ({ json: profile() }),
  logout: (): Reply => ({ json: { message: "Logged out successfully." } }),
};
function tokenReply(expiresIn: number): Reply {
  return { json: { message: "Login successful.", token_type: "Bearer", access_token: TOKEN, expires_in: expiresIn, company_id: COMPANY, user: { id: 7, name: "Laila Hassan", email: "laila@example.com" } } };
}

/** Answers every API request. Anything without a handler is recorded as unexpected. */
async function mockApi(page: Page, handlers: Record<string, Handler>) {
  const calls: { key: string; request: Request }[] = [];
  const unexpected: string[] = [];
  await page.route("https://api.royal.test/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const key = `${request.method()} ${new URL(request.url()).pathname.replace("/api/v1", "")}`;
    // The sign-in and registration screens check the API is reachable; answer it unless a test overrides it.
    if (key === "GET /foundation-check" && !handlers[key]) return route.fulfill({ status: 200, headers: cors, json: { locale: "en", direction: "ltr" } });
    calls.push({ key, request });
    const handler = handlers[key];
    if (!handler) {
      unexpected.push(key);
      return route.fulfill({ status: 500, headers: cors, json: {} });
    }
    const reply = await handler(request);
    if (reply.abort) return route.abort("connectionrefused");
    return route.fulfill({ status: reply.status ?? 200, headers: { ...cors, ...reply.headers }, json: reply.json ?? {} });
  });
  return { calls, unexpected, called: (key: string) => calls.filter((call) => call.key === key) };
}

async function fillCredentials(page: Page, { email = "Laila@Example.com", password = "Correct-Horse-9!", company = COMPANY } = {}) {
  await page.getByLabel(/^(Email|البريد الإلكتروني)$/).fill(email);
  await page.getByLabel(/^(Password|كلمة المرور)$/, { exact: true }).fill(password);
  await page.getByLabel(/^(Company ID|معرّف الشركة)$/).fill(company);
  await page.getByRole("button", { name: /^(Sign In|تسجيل الدخول)$/ }).click();
}

async function signIn(page: Page) {
  await fillCredentials(page);
  await expect(page).toHaveURL(/4174\/$/);
}

const CHALLENGE_KEY = "royal-travel.login-challenge.v1";

const storage = (page: Page) => page.evaluate(() => ({ session: { ...sessionStorage }, local: { ...localStorage } }));

test.describe("demo mode is the default", () => {
  test("the standard build keeps the demo login and never calls the API", async ({ page }) => {
    const apiCalls: string[] = [];
    page.on("request", (request) => { if (/api\.royal\.test|staging-api\.royalis\.tech/.test(request.url())) apiCalls.push(request.url()); });
    await page.goto("/login");
    await expect(page.getByText("Frontend preview only. Authentication is not verified by a server.")).toBeVisible();
    await expect(page.getByLabel("Company ID", { exact: true })).toHaveCount(0);
    await page.getByLabel("Email", { exact: true }).fill("demo@royalvacation.test");
    await page.getByLabel("Password", { exact: true }).fill("Demo@12345");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(page).not.toHaveURL(/\/login/);
    expect((await storage(page)).session["royal-vacation.demo-auth.v1"]).toBe("active");
    expect((await storage(page)).session[SESSION_KEY]).toBeUndefined();
    expect(apiCalls).toEqual([]);
  });

  test("the sign-in code page doesn't exist in demo mode and never calls the API", async ({ page }) => {
    const apiCalls: string[] = [];
    page.on("request", (request) => { if (/api\.royal\.test|staging-api\.royalis\.tech/.test(request.url())) apiCalls.push(request.url()); });
    await page.goto("/login/verify-otp");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Frontend preview only. Authentication is not verified by a server.")).toBeVisible();
    await expect(page.locator("#login-code")).toHaveCount(0);
    expect(apiCalls).toEqual([]);
  });
});

test.describe("API mode without company identification", () => {
  test.use({ baseURL: "http://127.0.0.1:4175" });

  test("sign-in is clearly unavailable and sends nothing", async ({ page }) => {
    const api = await mockApi(page, {});
    await page.goto("/login");
    await expect(page.locator("#login-unavailable")).toContainText("How companies are identified at sign-in hasn't been finalised yet");
    const submit = page.getByRole("button", { name: "Sign In", exact: true });
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveAttribute("aria-describedby", "login-unavailable");
    await expect(page.getByLabel("Company ID", { exact: true })).toHaveCount(0);
    // The demo credentials no longer work in this mode.
    await expect(page.getByText("Frontend preview only")).toHaveCount(0);
    expect(api.calls).toEqual([]);
  });
});

test.describe("API mode", () => {
  test.use({ baseURL: "http://127.0.0.1:4174" });

  test("sign-in checks the API is reachable and says so only when it isn't, in English and Arabic", async ({ page }) => {
    let reachable = false;
    const api = await mockApi(page, { "GET /foundation-check": () => (reachable ? { json: { locale: "en", direction: "ltr" } } : { abort: true }) });
    await page.goto("/login");
    const notice = page.locator(".api-status-notice");
    await expect(notice).toHaveText(/The sign-in service can't be reached right now\./);
    await expect(notice).toHaveAttribute("role", "status");
    // The form stays usable while the service is unreachable.
    await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeEnabled();

    reachable = true;
    await notice.getByRole("button", { name: "Check again" }).click();
    await expect(notice).toHaveCount(0);
    expect(api.called("GET /foundation-check").length).toBeGreaterThanOrEqual(2);
    expect(api.unexpected).toEqual([]);

    reachable = false;
    await selectLanguage(page, "ar");
    await page.reload();
    await expect(page.locator(".api-status-notice")).toContainText("لا يمكن الوصول إلى خدمة تسجيل الدخول حاليًا");
    await expect(page.locator(".api-status-notice").getByRole("button", { name: "تحقق مرة أخرى" })).toBeVisible();
  });

  test("the company ID field and its help text line up and fit small phones", async ({ page }) => {
    await mockApi(page, {});
    for (const width of [320, 390, 430, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/login");
      const field = (await page.locator("#company-id").boundingBox())!;
      const help = (await page.locator("#company-id-help").boundingBox())!;
      expect(Math.abs(help.x - field.x), `${width}px`).toBeLessThanOrEqual(1);
      // From standard phone widths up, a full 36-character ID is visible without scrolling the field.
      if (width >= 390) {
        await page.locator("#company-id").fill("8f14e45f-ceea-467a-9575-3c4b1f0b5c1a");
        expect(await page.locator("#company-id").evaluate((input) => input.scrollWidth - input.clientWidth), `${width}px`).toBeLessThanOrEqual(1);
      }
    }
  });

  test("a reachable API shows no service notice", async ({ page }) => {
    const api = await mockApi(page, {});
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".api-status-notice")).toHaveCount(0);
    expect(api.unexpected).toEqual([]);
  });

  test("direct login returns a token, verifies company and starts a scoped session without OTP", async ({ page }) => {
    const api = await mockApi(page, { "POST /b2b/auth/login": ok.login, "GET /b2b/me": ok.me });
    await page.goto("/login");
    await expect(page.getByText("Sign in securely using your email and password.")).toBeVisible();
    await fillCredentials(page);
    await expect(page).toHaveURL(/4174\/$/);
    const [login] = api.called("POST /b2b/auth/login");
    expect(login.request.postDataJSON()).toEqual({ email: "Laila@Example.com", password: "Correct-Horse-9!", company_id: COMPANY, channel: "website" });
    expect(login.request.headers()["x-locale"]).toBe("en");
    expect(login.request.headers()["authorization"]).toBeUndefined();
    expect(api.called("POST /b2b/auth/verify-otp")).toHaveLength(0);
    const [me] = api.called("GET /b2b/me");
    expect(me.request.headers()["authorization"]).toBe(`Bearer ${TOKEN}`);
    const saved = await storage(page);
    expect(JSON.parse(saved.session[SESSION_KEY])).toEqual({ token: TOKEN, companyId: COMPANY, expiresAt: expect.any(Number) });
    expect(JSON.stringify(saved)).not.toContain("Correct-Horse-9!");
    expect(JSON.stringify(saved.local)).not.toContain(TOKEN);
    expect(saved.session["royal-vacation.demo-auth.v1"]).toBeUndefined();
    expect(saved.session[CHALLENGE_KEY]).toBeUndefined();
    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(page.getByText("Laila Hassan")).toBeVisible();
    await expect(page.getByText("Nile Gate Tours")).toBeVisible();
    expect(api.unexpected).toEqual([]);
  });

  test("a reload confirms the stored session with the server before showing private pages", async ({ page }) => {
    const api = await mockApi(page, { "POST /b2b/auth/login": ok.login, "GET /b2b/me": ok.me });
    await page.goto("/login");
    await signIn(page);
    await expect(page).toHaveURL(/4174\/$/);
    await page.goto("/bookings");
    await expect(page.getByRole("heading", { name: "My Bookings" })).toBeVisible();
    expect(api.called("GET /b2b/me").length).toBeGreaterThanOrEqual(2);
  });

  for (const [label, reply, message] of [
    ["invalid credentials", { status: 422, json: { message: "Invalid credentials or account not activated.", errors: { email: ["Invalid credentials or account not activated."] } } }, "Incorrect email or password, or the account isn't activated yet."],
    ["an unapproved company", { status: 422, json: { message: "x", errors: { email: ["Company is not approved or account is inactive."] } } }, "We couldn't sign you in to this company. Check the Company ID from your registration. If it's correct, the company or your access to it isn't active yet."],
    ["an invalid company ID", { status: 422, json: { message: "x", errors: { company_id: ["The company id field must be a valid UUID."] } } }, null],
    ["too many attempts", { status: 429, json: { message: "Too Many Attempts." } }, "Too many sign-in attempts. Please wait before trying again."],
    ["a network failure", { abort: true }, "We couldn't reach the sign-in service. Check your connection and try again."],
    ["a malformed success response", { status: 200, json: { message: "Unauthenticated." } }, "The sign-in service returned an unexpected response. Please try again later."],
  ] as const) {
    test(`login reports ${label} safely and stays on the credentials step`, async ({ page }) => {
      await mockApi(page, { "POST /b2b/auth/login": () => reply });
      await page.goto("/login");
      await fillCredentials(page);
      if (message) await expect(page.getByRole("status")).toHaveText(message);
      else await expect(page.locator("#company-id-error")).toHaveText("Check the company ID.");
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("heading", { name: "Email Verification" })).toHaveCount(0);
      // Raw server wording never reaches the page.
      await expect(page.locator("main")).not.toContainText(/must be a valid UUID|Too Many Attempts\.|Unauthenticated\./);
    });
  }

  test("a refused company login stores no session and is explained in Arabic too", async ({ page }) => {
    const refused = { status: 422, json: { message: "Company is not approved or account is inactive.", errors: { email: ["Company is not approved or account is inactive."] } } };
    const api = await mockApi(page, { "POST /b2b/auth/login": () => refused });
    await page.goto("/login");
    await fillCredentials(page);
    await expect(page.getByRole("status")).toContainText("Check the Company ID");
    expect(await page.evaluate((key) => sessionStorage.getItem(key), SESSION_KEY)).toBeNull();
    expect(api.called("POST /b2b/auth/verify-otp")).toHaveLength(0);
    await selectLanguage(page, "ar");
    await fillCredentials(page);
    await expect(page.getByRole("status")).toHaveText("تعذر تسجيل دخولك إلى هذه الشركة. تحقق من معرّف الشركة من تسجيلك. إذا كان صحيحًا، فإن الشركة أو صلاحية وصولك إليها غير مفعّلة بعد.");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("company ID is normalized and direct login starts the session", async ({ page }) => {
    const api = await mockApi(page, { "POST /b2b/auth/login": ok.login, "GET /b2b/me": ok.me });
    await page.goto("/login");
    await fillCredentials(page, { company: COMPANY.toUpperCase() });
    await expect(page).toHaveURL(/4174\/$/);
    expect(api.called("POST /b2b/auth/login")[0].request.postDataJSON()).toMatchObject({ company_id: COMPANY, channel: "website" });
    expect(JSON.parse((await storage(page)).session[SESSION_KEY]).companyId).toBe(COMPANY);
  });

  test.describe("sign-in requests and rate limiting", () => {
    const tooMany = (headers?: Record<string, string>): Reply => ({ status: 429, json: { message: "Too Many Attempts." }, headers });
    const message = "Too many sign-in attempts. Please wait before trying again.";

    test("one click sends exactly one login request", async ({ page }) => {
      const api = await mockApi(page, { "POST /b2b/auth/login": ok.login, "GET /b2b/me": ok.me });
      await page.goto("/login");
      await fillCredentials(page);
      await expect(page).toHaveURL(/4174\/$/);
      expect(api.called("POST /b2b/auth/login")).toHaveLength(1);
    });

    test("a double click, and Enter followed by a click, still send one request", async ({ page }) => {
      let release!: () => void;
      const held = new Promise<void>((resolve) => { release = resolve; });
      const api = await mockApi(page, { "POST /b2b/auth/login": async () => { await held; return ok.login(); }, "GET /b2b/me": ok.me });
      await page.goto("/login");
      await page.getByLabel(/^Email$/).fill("laila@example.com");
      await page.getByLabel(/^Password$/, { exact: true }).fill("Correct-Horse-9!");
      await page.getByLabel(/^Company ID$/).fill(COMPANY);
      const button = page.getByRole("button", { name: /^(Sign In|Signing in…)$/ });
      // Enter and a click land together, then a double click while the first request is pending.
      await page.getByLabel(/^Company ID$/).press("Enter");
      await button.click({ force: true }).catch(() => undefined);
      await button.dblclick({ force: true }).catch(() => undefined);
      await expect(page.getByRole("button", { name: "Signing in…" })).toBeDisabled();
      release();
      await expect(page).toHaveURL(/4174\/$/);
      expect(api.called("POST /b2b/auth/login")).toHaveLength(1);
    });

    test("a 429 is never retried automatically, and without Retry-After shows no countdown", async ({ page }) => {
      const api = await mockApi(page, { "POST /b2b/auth/login": () => tooMany() });
      await page.goto("/login");
      await fillCredentials(page);
      await expect(page.getByRole("status").getByText(message)).toBeVisible();
      await expect(page.locator("[data-login-cooldown]")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Sign In" })).toBeEnabled();
      await page.waitForTimeout(2000);
      expect(api.called("POST /b2b/auth/login")).toHaveLength(1);
      await expect(page).toHaveURL(/\/login$/);
    });

    test("a readable Retry-After shows a countdown and blocks Sign In until it ends", async ({ page }) => {
      await page.clock.install();
      const api = await mockApi(page, { "POST /b2b/auth/login": () => (api.called("POST /b2b/auth/login").length === 1 ? tooMany({ "Retry-After": "65", "Access-Control-Expose-Headers": "Retry-After" }) : ok.login()), "GET /b2b/me": ok.me });
      await page.goto("/login");
      await fillCredentials(page);
      await expect(page.getByRole("status").getByText(message)).toBeVisible();
      await expect(page.locator("[data-login-cooldown]")).toContainText("1:05");
      const signIn = page.getByRole("button", { name: "Sign In" });
      await expect(signIn).toBeDisabled();
      await page.getByLabel(/^Company ID$/).press("Enter");
      expect(api.called("POST /b2b/auth/login")).toHaveLength(1);
      await page.clock.runFor(30_000);
      await expect(page.locator("[data-login-cooldown]")).toContainText("0:35");
      await page.clock.runFor(36_000);
      await expect(page.locator("[data-login-cooldown]")).toHaveCount(0);
      await expect(signIn).toBeEnabled();
      await signIn.click();
      await expect(page).toHaveURL(/4174\/$/);
      expect(api.called("POST /b2b/auth/login")).toHaveLength(2);
    });

    test("a Retry-After the browser can't read (not exposed by CORS) falls back to the generic message", async ({ page }) => {
      await mockApi(page, { "POST /b2b/auth/login": () => tooMany({ "Retry-After": "60" }) });
      await page.goto("/login");
      await fillCredentials(page);
      await expect(page.getByRole("status").getByText(message)).toBeVisible();
      await expect(page.locator("[data-login-cooldown]")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Sign In" })).toBeEnabled();
    });

    test("Arabic: the rate-limit message and countdown, right to left", async ({ page }) => {
      await page.clock.install();
      await mockApi(page, { "POST /b2b/auth/login": () => tooMany({ "Retry-After": "30", "Access-Control-Expose-Headers": "Retry-After" }) });
      await page.goto("/login");
      await selectLanguage(page, "ar");
      await fillCredentials(page);
      await expect(page.getByText("تم تجاوز عدد محاولات تسجيل الدخول المسموح بها. يُرجى الانتظار قبل المحاولة مرة أخرى.")).toBeVisible();
      await expect(page.locator("[data-login-cooldown]")).toContainText("يمكنك المحاولة مرة أخرى بعد");
      await expect(page.locator("[data-login-cooldown]")).toContainText("0:30");
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    });

    for (const width of [320, 768, 1440]) {
      test(`rate-limit message fits at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await mockApi(page, { "POST /b2b/auth/login": () => tooMany({ "Retry-After": "45", "Access-Control-Expose-Headers": "Retry-After" }) });
        await page.goto("/login");
        await fillCredentials(page);
        await expect(page.locator("[data-login-cooldown]")).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      });
    }
  });

  test("Retry-After parsing", () => {
    expect(parseRetryAfter("65")).toBe(65);
    expect(parseRetryAfter(new Date(Date.UTC(2030, 0, 1, 0, 1, 30)).toUTCString(), Date.UTC(2030, 0, 1, 0, 0, 0))).toBe(90);
    for (const value of [null, "", "soon", "0", "-5", "99999"]) expect(parseRetryAfter(value)).toBeUndefined();
  });

  test("client validation stops bad input before any request", async ({ page }) => {
    const api = await mockApi(page, {});
    await page.goto("/login");
    await fillCredentials(page, { email: "not-an-email", password: "", company: "12345" });
    await expect(page.locator("#username-error")).toHaveText("Enter a valid email.");
    await expect(page.locator("#password-error")).toHaveText("Enter your password.");
    await expect(page.locator("#company-id-error")).toHaveText("Enter the company ID from your registration.");
    expect(api.calls).toEqual([]);
  });

  test("a malformed token response never creates a session", async ({ page }) => {
    await mockApi(page, { "POST /b2b/auth/login": () => ({ json: { access_token: "invalid" } }) });
    await page.goto("/login");
    await fillCredentials(page);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("status")).toContainText("unexpected response");
    expect(await page.evaluate((key) => sessionStorage.getItem(key), SESSION_KEY)).toBeNull();
  });

  test("a profile for a different company is rejected and nothing is kept", async ({ page }) => {
    await mockApi(page, { "POST /b2b/auth/login": ok.login, "GET /b2b/me": () => ({ json: profile(OTHER_COMPANY) }) });
    await page.goto("/login");
    await fillCredentials(page);
    await expect(page.getByRole("status")).toHaveText("We couldn't confirm your company access. Please sign in again.");
    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), SESSION_KEY)).toBeNull();
  });

  test("a 401 from the current-user check ends the session and returns to sign-in", async ({ page }) => {
    let meReply: Reply = ok.me();
    await mockApi(page, { "POST /b2b/auth/login": ok.login, "GET /b2b/me": () => meReply });
    await page.goto("/login");
    await signIn(page);
    await expect(page).toHaveURL(/4174\/$/);
    meReply = { status: 401, json: { message: "Unauthenticated." } };
    await page.goto("/wallet");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("status")).toHaveText("Your session has ended. Please sign in again.");
    expect(await page.evaluate((key) => sessionStorage.getItem(key), SESSION_KEY)).toBeNull();
  });

  test("an unreachable server keeps the session and offers Try again", async ({ page }) => {
    let meReply: Reply = ok.me();
    await mockApi(page, { "POST /b2b/auth/login": ok.login, "GET /b2b/me": () => meReply });
    await page.goto("/login");
    await signIn(page);
    await expect(page).toHaveURL(/4174\/$/);
    meReply = { abort: true };
    await page.goto("/bookings");
    await expect(page.getByRole("heading", { name: "We couldn't confirm your session" })).toBeVisible();
    expect(await page.evaluate((key) => sessionStorage.getItem(key), SESSION_KEY)).not.toBeNull();
    meReply = ok.me();
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { name: "My Bookings" })).toBeVisible();
  });

  test("the token's expiry ends the session without a refresh", async ({ page }) => {
    await mockApi(page, { "POST /b2b/auth/login": () => tokenReply(3), "GET /b2b/me": ok.me });
    await page.goto("/login");
    await signIn(page);
    await expect(page).toHaveURL(/4174\/$/);
    await expect(page).toHaveURL(/\/login$/, { timeout: 8000 });
    await expect(page.getByRole("status")).toHaveText("Your session has ended. Please sign in again.");
  });

  test("logout revokes the token on the server and clears the session", async ({ page }) => {
    const api = await mockApi(page, { "POST /b2b/auth/login": ok.login, "GET /b2b/me": ok.me, "POST /b2b/auth/logout": ok.logout });
    await page.goto("/login");
    await signIn(page);
    await expect(page).toHaveURL(/4174\/$/);
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page).toHaveURL(/\/welcome$/);
    const [logout] = api.called("POST /b2b/auth/logout");
    expect(logout.request.headers()["authorization"]).toBe(`Bearer ${TOKEN}`);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), SESSION_KEY)).toBeNull();
    await page.goto("/bookings");
    await expect(page).toHaveURL(/\/welcome/);
  });

  for (const [label, reply] of [["a server error", { status: 500, json: {} }], ["a network failure", { abort: true }]] as const) {
    test(`logout after ${label} clears locally but says the server didn't confirm`, async ({ page }) => {
      await mockApi(page, { "POST /b2b/auth/login": ok.login, "GET /b2b/me": ok.me, "POST /b2b/auth/logout": () => reply });
      await page.goto("/login");
      await signIn(page);
      await expect(page).toHaveURL(/4174\/$/);
      await page.getByRole("button", { name: "Account menu" }).click();
      await page.getByRole("button", { name: "Sign Out" }).click();
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("status")).toHaveText(/signed out on this device, but the server couldn't confirm it/);
      expect(await page.evaluate((key) => sessionStorage.getItem(key), SESSION_KEY)).toBeNull();
    });
  }

  for (const width of [390, 1440]) {
    test(`Arabic at ${width}px: direct login sends X-Locale, RTL and passes axe`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const api = await mockApi(page, { "POST /b2b/auth/login": ok.login, "GET /b2b/me": ok.me });
      await page.goto("/login");
      await selectLanguage(page, "ar");
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
      await fillCredentials(page);
      await expect(page).toHaveURL(/4174\/$/);
      expect(api.called("POST /b2b/auth/login")[0].request.headers()["x-locale"]).toBe("ar");
      expect(api.called("POST /b2b/auth/verify-otp")).toHaveLength(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    });
  }

  for (const [path, inputs] of [["/forgot-password", 2], ["/verify-otp", 4], ["/reset-password", 2]] as const) {
    test(`password recovery at ${path} shows the original screen as a preview and never calls the API`, async ({ page }) => {
      const api = await mockApi(page, {});
      await page.goto(path);
      const note = page.getByRole("note");
      await expect(note).toContainText("Online password reset isn't available yet. Contact Royal Vacation to reset your password.");
      await expect(note.getByRole("link", { name: "Contact Royal Vacation to reset your password" })).toHaveAttribute("href", "/contact");
      // The original recovery form is restored, not replaced.
      await expect(page.locator("main input")).toHaveCount(inputs);
      await page.locator("main form button[type=submit]").click();
      expect(api.calls).toEqual([]);
      expect(api.unexpected).toEqual([]);
    });
  }

  test("the restored 4-digit recovery code screen is a preview in Arabic too", async ({ page }) => {
    const api = await mockApi(page, {});
    await page.goto("/verify-otp");
    await page.locator("main select").first().selectOption("ar");
    await expect(page.getByRole("note")).toContainText("إعادة تعيين كلمة المرور عبر الإنترنت غير متاحة حاليًا");
    for (const [index, digit] of ["1", "2", "3", "4"].entries()) await page.getByLabel(`الرقم ${index + 1} من ٤`).fill(digit);
    await page.getByRole("button", { name: "تأكيد" }).click();
    await expect(page.locator("main [role=status]").last()).toHaveText("التحقق عبر الإنترنت غير متاح حاليًا. لم يُرسل أي رمز ولم يُتحقق منه.");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    expect(api.calls).toEqual([]);
  });

  test("profile shows the account from /me; the hidden agency pages open My Profile; nothing pretends to be live", async ({ page }) => {
    await mockApi(page, { "POST /b2b/auth/login": ok.login, "GET /b2b/me": ok.me });
    await page.goto("/login");
    await signIn(page);
    await expect(page).toHaveURL(/4174\/$/);
    // No "sample data" banner above the page: it was removed at the owner's request.
    await expect(page.locator(".api-data-notice")).toHaveCount(0);
    await expect(page.getByText("Sample data: this page isn't connected to your account yet.")).toHaveCount(0);

    await page.goto("/profile");
    const main = page.locator("main");
    for (const value of ["Laila Hassan", "laila@example.com", "Nile Gate Tours", "1 Corniche Road", "Alexandria", "Egypt"]) await expect(main).toContainText(value);
    await expect(main).not.toContainText(/Alex Morgan|Horizon Travel|partner@example\.com/);
    await expect(page.locator(".api-data-notice")).toHaveCount(0);
    await expect(main.locator('a[href="/agency"], a[href="/agency/edit"]')).toHaveCount(0);

    // Agency Profile is hidden for now: its routes open My Profile.
    for (const path of ["/agency", "/agency/edit"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/profile$/);
      await expect(page.locator("[data-live-profile]")).toBeVisible();
    }

    await page.goto("/bookings");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator(".api-data-notice")).toHaveCount(0);
    await expect(page.getByText(/Sample data: this page isn't connected/)).toHaveCount(0);
  });

  async function completeRegistration(page: Page) {
    await page.goto("/register/agency/company");
    await fillCompanyStep(page, { name: "Delta Voyages", registration: "CR-REG-1" });
    await page.getByLabel("Full Name").fill("Mona Said");
    await page.getByLabel("Nationality").selectOption("EG");
    await page.getByLabel("ID Number").fill("ID-778");
    await attachIdDocument(page);
    await page.getByPlaceholder("Enter phone number").fill("1001234567");
    await page.getByLabel("Email", { exact: false }).fill("mona@example.test");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByLabel("Corporate", { exact: true }).check();
    await page.locator("#document-commercialRegistration").setInputFiles(samplePdf("cr.pdf"));
    await page.locator("#document-taxCertificate").setInputFiles(samplePdf("tax.pdf"));
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page).toHaveURL(/\/review$/);
  }

  test("registration sends the API contract and shows the company ID to sign in with", async ({ page }) => {
    const api = await mockApi(page, { "POST /b2b/auth/register": () => ({ status: 201, json: { message: "Registration submitted. Awaiting admin approval.", company_id: COMPANY, status: "pending" } }) });
    await completeRegistration(page);
    await expect(page.getByText("Preview demo submission")).toHaveCount(0);
    await expect(page.locator(".registration-password")).toContainText("not uploaded yet");

    await page.getByRole("button", { name: "Submit registration" }).click();
    await expect(page.locator("#registration-password-error")).toHaveText("Use a password that meets every rule below.");
    await page.locator("#registration-password").fill("Short1!");
    await expect(page.locator(".registration-password__rules li[data-met=true]")).toHaveCount(4);
    await page.locator("#registration-password").fill("Royal-Partner-2027");
    await page.locator("#registration-password-confirmation").fill("Royal-Partner-2028");
    await page.getByRole("button", { name: "Submit registration" }).click();
    await expect(page.locator("#registration-password-confirmation-error")).toHaveText("The passwords don't match.");
    expect(api.calls).toEqual([]);

    await page.locator("#registration-password-confirmation").fill("Royal-Partner-2027");
    await page.getByRole("button", { name: "Submit registration" }).click();
    await expect(page.getByRole("heading", { name: "Registration Submitted!" })).toBeVisible();
    await expect(page.locator(".registration-success")).toContainText(COMPANY);
    await expect(page.locator(".registration-success")).toContainText("Awaiting Approval");

    const [request] = api.called("POST /b2b/auth/register");
    expect(request.request.postDataJSON()).toEqual({
      legal_name: "Delta Voyages", business_type: "corporate", registration_no: "CR-REG-1", country_code: "EG", city: "Alexandria",
      address: "Alexandria", employee_count: 12, contact_name: "Mona Said", contact_email: "mona@example.test", contact_phone: "+201001234567",
      contact_nationality: "Egypt", contact_id_number: "ID-778", password: "Royal-Partner-2027", password_confirmation: "Royal-Partner-2027",
    });
    // Files are not part of the contract and are never sent.
    expect(request.request.headers()["content-type"]).toContain("application/json");
  });

  test("the success animation waits for the API, sends once, and keeps the real company ID copyable", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const api = await mockApi(page, { "POST /b2b/auth/register": async () => { await gate; return { status: 201, json: { company_id: COMPANY, status: "pending" } }; } });
    await completeRegistration(page);
    await page.locator("#registration-password").fill("Royal-Partner-2027");
    await page.locator("#registration-password-confirmation").fill("Royal-Partner-2027");
    await page.getByRole("button", { name: "Submit registration" }).dblclick();
    await expect(page.getByRole("button", { name: "Submitting…" })).toBeDisabled();
    // Nothing celebrates before the backend answers.
    await expect(page.locator(".registration-success")).toHaveCount(0);
    release();
    const success = page.locator(".registration-success");
    await expect(success).toBeVisible();
    expect(api.called("POST /b2b/auth/register")).toHaveLength(1);
    await expect(page.getByRole("heading", { name: "Registration Submitted!" })).toBeFocused();
    await expect(success.locator(".registration-success__status")).toHaveText("Awaiting Approval");
    await expect(success).not.toContainText(/Approved\b/);
    await expect(success.locator("code")).toHaveText(COMPANY);
    await expect(page.locator(".registration-password")).toHaveCount(0);
    await expect(page.locator(".review-card")).toHaveCount(0);
    await success.getByRole("button", { name: "Copy" }).click();
    await expect(success.getByRole("button", { name: "Copied" })).toBeVisible();
    await expect(success.getByText("Company ID copied.")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(COMPANY);
    await expect(success.getByRole("link", { name: "Go to Sign In" })).toHaveAttribute("href", "/login");
    await expect(page).toHaveURL(/\/review$/);
    await expect(success.locator(".registration-success__check")).toHaveCSS("animation-name", "registration-draw");
  });

  test("with reduced motion the success state is complete and still", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockApi(page, { "POST /b2b/auth/register": () => ({ status: 201, json: { company_id: COMPANY, status: "pending" } }) });
    await completeRegistration(page);
    await page.locator("#registration-password").fill("Royal-Partner-2027");
    await page.locator("#registration-password-confirmation").fill("Royal-Partner-2027");
    await page.getByRole("button", { name: "Submit registration" }).click();
    const success = page.locator(".registration-success");
    for (const part of [".registration-success__mark", ".registration-success__message", ".registration-success__id", ".registration-success__cta"]) await expect(success.locator(part)).toHaveCSS("animation-name", "none");
    await expect(success.locator(".registration-success__check")).toHaveCSS("stroke-dashoffset", "0px");
    await expect(success.locator("code")).toHaveText(COMPANY);
  });

  test("review Edit returns to a step with everything kept", async ({ page }) => {
    await mockApi(page, {});
    await completeRegistration(page);
    await page.getByRole("link", { name: "Edit Company Information" }).click();
    await expect(page).toHaveURL(/\/company$/);
    await expect(page.locator("#company-name")).toHaveValue("Delta Voyages");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page).toHaveURL(/\/review$/);
    await expect(page.locator(".review-card").first()).toContainText("CR-REG-1");
  });

  for (const width of [390, 768, 1024, 1440]) {
    test(`registration in Arabic at ${width}px is RTL, fits and passes axe through to success`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await mockApi(page, { "POST /b2b/auth/register": () => ({ status: 201, json: { company_id: COMPANY, status: "pending" } }) });
      await completeRegistration(page);
      await selectLanguage(page, "ar");
      await expect(page.locator("main.registration-page")).toHaveAttribute("dir", "rtl");
      await expect(page.getByRole("heading", { name: "المراجعة والإرسال" })).toBeVisible();
      const fits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await fits();
      expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
      await page.locator("#registration-password").fill("Royal-Partner-2027");
      await page.locator("#registration-password-confirmation").fill("Royal-Partner-2027");
      await page.getByRole("button", { name: "إرسال التسجيل" }).click();
      await expect(page.getByRole("heading", { name: "تم إرسال التسجيل!" })).toBeVisible();
      await expect(page.locator(".registration-success__status")).toHaveText("في انتظار الاعتماد");
      await page.locator(".registration-success__cta").evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
      await fits();
      expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    });
  }

  test("direct login never requests a verification code", async ({ page }) => {
    const api = await mockApi(page, { "POST /b2b/auth/login": ok.login, "GET /b2b/me": ok.me });
    await page.goto("/login");
    await signIn(page);
    expect(api.called("POST /b2b/auth/verify-otp")).toHaveLength(0);
    await expect(page.locator("#login-code")).toHaveCount(0);
  });

  for (const [label, reply, text] of [
    ["a duplicate email", { status: 422, json: { message: "x", errors: { contact_email: ["The contact email has already been taken."] } } }, "Email is already registered."],
    ["a duplicate company registration", { status: 422, json: { message: "x", errors: { registration_no: ["A company with this registration already exists."] } } }, "Commercial Registration Number is already registered."],
    ["too many attempts", { status: 429, json: { message: "Too Many Attempts." } }, "Too many registration attempts from this network. Please try again later."],
    ["a network failure", { abort: true }, "We couldn't reach the registration service. Check your connection and try again."],
  ] as const) {
    test(`registration explains ${label}`, async ({ page }) => {
      await mockApi(page, { "POST /b2b/auth/register": () => reply });
      await completeRegistration(page);
      await page.locator("#registration-password").fill("Royal-Partner-2027");
      await page.locator("#registration-password-confirmation").fill("Royal-Partner-2027");
      await page.getByRole("button", { name: "Submit registration" }).click();
      await expect(page.getByRole("alert")).toContainText(text);
      await expect(page.getByRole("heading", { name: "Registration Submitted!" })).toHaveCount(0);
    });
  }

  test("the direct sign-in works by keyboard alone", async ({ page }) => {
    await mockApi(page, { "POST /b2b/auth/login": ok.login, "GET /b2b/me": ok.me });
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill("laila@example.com");
    await page.getByLabel("Password", { exact: true }).fill("Correct-Horse-9!");
    await page.getByLabel("Company ID", { exact: true }).fill(COMPANY);
    await page.getByLabel("Company ID", { exact: true }).press("Enter");
    await expect(page).toHaveURL(/4174\/$/);
  });
});

test.describe("API mode: direct token login", () => {
  test.use({ baseURL: "http://127.0.0.1:4174" });

  test("a session survives reload without resending credentials", async ({ page }) => {
    const api = await mockApi(page, { "POST /b2b/auth/login": ok.login, "GET /b2b/me": ok.me });
    await page.goto("/login");
    await signIn(page);
    await page.reload();
    await expect(page).toHaveURL(/4174\/$/);
    expect(api.called("POST /b2b/auth/login")).toHaveLength(1);
    await expect.poll(() => api.called("GET /b2b/me").length, { timeout: 10000 }).toBeGreaterThanOrEqual(2);
  });

  test("a signed-in user opening the legacy OTP page stays signed in", async ({ page }) => {
    await mockApi(page, { "POST /b2b/auth/login": ok.login, "GET /b2b/me": ok.me });
    await page.goto("/login");
    await signIn(page);
    await page.goto("/login/verify-otp");
    await expect(page).toHaveURL(/4174\/$/);
  });

  test("password recovery OTP remains separate from login", async ({ page }) => {
    const api = await mockApi(page, {});
    await page.goto("/verify-otp");
    await expect(page.getByRole("heading", { name: "Enter the 4-digit verification code" })).toBeVisible();
    await expect(page.locator("main input")).toHaveCount(4);
    expect(api.calls).toEqual([]);
  });
});
