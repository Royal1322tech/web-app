import { test, expect } from "@playwright/test";
import { visit } from "./helpers/demo-login";
import { formatCalendarDate, formatDateTime } from "../src/lib/format-date";
import { hotelDisplayRate, lowestAvailableRate } from "../src/features/hotels/lib/display-rate";
import { filterHotels, defaultFilters } from "../src/features/hotels/lib/filter-hotels";
import { hotels } from "../src/features/hotels/data/hotels.fixture";

test.describe("shared formatting and pricing", () => {
  test("calendar dates are localized without shifting a day", () => {
    expect(formatCalendarDate("2026-11-04", "en")).toBe("Nov 4, 2026");
    expect(formatCalendarDate("2026-01-01", "en")).toBe("Jan 1, 2026");
    expect(formatCalendarDate("not-a-date", "en")).toBe("not-a-date");
    expect(formatCalendarDate("2026-11-04", "ar")).not.toBe("2026-11-04");
    expect(formatDateTime("2026-10-19T13:30:00Z", "en")).toMatch(/Oct 19, 2026/);
    expect(formatDateTime("bad", "en")).toBe("bad");
  });

  test("hotel cards use the lowest available offer, or a labelled listed rate when no offers exist", () => {
    // Eastern Al Montazah: every available offer is 185; one room is unavailable and ignored.
    expect(lowestAvailableRate("eastern-al-montazah")).toBe(185);
    expect(hotelDisplayRate({ id: "eastern-al-montazah", nightlyRate: 116 })).toEqual({ amount: 185, basis: "offer" });
    expect(hotelDisplayRate({ id: "royal-azure-resort", nightlyRate: 92 })).toEqual({ amount: 92, basis: "offer" });
    // No room offers in the data: the listed rate is kept and marked as such, never as an offer.
    expect(hotelDisplayRate({ id: "coastal-retreat-demo", nightlyRate: 184 })).toEqual({ amount: 184, basis: "listed" });
  });

  test("price sorting and filtering follow the displayed rate", () => {
    const ascending = filterHotels(hotels, defaultFilters, "", "priceLow").map((hotel) => hotelDisplayRate(hotel).amount);
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b));
    const capped = filterHotels(hotels, { ...defaultFilters, maxPrice: "150" }, "", "recommended");
    expect(capped.map((hotel) => hotel.id)).not.toContain("eastern-al-montazah");
    expect(capped.every((hotel) => hotelDisplayRate(hotel).amount <= 150)).toBe(true);
  });
});

test("search result cards label offer-based and listed prices, with a quieter Reduce Price action", async ({ page }) => {
  await visit(page, "/search");
  const offerCard = page.locator("article").filter({ hasText: "Eastern Al Montazah Hotel" }).first();
  await expect(offerCard).toContainText("From$185");
  await expect(offerCard).toContainText("Lowest available rate per night · USD");
  const listedCard = page.locator("article").filter({ hasText: "Coastal Retreat" }).first();
  await expect(listedCard).toContainText("Listed rate per night · USD");
  await expect(listedCard).not.toContainText("From");
  const reduce = offerCard.getByRole("button", { name: "Reduce Price" });
  await expect(reduce).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(offerCard.getByRole("button", { name: "View Rooms" })).toHaveCSS("color", "rgb(255, 255, 255)");
});

test("every audited page has a descriptive, localized document title", async ({ page }) => {
  const english: Record<string, string> = {
    "/": "Home", "/bookings": "My Bookings", "/bookings/DEMO-1001": "Booking details", "/wallet": "Wallet",
    "/tickets": "My Tickets", "/profile": "My Profile", "/agency": "Agency Profile",
  };
  for (const [path, title] of Object.entries(english)) {
    await visit(page, path);
    await expect(page).toHaveTitle(`${title} | Royal Vacation`);
  }
  await page.evaluate(() => localStorage.setItem("royal-vacation.locale", "ar"));
  await page.goto("/wallet");
  await expect(page).toHaveTitle("المحفظة | Royal Vacation");
  await page.goto("/bookings");
  await expect(page).toHaveTitle("حجوزاتي | Royal Vacation");
});

test("wallet shows readable dates and transaction types, aligned cards and a separate demo control", async ({ page }) => {
  await visit(page, "/wallet");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wallet");
  const table = page.getByRole("region", { name: "Transaction table" });
  await expect(table).toContainText("Oct 10, 2026");
  await expect(table).toContainText("Account adjustment");
  await expect(table).not.toContainText("2026-10-10");
  const overview = (await page.locator(".workspace-grid > section").boundingBox())!;
  const usage = (await page.locator(".workspace-grid > aside").boundingBox())!;
  expect(Math.abs(overview.y - usage.y)).toBeLessThanOrEqual(1);
  const demo = page.locator(".demo-tools");
  await expect(demo).toContainText("Demo");
  await expect(demo.getByRole("button", { name: "Preview insufficient balance" })).toBeVisible();
});

test("booking summary and timeline use readable localized dates", async ({ page }) => {
  await visit(page, "/hotels/eastern-al-montazah");
  await page.getByRole("button", { name: "Expand All Rooms" }).click();
  await page.getByRole("button", { name: "Select room" }).first().click();
  const summary = page.locator(".selection-summary");
  await expect(summary).toContainText(/Check in[A-Z][a-z]{2} \d{1,2}, \d{4}/);
  await expect(summary).not.toContainText(/\d{4}-\d{2}-\d{2}/);
  await visit(page, "/bookings/DEMO-1001");
  await expect(page.locator(".timeline time").first()).toHaveText(/[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2}/);
});

for (const locale of ["en", "ar"] as const) {
  test(`mobile booking actions wrap two per row with 44px targets in ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((value) => localStorage.setItem("royal-vacation.locale", value), locale);
    await visit(page, "/bookings/DEMO-1001");
    const actions = page.locator(".workspace-card .workspace-actions").first().locator(":scope > .button");
    await expect(actions).toHaveCount(5);
    const boxes = await Promise.all((await actions.all()).map((action) => action.boundingBox()));
    for (const box of boxes) {
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeLessThan(60);
    }
    // Two per row: the first two share a row, the third starts a new one.
    expect(Math.abs(boxes[0]!.y - boxes[1]!.y)).toBeLessThanOrEqual(1);
    expect(boxes[2]!.y).toBeGreaterThan(boxes[0]!.y + boxes[0]!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
}

test("mobile account tabs show a scroll cue and meet the touch-target height", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, "/bookings/DEMO-1001");
  const nav = page.locator(".workspace-nav");
  await expect(nav.locator(".workspace-nav__track")).toHaveAttribute("data-overflow-end", "true");
  expect(await nav.evaluate((element) => getComputedStyle(element, "::after").content)).toBe('"›"');
  const link = nav.getByRole("link", { name: "My Bookings" });
  expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test("compact search fields share one height on search and hotel pages", async ({ page }) => {
  for (const path of ["/search", "/hotels/eastern-al-montazah"]) {
    await visit(page, path);
    const heights = await page.locator("#hotel-search").evaluate((form) =>
      [...form.querySelectorAll("input, select, button[aria-haspopup]")]
        .filter((element) => element.getBoundingClientRect().height > 0)
        .map((element) => Math.round(element.getBoundingClientRect().height)));
    expect(new Set(heights).size, `${path}: ${heights.join(",")}`).toBe(1);
  }
});

test("hotel details shows supplied facts honestly and a single map action", async ({ page }) => {
  await visit(page, "/hotels/eastern-al-montazah");
  const facts = page.locator("aside").filter({ hasText: "Check-in time" });
  await expect(facts).toContainText("Not supplied");
  await expect(facts).toContainText("have not been supplied for this property");
  await expect(facts).not.toContainText("Not connected");
  await expect(page.getByRole("link", { name: "View On Map" })).toHaveCount(1);
});

test("status badges share one shape across bookings and tickets", async ({ page }) => {
  await visit(page, "/bookings");
  const bookingBadge = page.locator(".status-badge").first();
  await visit(page, "/tickets");
  const ticketBadge = page.locator(".ticket-status").first();
  const shape = (element: Element) => {
    const style = getComputedStyle(element);
    return [style.borderRadius, style.fontSize, style.fontWeight, getComputedStyle(element, "::before").width].join("|");
  };
  const ticketShape = await ticketBadge.evaluate(shape);
  await visit(page, "/bookings");
  expect(await bookingBadge.evaluate(shape)).toBe(ticketShape);
});

test("home sample collection uses a different photograph for each sample", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await visit(page, "/");
  const sources = await page.locator('[data-collection-marquee] article img').evaluateAll((images) =>
    [...new Set(images.map((image) => (image as HTMLImageElement).getAttribute("src")))]);
  expect(sources.length).toBeGreaterThanOrEqual(3);
});
