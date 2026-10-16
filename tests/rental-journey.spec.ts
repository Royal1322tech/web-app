import { selectLanguage } from "./helpers/header";
import { visit } from "./helpers/demo-login";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openHeaderTools, closeHeaderMenu } from "./helpers/header";
async function chooseVehicle(page: Page) {
  await visit(page, "/car-rental/search");
  await page.getByLabel("Pickup date", { exact: true }).fill("2027-03-10");
  await page.getByLabel("Return date", { exact: true }).fill("2027-03-13");
  await page
    .getByRole("button", { name: "Search demo vehicles", exact: true })
    .click();
  await expect(page).toHaveURL(/start=2027-03-10/);
  await page
    .getByRole("link", { name: "View vehicle", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Select vehicle — demo", exact: true })
    .click();
  await expect(page.locator(".rental-summary")).toContainText("$135.00");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("link", { name: "Continue to driver information" })
    .click();
  await page
    .getByRole("button", { name: "Continue to review booking" })
    .click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await page.getByLabel("Driver name", { exact: true }).fill("Sample Driver");
  await page
    .getByLabel("Driver email", { exact: true })
    .fill("driver@example.com");
  await page
    .getByLabel("Driver phone", { exact: true })
    .fill("+20 100 000 0000");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Continue to review booking" })
    .click();
  await expect(page).toHaveURL(/car-rental\/review$/);
  await expect(page.getByRole("button", { name: "Continue to rental payment preview" })).toBeDisabled();
  await page.getByRole("checkbox", { name: /I have reviewed the cancellation/ }).check();
  await page.getByRole("link", { name: "Continue to rental payment preview" }).click();
}
for (const width of [375, 1440])
  test(`rental confirmation, modification and cancellation ${width}px`, async ({
    page,
  }) => {
    const writes: string[] = [];
    page.on("request", (r) => {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(r.method()))
        writes.push(r.url());
    });
    await page.setViewportSize({ width, height: 1000 });
    await chooseVehicle(page);
    await page.getByLabel("Rental demo outcome").selectOption("insufficient");
    await page.getByRole("button", { name: "Simulate rental payment" }).click();
    await expect(page.getByRole("alert")).toContainText("Insufficient credit");
    await page.getByLabel("Rental demo outcome").selectOption("confirmed");
    await page.getByRole("button", { name: "Simulate rental payment" }).click();
    await page.getByRole("button", { name: "Show rental outcome" }).click();
    await expect(page).toHaveURL(/car-rental\/bookings\/RENTAL-DEMO-/);
    await expect(page.locator(".status-badge")).toContainText("Confirmed");
    await expect(
      page.getByText("Sample Driver", { exact: true }),
    ).toBeVisible();
    const modify = page.getByRole("button", { name: "Modify demo rental" });
    await modify.click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Return date", { exact: true }).fill("2027-03-09");
    await dialog.getByRole("button", { name: "Save rental changes" }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await dialog.getByLabel("Return date", { exact: true }).fill("2027-03-15");
    await dialog.getByRole("button", { name: "Save rental changes" }).click();
    await expect(dialog).toBeHidden();
    await expect(modify).toBeFocused();
    await expect(page.locator(".rental-summary")).toContainText("$225.00");
    await page.screenshot({
      path: `test-results/rental-details-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Cancel demo rental" }).click();
    await dialog
      .getByRole("button", { name: "Confirm simulated cancellation" })
      .click();
    await expect(page.locator(".status-badge")).toContainText("Cancelled");
    await expect(
      page.getByRole("button", { name: "Modify demo rental" }),
    ).toHaveCount(0);
    await page.locator('.rental-nav a[href="/car-rental/bookings"]').click();
    await page.getByLabel("Rental status").selectOption("confirmed");
    await expect(
      page.getByRole("heading", { name: "No demo rentals" }),
    ).toBeVisible();
    await page.getByLabel("Rental status").selectOption("cancelled");
    await page.getByRole("link", { name: "View rental details" }).click();
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "Rental not available in this session",
      }),
    ).toBeVisible();
    expect(writes).toEqual([]);
  });
test("rental failure retry, pending status and Arabic navigation", async ({
  page,
}) => {
  await chooseVehicle(page);
  await page.getByLabel("Rental demo outcome").selectOption("failed");
  await page.getByRole("button", { name: "Simulate rental payment" }).click();
  await page.getByRole("button", { name: "Show rental outcome" }).click();
  await expect(page.locator(".status-badge")).toContainText("Failed");
  await page.getByRole("button", { name: "Retry rental simulation" }).click();
  await expect(page).toHaveURL(/car-rental\/review$/);
  await page.getByRole("checkbox", { name: /I have reviewed the cancellation/ }).check();
  await page.getByRole("link", { name: "Continue to rental payment preview" }).click();
  await page.getByLabel("Rental demo outcome").selectOption("pending");
  await page.getByRole("button", { name: "Simulate rental payment" }).click();
  await page.getByRole("button", { name: "Show rental outcome" }).click();
  await expect(page.locator(".status-badge")).toContainText("Pending");
  await openHeaderTools(page);
  await selectLanguage(page, "ar");
  await closeHeaderMenu(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "تفاصيل حجز التأجير",
  );
  await expect(
    page.getByRole("button", { name: "إلغاء التأجير التجريبي" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
test("rental results filters, unavailable selection, direct URLs and accessibility", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await visit(page,
    "/car-rental/search?pickup=Cairo&dropoff=Alexandria&start=2027-03-10&end=2027-03-13",
  );
  await page.getByLabel("Vehicle category").selectOption("economy");
  await page.getByLabel("Transmission", { exact: true }).selectOption("manual");
  await expect(
    page.getByRole("heading", { name: "No matching vehicles" }),
  ).toBeVisible();
  await page.getByLabel("Vehicle category").selectOption("van");
  await page.getByRole("link", { name: "View vehicle" }).click();
  await expect(
    page.getByRole("button", { name: "Unavailable — demo" }),
  ).toBeDisabled();
  await page.screenshot({
    path: "test-results/rental-unavailable.png",
    fullPage: true,
  });
  const routes = [
    "/car-rental/search",
    "/car-rental/vehicles/missing",
    "/car-rental/summary",
    "/car-rental/driver",
    "/car-rental/payment",
    "/car-rental/bookings",
    "/car-rental/bookings/missing",
  ];
  for (const route of routes) {
    await visit(page, route);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
  await chooseVehicle(page);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
