import { expect, test } from "@playwright/test";
import { submitDemoLogin } from "./helpers/demo-login";
import AxeBuilder from "@axe-core/playwright";

test("guests can reach and refresh the public general contact page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/login");
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Contact Us", exact: true }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole("heading", { name: "Contact Us", exact: true })).toBeVisible();
  await expect(page.locator("header > a[href='/login']")).toBeVisible();
  await expect(page.locator("header nav").getByRole("link", { name: "Home", exact: true })).toHaveCount(0);
  await expect(page.locator("header").getByRole("link", { name: "Partner With Us", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Contact Information" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Submit a Complaint" })).toHaveCount(0);
  await expect(page.locator("#enquiry-name")).toBeVisible();
  await expect(page.locator("#enquiry-email")).toBeVisible();
  await expect(page.locator("#enquiry-phone")).toBeVisible();
  await expect(page.locator("#enquiry-subject")).toBeVisible();
  await expect(page.locator("#enquiry-message")).toBeVisible();
  await expect(page.getByRole("link", { name: /Planning a group journey/ })).toHaveCount(0);
  await expect(page.locator("footer")).toHaveCount(1);
  await page.reload();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole("heading", { name: "Contact Us", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Prepare enquiry", exact: true }).click();
  await expect(page.getByText("Enter your name.", { exact: true })).toBeVisible();
  await page.locator("#enquiry-name").fill("Demo Traveller");
  await page.locator("#enquiry-email").fill("demo@example.com");
  await page.locator("#enquiry-subject").fill("Agency onboarding");
  await page.locator("#enquiry-phone").fill("1001234567");
  await page.locator("#enquiry-message").fill("A fictional enquiry to preview locally.");
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  await page.getByRole("button", { name: "Prepare enquiry", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Request ready — not sent yet");
  expect(requests).toEqual([]);
  await expect(page.getByRole("complementary").locator('a[href="https://wa.me/201070724143"]')).toBeVisible();
  await expect(page.getByRole("link", { name: "royal.travel@royalvacation.online" })).toHaveAttribute("href", "mailto:royal.travel@royalvacation.online");
});

test("public chauffeur enquiry links retain their service selection for guests", async ({ page }) => {
  for (const [subject, service] of [["airport-transfers", "Airport Transfers"], ["private-chauffeur", "Private Chauffeur"]]) {
    await page.goto(`/contact?subject=${subject}`);
    await expect(page).toHaveURL(new RegExp(`/contact\\?subject=${subject}$`));
    await expect(page.locator("header > a[href='/login']")).toBeVisible();
    await expect(page.locator("header nav").getByRole("link", { name: "Home", exact: true })).toHaveCount(0);
    await expect(page.locator(".rental-service-badge").first()).toHaveText(service);
    await page.reload();
    await expect(page.locator(".rental-service-badge").first()).toHaveText(service);
  }
});

test("authenticated visitors keep the application header and private routes stay protected", async ({ page }) => {
  await page.goto("/login");
  await submitDemoLogin(page);
  await page.goto("/contact");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Search", exact: true })).toBeVisible();
  await expect(page.locator("header").getByRole("button", { name: "Account menu" })).toBeVisible();
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Contact Us" }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole("heading", { name: "Contact Information" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Planning a group journey/ })).toHaveAttribute("href", "/group-quotation");
  await page.locator("header").getByRole("button", { name: "Account menu" }).click();
  await page.locator("header").getByRole("button", { name: "Sign Out", exact: true }).click();
  await page.goto("/bookings");
  await expect(page).toHaveURL(/\/welcome$/);
});

for (const width of [320, 375, 768, 1440]) {
  for (const locale of ["en", "ar"]) {
    test(`public contact fits ${width}px in ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 950 });
      await page.addInitScript(value => localStorage.setItem("royal-vacation.locale", value), locale);
      await page.goto("/contact");
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      await expect(page.getByRole("heading", { level: 1, name: locale === "en" ? "Contact Us" : "تواصل معنا" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
      if ((width === 1440 && locale === "en") || (width === 375 && locale === "ar")) {
        expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
      }
      if (width === 1440 && locale === "en") await page.screenshot({ path: "test-results/public-contact-1440.png", fullPage: true });
      if (width === 375 && locale === "ar") await page.screenshot({ path: "test-results/public-contact-375-ar.png" });
    });
  }
}
