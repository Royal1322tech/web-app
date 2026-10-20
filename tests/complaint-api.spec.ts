import { expect, test } from "@playwright/test";

const endpointConfigured = Boolean(process.env.VITE_COMPLAINTS_ENDPOINT);

test.describe("configured complaint submission contract", () => {
  test.skip(!endpointConfigured, "Run with VITE_COMPLAINTS_ENDPOINT and a local same-origin API base to exercise mocked responses.");

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/contact");
  });

  async function fillValidComplaint(page: import("@playwright/test").Page) {
    await page.getByLabel("Service Type").selectOption("hotel_booking");
    await page.getByLabel("Booking ID (Optional)").fill(" BOOK-2048 ");
    await page.getByLabel("Complaint Title").fill("Room not as described");
    await page.getByLabel("Details of Your Complaint").fill("The room features did not match the description provided.");
  }

  test("submits multipart data once and reports a backend-accepted reference", async ({ page }) => {
    let requests = 0;
    await page.route("**/api/complaints", async route => {
      requests++;
      const request = route.request();
      expect(request.method()).toBe("POST");
      expect(request.headers()["content-type"]).toContain("multipart/form-data");
      expect(request.postData()).toContain("hotel_booking");
      expect(request.postData()).toContain("BOOK-2048");
      expect(request.postData()).toContain("Room not as described");
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ reference: "CMP-1007" }) });
    });
    await fillValidComplaint(page);
    await page.getByRole("button", { name: "Submit Complaint" }).click();
    await expect(page.getByRole("status")).toContainText("Complaint Submitted");
    await expect(page.getByRole("status")).toContainText("CMP-1007");
    expect(requests).toBe(1);
  });

  test("maps backend validation errors and retains the complaint for correction", async ({ page }) => {
    await page.route("**/api/complaints", route => route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ errors: { title: ["This title needs clarification."] } }),
    }));
    await fillValidComplaint(page);
    await page.getByRole("button", { name: "Submit Complaint" }).click();
    await expect(page.getByText("This title needs clarification.")).toBeVisible();
    await expect(page.getByLabel("Complaint Title")).toHaveValue("Room not as described");
    await expect(page.getByLabel("Details of Your Complaint")).toHaveValue("The room features did not match the description provided.");
  });

  test("shows retry feedback after server and network failures without losing input", async ({ page }) => {
    await page.route("**/api/complaints", route => route.fulfill({ status: 500, body: "Unavailable" }));
    await fillValidComplaint(page);
    await page.getByRole("button", { name: "Submit Complaint" }).click();
    await expect(page.getByRole("alert")).toContainText("Your complaint could not be submitted.");
    await expect(page.getByLabel("Complaint Title")).toHaveValue("Room not as described");

    await page.unrouteAll();
    await page.route("**/api/complaints", route => route.abort());
    await page.getByRole("button", { name: "Submit Complaint" }).click();
    await expect(page.getByRole("alert")).toContainText("Your complaint could not be submitted.");
  });

  test("prevents duplicate submissions while the backend is pending", async ({ page }) => {
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    let requests = 0;
    await page.route("**/api/complaints", async route => {
      requests++;
      await pending;
      await route.fulfill({ status: 202, contentType: "application/json", body: "{}" });
    });
    await fillValidComplaint(page);
    const button = page.locator("form button[type=submit]");
    await button.click();
    await expect(button).toBeDisabled();
    await button.evaluate((element: HTMLButtonElement) => element.click());
    expect(requests).toBe(1);
    release();
    await expect(page.getByRole("status")).toContainText("Complaint Submitted");
  });

  test("rejects unsupported and oversized attachments before a request", async ({ page }) => {
    let requests = 0;
    page.on("request", request => { if (request.method() === "POST") requests++; });
    const file = page.getByLabel("Attach File (Optional)");
    await file.setInputFiles({ name: "script.txt", mimeType: "text/plain", buffer: Buffer.from("not allowed") });
    await fillValidComplaint(page);
    await page.getByRole("button", { name: "Submit Complaint" }).click();
    await expect(page.getByText("Attach a JPG, PNG, or PDF file.")).toBeVisible();
    expect(requests).toBe(0);

    await file.setInputFiles({ name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
    await page.getByRole("button", { name: "Submit Complaint" }).click();
    await expect(page.getByText("The file must be 5 MB or smaller.")).toBeVisible();
    expect(requests).toBe(0);
  });
});
