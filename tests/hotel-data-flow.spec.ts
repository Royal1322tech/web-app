import { expect, test } from "@playwright/test";
import { visit } from "./helpers/demo-login";
import { hotels } from "../src/features/hotels/data/hotels.fixture";
import { roomsForHotel } from "../src/features/hotels/data/rooms.fixture";
import { hotelBoardPlans } from "../src/features/hotels/lib/board-plans";
import { demoOfferIsSelectable } from "../src/features/demo/room-policy";
import { normalizeHotelStarClassification } from "../src/features/hotels/lib/hotel-rating";

const search = (destination: string) =>
  `/search?destination=${encodeURIComponent(destination)}&nationality=EG&checkIn=2030-11-20&checkOut=2030-11-23&rooms=${encodeURIComponent(JSON.stringify([{ adults: 2, childAges: [] }]))}`;

test("the three fictional hotels expose the requested normalized offers and room limits", () => {
  const expected = [
    ["royal-azure-resort", ["room", "breakfast", "half-board"]],
    ["coral-bay-grand-resort", ["breakfast", "full-board", "all-inclusive"]],
    ["mediterranean-pearl-hotel", ["room", "breakfast", "ultra-all-inclusive"]],
  ] as const;
  for (const [id, boards] of expected) {
    const hotel = hotels.find(item => item.id === id)!;
    expect(hotel.inventoryType).toBe("demo");
    expect(hotel.reviewScore).toBeUndefined();
    expect(hotel.stars).toBeUndefined();
    expect(hotelBoardPlans(hotel)).toEqual(boards);
    expect(roomsForHotel(id).length).toBeGreaterThan(0);
    const availableBoards: readonly string[] = boards;
    expect(roomsForHotel(id).every(room => room.occupancy.maxAdults > 0 && room.rates.every(rate => {
      expect(availableBoards).toContain(rate.boardPlan);
      expect(rate.availability).toMatchObject({ hotelId: id, roomId: room.id, rateId: rate.id, source: "demo-fixture", status: "available" });
      expect(demoOfferIsSelectable(rate, id, room.id)).toBe(true);
      return true;
    }))).toBe(true);
  }
});

test("demo rate availability is offer-specific and rejects stale or unavailable identities", () => {
  const soldOutRoom = roomsForHotel("eastern-al-montazah").find(room => room.id === "double-3")!;
  for (const rate of soldOutRoom.rates) {
    expect(rate.availability).toMatchObject({ hotelId: "eastern-al-montazah", roomId: "double-3", rateId: rate.id, source: "demo-fixture", status: "unavailable" });
    expect(demoOfferIsSelectable(rate, "eastern-al-montazah", soldOutRoom.id)).toBe(false);
    expect(demoOfferIsSelectable(rate, "royal-azure-resort", soldOutRoom.id)).toBe(false);
  }
  const listedRate = roomsForHotel("royal-azure-resort")[0].rates[0];
  expect(demoOfferIsSelectable(listedRate, "royal-azure-resort", "azure-classic")).toBe(true);
  expect(demoOfferIsSelectable(listedRate, "royal-azure-resort", "azure-sea-view")).toBe(false);
});

test("hotel star classifications normalize only whole categories from one to five", () => {
  expect(normalizeHotelStarClassification(4)).toBe(4);
  for (const rating of [0, 5.5, -1, 6, Number.NaN, null, undefined]) {
    expect(normalizeHotelStarClassification(rating)).toBeUndefined();
  }
});

test("hotel and location search find the new demo inventory and only enable matching board offers", async ({ page }) => {
  await visit(page, search("Sharm El Sheikh"));
  await expect(page.getByRole("link", { name: "Royal Azure Resort" })).toBeVisible();
  await expect(page.getByText("Demo inventory").first()).toBeVisible();
  const filters = page.getByRole("complementary", { name: "Hotel filters" });
  await expect(filters.getByRole("checkbox", { name: "Half Board" })).toBeEnabled();
  await expect(filters.getByRole("checkbox", { name: "Full Board" })).toBeDisabled();
  await filters.getByRole("checkbox", { name: "Half Board" }).check();
  await expect(page.locator('article[class*="resultCard"]')).toHaveCount(1);
  await expect(page.locator('[class*="boardBadges"]')).toContainText("Half Board");

  await visit(page, search("Hurghada"));
  await expect(page.getByRole("link", { name: "Coral Bay Grand Resort" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Garden Stay" })).toBeVisible();
  await page.getByRole("complementary", { name: "Hotel filters" }).getByRole("searchbox").fill("Coral Bay");
  await expect(page.getByRole("link", { name: "Garden Stay" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Coral Bay Grand Resort" })).toBeVisible();
  await visit(page, search("Alexandria"));
  await expect(page.getByRole("link", { name: "Mediterranean Pearl Hotel" })).toBeVisible();
  const alexandriaFilters = page.getByRole("complementary", { name: "Hotel filters" });
  await expect(alexandriaFilters.getByRole("checkbox", { name: "Ultra All Inclusive" })).toBeEnabled();
  const unavailableAllInclusive = alexandriaFilters.getByRole("checkbox", { name: "All Inclusive", exact: true });
  await expect(unavailableAllInclusive).toBeDisabled();
  await expect(unavailableAllInclusive).toHaveAttribute("aria-describedby", /board-unavailable-all-inclusive/);
});

test("listed room offers for each demo hotel remain selectable through booking summary", async ({ page }) => {
  for (const [hotelId, destination, name, board] of [
    ["royal-azure-resort", "Sharm El Sheikh", "Royal Azure Resort", "Room Only"],
    ["coral-bay-grand-resort", "Hurghada", "Coral Bay Grand Resort", "Bed & Breakfast"],
    ["mediterranean-pearl-hotel", "Alexandria", "Mediterranean Pearl Hotel", "Room Only"],
  ]) {
    await visit(page, search(destination));
    await page.getByRole("link", { name }).click();
    await page.getByRole("button", { name: "Expand All Rooms" }).click();
    const selectableRate = page.getByRole("button", { name: "Select room", exact: true }).first();
    await expect(selectableRate).toBeEnabled();
    await selectableRate.click();
    await expect(page).toHaveURL(/\/booking\/summary$/);
    await expect(page.locator(".selection-summary")).toContainText(name);
    await expect(page.locator(".selection-summary")).toContainText(board);
    expect(hotels.some(hotel => hotel.id === hotelId)).toBe(true);
  }
});

test("demo hotel details load in Arabic and use a neutral fallback for a missing image", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.addInitScript(() => localStorage.setItem("royal-vacation.locale", "ar"));
  await visit(page, "/hotels/royal-azure-resort?destination=Sharm%20El%20Sheikh&nationality=EG&checkIn=2030-11-20&checkOut=2030-11-23&rooms=%5B%7B%22adults%22%3A2%2C%22childAges%22%3A%5B%5D%7D%5D");
  await expect(page.getByRole("heading", { name: "منتجع رويال أزور", level: 1 })).toBeVisible();
  await expect(page.getByText("بيانات تجريبية").first()).toBeVisible();
  const image = page.locator('[class*="mainPhoto"] img');
  await image.evaluate(element => {
    const img = element as HTMLImageElement;
    img.removeAttribute("srcset");
    img.src = "/images/not-a-real-hotel-photo.png";
  });
  await expect(image).toHaveAttribute("data-fallback-applied", "true");
  await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(image).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("heading", { name: "الغرف والوجبات" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test("changing room returns to Rooms & Boards and replaces the selected offer without losing stay criteria", async ({ page }) => {
  await visit(page, search("Sharm El Sheikh").replace("nationality=EG", "nationality=SA"));
  await page.getByRole("link", { name: "Royal Azure Resort" }).click();
  await page.getByRole("button", { name: "Expand All Rooms" }).click();
  await page.getByRole("button", { name: "Select room" }).first().click();
  await expect(page).toHaveURL(/\/booking\/summary$/);
  await expect(page.locator(".selection-summary")).toContainText("Room Only");

  await page.getByRole("link", { name: "Change room" }).click();
  await expect(page).toHaveURL(/changeRoom=1.*#rooms$/);
  await expect(page.locator("#rooms")).toBeFocused();
  await expect(page.locator("#search-nationality")).toHaveValue("SA");
  await expect(page.locator("#check-in")).toHaveValue("2030-11-20");
  await expect(page.locator("#check-out")).toHaveValue("2030-11-23");
  await page.locator("#rooms details summary").first().click();
  await page.locator('select[aria-label="Board preference"]').selectOption("half-board");
  await page.getByRole("button", { name: "Expand All Rooms" }).click();
  await expect(page.getByRole("button", { name: "Select room" })).toHaveCount(1);
  await page.getByRole("button", { name: "Select room" }).click();
  await expect(page).toHaveURL(/\/booking\/summary$/);
  await expect(page.locator(".selection-summary")).toContainText("Sea View Room");
  await expect(page.locator(".selection-summary")).toContainText("Half Board");
  await expect(page.locator(".selection-summary")).toContainText("$186");
});

test("My Bookings keeps references, local status, stay dates, ratings and actions compact and usable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await visit(page, "/bookings");
  const card = page.locator('article[class*="bookingCard"]').first();
  await expect(card).toBeVisible();
  await expect(card.getByText("Booking reference")).toBeVisible();
  await expect(card.getByText("Local preview")).toBeVisible();
  await expect(card.locator('[aria-label="4-star hotel classification"]')).toBeVisible();
  await expect(card.locator('[class*="reviewScore"]')).toContainText("4.1");
  await expect(card.getByText(/DEMO-100/)).toBeVisible();
  await expect(card.getByRole("link", { name: "Manage booking" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Compare" })).toBeVisible();
  await expect(card.getByRole("button", { name: "View Rooms" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

for (const width of [375, 1440]) {
  test(`My Bookings supports Arabic RTL card layout and keyboard actions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("royal-vacation.locale", "ar"));
    await visit(page, "/bookings");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const card = page.locator('article[class*="bookingCard"]').filter({ hasText: "DEMO-1001" }).first();
    await expect(card).toBeVisible();
    await expect(card.getByText("معاينة محلية")).toBeVisible();
    await expect(card.getByRole("link", { name: "إدارة الحجز" })).toBeVisible();
    const image = card.locator('[class*="cover"]').first();
    const imageBox = await image.boundingBox();
    const cardBox = await card.boundingBox();
    expect(imageBox && cardBox && imageBox.x + imageBox.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width);
    expect(imageBox!.x).toBeGreaterThanOrEqual(cardBox!.x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

    const compare = card.getByRole("button", { name: "قارن" });
    await compare.focus();
    await page.keyboard.press("Enter");
    await expect(card.getByRole("button", { name: "تم الاختيار" })).toHaveAttribute("aria-pressed", "true");
    await card.getByRole("button", { name: "عرض الغرف" }).click();
    await expect(page.getByText(/الحالة لبيانات توضيحية فقط/).first()).toBeVisible();
    await card.getByRole("link", { name: "إدارة الحجز" }).click();
    await expect(page).toHaveURL(/\/bookings\/DEMO-1001$/);
    await expect(page.getByRole("heading", { name: /تفاصيل الحجز/ })).toBeVisible();
  });
}

test("the booking result is a prepared local draft with the selected offer and payment method", async ({ page }) => {
  await visit(page, "/hotels/eastern-al-montazah");
  await page.getByRole("button", { name: "Expand All Rooms" }).click();
  await page.getByRole("button", { name: "Select room" }).first().click();
  await page.getByRole("link", { name: "Continue to guest details" }).click();
  await page.getByLabel("Lead guest name", { exact: true }).fill("Demo Guest");
  await page.getByLabel("Contact email", { exact: true }).fill("demo@example.com");
  await page.getByLabel("Contact phone", { exact: true }).fill("+20 100 000 0000");
  await page.getByLabel("Guest 2 name", { exact: true }).fill("Demo Companion");
  await page.getByRole("button", { name: "Continue to cancellation policy" }).click();
  await page.getByRole("checkbox", { name: /I have reviewed the cancellation and stay information/ }).check();
  await page.getByRole("link", { name: "Continue to Payment Details" }).click();
  await page.getByRole("radio", { name: "InstaPay" }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const facts = page.locator(".booking-prepared-facts");
  await expect(page.getByText("Booking Details Prepared", { exact: true })).toBeVisible();
  await expect(facts).toContainText("Eastern Al Montazah Hotel");
  await expect(facts).toContainText("Bed & Breakfast");
  await expect(facts).toContainText("3");
  await expect(facts).toContainText("InstaPay");
  await expect(page.getByRole("status")).toContainText("No hotel reservation has been submitted or confirmed");
  await expect(page.getByRole("heading", { name: "Ready for the next step" })).toHaveCount(0);
});
