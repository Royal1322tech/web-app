import { expect, test } from "@playwright/test";
import { visit } from "./helpers/demo-login";

const endpointConfigured = Boolean(process.env.VITE_PRICE_REDUCTION_REQUESTS_ENDPOINT?.trim());
const search = "/search?destination=Sharm%20El%20Sheikh&nationality=EG&checkIn=2030-11-20&checkOut=2030-11-23&rooms=%5B%7B%22adults%22%3A2%2C%22childAges%22%3A%5B%5D%7D%5D";

async function prepareRequest(page: Parameters<typeof visit>[0]) {
  await visit(page, search);
  const card = page.locator('article[class*="resultCard"]').filter({ hasText: "Royal Azure Resort" });
  await card.getByRole("button", { name: "Reduce Price" }).click();
  const dialog = page.getByRole("dialog", { name: "Request a Better Price" });
  await dialog.getByLabel(/Requested nightly price/).fill("85.50");
  await dialog.getByRole("button", { name: "Submit Request" }).click();
  return dialog;
}

test("accepted backend response confirms request and carries the validated request payload", async ({ page }) => {
  test.skip(!endpointConfigured, "Set a test-only Reduce Price endpoint to exercise the API contract.");
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>(resolve => { releaseResponse = resolve; });
  let observedPayload: unknown;
  let requestCount = 0;
  let notifyRequest!: () => void;
  const requestObserved = new Promise<void>(resolve => { notifyRequest = resolve; });
  await page.route("**/api/price-reduction-requests", async route => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": new URL(page.url()).origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" } });
      return;
    }
    requestCount += 1;
    observedPayload = route.request().postDataJSON();
    notifyRequest();
    await responseGate;
    await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ reference: "PRR-TEST-001" }) });
  });

  const dialog = await prepareRequest(page);
  const submit = dialog.getByRole("button", { name: "Submitting…" });
  await requestObserved;
  await expect(submit).toBeDisabled();
  expect(requestCount).toBe(1);
  releaseResponse();
  await expect(dialog.getByRole("heading", { name: "Request Submitted" })).toBeVisible();
  await expect(dialog.getByText("PRR-TEST-001")).toBeVisible();
  expect(observedPayload).toMatchObject({
    hotelId: "royal-azure-resort",
    checkIn: "2030-11-20",
    checkOut: "2030-11-23",
    currentPrice: 92,
    requestedPrice: 85.5,
    currency: "USD",
    agencyName: "Horizon Travel — Demo Agency",
    agentName: "Alex Morgan",
    agentEmail: "partner@example.com",
    priceComparisonEligible: true,
  });
});

test("failed backend response keeps the entered request available for retry", async ({ page }) => {
  test.skip(!endpointConfigured, "Set a test-only Reduce Price endpoint to exercise the API contract.");
  let requestCount = 0;
  await page.route("**/api/price-reduction-requests", async route => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": new URL(page.url()).origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" } });
      return;
    }
    requestCount += 1;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Unavailable" }) });
  });
  const dialog = await prepareRequest(page);
  await expect(dialog.getByRole("alert")).toContainText("Your request could not be submitted");
  await expect(dialog.getByLabel(/Requested nightly price/)).toHaveValue("85.50");
  expect(requestCount).toBe(1);
});
