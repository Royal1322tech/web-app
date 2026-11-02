import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { visit } from "./helpers/demo-login";
import { completeGroupWizard } from "./helpers/group-quotation";
import { selectLanguage } from "./helpers/header";

const axe = (page: Page) => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();

const fillGroupForm = completeGroupWizard;

test.describe("hotel voucher", () => {
  test("shows the supported sections, the same reference and invents nothing", async ({ page }) => {
    await visit(page, "/bookings/DEMO-1001/voucher");
    const voucher = page.locator("article.voucher");
    for (const heading of ["Hotel", "Booking details", "Stay", "Room details", "Travellers", "Customer remarks"]) {
      await expect(voucher.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    }
    await expect(voucher.locator(".voucher__hotel-photo")).toBeVisible();
    await expect.poll(() => voucher.locator(".voucher__hotel-photo").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(voucher.locator(".voucher__reference")).toContainText("DEMO-1001");
    await expect(voucher.locator(".voucher__status")).toHaveText("Confirmed");
    // No supplier data exists, so it must say so rather than show an invented code.
    await expect(voucher.locator(".voucher__facts--four")).toContainText("Not available — demonstration record");
    await expect(voucher.locator("svg[aria-label*=QR], [class*=barcode], [class*=qr]")).toHaveCount(0);
    await expect(voucher).not.toContainText(/passport/i);

    await page.goto("/booking/result/DEMO-1001");
    await expect(page.locator(".booking-status__reference")).toContainText("DEMO-1001");
  });

  test("prints to A4 with no overflow, on few pages, without page controls", async ({ page }) => {
    await visit(page, "/bookings/DEMO-1001/voucher");
    await expect.poll(() => page.locator("article.voucher img").evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete))).toBe(true);
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".voucher-toolbar")).toBeHidden();
    await expect(page.locator("header")).toBeHidden();
    await page.setViewportSize({ width: 718, height: 1000 }); // A4 width less margins, at 96dpi.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await expect(page.locator(".voucher__section").first()).toHaveCSS("print-color-adjust", "exact");
    const pdf = await page.pdf({ format: "A4", preferCSSPageSize: true });
    const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(pages).toBeGreaterThanOrEqual(1);
    expect(pages).toBeLessThanOrEqual(3);
  });

  test("meets accessibility checks in Arabic with RTL", async ({ page }) => {
    await visit(page, "/");
    await selectLanguage(page, "ar");
    await page.goto("/bookings/DEMO-1001/voucher");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("article.voucher").getByRole("heading", { name: "تفاصيل الحجز", exact: true })).toBeVisible();
    expect((await axe(page)).violations).toEqual([]);
  });
});

test.describe("booking status", () => {
  const states = [
    { id: "DEMO-1001", state: "confirmed", title: "Your booking is confirmed — demonstration record", voucher: true },
    { id: "DEMO-1002", state: "pending", title: "Your booking is pending confirmation", voucher: false },
    { id: "DEMO-1005", state: "failed", title: "We couldn't complete this booking", voucher: false },
    { id: "DEMO-1003", state: "cancelled", title: "This booking record is cancelled", voucher: false },
  ];
  for (const { id, state, title, voucher } of states) {
    test(`${state} maps to the recorded status with the real reference and summary`, async ({ page }) => {
      await visit(page, `/booking/result/${id}`);
      const panel = page.locator(".booking-status");
      await expect(panel).toHaveAttribute("data-state", state);
      await expect(panel.getByRole("heading", { level: 2, name: title })).toBeVisible();
      await expect(panel.locator(".booking-status__reference")).toContainText(id);
      await expect(panel.locator(".booking-summary dl")).toContainText("Check-in");
      await expect(panel.getByRole("link", { name: "View Booking Details" })).toHaveAttribute("href", `/bookings/${id}`);
      await expect(panel.getByRole("link", { name: /Voucher/ })).toHaveCount(voucher ? 1 : 0);
      await expect(panel).toContainText("No real booking or payment occurred");
      if (state !== "confirmed") await expect(panel).not.toContainText(/is confirmed/);
      expect((await axe(page)).violations).toEqual([]);
    });
  }

  test("failure offers Search Again and Contact Support", async ({ page }) => {
    await visit(page, "/booking/result/DEMO-1005");
    await expect(page.getByRole("link", { name: "Search Again" })).toHaveAttribute("href", "/search");
    await expect(page.getByRole("link", { name: "Contact Support" })).toHaveAttribute("href", "/contact");
  });

  test("a voucher stays unavailable for a pending booking", async ({ page }) => {
    await visit(page, "/bookings/DEMO-1002/voucher");
    await expect(page.getByRole("heading", { name: "Voucher unavailable" })).toBeVisible();
    await expect(page.locator("article.voucher")).toHaveCount(0);
  });

  test("the developer preview of processing never claims a result or offers an action", async ({ page }) => {
    await visit(page, "/booking/result/DEMO-1001?preview=processing");
    const panel = page.locator(".booking-status");
    await expect(panel).toHaveAttribute("data-state", "processing");
    await expect(panel).toContainText("It is not confirmed yet");
    await expect(panel.getByRole("link")).toHaveCount(0);
    await expect(panel.getByRole("button")).toHaveCount(0);
    await expect(panel.locator(".booking-status__reference")).toHaveCount(0);
    await page.waitForTimeout(1500);
    await expect(panel).toHaveAttribute("data-state", "processing");
  });

  test("checkout stays honest: Continue prepares details and creates no booking", async ({ page }) => {
    await visit(page, "/bookings");
    const before = await page.locator('article[class*="bookingCard"]').count();
    await visit(page, "/booking/result");
    await expect(page).not.toHaveURL(/booking\/result\/.+/);
    await visit(page, "/bookings");
    expect(await page.locator('article[class*="bookingCard"]').count()).toBe(before);
  });
});

test.describe("group requests", () => {
  test("saves once, shows a real reference and keeps it consistent everywhere", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const writes: string[] = [];
    page.on("request", (request) => { if (request.method() !== "GET") writes.push(request.url()); });
    await visit(page, "/group-quotation");
    await fillGroupForm(page);
    const save = page.getByRole("button", { name: "Save demo request" });
    await save.dblclick();
    await expect(page.getByRole("status").filter({ hasText: "Saving your demo request" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    await expect(page.getByRole("heading", { name: "Your demo group request is saved" })).toBeFocused();
    const result = page.locator(".group-result");
    await expect(result).toContainText("It was not sent to Royal Vacation");
    await expect(result.locator(".group-result__next li")).toHaveCount(3);
    await expect(result).toContainText("not a hotel booking reference");
    await expect(result).not.toContainText(/24 hours|receive an email|submitted/i);
    const reference = (await result.locator(".group-result__reference strong").textContent())!;
    expect(reference).toMatch(/^GRP-LOCAL-[0-9A-F]{6}$/);

    await page.getByRole("button", { name: "Copy Reference" }).click();
    await expect(page.getByText("Reference copied.")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(reference);

    await page.getByRole("link", { name: "View My Requests" }).click();
    await expect(page).toHaveURL(/\/group-requests$/);
    // Double-clicking saved exactly one record.
    await expect(page.locator("tbody tr").filter({ hasText: "GRP-LOCAL-" })).toHaveCount(1);
    const row = page.locator("tbody tr").filter({ hasText: reference });
    await expect(row).toContainText("Luxor");
    await expect(row).toContainText("12");
    await expect(row).toContainText("Saved locally");
    await expect(row).toContainText("This session only");
    await row.getByRole("link", { name: `View ${reference}` }).click();
    await expect(page).toHaveURL(new RegExp(`/group-requests/${reference}$`));
    await expect(page.locator(".group-detail__head")).toContainText(reference);
    for (const value of ["Luxor", "Demo Traveller", "Sample Agency", "Spring group trip", "Fictional travel requirements"]) await expect(page.locator(".group-detail")).toContainText(value);
    expect(writes).toEqual([]);
  });

  test("the form keeps what was typed and the failure panel can return to it", async ({ page }) => {
    await visit(page, "/group-quotation?preview=failed");
    const failed = page.locator(".group-result[data-result=failed]");
    await expect(failed).toContainText("Nothing was saved");
    await expect(failed.getByRole("link", { name: "Contact Support" })).toHaveAttribute("href", "/contact");
    await failed.getByRole("button", { name: "Try Again" }).click();
    await expect(page.locator("#enquiry-destination")).toBeVisible();
  });

  test("the list labels samples, paginates and opens details by real identifier", async ({ page }) => {
    await visit(page, "/group-requests");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("My Group Requests");
    await expect(page.getByRole("link", { name: "New Group Request" })).toHaveAttribute("href", "/group-quotation");
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(5);
    for (const row of await rows.all()) await expect(row).toContainText("Sample request");
    for (const label of ["Under Review", "Quotation Sent", "In Discussion", "Closed"]) await expect(rows.filter({ hasText: label }).first()).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Page 2 / 2")).toBeVisible();
    await expect(rows).toHaveCount(1);
    await rows.getByRole("link", { name: /View GRP-SAMPLE-0001/ }).click();
    await expect(page.locator(".group-detail__head")).toContainText("GRP-SAMPLE-0001");
    await expect(page.locator(".group-detail")).toContainText("Not sent to Royal Vacation");
    await page.goto("/group-requests/GRP-DOES-NOT-EXIST");
    await expect(page.getByRole("heading", { name: "This request isn't available" })).toBeVisible();
  });

  for (const width of [390, 1440]) {
    test(`list and details meet accessibility checks at ${width}px in Arabic`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await visit(page, "/group-requests");
      await selectLanguage(page, "ar");
      await page.goto("/group-requests");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("طلبات مجموعاتي");
      expect((await axe(page)).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    });
  }

  test("phones get readable cards with large actions", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await visit(page, "/group-requests");
    const row = page.locator("tbody tr").first();
    await expect(row).toHaveCSS("display", "block");
    const view = row.getByRole("link", { name: /^View / });
    expect((await view.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });

  test("the saving panel stops animating with reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await visit(page, "/group-quotation");
    await fillGroupForm(page);
    await page.getByRole("button", { name: "Save demo request" }).click();
    await expect(page.locator(".group-saving__ring")).toBeVisible();
    await expect(page.locator(".group-saving img")).toHaveCSS("position", "absolute");
    expect(await page.locator(".group-saving__ring").evaluate((ring) => getComputedStyle(ring, "::before").animationName)).toBe("none");
  });
});

for (const width of [390, 768, 1024, 1440, 1920]) {
  for (const locale of ["en", "ar"] as const) {
    test(`new pages fit ${width}px in ${locale}`, async ({ page }) => {
      test.setTimeout(90000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      await page.setViewportSize({ width, height: 900 });
      await visit(page, "/");
      await selectLanguage(page, locale);
      for (const path of ["/bookings/DEMO-1001/voucher", "/booking/result/DEMO-1001", "/booking/result/DEMO-1002", "/booking/result/DEMO-1005", "/booking/result/DEMO-1001?preview=processing", "/group-requests", "/group-requests/GRP-SAMPLE-0006", "/group-quotation?preview=failed"]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBeLessThanOrEqual(1);
      }
      expect(errors).toEqual([]);
    });
  }
}

async function checkoutToPrepared(page: Page) {
  await visit(page, "/search");
  await page.locator("article").filter({ hasText: "Eastern Al Montazah Hotel" }).first().locator("a").filter({ hasText: "Eastern Al Montazah Hotel" }).first().click();
  await expect(page).toHaveURL(/\/hotels\/eastern-al-montazah/);
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
  await expect(page.getByText("Booking Details Prepared", { exact: true })).toBeVisible();
}

test.describe("real hotel booking journey", () => {
  for (const [outcome, label, title] of [
    ["confirmed", "Confirmed", "Your booking is confirmed — demonstration record"],
    ["pending", "Pending confirmation", "Your booking is pending confirmation"],
    ["failed", "Failed", "We couldn't complete this booking"],
  ] as const) {
    test(`search to ${outcome} through normal interactions, with one consistent reference`, async ({ page }) => {
      const writes: string[] = [];
      page.on("request", (request) => { if (request.method() !== "GET") writes.push(request.url()); });
      await checkoutToPrepared(page);
      await expect(page.locator(".demo-simulation")).toContainText("No supplier is contacted");
      await page.getByRole("radio", { name: label, exact: true }).check();
      await page.getByRole("button", { name: "Run demo booking" }).dblclick();

      const processing = page.locator('.booking-status[data-state="processing"]');
      await expect(processing).toBeVisible();
      await expect(processing).toContainText("It is not confirmed yet");
      await expect(processing.locator(".booking-status__icon")).toBeInViewport();
      await expect(processing).toContainText("Demo simulation");
      await expect(processing.locator(".booking-summary")).toContainText("Eastern Al Montazah Hotel");
      expect(await processing.locator(".booking-status__icon").evaluate((icon) => getComputedStyle(icon, "::before").animationName)).not.toBe("none");

      await expect(page).toHaveURL(/\/booking\/result\/DEMO-LOCAL-[0-9A-F]{6}$/, { timeout: 8000 });
      const panel = page.locator(".booking-status");
      await expect(panel).toHaveAttribute("data-state", outcome);
      await expect(page.getByRole("heading", { level: 2, name: title })).toBeFocused();
      const reference = page.url().split("/").pop()!;
      await expect(panel.locator(".booking-status__reference")).toContainText(reference);
      await expect(panel.locator(".booking-status__confetti")).toHaveCount(outcome === "confirmed" ? 1 : 0);

      if (outcome === "confirmed") {
        await panel.getByRole("link", { name: /Voucher/ }).click();
        await expect(page.locator(".voucher__reference")).toContainText(reference);
        await expect(page.locator("article.voucher")).toContainText("Demo Guest");
        await expect(page.locator("article.voucher")).toContainText("NOT VALID FOR TRAVEL");
        await page.goBack();
      } else {
        await expect(panel.getByRole("link", { name: /Voucher/ })).toHaveCount(0);
      }
      if (outcome === "failed") {
        await expect(panel.getByRole("link", { name: "Search Again" })).toBeVisible();
      }
      await panel.getByRole("link", { name: "View Booking Details" }).click();
      await expect(page).toHaveURL(new RegExp(`/bookings/${reference}$`));
      await expect(page.locator("main")).toContainText(reference);
      await page.getByRole("link", { name: "My Bookings" }).first().click();
      // A double click still made exactly one record.
      await expect(page.getByText(reference, { exact: true })).toHaveCount(1);
      expect(writes).toEqual([]);
    });
  }

  test("Arabic on a phone with reduced motion reaches the result without animation", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await checkoutToPrepared(page);
    await selectLanguage(page, "ar");
    await page.getByRole("button", { name: "تشغيل الحجز التجريبي" }).click();
    const processing = page.locator('.booking-status[data-state="processing"]');
    await expect(processing).toBeVisible();
    expect(await processing.locator(".booking-status__icon").evaluate((icon) => getComputedStyle(icon, "::before").animationName)).toBe("none");
    await expect(page).toHaveURL(/DEMO-LOCAL/, { timeout: 5000 });
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator(".booking-status__confetti")).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    expect((await axe(page)).violations).toEqual([]);
  });

  test("a simulated result is a session record, not a claim of supplier confirmation", async ({ page }) => {
    await checkoutToPrepared(page);
    await page.getByRole("button", { name: "Run demo booking" }).click();
    await expect(page).toHaveURL(/DEMO-LOCAL/, { timeout: 8000 });
    const panel = page.locator(".booking-status");
    await expect(panel).toContainText("demonstration record");
    await expect(panel).toContainText("No real booking or payment occurred");
    await expect(panel).not.toContainText(/supplier (has )?confirmed|email has been sent/i);
    expect((await axe(page)).violations).toEqual([]);
  });
});

for (const [locale, width] of [["en", 1440], ["ar", 390]] as const) {
  test(`real group journey in ${locale} at ${width}px, from form to matching details`, async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width, height: 900 });
    await visit(page, "/group-quotation");
    if (locale === "en") {
      await fillGroupForm(page);
      await page.getByRole("button", { name: "Save demo request" }).click();
    }
    if (locale === "ar") {
      await selectLanguage(page, "ar");
      await completeGroupWizard(page);
      await page.getByRole("button", { name: "حفظ الطلب التجريبي" }).click();
    }
    await expect(page.locator(".group-saving")).toBeVisible();
    await expect(page.locator(".group-saving__ring")).toBeInViewport();
    await expect(page.locator(".group-saving img")).toHaveCSS("position", "absolute");
    expect(await page.locator(".group-saving__ring svg").evaluate((icon) => getComputedStyle(icon).animationName)).not.toBe("none");
    const result = page.locator('.group-result[data-result="saved"]');
    await expect(result).toBeVisible();
    const reference = (await result.locator(".group-result__reference strong").textContent())!;
    await result.locator(".group-result__reference button").click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(reference);
    expect((await axe(page)).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await result.locator('.group-result__actions a[href="/group-requests"]').click();
    await page.locator("tbody tr").filter({ hasText: reference }).locator("a").click();
    await expect(page.locator(".group-detail__head")).toContainText(reference);
    await expect(page.locator(".group-detail")).toContainText("Luxor");
    expect((await axe(page)).violations).toEqual([]);
  });
}

test("sample requests look realistic, vary and are never presented as real submissions", async ({ page }) => {
  await visit(page, "/group-requests");
  await expect(page.locator(".group-list__legend")).toHaveText("Sample requests");
  await expect(page.locator("main")).not.toContainText(/Sample Agent|Sample Agency|Sample group request/);
  await expect(page.locator("tbody tr").filter({ hasText: "GRP-SAMPLE-0005" })).toContainText("Luxor & Aswan");
  await page.locator("tbody tr").filter({ hasText: "GRP-SAMPLE-0005" }).locator("a").click();
  const detail = page.locator(".group-detail");
  for (const value of ["Luxor & Aswan", "Nile Gate Tours", "Sample request", "Not sent to Royal Vacation", "step-free rooms"]) await expect(detail).toContainText(value);
});
