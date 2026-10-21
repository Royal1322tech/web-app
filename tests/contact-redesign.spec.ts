import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { selectLanguage } from "./helpers/header";
import { visit } from "./helpers/demo-login";
import { openHeaderTools } from "./helpers/header";

for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  test(`general contact layout and footer app availability fit ${width}px in English and Arabic`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await visit(page, "/contact");
    for (const locale of ["en", "ar"] as const) {
      await openHeaderTools(page);
      await selectLanguage(page, locale);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(locale === "en" ? "Contact Us" : "تواصل معنا");
      await expect(page.getByRole("heading", { name: locale === "en" ? "Contact Information" : "معلومات التواصل" })).toBeVisible();
      await expect(page.getByRole("button", { name: locale === "en" ? "Prepare enquiry" : "تجهيز الاستفسار" })).toBeVisible();
      await expect(page.getByRole("heading", { name: locale === "en" ? "Submit a Complaint" : "تقديم شكوى" })).toHaveCount(0);
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

test("general contact validation prepares only a local preview and never sends data", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => { if (request.method() === "POST") requests.push(request.url()); });
  await visit(page, "/contact");
  await page.getByRole("button", { name: "Prepare enquiry", exact: true }).click();
  await expect(page.getByText("Enter your name.", { exact: true })).toBeVisible();
  await expect(page.getByText("Enter a valid email.", { exact: true })).toBeVisible();
  await expect(page.getByText("Enter a subject.", { exact: true })).toBeVisible();
  await page.locator("#enquiry-name").fill("Demo Traveller");
  await page.locator("#enquiry-email").fill("demo@example.com");
  await page.locator("#enquiry-subject").fill("Partnership question");
  await page.locator("#enquiry-phone").fill("1001234567");
  await page.locator("#enquiry-message").fill("A fictional enquiry to preview locally.");
  await page.getByRole("button", { name: "Prepare enquiry", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Local preview ready — not sent");
  await expect(page.getByText(/Submitted|sent successfully/i)).toHaveCount(0);
  expect(requests).toEqual([]);

  const support = page.getByRole("complementary");
  await expect(support.locator('a[href="https://wa.me/201070724143"]')).toHaveAttribute("target", "_blank");
  await expect(support.locator('a[href="mailto:royal.travel@royalvacation.online"]')).toBeVisible();

  await visit(page, "/group-quotation");
  await page.getByRole("button", { name: "Preview request", exact: true }).click();
  await expect(page.getByText("Enter your name.", { exact: true })).toBeVisible();
});
