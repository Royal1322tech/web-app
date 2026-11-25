import { expect, test, type Page, type Request } from "@playwright/test";

/*
 * Reduce Price request page (API build on port 4176, MOCKED API; never contacts staging).
 * POST /b2b/price-reduction-requests is answered here, so no real request is ever created.
 */
const APP = "http://127.0.0.1:4176";
const COMPANY = "8f14e45f-ceea-467a-9575-3c4b1f0b5c1a";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, X-Locale", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Expose-Headers": "Retry-After" };
const stay = `destination=dubai&nationality=EG&checkIn=2030-12-06&checkOut=2030-12-09&rooms=${encodeURIComponent(JSON.stringify([{ adults: 2, childAges: [] }]))}`;
const profile = { message: "ok", data: { user: { id: 7, name: "Laila Hassan", email: "laila@example.com" }, company: { id: COMPANY, name: "Nile Gate Tours", legal_name: "Nile Gate Tours LLC", display_name: "Nile Gate Tours", status: "approved", account_currency: "USD", preferred_locale: "en", country_code: "EG", city: "Alexandria", address: "1 Corniche Road", business_type: "travel_agency", registration_no: "CR-1", tax_no: null, employee_count: 12 }, membership: { role_code: "company_admin", status: "active" } } };
const searchReply = { success: true, code: "HOTEL_SEARCH_PREVIEW", message: "x", data: { hotels: [{ result_index: 0, hid: 4242, name: "Palm Court", address: "1 Palm Road, Jumeirah, Dubai", stars: 4, image: null, rooms: [], pricing_status: "unverified", booking_enabled: false }], total: 1, page: 1, per_page: 20, currency: "USD", supplier_currency: "USD", pricing_verified: false, booking_enabled: false } };
const unverified = { verified: false, selling_price: null, agency_purchase_price: null, currency: "USD", price_on_request: true };
const roomsReply = { hotel_hid: 4242, rooms_token: "rooms-token-A", expires_in_seconds: 900, total: 2, rooms: [0, 1].map((index) => ({ rate_index: index, room_name: ["Deluxe King", "Family Suite"][index], bedding_type: "double", meal_name: "breakfast", has_breakfast: true, price: unverified, selectable: false, booking_enabled: false })) };
const created = { success: true, message: "Request submitted for review.", data: { id: "0b6f5a1e-8a52-4c2b-9d0a-3c1f2f6a9b11", request_no: "RP-ABC123456789", status: "new" } };

type Reply = { status?: number; json?: unknown; headers?: Record<string, string>; delayMs?: number };
async function signedIn(page: Page, { locale = "en", rooms = true, submit = () => ({ status: 201, json: created }) }: { locale?: "en" | "ar"; rooms?: boolean; submit?: (request: Request) => Reply } = {}) {
  const calls: string[] = [];
  const posts: Request[] = [];
  await page.addInitScript(({ companyId, locale }) => {
    if (!sessionStorage.getItem("royal-travel.b2b-session.v1")) sessionStorage.setItem("royal-travel.b2b-session.v1", JSON.stringify({ token: "12|mocked", expiresAt: Date.now() + 3_600_000, companyId }));
    localStorage.setItem("royal-vacation.locale", locale);
  }, { companyId: COMPANY, locale });
  await page.route("https://api.royal.test/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const path = new URL(request.url()).pathname;
    calls.push(`${request.method()} ${path}`);
    if (path === "/api/v1/b2b/me") return route.fulfill({ headers: cors, json: profile });
    if (path === "/api/v1/b2b/hotels/search") return route.fulfill({ headers: cors, json: searchReply });
    if (path === "/api/v1/b2b/hotels/4242/rooms") return rooms ? route.fulfill({ headers: cors, json: roomsReply }) : route.fulfill({ status: 503, headers: cors, json: { success: false, code: "HOTEL_SUPPLIER_UNAVAILABLE", message: "x" } });
    if (path === "/api/v1/b2b/price-reduction-requests" && request.method() === "POST") {
      posts.push(request);
      const reply = submit(request);
      if (reply.delayMs) await new Promise((resolve) => setTimeout(resolve, reply.delayMs));
      return route.fulfill({ status: reply.status ?? 201, headers: { ...cors, ...reply.headers }, json: reply.json ?? {} });
    }
    return route.fulfill({ headers: cors, json: { locale: "en", direction: "ltr" } });
  });
  return { calls, posts };
}
/** A multipart field's value from the raw request body. */
const field = (body: string, name: string) => body.match(new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`))?.[1];

/** Opens the request form from a room rate's own Reduce Price action (one per rate card). */
async function openFromRooms(page: Page, rateIndex = 1) {
  await page.goto(`${APP}/search?${stay}`);
  await page.getByRole("link", { name: /View rooms/ }).click();
  const rates = page.locator("[data-rate-index]");
  await expect(rates).toHaveCount(2);
  // The old page-level call to action is gone; every rate (Price on request included) has its own action.
  await expect(page.getByRole("complementary", { name: "Found a better price?" })).toHaveCount(0);
  for (let index = 0; index < 2; index++) {
    const card = rates.nth(index);
    await expect(card.locator("[data-reduce-price]")).toHaveCount(1);
    await expect(card).toContainText("Price on request");
    // Selection stays as it was (these rates aren't selectable); Reduce Price doesn't change that.
    await expect(card.getByRole("button", { name: "Select room" })).toBeDisabled();
  }
  await expect(page.getByRole("link", { name: "Back to search results" }).first()).toHaveAttribute("href", /\/search\?destination=dubai/);
  await rates.nth(rateIndex).getByRole("link", { name: "Reduce Price" }).click();
  await expect(page).toHaveURL(/\/hotels\/rooms\/4242\/reduce-price\?destination=dubai/);
}

test.describe("Reduce Price request (mocked API)", () => {
  test("each rate's Reduce Price opens the form for that room; the API contract is unchanged", async ({ page }) => {
    const { posts } = await signedIn(page);
    await openFromRooms(page, 0);
    // The rate's room is carried over: shown with the stay, not asked again.
    await expect(page.getByLabel("Your stay")).toContainText("Deluxe King");
    await expect(page.getByLabel(/^Room/)).toHaveCount(0);
    await page.getByLabel(/Requested price/).fill("150");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByRole("heading", { name: "Request submitted for review" })).toBeVisible();
    expect(posts).toHaveLength(1);
    const body = posts[0].postDataBuffer()!.toString("latin1");
    expect(field(body, "room_name")).toBe("Deluxe King");
    expect(field(body, "hotel_name")).toBe("Palm Court");
    expect(posts[0].headers()["content-type"]).toMatch(/^multipart\/form-data; boundary=/);
  });

  for (const [locale, width] of [["ar", 375], ["en", 768], ["en", 1440]] as const) {
    test(`${locale} ${width}px: the per-rate Reduce Price action fits under Select room`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await signedIn(page, { locale });
      await page.goto(`${APP}/hotels/rooms/4242?${stay}`);
      const card = page.locator("[data-rate-index]").first();
      const action = card.locator("[data-reduce-price]");
      await expect(action).toHaveText(locale === "ar" ? "اطلب سعرًا أقل" : "Reduce Price");
      const select = await card.getByRole("button", { name: locale === "ar" ? "اختيار الغرفة" : "Select room" }).boundingBox();
      const reduce = await action.boundingBox();
      expect(reduce!.y).toBeGreaterThan(select!.y + select!.height - 1); // directly below the selection button
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });
  }

  test("opens from the rooms page, validates, and submits once as multipart with the real stay", async ({ page }) => {
    const { posts } = await signedIn(page, { submit: () => ({ status: 201, json: created, delayMs: 600 }) });
    await openFromRooms(page);
    await expect(page.getByRole("heading", { level: 1, name: "Request a Lower Price" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Palm Court" })).toBeVisible();
    await expect(page.getByLabel("Your stay")).toContainText("2 adults");
    await expect(page.getByRole("link", { name: "Back to rooms" })).toHaveAttribute("href", /\/hotels\/rooms\/4242\?/);
    await expect(page.getByLabel("Hotel name")).toHaveCount(0); // known from the search, so not asked

    // The room of the rate the action was used on is carried over and not asked again.
    await expect(page.getByLabel("Your stay")).toContainText("Family Suite");
    await expect(page.getByLabel(/^Room/)).toHaveCount(0);

    const price = page.getByLabel(/Requested price/);
    await price.focus();
    await price.blur();
    await expect(page.getByText("Enter the price you'd like.")).toBeVisible();
    await price.fill("12.345");
    await price.blur();
    await expect(page.getByText("Enter a valid amount, for example 120 or 120.50.")).toBeVisible();
    await price.fill("180.50");

    const fileInput = page.locator("input[type=file]");
    await fileInput.setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
    await expect(page.getByText("Attach a JPG, PNG or PDF file.")).toBeVisible();
    await fileInput.setInputFiles({ name: "quote.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
    await expect(page.getByText("The file must be 5 MB or smaller.")).toBeVisible();
    await fileInput.setInputFiles({ name: "quote.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });
    await expect(page.getByText("quote.pdf")).toBeVisible();
    await expect(page.locator("label", { hasText: "Replace" })).toBeVisible();
    await page.getByLabel(/^Notes/).fill("Competitor rate for the same dates.");

    const send = page.getByRole("button", { name: "Send request" });

    // A double click sends one request; the button shows progress; success waits for the 201.
    await send.dblclick();
    await expect(page.getByRole("button", { name: "Sending…" })).toBeDisabled();
    await expect(page.getByText(/submitted for review/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Request submitted for review" })).toBeVisible();
    expect(posts).toHaveLength(1);
    await expect(page.locator("[data-request-state=submitted]")).toContainText("RP-ABC123456789");
    await expect(page.locator("[data-request-state=submitted]")).toContainText("New");

    const request = posts[0];
    expect(request.headers()["content-type"]).toMatch(/^multipart\/form-data; boundary=/);
    expect(request.headers()["authorization"]).toBe("Bearer 12|mocked");
    const body = request.postDataBuffer()!.toString("latin1");
    expect(field(body, "supplier_hid")).toBe("4242");
    expect(field(body, "hotel_name")).toBe("Palm Court");
    expect(field(body, "room_name")).toBe("Family Suite");
    expect(field(body, "checkin")).toBe("2030-12-06");
    expect(field(body, "checkout")).toBe("2030-12-09");
    expect(field(body, "adults")).toBe("2");
    expect(field(body, "currency")).toBe("USD");
    expect(field(body, "requested_price")).toBe("180.50");
    expect(field(body, "hotel_address")).toBe("1 Palm Road, Jumeirah, Dubai");
    expect(field(body, "notes")).toBe("Competitor rate for the same dates.");
    expect(body).toContain('name="attachment"; filename="quote.pdf"');
    expect(body).not.toMatch(/name="(children|company_id|displayed_price|booking_id)"/);

    await expect(page.getByRole("link", { name: "View my price requests" })).toHaveAttribute("href", "/price-requests");
  });

  test("a 422 shows the server's message next to the field and keeps the form", async ({ page }) => {
    await signedIn(page, { submit: () => ({ status: 422, json: { message: "The given data was invalid.", errors: { requested_price: ["The requested price must be a valid amount."] } } }) });
    await openFromRooms(page, 0);
    await page.getByLabel(/Requested price/).fill("99");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("The requested price must be a valid amount.")).toBeVisible();
    await expect(page.locator("[data-request-state=validation]")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Request submitted for review" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Send request" })).toBeEnabled();
  });

  test("a 429 waits for Retry-After before sending can be tried again; 403 explains itself", async ({ page }) => {
    let call = 0;
    await signedIn(page, { submit: () => (++call === 1 ? { status: 429, json: { message: "Too Many Attempts." }, headers: { "Retry-After": "2" } } : { status: 403, json: { message: "Forbidden." } }) });
    await openFromRooms(page, 0);
    await page.getByLabel(/Requested price/).fill("99");
    const send = page.getByRole("button", { name: "Send request" });
    await send.click();
    await expect(page.getByText(/You can try again in \d seconds/)).toBeVisible();
    await expect(send).toBeDisabled();
    await expect(send).toBeEnabled({ timeout: 4000 });
    await send.click();
    await expect(page.locator("[data-request-state=forbidden]")).toContainText("can't send price requests");
  });

  test("without hotel or room details from the journey, both are asked for and sent as typed", async ({ page }) => {
    const { posts } = await signedIn(page, { rooms: false });
    await page.goto(`${APP}/hotels/rooms/4242/reduce-price?${stay}`);
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("Enter the hotel name.")).toBeVisible();
    await expect(page.getByText("Choose the room.")).toBeVisible();
    await page.getByLabel("Hotel name").fill("Palm Court");
    await page.getByLabel(/^Room/).fill("Deluxe King");
    await page.getByLabel(/Requested price/).fill("150");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByRole("heading", { name: "Request submitted for review" })).toBeVisible();
    const body = posts[0].postDataBuffer()!.toString("latin1");
    expect(field(body, "hotel_name")).toBe("Palm Court");
    expect(field(body, "room_name")).toBe("Deluxe King");
    expect(body).not.toContain('name="attachment"');
  });

  test("a link without valid stay details explains itself", async ({ page }) => {
    await signedIn(page);
    await page.goto(`${APP}/hotels/rooms/4242/reduce-price?destination=dubai`);
    await expect(page.getByRole("heading", { name: "This request can't be prepared" })).toBeVisible();
    await expect(page.locator("form")).toHaveCount(0);
  });

  for (const width of [320, 375, 768, 1440]) {
    test(`Arabic RTL at ${width}px: translated, aligned and within the page`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await signedIn(page, { locale: "ar" });
      await page.goto(`${APP}/hotels/rooms/4242/reduce-price?${stay}`);
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(page.getByRole("heading", { level: 1, name: "طلب سعر أقل" })).toBeVisible();
      await expect(page.getByRole("button", { name: "إرسال الطلب" })).toBeEnabled();
      await page.getByLabel(/السعر المطلوب/).focus();
      await page.getByLabel(/السعر المطلوب/).blur();
      await expect(page.getByText("أدخل السعر الذي تطلبه.")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });
  }
});
