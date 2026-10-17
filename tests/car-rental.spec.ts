import { selectLanguage } from "./helpers/header";
import { visit } from "./helpers/demo-login";
import { openHeaderTools } from "./helpers/header";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const width of [375, 1440])
  test(`Car Rental remains discoverable and preserves hotel search at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await visit(page, "/");
    await page.locator("#destination").selectOption("Alexandria");
    const carTab = page.getByRole("tab", { name: "Car Rental", exact: true });
    await carTab.click();
    await expect(carTab).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("heading", {
        name: "Explore Car Rentals",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator("#hotels-panel")).toBeHidden();
    await carTab.focus();
    await page.keyboard.press("Home");
    await expect(
      page.getByRole("tab", { name: "Hotels", exact: true }),
    ).toBeFocused();
    await expect(page.locator("#destination")).toHaveValue("Alexandria");
    await page.keyboard.press("End");
    await expect(carTab).toBeFocused();
    await page
      .getByRole("link", { name: "Explore Car Rental", exact: true })
      .click();
    await expect(page).toHaveURL(/\/car-rental$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Car Rental for your clients",
    );
    await expect(
      page.getByText(
        "Browse self-drive vehicles at illustrative daily rates, or prepare an enquiry for chauffeur and transfer services.",
        { exact: true },
      ),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBeTruthy();
    if (width < 1000)
      await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", { name: "Car Rental", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    if (width < 1000)
      await page.getByRole("button", { name: "Close navigation" }).click();
    await openHeaderTools(page);
    await selectLanguage(page, "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "تأجير السيارات لعملائك",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBeTruthy();
    await page.emulateMedia({ reducedMotion: "reduce" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    await page.screenshot({
      path: `test-results/car-rental-ar-${width}.png`,
      fullPage: true,
    });
  });
