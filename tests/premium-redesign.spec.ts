import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { visit } from "./helpers/demo-login";
import { selectLanguage, closeHeaderMenu } from "./helpers/header";

async function layout(page: Page) {
  await expect(page.locator("header")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  const broken = await page.locator('main img').evaluateAll(images => images.filter(image => {
    const img = image as HTMLImageElement;
    return img.complete && img.naturalWidth === 0;
  }).map(image => (image as HTMLImageElement).src));
  expect(broken).toEqual([]);
}
for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  for (const locale of ["en", "ar"] as const) {
    test(`rental redesign preserves header, review and responsive layout ${width}px ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await visit(page, "/car-rental");
      await selectLanguage(page, locale);
      await closeHeaderMenu(page);
      await layout(page);
      await page.getByRole("button", { name: /Search vehicles|ابحث عن سيارات/ }).click();
      await expect(page).toHaveURL(/car-rental\/search\?/);
      await layout(page);
      await expect(page.locator(".rental-card")).toHaveCount(3);
      if (width >= 1440) {
        const filter = (await page.locator(".rental-reference-filters").boundingBox())!;
        const results = (await page.locator(".rental-result-list").boundingBox())!;
        const trip = (await page.locator(".rental-trip-sidebar").boundingBox())!;
        expect(locale === "en" ? filter.x < results.x && results.x < trip.x : trip.x < results.x && results.x < filter.x).toBe(true);
        const card = page.locator(".rental-card").first();
        const photo = (await card.locator("figure").boundingBox())!;
        const price = (await card.locator(".rental-card-price").boundingBox())!;
        expect(Math.abs(photo.y - price.y)).toBeLessThan(70);
        expect((await card.boundingBox())!.width).toBeGreaterThan(500);
      }
      await page.screenshot({ path: `test-results/rental-results-new-${width}-${locale}.png`, fullPage: true });
      await page.getByRole("link", { name: /View vehicle|عرض السيارة/, exact: true }).first().click();
      await layout(page);
      await expect(page.locator(".rental-thumbnails button")).toHaveCount(1);
      await expect(page.locator(".rental-cinematic-vehicle img")).toHaveAttribute("src", /rental\/compact.webp$/);
      await page.screenshot({ path: `test-results/rental-vehicle-new-${width}-${locale}.png`, fullPage: true });
      await page.getByRole("button", { name: /Select vehicle|اختر السيارة/ }).click();
      await page.getByRole("checkbox").check();
      await page.getByRole("link", { name: /Continue to driver information|المتابعة لبيانات السائق/ }).click();
      await layout(page);
      await page.getByLabel(/Driver name|اسم السائق/, { exact: true }).fill("Fictional Passenger");
      await page.getByLabel(/Driver email|بريد السائق/, { exact: true }).fill("passenger@example.test");
      await page.getByLabel(/Driver phone|هاتف السائق/, { exact: true }).fill("+20 100 000 0000");
      await page.getByLabel(/Special requests \(optional\)|طلبات خاصة \(اختياري\)/).fill("Illustrative quiet ride request");
      await page.getByRole("checkbox").check();
      await page.screenshot({ path: `test-results/rental-passenger-new-${width}-${locale}.png`, fullPage: true });
      await page.getByRole("button", { name: /Continue to review booking|المتابعة لمراجعة الحجز/ }).click();
      await expect(page).toHaveURL(/car-rental\/review$/);
      await layout(page);
      await expect(page.getByText("Illustrative quiet ride request", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: /Continue to payment review|المتابعة لمراجعة الدفع/ })).toBeDisabled();
      // A direct client-side navigation cannot bypass review acknowledgment.
      await page.evaluate(() => { history.pushState(null, "", "/car-rental/payment"); window.dispatchEvent(new PopStateEvent("popstate")); });
      await expect(page).toHaveURL(/car-rental\/review$/);
      await page.screenshot({ path: `test-results/rental-review-new-${width}-${locale}.png`, fullPage: true });
      await page.getByRole("checkbox", { name: /I have reviewed|راجعت معلومات/ }).check();
      await page.getByRole("link", { name: /Continue to payment review|المتابعة لمراجعة الدفع/ }).click();
      await layout(page);
      if (width === 1440 && locale === "en") {
        await page.goBack();
        await expect(page.getByRole("checkbox", { name: /I have reviewed/ })).toBeChecked();
        await page.getByRole("link", { name: "Edit contact details" }).click();
        await expect(page.getByLabel("Driver name", { exact: true })).toHaveValue("Fictional Passenger");
        await page.getByRole("button", { name: "Continue to review booking" }).click();
        await expect(page.getByRole("checkbox", { name: /I have reviewed/ })).not.toBeChecked();
        await page.getByRole("checkbox", { name: /I have reviewed/ }).check();
        await page.getByRole("link", { name: "Continue to payment review" }).click();
      }
      await page.getByRole("button", { name: /Continue to outcome|متابعة للنتيجة/ }).click();
      await page.getByRole("button", { name: /Show outcome|عرض النتيجة/ }).click();
      await expect(page).toHaveURL(/car-rental\/bookings\/RENTAL-DEMO-/);
      await layout(page);
    });
  }
}

test("hotel illustration, neutral points and premium footer remain honest and accessible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await visit(page, "/");
  await page.locator(".hotel-miniature").scrollIntoViewIfNeeded();
  await expect(page.locator(".hotel-miniature-building")).toHaveCSS("animation-name", "none");
  await page.locator('section[aria-labelledby="collection-title"]').screenshot({ path: "test-results/hotel-illustration-points.png", animations: "disabled" });
  await expect(page.locator(".hotel-points").first()).toContainText("information only");
  await expect(page.locator(".hotel-points").first()).toHaveAttribute("title", /does not earn points/);
  const footer = page.locator("footer");
  await expect(footer.locator('a[href="https://wa.me/201070724143"]')).toBeVisible();
  await expect(footer.locator('a[href="mailto:royal.travel@royalvacation.online"]')).toBeVisible();
  await expect(footer.locator('a[href*="facebook"], a[href*="instagram"], a[href*="linkedin"], a[href*="youtube"]')).toHaveCount(0);
  expect((await new AxeBuilder({ page }).include("footer").analyze()).violations).toEqual([]);
  await footer.screenshot({ path: "test-results/footer-redesign-desktop.png" });
  await visit(page, "/contact");
  await expect(page.locator("footer")).toBeVisible();
});

for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  for (const locale of ["en", "ar"] as const) {
    test(`five hotel stages and guest summary remain usable ${width}px ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await visit(page, "/hotels/eastern-al-montazah");
      await selectLanguage(page, locale);
      await closeHeaderMenu(page);
      await page.getByRole("button", { name: /Expand All Rooms|عرض كل الغرف/, exact: true }).click();
      await page.getByRole("button", { name: /Select room|اختر الغرفة/, exact: true }).first().click();
      await expect(page.locator(".booking-progress li")).toHaveCount(5);
      await page.getByRole("link", { name: /Continue to guest details|المتابعة لبيانات الضيوف/ }).click();
      await page.getByLabel(/Lead guest name|اسم الضيف الرئيسي/, { exact: true }).fill("Fictional Guest");
      await page.getByLabel(/Contact email|البريد الإلكتروني/, { exact: true }).fill("guest@example.test");
      await page.getByLabel(/Contact phone|هاتف التواصل/, { exact: true }).fill("+20 100 000 0000");
      await page.getByLabel(/Guest 2 name|اسم الضيف 2/, { exact: true }).fill("Fictional Companion");
      await layout(page);
      await page.screenshot({ path: `test-results/hotel-guests-new-${width}-${locale}.png`, fullPage: true });
      await page.getByRole("button", { name: /Continue to cancellation policy|المتابعة لسياسة الإلغاء/ }).click();
      await expect(page).toHaveURL(/booking\/policy$/);
      await expect(page.locator('.booking-progress [aria-current="step"]')).toContainText(/3/);
      await expect(page.getByRole("button", { name: /Continue to Payment Details|المتابعة إلى بيانات الدفع/ })).toBeDisabled();
      await layout(page);
      if (width === 320 || width === 1440) expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
      await page.screenshot({ path: `test-results/hotel-policy-new-${width}-${locale}.png`, fullPage: true });
      await page.getByRole("checkbox", { name: /I have reviewed|راجعت معلومات/ }).check();
      await page.getByRole("link", { name: /Continue to Payment Details|المتابعة إلى بيانات الدفع/ }).click();
      await expect(page).toHaveURL(/booking\/payment$/);
      await expect(page.locator('.booking-progress [aria-current="step"]')).toContainText(/4/);
      await page.getByRole("link", { name: /^(Back|رجوع)$/ }).click();
      await expect(page).toHaveURL(/booking\/policy$/);
      await expect(page.getByRole("checkbox", { name: /I have reviewed|راجعت معلومات/ })).toBeChecked();
    });
  }
}


test("booking filter styling preserves selected feedback, apply and reset in both directions", async ({ page }) => {
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const locale of ["en", "ar"]) {
      await visit(page, "/bookings");
      await selectLanguage(page, locale);
      await closeHeaderMenu(page);
      const toggle = page.getByRole("button", { name: /^(Filters|التصفية)$/ });
      if (await toggle.isVisible()) await toggle.click();
      const filters = page.locator("#booking-filters");
      await expect(filters.getByRole("heading")).toContainText(/Booking Filters|تصفية الحجوزات/);
      await filters.getByRole("searchbox").fill("no such itinerary");
      await expect(filters.getByRole("status")).toContainText("1");
      await filters.getByRole("button", { name: /^(Apply|تطبيق)$/ }).click();
      await expect(page.locator('article[class*="bookingCard"]')).toHaveCount(0);
      await filters.getByRole("button", { name: /Reset filters|إعادة ضبط التصفية/ }).click();
      await expect(filters.getByRole("searchbox")).toHaveValue("");
      await expect(page.locator('article[class*="bookingCard"]').first()).toBeVisible();
      await layout(page);
      await page.screenshot({ path: `test-results/booking-filters-new-${width}-${locale}.png`, fullPage: true });
    }
  }
});

test("reference results combine capacity, daily price and sorting without changing criteria", async ({ page }) => {
  await visit(page, "/car-rental/search?pickup=Cairo&dropoff=Alexandria&start=2030-11-20&end=2030-11-23");
  const filters = page.getByRole("complementary", { name: "Vehicle filters" });
  await filters.getByLabel("Maximum daily price").fill("70");
  await expect(page.locator(".rental-card")).toHaveCount(1);
  await filters.getByLabel("Minimum seats").selectOption("5");
  await expect(page.getByRole("heading", { name: "No matching vehicles" })).toBeVisible();
  await filters.getByRole("button", { name: "Clear", exact: true }).click();
  await filters.getByLabel("Minimum bags").selectOption("3");
  await expect(page.locator(".rental-card")).toHaveCount(2);
  await page.getByLabel("Sort price").selectOption("high");
  await expect(page.locator(".rental-card h2").first()).toHaveText("Group van");
  await filters.getByRole("checkbox").check();
  await expect(page.locator(".rental-card h2")).toHaveText(["Family SUV"]);
  await expect(page).toHaveURL(/dropoff=Alexandria/);
  await page.getByRole("button", { name: "Edit Search", exact: true }).click();
  await expect(page.getByLabel("Return location")).toHaveValue("Alexandria");
  await expect(page.getByLabel("Pickup date", { exact: true })).toHaveValue("2030-11-20");
});
