import { expect, test, type Page } from "@playwright/test";

/*
 * Reduce Price request page (API build on port 4176, MOCKED API). No endpoint is approved, so the
 * page must validate locally, keep sending unavailable and send no request of its own.
 */
const APP = "http://127.0.0.1:4176";
const COMPANY = "8f14e45f-ceea-467a-9575-3c4b1f0b5c1a";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, X-Locale", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const stay = `destination=dubai&nationality=EG&checkIn=2030-12-06&checkOut=2030-12-09&rooms=${encodeURIComponent(JSON.stringify([{ adults: 2, childAges: [] }]))}`;
const profile = { message: "ok", data: { user: { id: 7, name: "Laila Hassan", email: "laila@example.com" }, company: { id: COMPANY, name: "Nile Gate Tours", legal_name: "Nile Gate Tours LLC", display_name: "Nile Gate Tours", status: "approved", account_currency: "USD", preferred_locale: "en", country_code: "EG", city: "Alexandria", address: "1 Corniche Road", business_type: "travel_agency", registration_no: "CR-1", tax_no: null, employee_count: 12 }, membership: { role_code: "company_admin", status: "active" } } };
const searchReply = { success: true, code: "HOTEL_SEARCH_PREVIEW", message: "x", data: { hotels: [{ result_index: 0, hid: 4242, name: "Palm Court", address: "1 Palm Road, Jumeirah, Dubai", stars: 4, image: null, rooms: [], pricing_status: "unverified", booking_enabled: false }], total: 1, page: 1, per_page: 20, currency: "USD", supplier_currency: "USD", pricing_verified: false, booking_enabled: false } };

async function signedIn(page: Page, locale: "en" | "ar" = "en") {
  const calls: string[] = [];
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
    // Rooms: the supplier is unavailable; the page header and the Reduce Price entry still show.
    if (path.startsWith("/api/v1/b2b/hotels/")) return route.fulfill({ status: 503, headers: cors, json: { success: false, code: "HOTEL_SUPPLIER_UNAVAILABLE", message: "x" } });
    return route.fulfill({ headers: cors, json: { locale: "en", direction: "ltr" } });
  });
  return calls;
}

test.describe("Reduce Price request (mocked API)", () => {
  test("opens from the rooms page with the hotel and stay, validates, and can't be sent yet", async ({ page }) => {
    const calls = await signedIn(page);
    await page.goto(`${APP}/search?${stay}`);
    await page.getByRole("link", { name: /View rooms/ }).click();
    // The rooms page promotes the request in its own call-to-action band.
    const cta = page.getByRole("complementary", { name: "Found a better price?" });
    await expect(cta).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to search results" }).first()).toHaveAttribute("href", /\/search\?destination=dubai/);
    await cta.getByRole("link", { name: "Request a Lower Price" }).click();
    await expect(page).toHaveURL(/\/hotels\/rooms\/4242\/reduce-price\?destination=dubai/);
    await expect(page.getByRole("heading", { level: 1, name: "Request a lower price" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Palm Court" })).toBeVisible();
    await expect(page.getByText("1 Palm Road, Jumeirah, Dubai")).toBeVisible();
    await expect(page.getByLabel("Your stay")).toContainText("2 adults");

    // Price: required, a plain amount with at most two decimals, above zero; shown in the stay currency.
    const price = page.getByLabel(/Requested price/);
    await price.focus();
    await price.blur();
    await expect(page.getByText("Enter the price you'd like.")).toBeVisible();
    await price.fill("12.345");
    await price.blur();
    await expect(page.getByText("Enter a valid amount, for example 120 or 120.50.")).toBeVisible();
    await price.fill("0");
    await expect(page.getByText("The amount must be greater than zero.")).toBeVisible();
    await price.fill("180.50");
    await expect(price).toHaveAttribute("aria-invalid", "false");
    await expect(page.getByText("Total for the stay, in USD.")).toBeVisible();

    // Document: JPG, PNG or PDF up to 5 MB, optional and removable.
    const fileInput = page.locator("input[type=file]");
    await fileInput.setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
    await expect(page.getByText("Attach a JPG, PNG or PDF file.")).toBeVisible();
    await fileInput.setInputFiles({ name: "quote.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
    await expect(page.getByText("The file must be 5 MB or smaller.")).toBeVisible();
    await fileInput.setInputFiles({ name: "quote.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    await expect(page.getByText("quote.pdf")).toBeVisible();
    await expect(page.getByText(/^\d+ KB$/)).toBeVisible(); // file size shown
    await expect(page.locator("label", { hasText: "Replace" })).toBeVisible();
    await expect(page.getByText(/Attach a JPG|5 MB or smaller/)).toHaveCount(0);
    await page.getByRole("button", { name: "Remove the file" }).click();
    await expect(page.getByText("quote.pdf")).toHaveCount(0);

    await page.getByLabel("Notes (optional)").fill("Competitor rate for the same dates.");
    await expect(page.getByText("35 of 1,000 characters")).toBeVisible();

    // Sending isn't available: the button is disabled and says why. Nothing is sent.
    const send = page.getByRole("button", { name: "Send request" });
    await expect(send).toBeDisabled();
    await expect(page.getByText("Requests can't be sent online yet.", { exact: false })).toBeVisible();
    await expect(page.getByText(/received|submitted|thank you/i)).toHaveCount(0);
    expect(calls.every((call) => /^(GET \/api\/v1\/b2b\/me|POST \/api\/v1\/b2b\/hotels\/search|POST \/api\/v1\/b2b\/hotels\/4242\/rooms|GET \/api\/v1\/foundation-check)$/.test(call))).toBe(true);

    await expect(page.getByRole("link", { name: "Back to rooms" })).toHaveAttribute("href", /\/hotels\/rooms\/4242\?/);
    await expect(page.getByRole("heading", { level: 2, name: "Booking details" })).toBeVisible();
    // Cancel returns to the rooms page with the hotel still shown.
    await page.getByRole("link", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/\/hotels\/rooms\/4242\?destination=dubai/);
    await expect(page.getByRole("heading", { name: "Palm Court" })).toBeVisible();
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
      await signedIn(page, "ar");
      await page.goto(`${APP}/hotels/rooms/4242/reduce-price?${stay}`);
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(page.getByRole("heading", { level: 1, name: "طلب سعر أقل" })).toBeVisible();
      await expect(page.getByRole("button", { name: "إرسال الطلب" })).toBeDisabled();
      await page.getByLabel(/السعر المطلوب/).focus();
      await page.getByLabel(/السعر المطلوب/).blur();
      await expect(page.getByText("أدخل السعر الذي تطلبه.")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });
  }
});
