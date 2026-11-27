import { expect, test, type Page } from "@playwright/test";
import { visit } from "./helpers/demo-login";
import { selectLanguage, closeHeaderMenu } from "./helpers/header";
import { pickDate } from "./helpers/date-picker";

// Targeted UI/UX refinements: passenger & trip enquiry, the mobile menu and the group quotation.
// Presentation only: no request is sent and every existing rule still applies.
const localToday = (page: Page) => page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
const noHorizontalScroll = async (page: Page, width: number) => expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width}px`).toBeLessThanOrEqual(width);

test.describe("passenger & trip enquiry", () => {
  test("travel date uses the calendar (no past days), counters respect their limits, and nothing is sent", async ({ page }) => {
    const writes: string[] = [];
    page.on("request", (request) => { if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) writes.push(request.url()); });
    await visit(page, "/contact?subject=airport-transfers");
    const today = await localToday(page);

    await page.locator("#chauffeur-date").click();
    const panel = page.locator('[data-date-picker="chauffeur-date"] [data-date-panel]');
    await expect(panel.locator("button[data-date]").first()).toHaveAttribute("data-date", today);
    await page.keyboard.press("Escape");
    await pickDate(page, "chauffeur-date", "2030-11-20");
    await expect(page.locator("#chauffeur-date")).toHaveAttribute("data-value", "2030-11-20");

    const passengers = page.getByLabel("Passengers", { exact: true });
    const bags = page.getByLabel("Bags", { exact: true });
    await passengers.fill("1");
    await expect(page.getByRole("button", { name: "Fewer passengers" })).toBeDisabled();
    await page.getByRole("button", { name: "More passengers" }).click();
    await expect(passengers).toHaveValue("2");
    await bags.fill("0");
    await expect(page.getByRole("button", { name: "Fewer bags" })).toBeDisabled();
    await page.getByRole("button", { name: "More bags" }).click();
    await expect(bags).toHaveValue("1");
    await passengers.fill("5000");
    await expect(page.getByRole("button", { name: "More passengers" })).toBeDisabled();

    // Wide fields: pickup instructions and destination span the whole row.
    const row = (await page.getByLabel("Destination", { exact: true }).locator("xpath=ancestor::div[contains(@class,'rental-form-fields')]").boundingBox())!;
    const destination = (await page.getByLabel("Destination", { exact: true }).boundingBox())!;
    expect(Math.abs(destination.width - row.width)).toBeLessThanOrEqual(2);

    const whatsapp = page.locator(".chauffeur-contact a");
    await expect(whatsapp).toHaveAttribute("href", "https://wa.me/201070724143");
    await expect(page.getByText(/sent online|booking confirmed/i)).toHaveCount(0);
    expect(writes).toEqual([]);
  });

  for (const locale of ["en", "ar"]) {
    test(`the enquiry fits every width without horizontal scroll (${locale})`, async ({ page }) => {
      await visit(page, "/contact?subject=airport-transfers");
      if (locale === "ar") { await selectLanguage(page, "ar"); await closeHeaderMenu(page); }
      for (const width of [320, 375, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await noHorizontalScroll(page, width);
        if (width < 768) await expect(page.locator("#chauffeur-date")).toHaveCSS("font-size", "16px");
      }
    });
  }
});

test.describe("mobile navigation menu", () => {
  for (const locale of ["en", "ar"]) {
    test(`labelled controls, outline icons and 44px targets on phones; desktop unchanged (${locale})`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await visit(page, "/");
      if (locale === "ar") { await selectLanguage(page, "ar"); await closeHeaderMenu(page); }
      for (const width of [320, 390, 430, 768, 1024]) {
        await page.setViewportSize({ width, height: 844 });
        await page.locator('header button[aria-controls~="home-navigation"]').click();
        const nav = page.locator("#home-navigation");
        const links = nav.locator("a");
        await expect(links.first()).toBeVisible();
        // Only the current page is highlighted.
        await expect(nav.locator("a[aria-current]")).toHaveCount(1);
        for (const link of await links.all()) {
          await expect(link.locator("svg")).toBeVisible();
          expect(Math.round((await link.boundingBox())!.height), `${width}px`).toBeGreaterThanOrEqual(44);
        }
        const notifications = page.getByRole("link", { name: /^(Notifications|الإشعارات)$/ });
        await expect(notifications).toContainText(locale === "ar" ? "الإشعارات" : "Notifications");
        for (const control of [notifications, page.locator("header .rv-popover-trigger").last()]) {
          const box = (await control.boundingBox())!;
          expect(Math.round(box.height), `${width}px`).toBeGreaterThanOrEqual(44);
          expect(box.x + box.width, `${width}px`).toBeLessThanOrEqual(width);
        }
        await noHorizontalScroll(page, width);
        await closeHeaderMenu(page);
      }

      // Desktop keeps its existing text-only navigation and icon-only tools.
      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(page.locator("header nav a svg").first()).toBeHidden();
      const bell = page.getByRole("link", { name: /^(Notifications|الإشعارات)$/ });
      expect((await bell.innerText()).trim()).toBe("");
    });
  }
});

test.describe("group quotation", () => {
  test("departure from today, end on or after departure, counters within their limits", async ({ page }) => {
    await visit(page, "/group-quotation");
    const today = await localToday(page);
    await page.locator("#enquiry-start").click();
    await expect(page.locator('[data-date-picker="enquiry-start"] button[data-date]').first()).toHaveAttribute("data-date", today);
    await page.keyboard.press("Escape");
    await pickDate(page, "enquiry-start", "2030-11-20");
    await page.locator("#enquiry-end").click();
    const end = page.locator('[data-date-picker="enquiry-end"] [data-date-panel]');
    await expect(end.locator("button[data-date]").first()).toHaveAttribute("data-date", "2030-11-20");
    await page.keyboard.press("Escape");

    await expect(page.locator("#enquiry-destination")).toHaveAttribute("placeholder", /Cairo/);
    await page.locator("#enquiry-rooms").fill("1000");
    await page.locator("#enquiry-rooms ~ button").click();
    await expect(page.locator("#enquiry-rooms")).toHaveValue("1000");
    await page.locator("#enquiry-passengers").fill("5000");
    await page.locator("#enquiry-passengers ~ button").click();
    await expect(page.locator("#enquiry-passengers")).toHaveValue("5000");
    await expect(page.getByRole("note")).toContainText(/Online sending isn't available yet/);
  });

  for (const locale of ["en", "ar"]) {
    test(`every step fits from 320px to 1920px (${locale})`, async ({ page }) => {
      await visit(page, "/group-quotation");
      if (locale === "ar") { await selectLanguage(page, "ar"); await closeHeaderMenu(page); }
      for (const width of [320, 390, 768, 1024, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await noHorizontalScroll(page, width);
        if (width < 768) for (const id of ["#enquiry-destination", "#enquiry-start", "#enquiry-passengers"]) await expect(page.locator(id)).toHaveCSS("font-size", "16px");
      }
    });
  }
});
