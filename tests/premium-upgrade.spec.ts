import { test, expect, type Page } from "@playwright/test";
import { visit } from "./helpers/demo-login";
import { buildInvoiceView } from "../src/features/demo/booking-invoice";
import { initialBookings } from "../src/features/demo/fixtures";
import { transactionParties } from "../src/features/demo/transaction-parties";
import type { DemoBooking, Transaction } from "../src/features/demo/types";
import { hotels } from "../src/features/hotels/data/hotels.fixture";
import { eventDistanceKm, formatDistanceKm, sortByEventDistance, verifiedHotelPoint } from "../src/features/hotels/lib/event-proximity";
import { haversineKm } from "../src/features/hotels/lib/geo";

const bookings = initialBookings();
const booking = (id: string) => bookings.find((item) => item.id === id)!;
const noOverflow = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

test.describe("home services", () => {
  test("shows seven distinct cards; Flights and Apartment Rentals say they are planned, with no badge or link", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await visit(page, "/");
    const section = page.locator('section[aria-labelledby="services-title"]');
    const cards = section.locator("article");
    await expect(cards).toHaveCount(7);
    await expect(section.getByRole("heading", { level: 3 })).toHaveText([
      "Airport Transfers", "Hotel Reservations", "Private Chauffeur", "Group Transportation", "Luxury & VIP Transportation", "Flights", "Apartment Rentals",
    ]);
    await expect(section).not.toContainText("Car Rental with Driver");
    const images = await cards.locator("img").evaluateAll((list) => list.map((image) => image.getAttribute("src")));
    expect(new Set(images).size).toBe(7);
    for (const name of ["Flights", "Apartment Rentals"]) {
      const card = cards.filter({ has: page.getByRole("heading", { name, exact: true }) });
      await expect(card).toContainText("planned for a future release");
      await expect(card).not.toContainText("Coming Soon");
      await expect(card.locator("a, button")).toHaveCount(0);
    }
    await expect(cards.filter({ hasText: "Hotel Reservations" }).getByRole("link")).toHaveAttribute("href", "/search");
    await expect(cards.filter({ hasText: "Group Transportation" }).getByRole("link")).toHaveAttribute("href", "/group-quotation");
    await expect(cards.filter({ hasText: "Airport Transfers" }).getByRole("link")).toHaveAttribute("href", "/contact?subject=airport-transfers");
  });

  test("Arabic: the services are translated and no Coming Soon badge is shown", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("royal-vacation.locale", "ar"));
    await visit(page, "/");
    const section = page.locator('section[aria-labelledby="services-title"]');
    await expect(section.getByRole("heading", { name: "الطيران", exact: true })).toBeVisible();
    await expect(section.getByText("قريبًا", { exact: true })).toHaveCount(0);
    await noOverflow(page);
  });
});

test.describe("car rental", () => {
  test("opens directly from the home search and the navbar", async ({ page }) => {
    await visit(page, "/");
    await page.locator("#hotel-search").getByRole("link", { name: "Car Rental", exact: true }).click();
    await expect(page).toHaveURL(/\/car-rental$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Car Rental for your clients");
    await expect(page.getByLabel("Pickup location")).toBeVisible();
    await visit(page, "/search");
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Car Rental", exact: true }).click();
    await expect(page).toHaveURL(/\/car-rental$/);
  });

  test("removes the Chauffeur tab; cards open the enquiries and old links redirect", async ({ page }) => {
    await visit(page, "/car-rental");
    await expect(page.getByText("Car Rental with Driver")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Chauffeur / Transfers" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Self-Drive Rental", exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Pickup location")).toBeVisible();
    const cards = page.locator(".rental-service-card");
    // Private Chauffeur opened the same enquiry as Airport Transfers, so only two services are listed.
    await expect(cards.locator("strong")).toHaveText(["Self-Drive Rental", "Airport Transfers"]);
    await cards.filter({ hasText: "Airport Transfers" }).click();
    await expect(page).toHaveURL(/\/contact\?subject=airport-transfers$/);
    await expect(page.locator(".rental-service-badge").first()).toHaveText("Airport Transfers");
    await page.getByRole("button", { name: "Review enquiry" }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
    await page.getByRole("link", { name: "Back to Services" }).click();
    await expect(page).toHaveURL(/\/car-rental$/);
    await expect(page.locator(".rental-service-card").filter({ hasText: "Private Chauffeur" })).toHaveCount(0);
    await page.locator(".rental-service-card").filter({ hasText: "Self-Drive Rental" }).click();
    await expect(page).toHaveURL(/\/car-rental\/search/);
    // Old links keep working.
    await page.goto("/car-rental?service=chauffeur");
    await expect(page).toHaveURL(/\/contact\?subject=private-chauffeur$/);
    await expect(page.locator(".rental-service-badge").first()).toHaveText("Private Chauffeur");
    await visit(page, "/contact?subject=car-with-driver");
    await expect(page.locator(".rental-service-badge").first()).toHaveText("Private Chauffeur");
  });

  test("Search vehicles still validates and opens results with the chosen criteria", async ({ page }) => {
    await visit(page, "/car-rental");
    await page.getByLabel("Pickup location").selectOption("Cairo");
    await page.getByLabel("Return location").selectOption("Alexandria");
    await page.getByLabel("Pickup date").fill("2030-11-20");
    await page.getByLabel("Return date").fill("2030-11-19");
    await page.getByRole("button", { name: "Search vehicles" }).click();
    await expect(page).toHaveURL(/\/car-rental$/);
    await page.getByLabel("Return date").fill("2030-11-23");
    await page.getByRole("button", { name: "Search vehicles" }).click();
    await expect(page).toHaveURL(/\/car-rental\/search\?.*pickup=Cairo.*dropoff=Alexandria.*start=2030-11-20.*end=2030-11-23/);
  });

  test.describe("hero carousel", () => {
    const activeSrc = (page: Page) => page.locator('.rental-hero__slide[data-active="true"] img').getAttribute("src");

    test("crossfades by itself with no controls, using images distinct from the cards", async ({ page }) => {
      await visit(page, "/car-rental");
      const hero = page.locator(".rental-hero--carousel");
      await expect(hero.locator("a")).toHaveCount(0);
      await expect(hero.locator("button")).toHaveCount(0);
      await expect(hero.locator(".rental-hero__slide")).toHaveCount(4);
      await expect(hero.getByRole("heading", { level: 1 })).toHaveText("Car Rental for your clients");
      const before = await hero.boundingBox();
      const seen = new Set<string>();
      for (let slide = 0; slide < 4; slide += 1) {
        const src = await activeSrc(page);
        seen.add(src!);
        await expect.poll(() => activeSrc(page), { timeout: 7000 }).not.toBe(src);
      }
      expect(seen.size).toBe(4);
      expect(await hero.boundingBox()).toEqual(before);
      for (const slide of await hero.locator(".rental-hero__slide").all()) expect(await slide.boundingBox()).toEqual(before);
      await expect.poll(() => hero.locator(".rental-hero__slide img").evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
      const cards = await page.locator(".rental-service-card img").evaluateAll((images) => images.map((image) => image.getAttribute("src")));
      for (const src of seen) expect(cards).not.toContain(src);
    });

    test("only the shown and next images are requested at first", async ({ page }) => {
      await visit(page, "/car-rental");
      expect(await page.locator(".rental-hero__slide img").count()).toBeLessThanOrEqual(2);
    });

    test("reduced motion shows one static image and no fade", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await visit(page, "/car-rental");
      const first = await activeSrc(page);
      await page.waitForTimeout(6000);
      expect(await activeSrc(page)).toBe(first);
      await expect(page.locator(".rental-hero__slide img")).toHaveCount(1);
      await expect(page.locator(".rental-hero__slide").first()).toHaveCSS("transition-duration", "0s");
    });

    test("does not advance while the page is hidden, and resumes when visible", async ({ page }) => {
      await visit(page, "/car-rental");
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      const first = await activeSrc(page);
      await page.waitForTimeout(6000);
      expect(await activeSrc(page)).toBe(first);
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await expect.poll(() => activeSrc(page), { timeout: 7000 }).not.toBe(first);
    });
  });

  test("Search vehicles is the Royal Blue primary button with AA contrast", async ({ page }) => {
    await visit(page, "/car-rental");
    await expect(page.getByRole("button", { name: "Search vehicles" })).toHaveCSS("background-color", "rgb(14, 77, 146)");
  });

  for (const [width, locale] of [[1440, "en"], [390, "ar"]] as const) {
    test(`page has two service cards and no overflow at ${width}px ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((value) => localStorage.setItem("royal-vacation.locale", value), locale);
      await visit(page, "/car-rental");
      await expect(page.locator(".rental-service-card")).toHaveCount(2);
      await noOverflow(page);
    });
  }
});

test.describe("invoices", () => {
  test("a confirmed booking builds a labelled preview from its own recorded total", () => {
    const view = buildInvoiceView(booking("DEMO-1001"))!;
    expect(view.source).toBe("demo-preview");
    expect(view.reference).toBe("PREVIEW-DEMO-1001");
    expect(view.issueDate).toBeUndefined();
    expect(view.totalMinor).toBe(55500);
    expect(view.lines[0].calculation).toEqual({ nightlyMinor: 18500, nights: 3, rooms: 1 });
    expect(view.cancellation).toBeUndefined();
  });

  test("cancelled invoices never invent a charge or refund", () => {
    const cancelled = booking("DEMO-1003");
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancellationFee).toBe(true);
    expect(buildInvoiceView(cancelled)!.cancellation).toEqual({ originalMinor: 16400, chargeMinor: null, refundMinor: null, feeIndicated: true });
    // A supplied value is shown; the one that was not supplied is not derived from it.
    const supplied: DemoBooking = {
      ...cancelled,
      invoice: { reference: "INV-1", referenceType: "official", issueDate: "2026-10-01", lifecycle: "issued", settlement: "unpaid", currency: "USD", lineItems: [], subtotalMinor: 16400, totalMinor: 16400, cancellation: { chargeMinor: 4000 } },
    };
    expect(buildInvoiceView(supplied)!.cancellation).toMatchObject({ chargeMinor: 4000, refundMinor: null });
  });

  test("pending and failed bookings have no invoice", () => {
    expect(buildInvoiceView(booking("DEMO-1002"))).toBeUndefined();
    expect(buildInvoiceView(booking("DEMO-1005"))).toBeUndefined();
  });

  test("renders a confirmed invoice with demo labelling, and prints without page controls", async ({ page }) => {
    await visit(page, "/bookings/DEMO-1001/invoice");
    const invoice = page.locator("article.rv-invoice");
    for (const text of ["DEMO INVOICE PREVIEW", "PREVIEW-DEMO-1001", "Not issued", "DEMO-1001", "Horizon Travel — Demo Agency", "Eastern Al Montazah Hotel", "Sample Traveller A", "Oct 20, 2026", "Oct 23, 2026", "$555.00", "USD"]) {
      await expect(invoice).toContainText(text);
    }
    await expect(invoice).not.toContainText("Refund Amount");
    const print = page.getByRole("button", { name: "Print / Save as PDF" });
    await page.evaluate(() => { window.print = () => { document.body.dataset.printed = "true"; }; });
    await print.click();
    await expect(page.locator("body")).toHaveAttribute("data-printed", "true");
    await page.emulateMedia({ media: "print" });
    await expect(print).toBeHidden();
    await expect(page.locator("header").first()).toBeHidden();
    await expect(invoice.locator(".rv-invoice__header")).toBeVisible();
    await expect(invoice.locator(".rv-invoice__notice")).toBeVisible();
    await page.emulateMedia({ media: "screen" });
    await page.getByRole("link", { name: "Back to booking" }).click();
    await expect(page).toHaveURL(/\/bookings\/DEMO-1001$/);
  });

  test("a cancelled invoice shows pending amounts, in both languages", async ({ page }) => {
    await visit(page, "/bookings/DEMO-1003/invoice");
    const cancellation = page.locator(".rv-invoice__cancellation");
    await expect(cancellation).toContainText("Original Booking Amount");
    await expect(cancellation).toContainText("$164.00");
    await expect(cancellation.locator("dd[data-pending]")).toHaveCount(2);
    await expect(cancellation.locator("dd[data-pending]").first()).toHaveText("Pending confirmation");
    await page.evaluate(() => localStorage.setItem("royal-vacation.locale", "ar"));
    await page.reload();
    await expect(page.locator(".rv-invoice__cancellation dd[data-pending]").first()).toHaveText("بانتظار التأكيد");
    await noOverflow(page);
  });

  test("Invoice History lists eligible bookings as demo previews", async ({ page }) => {
    await visit(page, "/invoices");
    const cards = page.locator(".invoice-list-card");
    await expect(cards).toHaveCount(3);
    await expect(cards.first()).toContainText("Example");
    await expect(page.locator(".invoice-list")).not.toContainText("DEMO-1002");
  });
});

test.describe("transaction history", () => {
  const tx = (type: Transaction["type"], reference: string): Transaction => ({ id: "T", date: "2026-10-01", type, amount: 1, status: "completed", description: "", reference });

  test("names come only from the referenced booking", () => {
    expect(transactionParties(tx("reservation", "DEMO-1001"), bookings, "en")).toEqual({ customer: "Sample Traveller A", hotel: "Eastern Al Montazah Hotel" });
    expect(transactionParties(tx("reservation", "DEMO-1001"), bookings, "ar").hotel).toBe("فندق إيسترن المنتزه");
    expect(transactionParties(tx("reservation", "DEMO-9999"), bookings, "en")).toEqual({});
    expect(transactionParties(tx("credit", "DEMO-1001"), bookings, "en")).toEqual({});
    expect(transactionParties(tx("adjustment", "ADJ-1"), bookings, "en")).toEqual({});
  });

  test("the table shows the new columns and a dash for account-level rows", async ({ page }) => {
    await visit(page, "/transactions");
    const table = page.getByRole("region", { name: "Transaction table" });
    await expect(table.getByRole("columnheader", { name: "Customer Name" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Hotel Name" })).toBeVisible();
    const adjustment = table.getByRole("row").filter({ hasText: "TX-DEMO-003" });
    await expect(adjustment.getByLabel("Not applicable")).toHaveCount(2);
    await page.getByLabel("Search transactions").fill("Garden Stay");
    const row = table.getByRole("row").filter({ hasText: "TX-DEMO-006" });
    await expect(row).toContainText("Sample Traveller D");
    await expect(row).toContainText("Garden Stay");
    await row.getByRole("button", { name: /View transaction/ }).click();
    await expect(page.getByRole("dialog")).toContainText("Sample Traveller D");
  });

  test("works in Arabic and scrolls inside its own region on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => localStorage.setItem("royal-vacation.locale", "ar"));
    await visit(page, "/transactions");
    await expect(page.getByRole("columnheader", { name: "اسم الفندق" })).toBeVisible();
    await noOverflow(page);
  });
});

test.describe("welcome", () => {
  for (const [width, locale, heading] of [[1440, "en", "Your Journey Starts Here"], [390, "ar", "رحلتك تبدأ من هنا"]] as const) {
    test(`keeps Sign In and Register at ${width}px ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((value) => localStorage.setItem("royal-vacation.locale", value), locale);
      await page.goto("/welcome");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expect(page.locator(".travel-image")).toHaveAttribute("src", "/images/welcome/resort-aerial.jpg");
      await noOverflow(page);
      await page.locator('.account-card[href="/register/agency"]').click();
      await expect(page).toHaveURL(/\/register\/agency/);
      await page.goto("/welcome");
      await page.locator('.account-card[href="/login"]').click();
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test("uses a 45/55 split on desktop", async ({ page }) => {
    await page.goto("/welcome");
    const shell = (await page.locator(".auth-page--welcome").boundingBox())!;
    const photo = (await page.locator(".travel-image").boundingBox())!;
    expect(photo.width / shell.width).toBeCloseTo(0.45, 2);
  });
});

test.describe("hotel search map: distance logic", () => {
  const cairo = { latitude: 30.0444, longitude: 31.2357 };
  const near = { id: "near", coordinates: { latitude: 30.05, longitude: 31.24, source: "test" } };
  const far = { id: "far", coordinates: { latitude: 31.2, longitude: 29.9, source: "test" } };
  const unknownA = { id: "unknown-a", coordinates: undefined };
  const unknownB = { id: "unknown-b", coordinates: undefined };

  test("Haversine matches a known distance and formats kilometres", () => {
    expect(haversineKm({ latitude: 51.5074, longitude: -0.1278 }, { latitude: 48.8566, longitude: 2.3522 })).toBeCloseTo(343.5, 0);
    expect(eventDistanceKm(near, near.coordinates)).toBe(0);
    expect(formatDistanceKm(2.44, "en")).toBe("2.4");
    expect(formatDistanceKm(150.4, "en")).toBe("150.4");
  });

  test("sorts located hotels first, and keeps the rest honest and in order", () => {
    const sorted = sortByEventDistance([unknownA, far, unknownB, near], cairo);
    expect(sorted.map((hotel) => hotel.id)).toEqual(["near", "far", "unknown-a", "unknown-b"]);
    expect(eventDistanceKm(unknownA, cairo)).toBeUndefined();
  });

  test("rejects invalid coordinates and does not invent any", () => {
    expect(verifiedHotelPoint({ coordinates: { latitude: 200, longitude: 10, source: "test" } })).toBeUndefined();
    expect(verifiedHotelPoint({ coordinates: undefined })).toBeUndefined();
    expect(hotels.filter((hotel) => verifiedHotelPoint(hotel)).map((hotel) => hotel.id)).toEqual(["eastern-al-montazah"]);
  });
});

test.describe("hotel search map: browser", () => {
  const blockTiles = (page: Page) => page.route("https://tile.openstreetmap.org/**", (route) => route.abort());
  const hotelMarkers = (page: Page) => page.locator(".hotel-map-marker");
  const openMap = async (page: Page) => {
    await blockTiles(page);
    await visit(page, "/search");
    await page.getByRole("group", { name: "Results view" }).getByRole("button", { name: "Map View" }).click();
    await expect(page.locator(".leaflet-container")).toBeVisible();
  };

  test("switches views without losing filters, and markers follow the results", async ({ page }) => {
    await openMap(page);
    await expect(page.getByRole("button", { name: "Show Hotels on Map" })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Results view" }).getByRole("button", { name: "Map View" })).toHaveAttribute("aria-pressed", "true");
    await expect(hotelMarkers(page)).toHaveCount(1);
    await expect(page.locator(".hotel-map__coverage")).toContainText("1 of 7 hotels");
    await expect(page.locator(".hotel-map__list li")).toHaveCount(7);

    const filters = page.locator("#hotel-filters");
    await filters.getByRole("checkbox", { name: "Cairo", exact: true }).check();
    await expect(hotelMarkers(page)).toHaveCount(0);
    await expect(page.locator(".hotel-map__coverage")).toContainText("0 of 1 hotels");

    await page.getByRole("button", { name: "List View", exact: true }).click();
    await expect(page.locator('article[class*="resultCard"]')).toHaveCount(1);
    await expect(filters.getByRole("checkbox", { name: "Cairo", exact: true })).toBeChecked();

    await filters.getByRole("searchbox").fill("No such hotel");
    await page.getByRole("button", { name: "Map View", exact: true }).click();
    await expect(page.locator("[data-hotel-map]")).toHaveCount(0);
    await expect(page.getByText("No hotels match these filters")).toBeVisible();
  });

  test("a hotel marker opens a popup with price and a View Hotel link that keeps the stay", async ({ page }) => {
    await blockTiles(page);
    await visit(page, "/search?destination=Alexandria&nationality=EG&checkIn=2030-11-20&checkOut=2030-11-22&rooms=%5B%7B%22adults%22%3A2%2C%22childAges%22%3A%5B%5D%7D%5D");
    await page.getByRole("group", { name: "Results view" }).getByRole("button", { name: "Map View" }).click();
    await hotelMarkers(page).click();
    const popup = page.locator(".hotel-map__popup");
    await expect(popup).toContainText("Eastern Al Montazah Hotel");
    await expect(popup).toContainText("From $185 per night");
    const link = popup.getByRole("link", { name: "View Hotel" });
    await expect(link).toHaveAttribute("href", /\/hotels\/eastern-al-montazah\?.*checkIn=2030-11-20/);
    await link.click();
    await expect(page).toHaveURL(/\/hotels\/eastern-al-montazah\?/);
  });

  test("selecting an event gives straight-line distances, Nearest to Event, and can be cleared", async ({ page }) => {
    await openMap(page);
    const sort = page.getByRole("combobox", { name: "Sort by" });
    await expect(sort.locator('option[value="nearest"]')).toHaveJSProperty("disabled", true);
    await page.getByRole("button", { name: "Set event at map centre" }).click();
    await expect(page.locator(".hotel-map-event")).toHaveCount(1);
    await expect(page.locator(".hotel-map__panel")).toContainText("Selected map point");
    const located = page.locator(".hotel-map__list li").filter({ hasText: "Eastern Al Montazah Hotel" });
    await expect(located).toContainText(/km from event — straight-line distance/);
    await expect(page.locator(".hotel-map__list li").filter({ hasText: "City Stay" })).toContainText("No verified location — distance unavailable");
    await expect(page.locator("[data-hotel-map]")).not.toContainText(/driving|walking/i);

    await sort.selectOption("nearest");
    await expect(page.locator(".hotel-map__list li").first()).toContainText("Eastern Al Montazah Hotel");

    // Clicking the map replaces the event; its position changes the marker, not the marker count.
    const before = await page.locator(".hotel-map__panel bdi").first().textContent();
    const box = (await page.locator(".leaflet-container").boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.25);
    await expect(page.locator(".hotel-map-event")).toHaveCount(1);
    await expect(page.locator(".hotel-map__panel bdi").first()).not.toHaveText(before!);

    // Result cards show the distance while an event is selected.
    await page.getByRole("button", { name: "List View", exact: true }).click();
    await expect(page.locator('article[class*="resultCard"]').first()).toContainText("straight-line distance");

    await page.getByRole("button", { name: "Map View", exact: true }).click();
    await page.getByRole("button", { name: "Clear event location" }).click();
    await expect(page.locator(".hotel-map-event")).toHaveCount(0);
    await expect(sort).toHaveValue("recommended");
    await expect(sort.locator('option[value="nearest"]')).toHaveJSProperty("disabled", true);
  });

  for (const [width, locale] of [[390, "en"], [390, "ar"], [1440, "ar"]] as const) {
    test(`map view is usable with no overflow at ${width}px ${locale}`, async ({ page }) => {
      await blockTiles(page);
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript((value) => localStorage.setItem("royal-vacation.locale", value), locale);
      await visit(page, "/search");
      await page.getByRole("button", { name: locale === "ar" ? "عرض الخريطة" : "Map View", exact: true }).click();
      await expect(page.locator(".leaflet-container")).toBeVisible();
      await noOverflow(page);
    });
  }
});
