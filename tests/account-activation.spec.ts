import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Request } from "@playwright/test";

/*
 * /activate-account against MOCKED replies that follow the backend handoff contract. The API-mode build
 * points at api.royal.test, which never resolves; every request is answered here, so staging is never
 * contacted.
 */
const COMPANY = "8f14e45f-ceea-467a-9575-3c4b1f0b5c1a";
const EMAIL = "owner@example.com";
const ACTIVATED = { message: "Email verified successfully. Your company account is now active. You can log in using your email and password.", status: "active" };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, X-Locale", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Expose-Headers": "Retry-After" };

type Reply = { status?: number; json?: unknown; abort?: boolean; headers?: Record<string, string> };
type Handler = (request: Request) => Reply | Promise<Reply>;
const VERIFY = "POST /b2b/auth/verify-otp";
const RESEND = "POST /b2b/auth/resend-verification-otp";

async function mockApi(page: Page, handlers: Record<string, Handler>) {
  const calls: { key: string; request: Request }[] = [];
  const unexpected: string[] = [];
  await page.route("https://api.royal.test/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const key = `${request.method()} ${new URL(request.url()).pathname.replace("/api/v1", "")}`;
    // The sign-in page, reached after activation, checks the API is reachable.
    if (key === "GET /foundation-check") return route.fulfill({ status: 200, headers: cors, json: { locale: "en", direction: "ltr" } });
    calls.push({ key, request });
    const handler = handlers[key];
    if (!handler) { unexpected.push(key); return route.fulfill({ status: 500, headers: cors, json: {} }); }
    const reply = await handler(request);
    if (reply.abort) return route.abort("connectionrefused");
    return route.fulfill({ status: reply.status ?? 200, headers: { ...cors, ...reply.headers }, json: reply.json ?? {} });
  });
  return { calls, unexpected, called: (key: string) => calls.filter((call) => call.key === key) };
}

const link = (params: Record<string, string>) => `/activate-account?${new URLSearchParams(params)}`;
const email = (page: Page) => page.getByLabel(/^(Email|البريد الإلكتروني)$/);
const company = (page: Page) => page.getByLabel(/^(Company ID|معرّف الشركة)$/);
const verifyButton = (page: Page) => page.getByRole("button", { name: /^(Verify and activate|تأكيد وتفعيل الحساب)$/ });
const resendButton = (page: Page) => page.getByRole("button", { name: /^(Send a new code|إرسال رمز جديد)$/ });
async function typeCode(page: Page, code = "123456") {
  await page.locator("#activate-code").click();
  await page.keyboard.type(code);
}
const storage = (page: Page) => page.evaluate(() => ({ session: { ...sessionStorage }, local: { ...localStorage }, cookies: document.cookie }));

test.describe("account activation (API mode)", () => {
  test.use({ baseURL: "http://127.0.0.1:4174" });

  test("is public: opens without a session and sends nothing until asked", async ({ page }) => {
    const api = await mockApi(page, {});
    await page.goto("/activate-account");
    await expect(page).toHaveURL(/\/activate-account$/);
    await expect(page.getByRole("heading", { level: 1, name: "Activate your account" })).toBeVisible();
    await expect(email(page)).toBeFocused();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    await expect(page).toHaveTitle(/Activate Account/);
    expect(api.calls).toEqual([]);
    expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  });

  test("prefills the email and Company ID from the link, drops a code from the URL, and checks the values", async ({ page }) => {
    await mockApi(page, {});
    await page.goto(link({ email: EMAIL, company_id: COMPANY.toUpperCase(), otp: "654321", token: "x" }));
    await expect(page).toHaveURL(new RegExp(`/activate-account\\?email=owner%40example.com&company_id=${COMPANY.toUpperCase()}$`));
    await expect(email(page)).toHaveValue(EMAIL);
    await expect(company(page)).toHaveValue(COMPANY.toUpperCase());
    // Both are valid, so the code is next.
    await expect(page.locator("#activate-code")).toBeFocused();
    await expect(page.locator(".field-error")).toHaveCount(0);

    await page.goto(link({ email: "not-an-email", company_id: "1234" }));
    await expect(page.getByText("Enter a valid email.")).toBeVisible();
    await expect(page.getByText("Enter the company ID from your approval email.")).toBeVisible();
    await expect(email(page)).toBeFocused();
    // Values can be corrected.
    await email(page).fill(EMAIL);
    await company(page).fill(COMPANY);
    await expect(page.locator(".field-error")).toHaveCount(0);
  });

  test("checks the form before sending anything", async ({ page }) => {
    const api = await mockApi(page, {});
    await page.goto("/activate-account");
    await verifyButton(page).click();
    await expect(page.getByText("Enter a valid email.")).toBeVisible();
    await expect(page.getByText("Enter the company ID from your approval email.")).toBeVisible();
    await expect(page.getByText("Enter all 6 digits of the code.")).toBeVisible();
    await resendButton(page).click();
    expect(api.calls).toEqual([]);
  });

  test("verifies once, shows success, creates no session and moves on to sign-in", async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const api = await mockApi(page, { [VERIFY]: async () => { await held; return { json: ACTIVATED }; } });
    await page.goto(link({ email: EMAIL, company_id: COMPANY.toUpperCase() }));
    await typeCode(page);
    await verifyButton(page).click();
    await expect(page.getByRole("button", { name: "Verifying…" })).toBeDisabled();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Verifying…" }).dblclick({ force: true });
    release();

    await expect(page.getByRole("heading", { level: 1, name: "Your account is active" })).toBeFocused();
    await expect(page.getByRole("status").filter({ hasText: "Your email is verified and your company account is active." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to Sign In" })).toHaveAttribute("href", "/login");
    expect(api.called(VERIFY)).toHaveLength(1);
    const request = api.called(VERIFY)[0].request;
    expect(request.postDataJSON()).toEqual({ email: EMAIL, company_id: COMPANY, otp: "123456" });
    expect(request.headers().authorization).toBeUndefined();
    // No token, session or sign-in of any kind.
    expect(await storage(page)).toEqual({ session: {}, local: {}, cookies: "" });
    expect(page.url()).not.toContain("123456");

    await expect(page).toHaveURL(/4174\/login$/, { timeout: 10000 });
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    expect(api.unexpected).toEqual([]);
  });

  test("Go to Sign In leaves straight away", async ({ page }) => {
    await mockApi(page, { [VERIFY]: () => ({ json: ACTIVATED }) });
    await page.goto(link({ email: EMAIL, company_id: COMPANY }));
    await typeCode(page);
    await verifyButton(page).click();
    await page.getByRole("link", { name: "Go to Sign In" }).click();
    await expect(page).toHaveURL(/4174\/login$/);
  });

  test("a 2xx without status active is not treated as success", async ({ page }) => {
    await mockApi(page, { [VERIFY]: () => ({ json: { message: "ok", status: "pending" } }) });
    await page.goto(link({ email: EMAIL, company_id: COMPANY }));
    await typeCode(page);
    await verifyButton(page).click();
    await expect(page.getByRole("alert").filter({ hasText: "The activation service returned an unexpected response." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your account is active" })).toHaveCount(0);
  });

  for (const [name, reply, message] of [
    ["an incorrect or expired code (422 on otp)", { status: 422, json: { message: "The OTP is invalid or has expired.", errors: { otp: ["The OTP is invalid or has expired."] } } }, "That code is incorrect or has expired. Check the latest email or request a new code."],
    ["a 422 with only a message", { status: 422, json: { message: "Invalid OTP." } }, "That code is incorrect or has expired. Check the latest email or request a new code."],
  ] as const) {
    test(`verify: ${name} clears the code and asks again`, async ({ page }) => {
      await mockApi(page, { [VERIFY]: () => reply });
      await page.goto(link({ email: EMAIL, company_id: COMPANY }));
      await typeCode(page);
      await verifyButton(page).click();
      await expect(page.locator("#activate-code-error")).toHaveText(message);
      await expect(page.locator("#activate-code")).toHaveValue("");
      await expect(page.locator("#activate-code")).toBeFocused();
      await expect(page.getByText("The OTP is invalid")).toHaveCount(0);
    });
  }

  test("verify: 422 on the email or Company ID marks those fields", async ({ page }) => {
    await mockApi(page, { [VERIFY]: () => ({ status: 422, json: { message: "x", errors: { email: ["bad"], company_id: ["bad"] } } }) });
    await page.goto(link({ email: EMAIL, company_id: COMPANY }));
    await typeCode(page);
    await verifyButton(page).click();
    await expect(page.getByText("Check the email address.")).toBeVisible();
    await expect(page.getByText("Check the Company ID.")).toBeVisible();
    await expect(page.locator("#activate-code-error")).toHaveCount(0);
  });

  for (const [name, reply, message] of [
    ["400 (details don't match)", { status: 400, json: { message: "Internal: no pending verification for user 7" } }, "We couldn't activate an account with these details."],
    ["404", { status: 404, json: { message: "Not found" } }, "We couldn't activate an account with these details."],
    ["500", { status: 500, json: { message: "SQLSTATE[HY000]" } }, "Account activation isn't available right now. Please try again later."],
    ["503", { status: 503, json: { message: "down" } }, "Account activation isn't available right now. Please try again later."],
    ["a network failure", { abort: true }, "We couldn't reach the activation service. Check your connection and try again."],
  ] as const) {
    test(`verify: ${name} shows a plain message and keeps the form`, async ({ page }) => {
      await mockApi(page, { [VERIFY]: () => reply });
      await page.goto(link({ email: EMAIL, company_id: COMPANY }));
      await typeCode(page);
      await verifyButton(page).click();
      await expect(page.locator("[data-activation-notice=error]")).toContainText(message);
      await expect(page.getByText(/Internal:|SQLSTATE|Not found/)).toHaveCount(0);
      await expect(verifyButton(page)).toBeEnabled();
    });
  }

  test("verify: 429 waits for Retry-After before allowing another try, and never retries by itself", async ({ page }) => {
    const api = await mockApi(page, { [VERIFY]: () => ({ status: 429, json: { message: "Too Many Attempts." }, headers: { "Retry-After": "90" } }) });
    await page.goto(link({ email: EMAIL, company_id: COMPANY }));
    await typeCode(page);
    await verifyButton(page).click();
    await expect(page.locator("[data-activation-notice=error]")).toHaveText("Too many attempts. Please wait before trying again.");
    await expect(page.locator("[data-activation-wait=verify]")).toHaveText(/You can try again in 1:(30|29)/);
    await expect(verifyButton(page)).toBeDisabled();
    await page.waitForTimeout(1500);
    expect(api.called(VERIFY)).toHaveLength(1);
  });

  test("resend: neutral confirmation, one request, then a cooldown", async ({ page }) => {
    const api = await mockApi(page, { [RESEND]: () => ({ json: { message: "A new verification code has been sent." } }) });
    await page.goto(link({ email: EMAIL, company_id: COMPANY.toUpperCase() }));
    await resendButton(page).dblclick();
    const status = page.locator("[data-activation-notice=info]");
    await expect(status).toHaveText(/^If these details match an account waiting for activation, a new code will be sent to that email\./);
    await expect(status.locator("xpath=..")).toHaveAttribute("role", "status");
    // The server's wording, which claims delivery, is not shown.
    await expect(page.getByText("has been sent")).toHaveCount(0);
    await expect(page.locator("[data-activation-wait=resend]")).toHaveText(/Available again in (1:00|0:59)/);
    await expect(resendButton(page)).toBeDisabled();
    expect(api.called(RESEND)).toHaveLength(1);
    expect(api.called(RESEND)[0].request.postDataJSON()).toEqual({ email: EMAIL, company_id: COMPANY });
    expect(api.called(RESEND)[0].request.headers().authorization).toBeUndefined();
  });

  test("resend: 429 uses Retry-After for the cooldown", async ({ page }) => {
    await mockApi(page, { [RESEND]: () => ({ status: 429, json: { message: "Too Many Attempts." }, headers: { "Retry-After": "125" } }) });
    await page.goto(link({ email: EMAIL, company_id: COMPANY }));
    await resendButton(page).click();
    await expect(page.locator("[data-activation-notice=error]")).toHaveText("Too many code requests. Please wait before asking for another code.");
    await expect(page.locator("[data-activation-wait=resend]")).toHaveText(/Available again in 2:0(5|4)/);
    await expect(resendButton(page)).toBeDisabled();
  });

  // Staging today: Retry-After is sent but CORS doesn't expose it, so the browser can't read it.
  const hiddenRetryAfter = { "Retry-After": "1952", "Access-Control-Expose-Headers": "" };
  const unreadable: [string, Record<string, string>][] = [["not exposed by CORS", hiddenRetryAfter], ["invalid", { "Retry-After": "soon" }], ["missing", {}]];
  for (const [name, headers] of unreadable) {
    test(`verify: 429 with a Retry-After that is ${name} shows no countdown, keeps Verify usable and never retries`, async ({ page }) => {
      await page.clock.install();
      const api = await mockApi(page, { [VERIFY]: () => ({ status: 429, json: { message: "Too Many Attempts." }, headers }) });
      await page.goto(link({ email: EMAIL, company_id: COMPANY }));
      await typeCode(page);
      await verifyButton(page).click();
      await expect(page.locator("[data-activation-notice=error]")).toHaveText("Too many attempts. Please wait a few minutes before trying again.");
      await expect(page.locator("[data-activation-wait]")).toHaveCount(0);
      await expect(page.getByText(/try again in \d|Available again in \d/)).toHaveCount(0);
      await expect(verifyButton(page)).toBeEnabled();
      // Two minutes later: still no countdown and no request the user didn't make.
      await page.clock.fastForward("02:00");
      await expect(page.locator("[data-activation-wait]")).toHaveCount(0);
      expect(api.called(VERIFY)).toHaveLength(1);
      // The user can try again; one click is still one request.
      await typeCode(page);
      await verifyButton(page).click();
      await expect.poll(() => api.called(VERIFY).length).toBe(2);
      await expect(verifyButton(page)).toBeEnabled();
      expect(api.called(VERIFY)).toHaveLength(2);
    });
  }

  test("verify: a readable Retry-After after an unknown one starts the real countdown", async ({ page }) => {
    let reply: Reply = { status: 429, json: {}, headers: hiddenRetryAfter };
    await mockApi(page, { [VERIFY]: () => reply });
    await page.goto(link({ email: EMAIL, company_id: COMPANY }));
    await typeCode(page);
    await verifyButton(page).click();
    await expect(page.locator("[data-activation-notice=error]")).toHaveText("Too many attempts. Please wait a few minutes before trying again.");
    reply = { status: 429, json: {}, headers: { "Retry-After": "300" } };
    await typeCode(page);
    await verifyButton(page).click();
    await expect(page.locator("[data-activation-notice=error]")).toHaveText("Too many attempts. Please wait before trying again.");
    await expect(page.locator("[data-activation-wait=verify]")).toHaveText(/You can try again in (5:00|4:59)/);
    await expect(verifyButton(page)).toBeDisabled();
  });

  test("resend: 429 without a readable Retry-After shows no countdown and leaves the button usable", async ({ page }) => {
    const api = await mockApi(page, { [RESEND]: () => ({ status: 429, json: { message: "Too Many Attempts." }, headers: hiddenRetryAfter }) });
    await page.goto(link({ email: EMAIL, company_id: COMPANY }));
    await resendButton(page).click();
    await expect(page.locator("[data-activation-notice=error]")).toHaveText("Too many code requests. Please wait a few minutes before asking for another code.");
    await expect(page.locator("[data-activation-wait]")).toHaveCount(0);
    await expect(resendButton(page)).toBeEnabled();
    expect(api.called(RESEND)).toHaveLength(1);
  });

  test("Arabic: 429 without a readable Retry-After explains the unknown wait, right to left, with no countdown", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("royal-vacation.locale", "ar"));
    await mockApi(page, { [VERIFY]: () => ({ status: 429, json: {}, headers: hiddenRetryAfter }) });
    await page.goto(link({ email: EMAIL, company_id: COMPANY }));
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await typeCode(page);
    await verifyButton(page).click();
    await expect(page.locator("[data-activation-notice=error]")).toHaveText("محاولات كثيرة. يرجى الانتظار بضع دقائق قبل المحاولة مرة أخرى.");
    await expect(page.locator("[data-activation-wait]")).toHaveCount(0);
  });

  test("Arabic: 429 with Retry-After shows the countdown", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("royal-vacation.locale", "ar"));
    await mockApi(page, { [VERIFY]: () => ({ status: 429, json: {}, headers: { "Retry-After": "90" } }) });
    await page.goto(link({ email: EMAIL, company_id: COMPANY }));
    await typeCode(page);
    await verifyButton(page).click();
    await expect(page.locator("[data-activation-notice=error]")).toHaveText("محاولات كثيرة. يرجى الانتظار قبل المحاولة مرة أخرى.");
    await expect(page.locator("[data-activation-wait=verify]")).toContainText(/يمكنك المحاولة مرة أخرى بعد\s*1:(30|29)/);
  });

  test("resend: 422 and server errors are explained without server wording", async ({ page }) => {
    let reply: Reply = { status: 422, json: { message: "x", errors: { email: ["The selected email is invalid."] } } };
    await mockApi(page, { [RESEND]: () => reply });
    await page.goto(link({ email: EMAIL, company_id: COMPANY }));
    await resendButton(page).click();
    await expect(page.getByText("Check the email address.")).toBeVisible();
    await expect(page.getByText("The selected email is invalid.")).toHaveCount(0);
    reply = { status: 502, json: { message: "Bad gateway" } };
    await resendButton(page).click();
    await expect(page.locator("[data-activation-notice=error]")).toHaveText("Account activation isn't available right now. Please try again later.");
    await expect(resendButton(page)).toBeEnabled();
  });

  test("Arabic: right-to-left page, messages and success", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("royal-vacation.locale", "ar"));
    const api = await mockApi(page, { [VERIFY]: () => ({ json: ACTIVATED }), [RESEND]: () => ({ json: {} }) });
    await page.goto(link({ email: EMAIL, company_id: COMPANY }));
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1, name: "تفعيل حسابك" })).toBeVisible();
    await expect(email(page)).toHaveAttribute("dir", "ltr");
    await resendButton(page).click();
    await expect(page.locator("[data-activation-notice=info]")).toContainText("إذا كانت هذه البيانات مطابقة لحساب بانتظار التفعيل");
    await expect(page.locator("[data-activation-wait=resend]")).toContainText("متاح مرة أخرى بعد");
    await typeCode(page, "١٢٣٤٥٦");
    await verifyButton(page).click();
    await expect(page.getByRole("heading", { level: 1, name: "تم تفعيل حسابك" })).toBeVisible();
    expect(api.called(VERIFY)[0].request.postDataJSON().otp).toBe("123456");
    expect(api.called(VERIFY)[0].request.headers()["x-locale"]).toBe("ar");
  });

  for (const width of [360, 768, 1440]) {
    test(`fits a ${width}px screen without sideways scrolling`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await mockApi(page, {});
      await page.goto(link({ email: "a.very.long.company.owner.address@example-travel-agency.com", company_id: COMPANY }));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });
  }

  test("is separate from the sign-in code step and password recovery", async ({ page }) => {
    const api = await mockApi(page, {});
    await page.goto("/login/verify-otp");
    await expect(page.getByRole("heading", { name: "Activate your account" })).toHaveCount(0);
    await page.goto("/verify-otp");
    await expect(page.locator("[data-recovery-unavailable]")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Activate your account" })).toHaveCount(0);
    expect(api.calls).toEqual([]);
  });
});

test.describe("account activation (demo build)", () => {
  test("isn't available and sends the visitor to sign-in", async ({ page }) => {
    await page.goto("/activate-account?email=owner%40example.com");
    await expect(page).toHaveURL(/\/login$/);
  });
});
