import { expect, test } from "@playwright/test";
import { visit } from "./helpers/demo-login";

const search = "/search?destination=Sharm%20El%20Sheikh&nationality=EG&checkIn=2030-11-20&checkOut=2030-11-23&rooms=%5B%7B%22adults%22%3A2%2C%22childAges%22%3A%5B%5D%7D%5D";

test("hotel result keeps Compare and provides a validated, honest Reduce Price request", async ({ page }) => {
  test.skip(Boolean(process.env.VITE_PRICE_REDUCTION_REQUESTS_ENDPOINT?.trim()), "This test covers the missing-endpoint fallback.");
  await page.setViewportSize({ width: 1440, height: 960 });
  await visit(page, search);
  const card = page.locator('article[class*="resultCard"]').filter({ hasText: "Royal Azure Resort" });
  const compare = card.getByRole("button", { name: "Compare" });
  await expect(compare).toBeVisible();
  await compare.click();
  const selectedCompare = card.getByRole("button", { name: "Selected" });
  await expect(selectedCompare).toHaveAttribute("aria-pressed", "true");

  const reduce = card.getByRole("button", { name: "Reduce Price" });
  await expect(reduce).toBeVisible();
  const compareBox = await selectedCompare.boundingBox();
  const reduceBox = await reduce.boundingBox();
  expect(compareBox && reduceBox && reduceBox.y).toBeGreaterThan(compareBox?.y ?? 0);
  await reduce.click();

  const dialog = page.getByRole("dialog", { name: "Request a Better Price" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Royal Azure Resort");
  await expect(dialog).toContainText("2030-11-20");
  await expect(dialog).toContainText("$92.00");
  await expect(dialog.getByLabel(/Agency name/)).toHaveValue("Horizon Travel — Demo Agency");
  await expect(dialog.getByLabel(/Agent name/)).toHaveValue("Alex Morgan");
  await expect(dialog.getByLabel(/Email address/)).toHaveValue("partner@example.com");

  await dialog.getByRole("button", { name: "Submit Request" }).click();
  await expect(dialog.getByText("Enter the requested price.")).toBeVisible();
  await dialog.getByLabel(/Requested nightly price/).fill("92");
  await dialog.getByRole("button", { name: "Submit Request" }).click();
  await expect(dialog.getByText("Requested price must be lower than the current nightly price.")).toBeVisible();
  await dialog.getByLabel(/Requested nightly price/).fill("85.50");
  await dialog.getByRole("button", { name: "Submit Request" }).click();
  await expect(dialog.getByRole("status")).toContainText("Online submission is not available yet");
  await expect(dialog.getByRole("status")).toContainText("Your information has not been sent");
  await expect(dialog.getByLabel(/Requested nightly price/)).toHaveValue("85.50");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(reduce).toBeFocused();
});

test("Reduce Price dialog fits a mobile Arabic RTL viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.addInitScript(() => localStorage.setItem("royal-vacation.locale", "ar"));
  await visit(page, search);
  const reduce = page.getByRole("button", { name: "اطلب سعراً أقل" }).first();
  await reduce.click();
  const dialog = page.getByRole("dialog", { name: "اطلب سعراً أفضل" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel(/السعر المطلوب لليلة/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
