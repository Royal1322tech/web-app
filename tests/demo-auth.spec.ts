import { selectLanguage } from "./helpers/header";
import { test, expect } from "@playwright/test";
import { submitDemoLogin, logout, visit } from "./helpers/demo-login";
import { openHeaderTools } from "./helpers/header";

const privateRoutes = ["/", "/search", "/hotels/eastern-al-montazah", "/booking/summary", "/booking/guests", "/booking/policy", "/booking/payment", "/booking/result", "/booking/result/DEMO-1001", "/bookings", "/bookings/DEMO-1001", "/bookings/DEMO-1001/voucher", "/favourites", "/wallet", "/transactions", "/notifications", "/agency", "/agency/edit", "/profile", "/account/settings", "/verify-email", "/group-quotation", "/car-rental", "/car-rental/search", "/car-rental/vehicles/demo", "/car-rental/summary", "/car-rental/driver", "/car-rental/review", "/car-rental/payment", "/car-rental/bookings", "/car-rental/bookings/demo", "/unknown-internal-page"];

test("every internal route defaults to Welcome without exposing application content", async ({ page }) => {
  for (const path of privateRoutes) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Welcome to Royal Vacation", exact: true })).toBeVisible();
    await expect(page.locator("header, footer, .workspace, #hotel-search")).toHaveCount(0);
    await expect(page).toHaveURL(path === "/" ? /\/$/ : /\/welcome$/);
  }
});

test("public recovery, registration, and Contact Us remain accessible without a session", async ({ page }) => {
  for (const path of ["/welcome", "/login", "/contact", "/register/agency", "/forgot-password", "/verify-otp", "/reset-password"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("#home-navigation, .workspace")).toHaveCount(0);
    if (path === "/login" || path === "/contact") await expect(page.locator("footer")).toBeVisible();
    else await expect(page.locator("footer")).toHaveCount(0);
    expect(await page.evaluate(() => sessionStorage.getItem("royal-vacation.demo-auth.v1"))).toBeNull();
  }
});

test("invalid credentials fail, valid login returns to the complete deep link and survives reload", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", r => { if (!["GET", "HEAD"].includes(r.method())) writes.push(r.url()); });
  await page.goto("/search?destination=Alexandria#results");
  await page.locator('a[href="/login"]').click();
  await expect(page.locator("body")).not.toContainText("demo@royalvacation.test");
  await expect(page.locator("body")).not.toContainText("Demo@12345");
  await page.getByLabel("Email", { exact: true }).fill("demo@royalvacation.test");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Incorrect email or password");
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => sessionStorage.getItem("royal-vacation.demo-auth.v1"))).toBeNull();
  await submitDemoLogin(page);
  await expect(page).toHaveURL(/\/search\?destination=Alexandria#results$/);
  await page.reload();
  await expect(page.locator("#home-navigation")).toBeVisible();
  const storage = await page.evaluate(() => JSON.stringify({ ...sessionStorage, ...localStorage }));
  expect(storage).not.toContain("Demo@12345");
  expect(storage).not.toContain("demo@royalvacation.test");
  expect(writes).toEqual([]);
  await page.goto("/welcome");
  await expect(page).toHaveURL(/\/$/);
});

for (const width of [375, 768, 1440]) {
  test(`authenticated navigation and logout preserve preferences at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await visit(page, "/agency");
    await openHeaderTools(page);
    await expect(page.locator('header a[href="/login"], header a[href^="/register"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Account menu", exact: true })).toHaveAttribute("aria-expanded", "false");
    await selectLanguage(page, "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const preferences = await page.evaluate(() => JSON.stringify(localStorage));
    await logout(page);
    await expect(page.getByRole("heading", { name: "مرحبًا بكم في رويال فاكيشن" })).toBeVisible();
    expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(preferences);
    expect(await page.evaluate(() => sessionStorage.getItem("royal-vacation.demo-auth.v1"))).toBeNull();
    await page.goBack();
    await expect(page.locator(".welcome-content")).toBeVisible();
    await expect(page.locator("#home-navigation, .workspace")).toHaveCount(0);
    await page.goto("/wallet");
    await expect(page.locator(".welcome-content")).toBeVisible();
  });
}

test("unsafe return locations cannot navigate away from the application", async ({ page }) => {
  for (const from of ["https://example.com", "//example.com", "/\\example.com", "/login", "/welcome"]) {
    await page.goto("/login");
    // Simulate tampered history state, never inject authentication state.
    await page.evaluate(from => {
      history.replaceState({ ...history.state, usr: { from } }, "", "/login");
    }, from);
    await page.reload();
    await submitDemoLogin(page);
    await expect(page).toHaveURL(/\/$/);
    await logout(page);
  }
});

test("storage failure is explained without creating a session", async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException("Blocked", "SecurityError"); }; });
  await page.goto("/login");
  await expect(page.locator("body")).not.toContainText("demo@royalvacation.test");
  await expect(page.locator("body")).not.toContainText("Demo@12345");
  await page.getByLabel("Email", { exact: true }).fill("demo@royalvacation.test");
  await page.getByLabel("Password", { exact: true }).fill("Demo@12345");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Session storage is unavailable");
  await expect(page).toHaveURL(/\/login$/);
});


test("restored documents recheck demo access before exposing internal routes", async ({ page }) => {
  await visit(page, "/agency");
  await page.evaluate(() => {
    sessionStorage.removeItem("royal-vacation.demo-auth.v1");
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  });
  await expect(page.locator(".welcome-content")).toBeVisible();
  await expect(page.locator(".workspace, #home-navigation")).toHaveCount(0);
});
