import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { visit } from "./helpers/demo-login";
import { selectLanguage, closeHeaderMenu } from "./helpers/header";

for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  for (const locale of ["en", "ar"] as const) {
    test(`chauffeur enquiry preserves its distinct service flow ${width}px ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      const writes: string[] = [];
      page.on("request", request => { if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) writes.push(request.url()); });
      await visit(page, "/car-rental");
      await selectLanguage(page, locale);
      await closeHeaderMenu(page);
      await page.locator('.rental-service-card[href="/contact?subject=airport-transfers"]').click();
      await expect(page).toHaveURL(/contact\?subject=airport-transfers/);
      await expect(page.locator("header")).toBeVisible();
      await expect(page.locator("footer")).toHaveCount(0);
      await page.getByRole("button", { name: /Review enquiry|مراجعة الاستفسار/ }).click();
      await expect(page.getByRole("alert").first()).toBeVisible();
      await page.getByLabel(/^(Full Name|الاسم الكامل)$/).fill("Fictional Passenger");
      await page.getByLabel(/^(Email Address|البريد الإلكتروني)$/).fill("enquiry@example.test");
      await page.getByLabel(/^(Pickup location|مكان الاستلام)$/).fill("Cairo Airport");
      await page.getByLabel(/^(Travel date|تاريخ الرحلة)$/).fill("2030-11-20");
      await page.getByLabel(/^(Pickup time|وقت الاستلام)$/).fill("12:30");
      await page.getByLabel(/^(Destination|الوجهة)$/).fill("Cairo hotel");
      await page.getByLabel(/^(Passengers|المسافرون)$/).fill("3");
      await page.getByLabel(/^(Bags|الحقائب)$/).fill("2");
      await page.getByLabel(/Flight number|رقم الرحلة/).fill("EX123");
      await page.getByLabel(/^(Message|الرسالة)$/).fill("Fictional transfer enquiry only.");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: `test-results/chauffeur-passenger-${width}-${locale}.png`, fullPage: true });
      if (width === 1440 && locale === "en") {
        await page.getByLabel("Full Name", { exact: true }).fill("x".repeat(101));
        await page.getByRole("button", { name: "Review enquiry", exact: true }).click();
        await expect(page.getByLabel("Full Name", { exact: true })).toHaveAttribute("aria-invalid", "true");
        await page.getByLabel("Full Name", { exact: true }).fill("Fictional Passenger");
      }
      await page.getByRole("button", { name: /Review enquiry|مراجعة الاستفسار/ }).click();
      await expect(page.locator(".rental-enquiry-review")).toContainText("EX123");
      const preview = page.getByRole("button", { name: /Review enquiry|مراجعة الاستفسار/ });
      await expect(page.getByRole("heading", { name: /Cancellation Policy|سياسة الإلغاء/ })).toHaveCount(0);
      await expect(preview).toBeEnabled();
      await page.getByRole("button", { name: /Edit enquiry|تعديل الاستفسار/ }).click();
      await expect(page.getByLabel(/^(Full Name|الاسم الكامل)$/)).toHaveValue("Fictional Passenger");
      await page.getByRole("button", { name: /Review enquiry|مراجعة الاستفسار/ }).click();
      await expect(preview).toBeEnabled();
      if (width === 1440 || width === 320) expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
      await page.screenshot({ path: `test-results/chauffeur-review-${width}-${locale}.png`, fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await preview.click();
      await expect(page.getByRole("status")).toContainText(/not sent|لم تُرسل|لم يُرسل/);
      await expect(page.locator(".status-badge")).toHaveCount(0);
      expect(writes).toEqual([]);
    });
  }
}
