import { pickDate } from "./helpers/date-picker";
import { selectLanguage } from "./helpers/header";
import { visit } from "./helpers/demo-login";
import { openHeaderTools } from "./helpers/header";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
// Interface state previews are developer-only; the local test build enables them (playwright.config.ts).
const statePreviewBuild = !process.env.PLAYWRIGHT_BASE_URL || process.env.VITE_ENABLE_STATE_PREVIEW === "true";
const routes = [
  // Agency Profile (/agency, /agency/edit) is hidden for now and redirects to My Profile.
  "/profile",
  "/account/settings",
  "/notifications",
  "/verify-email",
  "/wallet",
  "/transactions",
  "/booking/summary",
  "/booking/guests",
  "/booking/payment",
  "/booking/result",
  "/booking/result/DEMO-1001",
  "/bookings/DEMO-1001",
  "/bookings/DEMO-1001/voucher",
  "/bookings/missing",
];
async function selectRoom(page: Page) {
  await visit(page, "/hotels/eastern-al-montazah");
  await page
    .getByRole("button", { name: "Expand All Rooms", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Sold out", exact: true }).first(),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Select room", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/booking\/summary$/);
}
async function fillGuests(page: Page) {
  await page
    .getByRole("link", { name: "Continue to guest details", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Continue to cancellation policy" })
    .click();
  await expect(
    page.getByText("Enter the lead guest name.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Lead guest name", { exact: true }).fill("Demo Guest");
  await page
    .getByLabel("Contact email", { exact: true })
    .fill("demo@example.com");
  await page
    .getByLabel("Contact phone", { exact: true })
    .fill("+20 100 000 0000");
  await page.getByLabel("Guest 2 name", { exact: true }).fill("Demo Companion");
  await page
    .getByLabel("Agency reference (optional)", { exact: true })
    .fill("LOCAL-AGENCY-42");
  await page
    .getByLabel("Special requests (optional)", { exact: true })
    .fill("Demo quiet room request");
  await page
    .getByRole("button", { name: "Continue to cancellation policy" })
    .click();
  await expect(page).toHaveURL(/\/booking\/policy$/);
  await expect(page.getByRole("button", { name: "Continue to Payment Details" })).toBeDisabled();
  await page.getByRole("checkbox", { name: /I have reviewed the cancellation and stay information/ }).check();
  await page.getByRole("link", { name: "Continue to Payment Details" }).click();
  await expect(page).toHaveURL(/\/booking\/payment$/);
}
test("hotel payment details select one method and prepare a neutral result", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url());
  });
  await selectRoom(page);
  await fillGuests(page);
  await expect(page.getByRole("heading", { name: "Choose a payment method" })).toBeVisible();
  await page.screenshot({ path: "test-results/payment-details-desktop.png", fullPage: true });
  const methods = page.getByRole("radio", { name: /InstaPay|Fawry|Credit \/ Debit Card|Agency Credit/ });
  await expect(methods).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
  await expect(page.getByLabel(/Card number|CVV|Expiry date/)).toHaveCount(0);

  await page.getByRole("radio", { name: /Agency Credit/ }).check();
  await expect(page.getByRole("region", { name: "Agency credit summary" })).toContainText("Available balance");
  await expect(page.getByRole("region", { name: "Agency credit summary" })).toContainText("Estimated remaining");
  await page.getByRole("radio", { name: "InstaPay" }).check();
  await expect(page.getByRole("radio", { name: "Agency Credit" })).not.toBeChecked();
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await page.getByRole("link", { name: "Continue to Payment Details" }).click();
  await expect(page.getByRole("radio", { name: "InstaPay" })).toBeChecked();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/\/booking\/result$/);
  await expect(page.getByText("Booking Details Prepared", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Prepared booking summary" })).toBeVisible();
  await expect(page.locator(".booking-prepared-facts")).toContainText("Eastern Al Montazah Hotel");
  await expect(page.locator(".booking-prepared-facts")).toContainText("Bed & Breakfast");
  await expect(page.locator(".booking-prepared-facts")).toContainText("InstaPay");
  await expect(page.getByRole("status")).toContainText("No hotel reservation has been submitted or confirmed, and no real payment has been processed.");
  await expect(page.getByRole("link", { name: "Review Booking Details" })).toHaveAttribute("href", "/booking/summary");
  await expect(page.getByRole("link", { name: "Return to Hotel Search" })).toHaveAttribute("href", "/search");
  await page.screenshot({ path: "test-results/payment-prepared-desktop.png", fullPage: true });
  expect(writes).toEqual([]);
});

test("booking modification updates dates, total and timeline", async ({
  page,
}) => {
  await visit(page, "/bookings/DEMO-1001");
  await page
    .getByRole("button", { name: "Modify booking", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await pickDate(dialog, "check-in", "2027-01-10");
  await pickDate(dialog, "check-out", "2027-01-14");
  await dialog.getByRole("button", { name: "Search", exact: true }).click();
  await expect(dialog).toContainText("$740.00");
  await dialog.getByRole("button", { name: "Save simulated changes" }).click();
  await expect(page.locator(".selection-summary")).toContainText("Jan 14, 2027");
  await expect(page.locator(".selection-summary")).toContainText("$740.00");
  await expect(page.locator(".timeline")).toContainText(
    "Stay modification simulated",
  );
});
test("account editing, notifications, transactions and state previews", async ({
  page,
}) => {
  // Agency Profile is hidden for now: both of its routes open My Profile, with no link back to it.
  await visit(page, "/profile");
  for (const path of ["/agency", "/agency/edit"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/profile$/);
  }
  await expect(page.locator('a[href="/agency"], a[href="/agency/edit"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Agency Profile" })).toHaveCount(0);
  await page
    .getByRole("link", { name: "Notifications", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await page.getByLabel("Show notifications").selectOption("unread");
  await expect(
    page.getByRole("heading", { name: "You’re all caught up" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Transactions", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(4);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByLabel("Search transactions").fill("TX-DEMO-001");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "View transaction TX-DEMO-001" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Opening demo credit");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "View transaction TX-DEMO-001" }),
  ).toBeFocused();
  await page.getByLabel("Search transactions").fill("missing");
  await expect(
    page.getByRole("heading", { name: "No matching transactions" }),
  ).toBeVisible();
  await page.getByRole("navigation", { name: "Workspace navigation" }).getByRole("link", { name: "Wallet", exact: true }).click();
  await page
    .getByRole("button", { name: "Show insufficient-balance example" })
    .click();
  await expect(page.getByRole("alert")).toContainText("Insufficient balance");
  if (!statePreviewBuild) return;
  await page.getByText("Preview interface states", { exact: true }).click();
  await page.getByLabel("Demo state", { exact: true }).selectOption("error");
  await expect(
    page.getByRole("heading", { name: "Unable to load this view" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Account overview" }),
  ).toBeVisible();
});
test("mobile filters behave as a keyboard accessible drawer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await visit(page, "/search");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Hotel Name", { exact: true }).fill("missing");
  await dialog.getByRole("button", { name: "Show 0 hotels" }).click();
  await expect(
    page.getByText("No hotels match", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Filters (1)", exact: true }),
  ).toBeFocused();
});
test("new routes load directly, refresh, and preserve RTL and reduced motion", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const route of routes) {
      await visit(page, route);
      await expect(page.locator("h1")).toBeVisible();
      await page.reload();
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${route} ${width}`,
      ).toBeTruthy();
    }
  }
  await visit(page, "/wallet");
  await openHeaderTools(page);
  await selectLanguage(page, "ar");
  for (const route of [
    "/profile",
    "/account/settings",
    "/wallet",
    "/transactions",
    "/bookings/DEMO-1001",
    "/bookings/DEMO-1001/voucher",
  ]) {
    await visit(page, route);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      route,
    ).toBeTruthy();
    await expect(page.locator("h1")).toBeVisible();
  }
  await page.screenshot({
    path: "test-results/workspace-ar.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("new account and finance screens pass accessibility checks", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of [
    "/profile",
    "/account/settings",
    "/wallet",
    "/transactions",
    "/notifications",
    "/verify-email",
    "/bookings/DEMO-1001",
    "/bookings/DEMO-1001/voucher",
  ]) {
    await visit(page, route);
    await expect(page.locator("h1")).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      route,
    ).toEqual([]);
  }
  await visit(page, "/wallet");
  await page.screenshot({
    path: "test-results/wallet-desktop.png",
    fullPage: true,
  });
});
test("checkout accessibility and refresh recovery", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await selectRoom(page);
  let result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  await page
    .getByRole("link", { name: "Continue to guest details", exact: true })
    .click();
  result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Choose a room to begin" }),
  ).toBeVisible();
});

test("stay dates and multiple-room totals survive search, details and room changes", async ({
  page,
}) => {
  const criteria = {
    destination: "Alexandria",
    checkIn: "2027-02-10",
    checkOut: "2027-02-14",
    rooms: [
      { adults: 2, childAges: [] },
      { adults: 2, childAges: [] },
    ],
  };
  const query = new URLSearchParams({
    ...criteria,
    rooms: JSON.stringify(criteria.rooms),
  });
  await visit(page, `/search?${query}`);
  await pickDate(page, "check-out", "2027-02-15");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/checkOut=2027-02-15/);
  await page.reload();
  await expect(page.locator("#check-out")).toHaveAttribute("data-value", "2027-02-15");
  await page
    .getByRole("link", { name: "Eastern Al Montazah Hotel", exact: true })
    .click();
  await expect(page.locator("#check-in")).toHaveAttribute("data-value", "2027-02-10");
  await page
    .getByRole("button", { name: "Expand All Rooms", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select room", exact: true })
    .first()
    .click();
  await expect(page.locator(".selection-summary")).toContainText("$1,850.00");
  await expect(page.locator(".selection-summary")).toContainText("2 / 5");
  await page.getByRole("link", { name: "Change room", exact: true }).click();
  await expect(page.locator("#check-out")).toHaveAttribute("data-value", "2027-02-15");
  await page.locator('a[href^="/hotels/garden-stay-demo?"]').first().click();
  await expect(page.locator("#check-in")).toHaveAttribute("data-value", "2027-02-10");
  await expect(page.locator('input[name="destination"]')).toHaveValue(
    "Hurghada",
  );
  await page.locator('a[href^="/hotels/eastern-al-montazah?"]').first().click();
  await page
    .getByRole("button", { name: "Expand All Rooms", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select room", exact: true })
    .first()
    .click();
  await page
    .getByRole("link", { name: "Continue to guest details", exact: true })
    .click();
  await expect(page.getByLabel("Guest 4 name", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Guest 5 name", { exact: true })).toHaveCount(0);
});

test("Arabic mobile hotel payment prepares details without creating a booking", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 950 });
  await selectRoom(page);
  await openHeaderTools(page);
  await selectLanguage(page, "ar");
  await page.getByRole("link", { name: "المتابعة لبيانات الضيوف", exact: true }).click();
  await page.getByLabel("اسم الضيف الرئيسي", { exact: true }).fill("ضيف تجريبي");
  await page.getByLabel("البريد الإلكتروني", { exact: true }).fill("demo@example.com");
  await page.getByLabel("هاتف التواصل", { exact: true }).fill("+20 100 000 0000");
  await page.getByLabel("اسم الضيف 2", { exact: true }).fill("مرافق تجريبي");
  await page.getByRole("button", { name: "المتابعة لسياسة الإلغاء" }).click();
  await expect(page.getByRole("button", { name: "المتابعة إلى بيانات الدفع" })).toBeDisabled();
  await page.getByRole("checkbox", { name: "راجعت معلومات الإلغاء والإقامة الموضحة أعلاه." }).check();
  await page.getByRole("link", { name: "المتابعة إلى بيانات الدفع" }).click();
  await expect(page.getByRole("heading", { name: "اختر طريقة الدفع" })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  const paymentAxe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(paymentAxe.violations).toEqual([]);
  await page.getByRole("radio", { name: "فوري" }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("radio", { name: "فوري" })).toBeChecked();
  await page.getByRole("button", { name: "متابعة", exact: true }).click();
  await expect(page.getByRole("heading", { name: "تم تجهيز تفاصيل الحجز" }).last()).toBeVisible();
  await expect(page.getByRole("status")).toContainText("لم يُرسل الحجز إلى الفندق أو يُؤكد، ولم تتم معالجة دفعة فعلية.");
  await expect(page.getByRole("link", { name: "عرض القسيمة", exact: true })).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  await page.screenshot({ path: "test-results/payment-prepared-mobile-ar.png", fullPage: true });
});

test("email states, shared loading/empty/error states, and motion fallback remain usable", async ({
  page,
}) => {
  await visit(page, "/verify-email");
  await page.getByLabel("Verification state").selectOption("expired");
  await expect(page.getByRole("alert")).toContainText("The link is expired");
  await page.getByRole("button", { name: "Reset link status" }).click();
  await page
    .getByRole("button", { name: "Preview verification", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "This local status does not verify your email address.",
  );
  for (const route of statePreviewBuild ? [
    "/search",
    "/wallet",
    "/bookings",
    "/notifications",
    "/transactions",
  ] : []) {
    await visit(page, route);
    await page.getByText("Preview interface states", { exact: true }).click();
    await page
      .getByLabel("Demo state", { exact: true })
      .selectOption("loading");
    await expect(
      page.getByRole("status", { name: "Loading preview" }),
    ).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await page
        .locator(".skeleton-group span")
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("none");
    for (const state of ["empty", "error", "unavailable"]) {
      await page.getByLabel("Demo state", { exact: true }).selectOption(state);
      await expect(page.locator(".system-state")).toBeVisible();
    }
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.locator(".skeleton-group")).toHaveCount(0);
  }
  await visit(page, "/");
  await page.mouse.move(700, 300);
  await expect(
    page.locator('section[aria-label] img[src="/images/home/hero/maldives-ai.png"]').first(),
  ).toHaveCSS("transform", "none");
  await page.locator(".travel-trail").scrollIntoViewIfNeeded();
  expect(
    await page
      .locator(".travel-trail-plane")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});
