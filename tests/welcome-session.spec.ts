import { visit, submitDemoLogin, logout } from "./helpers/demo-login";
import { openHeaderTools } from "./helpers/header";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [375, 1440]) {
  for (const locale of ["en", "ar"] as const) {
    test(`welcome and explicit demo session at ${width}px ${locale}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      if (locale === "ar") await page.getByRole("button", { name: "العربية" }).click();
      await expect(page.locator("header, footer")).toHaveCount(0);
      const account = () => page.getByRole("button", { name: locale === "en" ? "Account menu" : "قائمة الحساب", exact: true, includeHidden: true });
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        locale === "en" ? "Your Journey Starts Here" : "رحلتك تبدأ من هنا",
      );
      const photo = page.locator(".auth-page--welcome .travel-image");
      await expect(photo).toBeVisible();
      await expect(photo).toHaveAttribute("src", "/images/welcome/resort-aerial.jpg");
      const imageBox = (await photo.boundingBox())!;
      const contentBox = (await page
        .locator(".welcome-content")
        .boundingBox())!;
      const cards = page.locator(".account-card");
      const first = (await cards.nth(0).boundingBox())!;
      const second = (await cards.nth(1).boundingBox())!;
      if (width > 800) {
        const shell = (await page
          .locator(".auth-page--welcome")
          .boundingBox())!;
        expect(imageBox.width / shell.width).toBeCloseTo(0.45, 2);
        expect(imageBox.height).toBeCloseTo(shell.height, 0);
        expect(first.y).toBeCloseTo(second.y, 0);
      } else {
        expect(imageBox.y + imageBox.height).toBeLessThanOrEqual(
          contentBox.y + 1,
        );
        expect(second.y).toBeGreaterThan(first.y);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width + 1);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: `test-results/welcome-${locale}-${width}.png`,
        fullPage: true,
      });
      await page.locator('a[href="/register/agency"]').click();
      await expect(page).toHaveURL(/\/register\/agency\/company$/);
      await page.goBack();
      await page.locator('a[href="/login"]').click();
      await expect(page).toHaveURL(/\/login$/);
      await submitDemoLogin(page);
      await expect(page).toHaveURL(/\/$/);
      await visit(page, "/agency");
      await expect(
        page.getByRole("heading", { name: "Horizon Travel — Demo Agency" }),
      ).toBeVisible();
      await openHeaderTools(page);
      await expect(account()).toHaveAttribute("aria-expanded", "false");
      for (const path of [
        "/transactions",
        "/notifications",
        "/agency",
        "/wallet",
      ]) {
        await page.locator(`.workspace-nav a[href="${path}"]`).click();
        await expect(page).toHaveURL(new RegExp(`${path}$`));
        await expect(page.locator(".demo-session-gate")).toHaveCount(0);
      }
      await openHeaderTools(page);
      await account().click();
      await page.locator('header a[href="/profile"]').click();
      await expect(account()).toHaveAttribute("aria-expanded", "false");
      await expect(page).toHaveURL(/\/profile$/);
      await page
        .getByRole("button", {
          name: locale === "en" ? "Sign Out" : "تسجيل الخروج",
          exact: true,
        })
        .click();
      await expect(page).toHaveURL(/\/welcome$/);
      await page.goBack();
      await expect(page.locator(".welcome-content")).toBeVisible();
      await expect(page.locator("header, footer, .workspace")).toHaveCount(0);
    });
  }
}

test("private demo screens require login and refresh preserves access", async ({ page }) => {
  for (const path of ["/agency", "/agency/edit", "/wallet", "/notifications", "/transactions", "/verify-email"]) {
    await page.goto(path);
    await expect(page.locator(".welcome-content")).toBeVisible();
    await expect(page.locator("header, footer, .workspace")).toHaveCount(0);
    await page.locator('a[href="/login"]').click();
    await submitDemoLogin(page);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await page.reload();
    await expect(page.locator(".workspace").first()).toBeVisible();
    if (path === "/wallet") {
      // Wallet intentionally has no account workspace bar; sign out from the header account menu.
      await logout(page);
    } else {
      await page.locator(".workspace-nav").getByRole("button", { name: "Sign Out", exact: true }).click();
    }
    await expect(page.locator(".welcome-content")).toBeVisible();
  }
});

test("homepage SVG introduction settles without layout shift and does not replay", async ({
  page,
}) => {
  await visit(page, "/");
  const logo = page.locator("header .brand-logo");
  await expect(logo).toHaveClass(/brand-logo--homepage-intro/);
  // Let the existing page entrance settle before measuring logo-only movement.
  await page.locator(".route-entrance").evaluate(async (el) => {
    await Promise.all(el.getAnimations().map((a) => a.finished));
  });
  const initial = await logo.boundingBox();
  await expect(page.locator("header .brand-plane")).toHaveCSS(
    "animation-name",
    "homepage-plane-flight",
  );
  await page.locator("header").evaluate(async (el) => {
    await Promise.all(
      el.getAnimations({ subtree: true }).map((a) => a.finished),
    );
  });
  expect(await logo.boundingBox()).toEqual(initial);
  await expect(page.locator("header .brand-waves")).toHaveCSS(
    "transform",
    "none",
  );
  const finalPlane = await page.locator("header .brand-plane").boundingBox();
  const header = await page.locator("header").boundingBox();
  await openHeaderTools(page);
  await page.getByRole("button", { name: /Account menu|قائمة الحساب/ }).click();
  await page.locator('header a[href="/profile"]').click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(
    page.getByRole("heading", { name: "My Profile", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(logo).toBeVisible();
  // Dropdown navigation can restore a scrolled position; compare the same viewport.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator(".route-entrance").evaluate(async (el) => {
    await Promise.all(el.getAnimations().map((a) => a.finished));
  });
  await expect(logo).not.toHaveClass(/brand-logo--homepage-intro/);
  const staticPlane = await page.locator("header .brand-plane").boundingBox();
  expect(finalPlane!.x).toBeCloseTo(staticPlane!.x, 0);
  expect(finalPlane!.y).toBeCloseTo(staticPlane!.y, 0);
  expect(await page.locator("header").boundingBox()).toEqual(header);
});

test("homepage logo has a static reduced-motion fallback", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await visit(page, "/");
  for (const selector of [
    ".brand-emblem",
    ".brand-plane",
    ".brand-waves",
    ".brand-wordmark",
  ]) {
    await expect(page.locator(`header ${selector}`)).toHaveCSS(
      "animation-name",
      "none",
    );
  }
  await expect(page.locator("header .brand-plane")).toHaveCSS(
    "offset-path",
    "none",
  );
});
