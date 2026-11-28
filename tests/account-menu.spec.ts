import { selectLanguage } from "./helpers/header";
import { test, expect } from "@playwright/test";
import { visit } from "./helpers/demo-login";
import { openHeaderTools } from "./helpers/header";

for (const width of [320, 375, 768, 1440]) {
  for (const locale of ["en", "ar"]) {
    test(`single profile dropdown supports keyboard and dismissal at ${width}px ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await visit(page, "/");
      await openHeaderTools(page);
      await selectLanguage(page, locale);
      const name = locale === "en" ? "Account menu" : "قائمة الحساب";
      const trigger = page.getByRole("button", { name, exact: true });
      const panel = page.getByRole("region", { name, exact: true });
      await expect(trigger).toHaveCount(1);
      await expect(page.locator("header").getByText(/Demo account|حساب تجريبي/)).toHaveCount(0);
      await expect(trigger).toHaveText("");
      await expect(trigger.locator("svg")).toHaveCount(1);
      await trigger.click();
      await expect(panel).toBeVisible();
      const menuLinks = panel.getByRole("link");
      // 10 with Points (Finance, after Wallet).
      await expect(menuLinks).toHaveCount(10);
      await expect(panel.locator('a[href="/points"]')).toHaveCount(1);
      await expect(panel.getByRole("link").first()).toBeVisible();
      await expect(panel.locator('a[href="/agency"]')).toHaveCount(0);
      await expect(trigger).toHaveCSS("background-color", "rgb(217, 242, 238)");
      const bounds = (await panel.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      await page.keyboard.press("Escape");
      await expect(panel).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await page.keyboard.press("Enter");
      await page.keyboard.press("Tab");
      await expect(panel.getByRole("link").first()).toBeFocused();
      for (let index = 1; index < 10; index++) {
        await page.keyboard.press("Tab");
        await expect(panel.getByRole("link").nth(index)).toBeFocused();
      }
      await page.keyboard.press("Tab");
      await expect(panel.getByRole("button")).toBeFocused();
      await page.keyboard.press("Escape");
      await trigger.click();
      await page.mouse.click(2, 2);
      await expect(panel).toHaveCount(0);
      await openHeaderTools(page); // on phones and tablets the outside tap closes the whole menu
      await trigger.click();
      await panel.getByRole("button", { name: /Sign Out|تسجيل الخروج/ }).click();
      await expect(page).toHaveURL(/\/welcome$/);
      await page.goBack();
      await expect(page.locator("header")).toHaveCount(0);
      await expect(page.locator(".welcome-content")).toBeVisible();
    });
  }
}

test("profile dropdown preserves all account destinations and closes on selection", async ({ page }) => {
  await visit(page, "/");
  const routes = [
    ["My Profile", "/profile"],
    ["My Bookings", "/bookings"], ["My Rentals", "/car-rental/bookings"], ["My Tickets", "/tickets"],
    ["Wallet", "/wallet"], ["Transactions", "/transactions"],
    ["Account Settings", "/account/settings"], ["Account Settings", "/account/settings"],
  ];
  for (const [name, path] of routes) {
    await page.getByRole("button", { name: "Account menu", exact: true }).click();
    const panel = page.getByRole("region", { name: "Account menu", exact: true });
    const link = panel.getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("href", path);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(panel).toHaveCount(0);
  }
});
