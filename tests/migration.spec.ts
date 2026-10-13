import { openHeaderTools } from "./helpers/header";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = [
  "/",
  "/welcome",
  "/login",
  "/forgot-password",
  "/verify-otp",
  "/reset-password",
  "/search",
  "/hotels/eastern-al-montazah",
  "/bookings",
  "/favourites",
  "/register/agency",
  "/register/agency/company",
  "/register/agency/contact",
  "/register/agency/documents",
  "/register/agency/review",
  "/hotels/missing",
  "/missing",
];

test("every route loads directly and refreshes without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    await page.reload();
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText("Unable to load this page")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

for (const width of [320, 375, 768, 1440]) {
  test(`responsive layouts and RTL at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    for (const route of [
      "/",
      "/search",
      "/hotels/eastern-al-montazah",
      "/welcome",
      "/login",
      "/forgot-password",
      "/verify-otp",
      "/reset-password",
      "/register/agency/company",
      "/bookings",
      "/favourites",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        route,
      ).toBeTruthy();
    }
    await page.goto("/");
    await openHeaderTools(page);
    await page.getByRole("combobox", { name: "Language" }).selectOption("ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `test-results/home-ar-${width}.png`,
      fullPage: true,
    });
  });
}

test("search validation, rooms, child ages, query navigation and browser history", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Search", exact: true })
    .first()
    .click();
  await expect(page.locator("#destination")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.locator("#destination").selectOption("Alexandria");
  const date = new Date();
  date.setDate(date.getDate() + 7);
  const checkIn = date.toISOString().slice(0, 10);
  date.setDate(date.getDate() + 3);
  await page.locator("#check-in").fill(checkIn);
  await page.locator("#check-out").fill(date.toISOString().slice(0, 10));
  await page.locator('[aria-controls="room-selector"]').click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /Increase children/ }).click();
  await dialog.locator("select").first().selectOption("0");
  await dialog.getByRole("button", { name: "Add Room", exact: false }).click();
  await dialog.getByRole("button", { name: "Apply", exact: true }).click();
  await page
    .getByRole("button", { name: "Search", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/search\?destination=Alexandria/);
  await expect(page.locator("#destination")).toHaveValue("Alexandria");
  expect(new URL(page.url()).searchParams.get("rooms")).toContain(
    '"childAges":[0]',
  );
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
});

test("filters, sorting, comparison and persisted favourites", async ({
  page,
}) => {
  await page.goto("/search");
  const favourites = page.getByRole("button", { name: /^Favourite:/ });
  await expect(favourites.first()).toBeVisible();
  await favourites.first().click();
  await page.getByLabel("Hotel Name", { exact: true }).fill("does-not-exist");
  await expect(page.getByText("No sample hotels match")).toBeVisible();
  await page.getByLabel("Hotel Name", { exact: true }).fill("");
  await page.getByRole("combobox", { name: /Sort/ }).selectOption("priceLow");
  const comparison = page.getByRole("button", { name: "Compare", exact: true });
  await comparison.nth(0).click();
  await comparison.nth(0).click();
  await page.getByRole("button", { name: "Compare hotels" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Sample hotel comparison",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.getByRole("link", { name: "Favourites", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /^Favourite:/ }).first(),
  ).toHaveAttribute("aria-pressed", "true");
});

test("gallery, room and rate dialogs, chart, map", async ({ page }) => {
  await page.goto("/hotels/eastern-al-montazah");
  await page.getByRole("button", { name: "Open photo gallery" }).click();
  const gallery = page.getByRole("dialog");
  await gallery.getByRole("button", { name: "Next photo" }).click();
  await expect(gallery).toContainText("2 / 7");
  await page.keyboard.press("Escape");
  const bars = page.getByRole("button", { name: /USD — Sample/ });
  await expect(bars).toHaveCount(20);
  await bars.first().click();
  await page.locator("#location").scrollIntoViewIfNeeded();
  await expect(
    page.locator('iframe[title^="Hotel location map"]'),
  ).toHaveAttribute("src", /openstreetmap.org/);
  await expect(
    page.getByRole("link", { name: "Open in Google Maps" }),
  ).toHaveAttribute("href", /maps/);
  await page.goto("/search");
  await page
    .getByRole("button", { name: "View Rooms", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Room Details", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText("Bed Options");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Expand All Rooms", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Price Details", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText("Price Details");
  await page.keyboard.press("Escape");
});

async function company(page: Page) {
  await page.getByLabel("Name of Company").fill("Migration Test Agency");
  await page.getByLabel("Number of Employees").fill("12");
  await page.getByLabel("Country", { exact: false }).selectOption("EG");
  await page.getByLabel("Company Registration Number").fill("TEST-001");
  await page.getByLabel("Address of Company").fill("Alexandria");
  await page.getByRole("button", { name: "Next", exact: true }).click();
}

test("registration validation, file retention, review and prerequisite guards", async ({
  page,
}) => {
  await page.goto("/register/agency/review");
  await expect(page).toHaveURL(/\/company$/);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Enter your company name.")).toBeVisible();
  await company(page);
  await page.getByLabel("Role", { exact: false }).fill("Manager");
  await page.getByLabel("Full Name").fill("Test User");
  await page.getByLabel("Nationality").selectOption("EG");
  await page.getByLabel("ID Number").fill("TEST-002");
  await page.getByPlaceholder("Enter phone number").fill("1001234567");
  await page.getByLabel("Email", { exact: false }).fill("test@example.com");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/\/documents$/);
  const inputs = page.locator("input[type=file]");
  await inputs.first().setInputFiles({
    name: "invalid.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("test"),
  });
  await expect(page.locator("[role=alert]").first()).toBeVisible();
  for (let i = 0; i < 3; i++)
    await inputs.nth(i).setInputFiles({
      name: `sample-${i}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n test"),
    });
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(
    page.getByText("Migration Test Agency", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("sample-0.pdf", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Preview demo submission" }).click();
  await expect(page.getByRole("status")).toContainText(
    "No account was created",
  );
  await page.goBack();
  await expect(page.getByText("sample-0.pdf", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/company$/);
});

test("authentication and recovery validation never submit network credentials", async ({
  page,
}) => {
  const writes: { url: string; body: string }[] = [];
  page.on("request", (request) => {
    if (!["GET", "HEAD"].includes(request.method())) {
      writes.push({ url: request.url(), body: request.postData() ?? "" });
    }
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.locator("#username")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByLabel("User Name", { exact: true }).fill("test-user");
  await page.getByLabel("Password", { exact: true }).fill("ExamplePass123!");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.locator("#password")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    page.getByText("Your credentials have not been sent.", { exact: false }),
  ).toBeVisible();
  for (const route of ["/forgot-password", "/verify-otp", "/reset-password"]) {
    await page.goto(route);
    await page.locator("button[type=submit]").click();
    await expect(page.locator("[role=alert]").first()).toBeVisible();
    await expect(page.locator("meta[name=robots]")).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
  }
  for (const request of writes) {
    // Staging's Cloudflare proxy injects performance telemetry; the app does not.
    const url = new URL(request.url);
    expect(url.origin).toBe(new URL(page.url()).origin);
    expect(url.pathname).toBe("/cdn-cgi/rum");
    expect(request.url + request.body).not.toContain("test-user");
    expect(request.url + request.body).not.toContain("ExamplePass123!");
  }
});

test("key screens pass automated accessibility checks and generate review screenshots", async ({
  page,
}) => {
  for (const [name, route] of [
    ["home", "/"],
    ["hotel", "/hotels/eastern-al-montazah"],
    ["search", "/search"],
    ["login", "/login"],
    ["company", "/register/agency/company"],
  ]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations, route).toEqual([]);
    await page.screenshot({
      path: `test-results/${name}-desktop.png`,
      fullPage: true,
    });
  }
});

test("booking filters, date validation and result limits", async ({ page }) => {
  await page.goto("/bookings");
  await page
    .getByRole("combobox", { name: "Results", exact: true })
    .selectOption("2");
  await expect(page.locator("article")).toHaveCount(2);
  await page
    .getByRole("combobox", { name: "Sort by", exact: true })
    .selectOption("oldest");
  await page.getByLabel("Select Date From").fill("2026-12-10");
  await page.getByLabel("Select Date To").fill("2026-12-01");
  await page.getByRole("button", { name: "Search bookings" }).click();
  await expect(
    page.getByText("End date must not precede start date."),
  ).toBeVisible();
  await page.getByRole("button", { name: /Reset/ }).click();
  await page.getByPlaceholder("Booking Number").fill("NO-SUCH-BOOKING");
  await page.getByRole("button", { name: "Search bookings" }).click();
  await expect(page.locator("article")).toHaveCount(0);
});

test("OTP multi-digit entry and reset mismatch validation remain frontend-only", async ({
  page,
}) => {
  await page.goto("/verify-otp");
  await page.getByRole("textbox", { name: "Digit 1 of 4" }).fill("1234");
  await expect(page.getByRole("textbox", { name: "Digit 4 of 4" })).toHaveValue(
    "4",
  );
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("not");
  await page.goto("/reset-password");
  await page.getByLabel("Password", { exact: true }).fill("ExamplePass123!");
  await page
    .getByLabel("Confirm Password", { exact: true })
    .fill("DifferentPass123!");
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByText("Passwords must match.")).toBeVisible();
  await page
    .getByLabel("Confirm Password", { exact: true })
    .fill("ExamplePass123!");
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your password has not been changed.",
  );
});
