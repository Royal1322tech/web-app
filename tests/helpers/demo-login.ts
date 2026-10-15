import { expect, type Page } from "@playwright/test";
import { openHeaderTools } from "./header";

export async function submitDemoLogin(page: Page) {
  await page.getByLabel("Email", { exact: true }).fill("demo@royalvacation.test");
  await page.getByLabel("Password", { exact: true }).fill("Demo@12345");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.locator(".login-form, .welcome-content")).toHaveCount(0);
  await expect(page.locator("h1")).toBeVisible();
}

/** Exercise the real login UI; never inject a session or change app behavior. */
export async function visit(page: Page, path: string) {
  const publicPage = /^\/(welcome|login|forgot-password|verify-otp|reset-password|register)(\/|$)/.test(path);
  if (publicPage && page.url().startsWith("http")) {
    await page.goto("/agency");
    await expect(page.locator("h1")).toBeVisible();
    if (await page.locator(".workspace").count()) {
      await page.locator(".workspace-nav").getByRole("button", { name: /Sign Out|تسجيل الخروج/ }).click();
    }
  }
  await page.goto(path);
  await expect(page.locator("h1")).toBeVisible();
  if (!publicPage && await page.locator(".welcome-content").count()) {
    await page.locator('a[href="/login"]').click();
    await submitDemoLogin(page);
    await expect(page).toHaveURL(new RegExp(path === "/" ? "/$" : path.split("?")[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
}

export async function logout(page: Page) {
  await openHeaderTools(page);
  await page.getByRole("button", { name: /Account menu|قائمة الحساب/ }).click();
  await page.locator("header").getByRole("button", { name: /Sign Out|تسجيل الخروج/, exact: true }).click();
  await expect(page).toHaveURL(/\/welcome$/);
}
