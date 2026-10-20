import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { selectLanguage } from "./helpers/header";
import { visit } from "./helpers/demo-login";
import { openHeaderTools } from "./helpers/header";

for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  test(`contact complaint layout and footer app availability fit ${width}px in English and Arabic`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await visit(page, "/contact");
    for (const locale of ["en", "ar"] as const) {
      await openHeaderTools(page);
      await selectLanguage(page, locale);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(locale === "en" ? "Contact Us" : "تواصل معنا");
      await expect(page.getByRole("heading", { name: locale === "en" ? "Customer Support" : "دعم العملاء" })).toBeVisible();
      await expect(page.getByRole("heading", { name: locale === "en" ? "Submit a Complaint" : "تقديم شكوى" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);

      const support = page.getByRole("complementary");
      const form = page.locator("form");
      const supportBox = (await support.boundingBox())!;
      const formBox = (await form.boundingBox())!;
      if (width < 800) expect(formBox.y).toBeLessThan(supportBox.y);
      else expect(Math.abs(supportBox.y - formBox.y)).toBeLessThan(1);
      await expect(support.locator('a[href="mailto:royal.travel@royalvacation.online"]')).toBeVisible();
      await expect(support.locator('a[href="https://wa.me/201070724143"]')).toBeVisible();
      await expect(page.locator("footer")).toHaveCount(1);
      if ((width === 375 && locale === "en") || (width === 1440 && locale === "en")) {
        await page.screenshot({ path: `test-results/contact-${locale}-${width}.png`, fullPage: true });
      }
      if ((width === 375 && locale === "ar") || (width === 1440 && locale === "en")) {
        expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
      }

      await visit(page, "/");
      const apps = page.locator('footer section[aria-labelledby="footer-apps-title"]');
      await expect(apps.getByRole("heading", { name: locale === "en" ? "Mobile Experience" : "تجربة الهاتف المحمول" })).toBeVisible();
      await expect(apps.getByText(locale === "en" ? "Coming Soon" : "قريبًا", { exact: true })).toBeVisible();
      await expect(apps.locator("a, img")).toHaveCount(0);
      await visit(page, "/contact");
    }
  });
}

test("complaint validation and missing endpoint never show fake success or send data", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => { if (request.method() === "POST") requests.push(request.url()); });
  await visit(page, "/contact");
  await page.getByRole("button", { name: "Submit Complaint" }).click();
  await expect(page.getByText("Select a service type.")).toBeVisible();
  await expect(page.getByText("Enter a complaint title.")).toBeVisible();
  await expect(page.getByText("Describe your complaint.")).toBeVisible();
  await page.getByLabel("Service Type").selectOption("payment");
  await page.getByLabel("Booking ID (Optional)").fill("  BOOK-2048  ");
  await page.getByLabel("Complaint Title").fill("Payment was not reflected");
  await page.getByLabel("Details of Your Complaint").fill("The payment is not reflected in the booking summary.");
  await page.getByRole("button", { name: "Submit Complaint" }).click();
  await expect(page.getByRole("status")).toContainText("Online complaint submission is not available yet.");
  await expect(page.getByText(/Complaint Submitted/)).toHaveCount(0);
  expect(requests).toEqual([]);

  const support = page.getByRole("complementary");
  await expect(support.locator('a[href="https://wa.me/201070724143"]')).toHaveAttribute("target", "_blank");
  await expect(support.locator('a[href="mailto:royal.travel@royalvacation.online"]')).toBeVisible();

  await visit(page, "/group-quotation");
  await page.getByRole("button", { name: "Preview request", exact: true }).click();
  await expect(page.getByText("Enter your name.", { exact: true })).toBeVisible();
});
