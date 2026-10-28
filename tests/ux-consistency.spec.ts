import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { visit } from "./helpers/demo-login";

const search = "/search?destination=Sharm%20El%20Sheikh&nationality=EG&checkIn=2030-11-20&checkOut=2030-11-23&rooms=%5B%7B%22adults%22%3A2%2C%22childAges%22%3A%5B%5D%7D%5D";

test("booking records omit catalogue actions while search results keep them", async ({ page }) => {
  await visit(page, "/bookings");
  const records = page.locator('article[class*="bookingCard"]');
  await expect(records.first()).toBeVisible();
  await expect(records.getByRole("button", { name: /Compare|Selected/ })).toHaveCount(0);
  await expect(records.locator('button[aria-pressed]')).toHaveCount(0);
  await expect(records.first().getByRole("link", { name: "Manage booking" })).toBeVisible();
  await expect(records.getByRole("button", { name: "View Rooms" })).toHaveCount(0);
  await expect(records.first().getByRole("link", { name: "View voucher" })).toBeVisible();

  await visit(page, search);
  const result = page.locator('article[class*="resultCard"]').first();
  await expect(result.getByRole("button", { name: "Compare" })).toBeVisible();
  await expect(result.locator('[class*="heart"]')).toHaveCount(1);
});

test("transactional flows hide the account navigation and account pages keep it", async ({ page }) => {
  for (const route of ["/booking/summary", "/booking/guests", "/car-rental/search", "/car-rental/summary"]) {
    await visit(page, route);
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Workspace navigation" })).toHaveCount(0);
  }
  for (const route of ["/profile", "/car-rental/bookings", "/bookings/DEMO-1001/voucher"]) {
    await visit(page, route);
    await expect(page.getByRole("navigation", { name: "Workspace navigation" })).toHaveCount(1);
  }
});

test("navigation labels are consistent across header, workspace and breadcrumbs", async ({ page }) => {
  await visit(page, "/wallet");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Wallet");
  await expect(page.getByRole("navigation", { name: "Workspace navigation" })).toHaveCount(0);
  await visit(page, "/transactions");
  const workspace = page.getByRole("navigation", { name: "Workspace navigation" });
  for (const label of ["My Bookings", "My Rentals", "Agency Profile", "Wallet"]) {
    await expect(workspace.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await expect(workspace.getByRole("link", { name: "Credit balance" })).toHaveCount(0);
  await expect(page.locator("header").getByRole("link", { name: "My Bookings", exact: true })).toHaveAttribute("href", "/bookings");
  const signOut = workspace.getByRole("button", { name: "Sign Out", exact: true });
  await expect(signOut).toHaveCSS("text-decoration-line", "none");
  expect((await signOut.boundingBox())!.height).toBeGreaterThanOrEqual(36);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
});

for (const locale of ["en", "ar"] as const) {
  test(`mobile workspace navigation scrolls the active section into view in ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript(value => localStorage.setItem("royal-vacation.locale", value), locale);
    await visit(page, "/car-rental/bookings");
    const track = page.locator(".workspace-nav__track");
    await expect(track).toHaveAttribute("data-overflow-end", "true");
    await expect(track).not.toHaveAttribute("data-overflow-start", "true");
    await visit(page, "/account/settings");
    await expect(track).toHaveAttribute("data-overflow-start", "true");
    const [bar, active] = await page.evaluate(() => [
      document.querySelector(".workspace-nav__track")!.getBoundingClientRect().toJSON(),
      document.querySelector('.workspace-nav__track [aria-current="page"]')!.getBoundingClientRect().toJSON(),
    ]);
    expect(active.left).toBeGreaterThanOrEqual(bar.left);
    expect(active.right).toBeLessThanOrEqual(bar.right);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  });
}

test("Arabic landing call to action arrow follows the reading direction", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("royal-vacation.locale", "ar"));
  await page.goto("/login");
  const arrow = page.locator('a[href="/register/agency/company"] svg').last();
  await expect(arrow).toHaveCSS("rotate", "180deg");
});
