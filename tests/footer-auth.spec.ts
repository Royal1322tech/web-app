import { visit } from "./helpers/demo-login";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [375, 768, 1440]) {
  for (const locale of ["en", "ar"]) {
    test(`footer links, focus and layout ${width} ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript((value) => localStorage.setItem("royal-vacation.locale", value), locale);
      await visit(page, "/");
      const footer = page.locator("footer");
      await footer.scrollIntoViewIfNeeded();
      const links = footer.locator("nav a");
      await expect(links).toHaveCount(4);
      const paths = ["/car-rental", "/search", "/agency", "/welcome"];
      for (let i = 0; i < paths.length; i++) {
        const link = links.nth(i);
        await expect(link).toHaveAttribute("href", paths[i]);
        await expect(link.locator("svg")).toHaveAttribute("aria-hidden", "true");
        expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        // Login uses pointer input; enter keyboard modality for focus-visible checks.
        await page.keyboard.press("Tab");
        await link.focus();
        await expect(link).toHaveCSS("outline-style", "solid");
        await expect(link).toHaveCSS("color", "rgb(255, 213, 158)");
      }
      const logo = footer.locator('a[href="/"]');
      const plane = logo.locator(".brand-plane");
      await expect(plane).toHaveCSS("animation-name", "none");
      await logo.hover();
      await expect(plane).toHaveCSS("animation-name", "footer-plane-flight");
      await logo.evaluate(async (el) => {
        await Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished));
      });
      await expect(plane).toHaveCSS("transform", "none");
      const brandBox = (await logo.boundingBox())!;
      const navBox = (await footer.locator("nav").boundingBox())!;
      if (width >= 768) {
        expect(locale === "en" ? navBox.x > brandBox.x : navBox.x < brandBox.x).toBeTruthy();
      } else {
        expect(navBox.y).toBeGreaterThan(brandBox.y + brandBox.height);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect((await new AxeBuilder({ page }).include("footer").analyze()).violations).toEqual([]);
      await footer.screenshot({ path: `test-results/footer-${locale}-${width}.png` });
      await links.last().click();
      await expect(page).toHaveURL(/\/$/);
    });
  }
}

for (const path of ["/login", "/welcome", "/register/agency/company"]) {
  test(`auth logo entrance and static fallback ${path}`, async ({ page }) => {
    await visit(page, path);
    const logo = page.locator(".brand-logo--auth");
    await expect(logo).toBeVisible();
    await page.locator(".route-entrance").evaluate(async el => {
      await Promise.all(el.getAnimations().map(a => a.finished));
    });
    const before = await logo.boundingBox();
    await expect(logo.locator(".brand-plane")).toHaveCSS("animation-name", "homepage-plane-flight");
    await logo.evaluate(async el => {
      await Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished));
    });
    expect(await logo.boundingBox()).toEqual(before);
    const planeBox = await logo.locator(".brand-plane").boundingBox();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(logo.locator(".brand-plane")).toHaveCSS("animation-name", "none");
    await expect(logo.locator(".brand-plane")).toHaveCSS("offset-path", "none");
    const staticBox = (await logo.locator(".brand-plane").boundingBox())!;
    expect(staticBox.x).toBeCloseTo(planeBox!.x, 0);
    expect(staticBox.y).toBeCloseTo(planeBox!.y, 0);
  });
}

test("registration keeps its settled logo and company data between steps", async ({ page }) => {
  await visit(page, "/register/agency/company");
  const logo = page.locator(".brand-logo--auth");
  await logo.evaluate(async el => {
    await Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished));
    el.setAttribute("data-original-entry", "true");
  });
  await page.getByLabel("Name of Company").fill("Footer Test Agency");
  await page.getByLabel("Number of Employees").fill("12");
  await page.getByLabel("Country", { exact: false }).selectOption("EG");
  await page.getByLabel("Company Registration Number").fill("TEST-001");
  await page.getByLabel("Address of Company").fill("Alexandria");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(logo).toHaveAttribute("data-original-entry", "true");
  expect(await logo.evaluate(el => el.getAnimations({ subtree: true }).every(a => a.playState === "finished"))).toBeTruthy();
  await page.goBack();
  await expect(page.getByLabel("Name of Company")).toHaveValue("Footer Test Agency");
  await expect(logo).toHaveAttribute("data-original-entry", "true");
});

test("footer reduced motion stays static on hover and keyboard focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await visit(page, "/");
  const footer = page.locator("footer");
  const logo = footer.locator('a[href="/"]');
  await logo.hover();
  await page.keyboard.press("Tab");
  await logo.focus();
  await expect(logo.locator(".brand-plane")).toHaveCSS("animation-name", "none");
  await expect(logo.locator(".brand-flight-trail")).toHaveCSS("animation-name", "none");
  await expect(logo).toHaveCSS("outline-style", "solid");
});
