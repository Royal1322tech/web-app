import { expect, test, type Page, type Request } from "@playwright/test";

/*
 * Editing the signed-in user's name and phone with PATCH /api/v1/b2b/me, against MOCKED replies. The
 * deployed API accepts only `name` and `phone` (strings) and at least one of them (422 otherwise).
 * The build on port 4174 calls api.royal.test; nothing reaches staging.
 */
const COMPANY = "8f14e45f-ceea-467a-9575-3c4b1f0b5c1a";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, X-Locale", "Access-Control-Allow-Methods": "GET, PATCH, POST, OPTIONS" };
const me = (name = "Laila Hassan", phone: string | null = "+201001234567") => ({ message: "ok", data: { user: { id: 7, name, email: "laila@example.com", phone }, company: { id: COMPANY, name: "Nile Gate Tours", legal_name: "Nile Gate Tours LLC", display_name: "Nile Gate Tours", status: "approved", account_currency: "USD", preferred_locale: "en", country_code: "EG", city: "Alexandria", address: "1 Corniche Road", business_type: "travel_agency", registration_no: "CR-1", tax_no: null, employee_count: 12 }, membership: { role_code: "company_admin", status: "active" } } });
type Reply = { status?: number; json?: unknown; abort?: boolean };

async function signedIn(page: Page, patch: (request: Request) => Reply) {
  let current = me();
  const calls: { me: number; patch: Request[] } = { me: 0, patch: [] };
  await page.addInitScript((companyId) => {
    if (!sessionStorage.getItem("royal-travel.b2b-session.v1")) sessionStorage.setItem("royal-travel.b2b-session.v1", JSON.stringify({ token: "12|mocked", expiresAt: Date.now() + 3_600_000, companyId }));
  }, COMPANY);
  await page.route("https://api.royal.test/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const path = new URL(request.url()).pathname;
    if (path === "/api/v1/foundation-check") return route.fulfill({ headers: cors, json: { locale: "en", direction: "ltr" } });
    if (path === "/api/v1/b2b/me" && request.method() === "GET") { calls.me++; return route.fulfill({ headers: cors, json: current }); }
    if (path === "/api/v1/b2b/me" && request.method() === "PATCH") {
      calls.patch.push(request);
      const reply = patch(request);
      if (reply.abort) return route.abort("connectionrefused");
      if ((reply.status ?? 200) < 300) { const body = request.postDataJSON(); current = me(body.name ?? current.data.user.name, body.phone ?? current.data.user.phone); }
      return route.fulfill({ status: reply.status ?? 200, headers: cors, json: reply.json ?? { message: "Profile updated." } });
    }
    return route.fulfill({ status: 500, headers: cors, json: {} });
  });
  return calls;
}

test.describe("profile: your details (mocked API)", () => {
  test.use({ baseURL: "http://127.0.0.1:4174" });

  test("shows the name and phone from /me, saves only what changed, and reloads the profile", async ({ page }) => {
    const calls = await signedIn(page, () => ({}));
    await page.goto("/profile");
    const form = page.locator("[data-profile-form]");
    await expect(form.getByLabel("Full name")).toHaveValue("Laila Hassan");
    await expect(form.getByLabel("Phone")).toHaveValue("+201001234567");
    await form.getByLabel("Full name").fill("Laila M. Hassan");
    const meBefore = calls.me;
    await form.getByRole("button", { name: "Save changes" }).dblclick();
    await expect(page.locator("[data-profile-notice=success]")).toHaveText("Your details were saved.");
    expect(calls.patch).toHaveLength(1);
    expect(calls.patch[0].postDataJSON()).toEqual({ name: "Laila M. Hassan" });
    expect(calls.patch[0].headers()["authorization"]).toBe("Bearer 12|mocked");
    expect(calls.me).toBe(meBefore + 1);
    await expect(page.locator("main")).toContainText("Laila M. Hassan");
    // No loading screen replaced the page while the profile reloaded.
    await expect(form).toBeVisible();
  });

  test("nothing changed, an empty name or a bad phone sends nothing", async ({ page }) => {
    const calls = await signedIn(page, () => ({}));
    await page.goto("/profile");
    const form = page.locator("[data-profile-form]");
    await form.getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator("[data-profile-notice=info]")).toHaveText("There are no changes to save.");
    await form.getByLabel("Full name").fill(" ");
    await form.getByLabel("Phone").fill("call me");
    await form.getByRole("button", { name: "Save changes" }).click();
    await expect(form.getByText("Enter your name.")).toBeVisible();
    await expect(form.getByText(/Enter a valid phone number/)).toBeVisible();
    expect(calls.patch).toHaveLength(0);
  });

  for (const [name, reply, expected] of [
    ["422 on the phone", { status: 422, json: { message: "x", errors: { phone: ["The phone format is invalid."] } } }, "Check the phone number."],
    ["429", { status: 429, json: { message: "Too Many Attempts." } }, "Too many requests. Please wait a few minutes before trying again."],
    ["a network failure", { abort: true }, "We couldn't reach the server. Check your connection and try again."],
  ] as const) {
    test(`${name} is explained without server wording`, async ({ page }) => {
      await signedIn(page, () => reply);
      await page.goto("/profile");
      const form = page.locator("[data-profile-form]");
      await form.getByLabel("Phone").fill("+20 100 765 4321");
      await form.getByRole("button", { name: "Save changes" }).click();
      await expect(form.getByText(expected)).toBeVisible();
      await expect(page.getByText("The phone format is invalid.")).toHaveCount(0);
    });
  }

  test("company details stay read-only", async ({ page }) => {
    await signedIn(page, () => ({}));
    await page.goto("/profile");
    const form = page.locator("[data-profile-form]");
    await expect(form.locator("input")).toHaveCount(2);
    await expect(form).toContainText("Company details can't be changed online");
  });
});
