import { openHeaderTools } from "./helpers/header";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const protectedDemoRoutes = [
  "/agency",
  "/agency/edit",
  "/notifications",
  "/verify-email",
  "/wallet",
  "/transactions",
];
async function enterDemoIfNeeded(page: Page, route: string) {
  if (protectedDemoRoutes.includes(route)) {
    await page
      .getByRole("button", {
        name: /Explore demo agency workspace|استكشاف مساحة الوكالة التجريبية/,
      })
      .click();
  }
}
async function visit(page: Page, route: string) {
  await page.goto(route);
  await enterDemoIfNeeded(page, route);
}
const routes = [
  "/agency",
  "/agency/edit",
  "/notifications",
  "/verify-email",
  "/wallet",
  "/transactions",
  "/booking/summary",
  "/booking/guests",
  "/booking/payment",
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
    page.getByRole("button", { name: "Sold out — demo", exact: true }).first(),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Select room — demo", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/booking\/summary$/);
}
async function fillGuests(page: Page) {
  await page
    .getByRole("checkbox", { name: /I understand this is a demonstration/ })
    .check();
  await page
    .getByRole("link", { name: "Continue to guest details", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Continue to payment preview" })
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
    .getByRole("button", { name: "Continue to payment preview" })
    .click();
  await expect(page).toHaveURL(/\/booking\/payment$/);
}
async function finish(page: Page, scenario = "confirmed") {
  await page
    .getByLabel("Demonstration outcome", { exact: true })
    .selectOption(scenario);
  await page
    .getByRole("button", { name: "Simulate payment", exact: true })
    .click();
  await expect(
    page.getByText("Processing state preview.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show simulated result" }).click();
  await expect(page).toHaveURL(/\/booking\/result\/DEMO-/);
}
for (const width of [375, 1440])
  test(`complete booking, voucher and cancellation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    const writes: string[] = [];
    page.on("request", (r) => {
      if (!["GET", "HEAD"].includes(r.method())) writes.push(r.url());
    });
    await selectRoom(page);
    await fillGuests(page);
    await page
      .getByLabel("Demonstration outcome", { exact: true })
      .selectOption("insufficient");
    await expect(page.getByRole("alert")).toContainText(
      "Insufficient demo credit",
    );
    await expect(
      page.getByRole("button", { name: "Simulate payment", exact: true }),
    ).toBeDisabled();
    await finish(page);
    await page
      .getByRole("link", { name: "View demo voucher", exact: true })
      .click();
    await expect(page.locator(".voucher")).toContainText("Demo Guest");
    await expect(page.locator(".voucher")).toContainText("Demo Companion");
    await expect(page.locator(".voucher")).toContainText("LOCAL-AGENCY-42");
    await expect(page.locator(".voucher")).toContainText(
      "DEMO · NOT VALID FOR TRAVEL",
    );
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".voucher")).toBeVisible();
    await expect(page.locator("header")).toBeHidden();
    await page.emulateMedia({ media: "screen" });
    await page
      .getByRole("link", { name: "Back to booking", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Cancel demo booking", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByRole("button", { name: "Keep booking", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Cancel demo booking", exact: true }),
    ).toBeFocused();
    await page
      .getByRole("button", { name: "Cancel demo booking", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirm simulated cancellation" })
      .click();
    await expect(page.locator(".status-badge").first()).toContainText(
      "Cancelled",
    );
    await expect(
      page.getByRole("link", { name: "View demo voucher", exact: true }),
    ).toHaveCount(0);
    expect(writes).toEqual([]);
    expect(
      await page.evaluate(() =>
        JSON.stringify({ ...localStorage, ...sessionStorage }),
      ),
    ).not.toContain("Demo Guest");
  });
for (const scenario of ["pending", "failed"])
  test(`${scenario} result and safe retry`, async ({ page }) => {
    await selectRoom(page);
    await fillGuests(page);
    await finish(page, scenario);
    await expect(page.locator(".status-badge").first()).toContainText(
      scenario === "pending" ? "Pending" : "Failed",
    );
    await expect(
      page.getByRole("link", { name: "View demo voucher", exact: true }),
    ).toHaveCount(0);
    if (scenario === "failed") {
      await page.getByRole("button", { name: "Retry simulation" }).click();
      await expect(page).toHaveURL(/\/booking\/payment$/);
      await finish(page);
      await expect(page.locator(".status-badge").first()).toContainText(
        "Confirmed",
      );
    }
  });
test("booking modification updates dates, total and timeline", async ({
  page,
}) => {
  await visit(page, "/bookings/DEMO-1001");
  await page
    .getByRole("button", { name: "Modify demo booking", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#check-in").fill("2027-01-10");
  await dialog.locator("#check-out").fill("2027-01-14");
  await dialog.getByRole("button", { name: "Search", exact: true }).click();
  await expect(dialog).toContainText("$740.00");
  await dialog.getByRole("button", { name: "Save simulated changes" }).click();
  await expect(page.locator(".selection-summary")).toContainText("2027-01-14");
  await expect(page.locator(".selection-summary")).toContainText("$740.00");
  await expect(page.locator(".timeline")).toContainText(
    "Stay modification simulated",
  );
});
test("account editing, notifications, transactions and state previews", async ({
  page,
}) => {
  await visit(page, "/agency/edit");
  await page.getByLabel("Agency name", { exact: true }).fill("");
  await page
    .getByRole("button", { name: "Save demo profile", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Enter your agency name.",
  );
  await page
    .getByLabel("Agency name", { exact: true })
    .fill("Local Demo Agency");
  await page
    .getByRole("button", { name: "Save demo profile", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Demo profile saved");
  await page.getByRole("link", { name: "Back to profile" }).click();
  await expect(
    page.getByRole("heading", { name: "Local Demo Agency" }),
  ).toBeVisible();
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
  await page.getByRole("link", { name: "Credit balance", exact: true }).click();
  await page
    .getByRole("button", { name: "Preview insufficient balance" })
    .click();
  await expect(page.getByRole("alert")).toContainText("Insufficient balance");
  await page.getByText("Preview interface states", { exact: true }).click();
  await page.getByLabel("Demo state", { exact: true }).selectOption("error");
  await expect(
    page.getByRole("heading", { name: "Unable to load this view" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A transparent demo overview" }),
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
    page.getByText("No sample hotels match", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Filters", exact: true }),
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
      await enterDemoIfNeeded(page, route);
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
  await page.getByRole("combobox", { name: "Language" }).selectOption("ar");
  for (const route of [
    "/agency",
    "/agency/edit",
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
    "/agency",
    "/agency/edit",
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
    .getByRole("checkbox", { name: /I understand this is a demonstration/ })
    .check();
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
  await page.locator("#check-out").fill("2027-02-15");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/checkOut=2027-02-15/);
  await page.reload();
  await expect(page.locator("#check-out")).toHaveValue("2027-02-15");
  await page
    .getByRole("link", { name: "Eastern Al Montazah Hotel", exact: true })
    .click();
  await expect(page.locator("#check-in")).toHaveValue("2027-02-10");
  await page
    .getByRole("button", { name: "Expand All Rooms", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select room — demo", exact: true })
    .first()
    .click();
  await expect(page.locator(".selection-summary")).toContainText("$1,850.00");
  await expect(page.locator(".selection-summary")).toContainText("2 / 5");
  await page.getByRole("link", { name: "Change room", exact: true }).click();
  await expect(page.locator("#check-out")).toHaveValue("2027-02-15");
  await page.locator('a[href^="/hotels/garden-stay-demo?"]').first().click();
  await expect(page.locator("#check-in")).toHaveValue("2027-02-10");
  await expect(page.locator('input[name="destination"]')).toHaveValue(
    "Hurghada",
  );
  await page.locator('a[href^="/hotels/eastern-al-montazah?"]').first().click();
  await page
    .getByRole("button", { name: "Expand All Rooms", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select room — demo", exact: true })
    .first()
    .click();
  await page
    .getByRole("checkbox", { name: /I understand this is a demonstration/ })
    .check();
  await page
    .getByRole("link", { name: "Continue to guest details", exact: true })
    .click();
  await expect(page.getByLabel("Guest 4 name", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Guest 5 name", { exact: true })).toHaveCount(0);
});

test("Arabic mobile checkout preserves guest names, contact and totals through the voucher", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 950 });
  await selectRoom(page);
  await openHeaderTools(page);
  await page.getByRole("combobox", { name: "Language" }).selectOption("ar");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("link", { name: "المتابعة لبيانات الضيوف", exact: true })
    .click();
  await page
    .getByLabel("اسم الضيف الرئيسي", { exact: true })
    .fill("ضيف تجريبي");
  await page
    .getByLabel("البريد الإلكتروني", { exact: true })
    .fill("demo@example.com");
  await page
    .getByLabel("هاتف التواصل", { exact: true })
    .fill("+20 100 000 0000");
  await page.getByLabel("اسم الضيف 2", { exact: true }).fill("مرافق تجريبي");
  await page.getByRole("button", { name: "المتابعة لمعاينة الدفع" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
  const paymentAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(paymentAxe.violations).toEqual([]);
  await page.getByRole("button", { name: "محاكاة الدفع", exact: true }).click();
  await page.getByRole("button", { name: "عرض النتيجة التجريبية" }).click();
  await page
    .getByRole("link", { name: "عرض القسيمة التجريبية", exact: true })
    .click();
  await expect(page.locator(".voucher")).toContainText("ضيف تجريبي");
  await expect(page.locator(".voucher")).toContainText("مرافق تجريبي");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/voucher-mobile-ar.png",
    fullPage: true,
  });
});

test("email states, shared loading/empty/error states, and motion fallback remain usable", async ({
  page,
}) => {
  await visit(page, "/verify-email");
  await page.getByLabel("Verification state").selectOption("expired");
  await expect(page.getByRole("alert")).toContainText("Expired link preview");
  await page.getByRole("button", { name: "Reset demo link" }).click();
  await page
    .getByRole("button", { name: "Preview verification", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Your actual email has not been verified.",
  );
  for (const route of [
    "/search",
    "/wallet",
    "/bookings",
    "/notifications",
    "/transactions",
  ]) {
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
    page.locator('section[aria-label] img[src="/images/home/flight/hero-clean.png"]').first(),
  ).toHaveCSS("transform", "none");
  await page.locator(".travel-trail").scrollIntoViewIfNeeded();
  expect(
    await page
      .locator(".travel-trail-plane")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});
