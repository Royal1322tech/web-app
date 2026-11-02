import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { visit } from "./helpers/demo-login";
import { selectLanguage } from "./helpers/header";

const activeIndex = (page: Page, slides: string) =>
  page.locator(slides).evaluateAll((items) => items.findIndex((item) => item.getAttribute("data-active") === "true"));

/** The time between two slide changes. */
async function measureInterval(page: Page, slides: string) {
  const start = await activeIndex(page, slides);
  await expect.poll(() => activeIndex(page, slides), { timeout: 9000, intervals: [50] }).not.toBe(start);
  const from = Date.now();
  const current = await activeIndex(page, slides);
  await expect.poll(() => activeIndex(page, slides), { timeout: 9000, intervals: [50] }).not.toBe(current);
  return Date.now() - from;
}

test.describe("hero carousels", () => {
  test("Home shows 6 distinct images about every 4500ms, loads only what it needs and can pause", async ({ page }) => {
    await visit(page, "/");
    const slides = "[data-slide]";
    await expect(page.locator(slides)).toHaveCount(6);
    // The first image and at most the next one: never all six.
    expect(await page.locator(`${slides} img`).count()).toBeLessThanOrEqual(2);
    const interval = await measureInterval(page, slides);
    expect(interval).toBeGreaterThan(4200);
    expect(interval).toBeLessThan(5000);

    const pause = page.getByRole("button", { name: "Pause image rotation" });
    await pause.click();
    const paused = await activeIndex(page, slides);
    await page.waitForTimeout(5500);
    expect(await activeIndex(page, slides)).toBe(paused);
    await expect(page.locator(`${slides}[data-active="true"]`)).toHaveAttribute("data-motion", "false");

    const play = page.getByRole("button", { name: "Play image rotation" });
    await expect(play).toBeFocused();
    await page.keyboard.press("Enter");
    await expect.poll(() => activeIndex(page, slides), { timeout: 7000 }).not.toBe(paused);

    await expect.poll(async () => {
      const sources = await page.locator(`${slides} img`).evaluateAll((images) => images.map((image) => image.getAttribute("src")));
      return new Set(sources).size === sources.length;
    }).toBe(true);
  });

  test("Car Rental rotates about every 4000ms without shifting and can pause", async ({ page }) => {
    await visit(page, "/car-rental");
    const hero = page.locator(".rental-hero--carousel");
    const before = await hero.boundingBox();
    const interval = await measureInterval(page, ".rental-hero__slide");
    expect(interval).toBeGreaterThan(3700);
    expect(interval).toBeLessThan(4500);
    expect(await hero.boundingBox()).toEqual(before);
    await page.getByRole("button", { name: "Pause image rotation" }).click();
    const paused = await activeIndex(page, ".rental-hero__slide");
    await page.waitForTimeout(4800);
    expect(await activeIndex(page, ".rental-hero__slide")).toBe(paused);
  });

  for (const path of ["/", "/car-rental"]) {
    test(`reduced motion on ${path} shows one still image and no control`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await visit(page, path);
      await expect(page.getByRole("button", { name: /image rotation/ })).toHaveCount(0);
      const slides = path === "/" ? "[data-slide]" : ".rental-hero__slide";
      await page.waitForTimeout(5000);
      expect(await activeIndex(page, slides)).toBe(0);
      await expect(page.locator(`${slides} img`)).toHaveCount(1);
    });
  }

  test("the first hero image is preloaded and requested only once, using the phone crop on phones", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await visit(page, "/search");
    const requests: string[] = [];
    page.on("request", (request) => { if (request.url().includes("/optimized/")) requests.push(request.url()); });
    await page.goto("/");
    await expect(page.locator('[data-slide="0"] img')).toBeVisible();
    await expect.poll(() => page.locator('[data-slide="0"] img').evaluate((image) => (image as HTMLImageElement).currentSrc)).toContain("-phone");
    const first = await page.locator('[data-slide="0"] img').evaluate((image) => (image as HTMLImageElement).currentSrc);
    await expect(page.locator('link[rel="preload"][as="image"]')).toHaveAttribute("href", new URL(first).pathname);
    expect(requests.filter((url) => url === first)).toHaveLength(1);
  });
});

test.describe("contact", () => {
  for (const locale of ["en", "ar"] as const) {
    test(`every invalid field shows the shared error border in ${locale}`, async ({ page }) => {
      await visit(page, "/contact");
      await selectLanguage(page, locale);
      await page.locator("form button[type=submit]").click();
      for (const id of ["name", "email", "subject", "phone", "message"]) {
        const field = page.locator(`#enquiry-${id}`);
        await expect(field).toHaveAttribute("aria-invalid", "true");
        await expect(field).toHaveCSS("border-top-color", "rgb(171, 37, 62)");
        await expect(page.locator(`#enquiry-${id}-error`)).toBeVisible();
      }
      await expect(page.locator("#enquiry-name")).toBeFocused();
    });
  }

  test("the Arabic email hint follows the page while typed addresses stay left-to-right", async ({ page }) => {
    await visit(page, "/contact");
    await selectLanguage(page, "ar");
    const email = page.locator("#enquiry-email");
    await expect(email).toHaveCSS("direction", "rtl");
    await email.fill("agent@example.com");
    await expect(email).toHaveCSS("direction", "ltr");
  });

  test("the primary action is Royal Blue and direct contact details are unchanged", async ({ page }) => {
    await visit(page, "/contact");
    await expect(page.getByRole("button", { name: "Prepare enquiry" })).toHaveCSS("background-color", "rgb(14, 77, 146)");
    const card = page.getByRole("complementary");
    await expect(card.locator('a[href="https://wa.me/201070724143"]')).toContainText("+20 01070724143");
    await expect(card.locator('a[href="mailto:royal.travel@royalvacation.online"]')).toContainText("royal.travel@royalvacation.online");
    await expect(page.locator("#enquiry-name")).toHaveAttribute("autocomplete", "name");
    await expect(page.locator("#enquiry-email")).toHaveAttribute("autocomplete", "email");
    await expect(page.locator("#enquiry-agency")).toHaveAttribute("autocomplete", "organization");
  });

  test("phones reach WhatsApp and email in the first screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await visit(page, "/contact");
    const quick = page.getByRole("navigation", { name: "Contact directly" });
    for (const link of [quick.getByRole("link", { name: "WhatsApp" }), quick.getByRole("link", { name: "Email" })]) {
      await expect(link).toBeInViewport();
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(quick).toBeHidden();
  });

  test("send actions carry the enquiry to the visitor's own app and never claim delivery or contact a server", async ({ page }) => {
    const posts: string[] = [];
    page.on("request", (request) => { if (request.method() !== "GET") posts.push(request.url()); });
    await visit(page, "/contact");
    await expect(page.getByRole("link", { name: "Send via WhatsApp" })).toHaveCount(0);
    await page.locator("#enquiry-name").fill("Demo Traveller");
    await page.locator("#enquiry-email").fill("demo@example.com");
    await page.locator("#enquiry-agency").fill("Sample & Co");
    await page.locator("#enquiry-subject").fill("Partnership question");
    await page.locator("#enquiry-phone").fill("1001234567");
    await page.locator("#enquiry-message").fill("A fictional enquiry, line one.");
    await page.getByRole("button", { name: "Prepare enquiry" }).click();

    const status = page.getByRole("status");
    await expect(status).toContainText("Local preview ready — not sent");
    await expect(status).toContainText("You must complete sending there");
    await expect(status).toContainText("does not send or store your enquiry");
    await expect(status).not.toContainText(/delivered|sent successfully|received/i);

    const whatsapp = page.getByRole("link", { name: "Send via WhatsApp" });
    await expect(whatsapp).toHaveAttribute("target", "_blank");
    const whatsappUrl = new URL((await whatsapp.getAttribute("href"))!);
    expect(whatsappUrl.origin + whatsappUrl.pathname).toBe("https://wa.me/201070724143");
    const text = whatsappUrl.searchParams.get("text")!;
    for (const part of ["Demo Traveller", "demo@example.com", "Sample & Co", "+20 1001234567", "Partnership question", "A fictional enquiry, line one."]) expect(text).toContain(part);

    const email = (await page.getByRole("link", { name: "Send via Email" }).getAttribute("href"))!;
    expect(email.startsWith("mailto:royal.travel@royalvacation.online?")).toBe(true);
    const query = new URLSearchParams(email.split("?")[1]);
    expect(query.get("subject")).toBe("Partnership question");
    expect(query.get("body")).toContain("Sample & Co");

    // Editing invalidates the prepared text, so the actions disappear until it is prepared again.
    await page.locator("#enquiry-message").fill("Changed message for the preview.");
    await expect(whatsapp).toHaveCount(0);
    expect(posts).toEqual([]);
  });
});

test.describe("mobile hotel search", () => {
  const query = `/search?destination=Alexandria&checkIn=2030-11-20&checkOut=2030-11-23&rooms=${encodeURIComponent(JSON.stringify([{ adults: 2, childAges: [] }]))}`;

  test("folds to a summary, brings results up and keeps the search state", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await visit(page, query);
    const edit = page.getByRole("button", { name: "Edit search" });
    await expect(edit).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#destination")).toBeHidden();
    await expect(page.getByText("Alexandria", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("2 guests, 1 room")).toBeVisible();
    await page.evaluate(() => scrollTo(0, 0));
    expect((await page.locator("article").first().boundingBox())!.y).toBeLessThan(844);

    await edit.focus();
    await page.keyboard.press("Enter");
    const close = page.getByRole("button", { name: "Close search" });
    await expect(close).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#destination")).toHaveValue("Alexandria");
    await expect(page.locator("#check-in")).toHaveValue("2030-11-20");
    await page.keyboard.press("Tab");
    await expect(page.locator("#destination")).toBeFocused();

    await page.locator("#destination").selectOption("Cairo");
    await page.locator("#hotel-search button[type=submit]").click();
    await expect(page).toHaveURL(/destination=Cairo/);
    await expect(page.getByRole("button", { name: "Edit search" })).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByText("Cairo", { exact: true }).first()).toBeVisible();
  });

  test("hotel details fold the form too and show the gallery in the first screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await visit(page, "/hotels/eastern-al-montazah");
    await page.evaluate(() => scrollTo(0, 0));
    await expect(page.locator("#check-in")).toBeHidden();
    await page.getByRole("button", { name: "Edit search" }).click();
    await expect(page.locator("#check-in")).toBeVisible();
    await expect(page.getByRole("button", { name: "Close search" })).toBeVisible();
  });

  test("desktop keeps the full form and shows no summary", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await visit(page, query);
    await expect(page.locator("#destination")).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit search" })).toBeHidden();
  });
});

test.describe("states and bugs from the audit", () => {
  test("Wallet status pills stay on one line at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await visit(page, "/wallet");
    const badges = page.locator("table .status-badge");
    expect(await badges.count()).toBeGreaterThan(0);
    for (const badge of await badges.all()) {
      await expect(badge).toHaveCSS("white-space", "nowrap");
      expect((await badge.boundingBox())!.height).toBeLessThan(36);
    }
  });

  test("the empty search offers a working Reset Search", async ({ page }) => {
    await visit(page, "/search");
    await page.locator("#hotel-filters input").first().fill("no hotel has this name");
    await page.locator("#hotel-filters input").first().press("Enter");
    const reset = page.getByRole("button", { name: "Reset Search" });
    await expect(reset).toBeVisible();
    await reset.click();
    await expect(reset).toHaveCount(0);
    expect(await page.locator("article").count()).toBeGreaterThan(0);
  });

  for (const locale of ["en", "ar"] as const) {
    test(`the not-found page is branded and localized in ${locale}`, async ({ page }) => {
      await visit(page, "/");
      await selectLanguage(page, locale);
      await page.goto("/no-such-page");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(locale === "en" ? "Page not found" : "الصفحة غير موجودة");
      await expect(page).toHaveTitle(locale === "en" ? "Page not found | Royal Vacation" : "الصفحة غير موجودة | Royal Vacation");
      await expect(page.locator("header")).toHaveCount(1);
      await expect(page.locator("footer")).toHaveCount(1);
      await page.getByRole("link", { name: locale === "en" ? "Return home" : "العودة إلى الرئيسية" }).click();
      await expect(page).toHaveURL(/\/$/);
    });
  }

  test("signed-out visitors on an unknown address still go to the welcome page", async ({ page }) => {
    await page.goto("/no-such-page");
    await expect(page).toHaveURL(/\/welcome/);
  });

  test("date fields show a visible focus ring", async ({ page }) => {
    await visit(page, "/search");
    await page.locator("#check-in").focus();
    await expect(page.locator("#check-in")).toHaveCSS("outline-style", "solid");
    expect(parseFloat(await page.locator("#check-in").evaluate((input) => getComputedStyle(input).outlineWidth))).toBeGreaterThanOrEqual(2);
  });

  test("the voucher tables can be scrolled by keyboard", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await visit(page, "/bookings/DEMO-1001/voucher");
    const region = page.locator('.voucher__table-wrap[aria-labelledby="voucher-rooms"]');
    await expect(region).toHaveRole("region");
    await expect(region).toHaveAttribute("tabindex", "0");
  });

  test("Car Rental service cards use responsive images", async ({ page }) => {
    await visit(page, "/car-rental");
    for (const image of await page.locator(".rental-service-card img").all()) await expect(image).toHaveAttribute("srcset", /\d+w/);
  });
});

test.describe("axe", () => {
  for (const width of [390, 1440]) {
    test(`audited routes have no WCAG A or AA violations at ${width}px`, async ({ page }) => {
      test.setTimeout(120000);
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/welcome", "/register/agency/company"]) {
        await page.goto(path);
        // Logo entrance animations finish first, so contrast is read from the settled colours.
        await page.waitForTimeout(2000);
        expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
      }
      for (const path of ["/account/settings", "/bookings/DEMO-1001/voucher", "/contact", "/no-such-page", "/search"]) {
        await visit(page, path);
        await page.waitForTimeout(800);
        expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).exclude(".leaflet-container").analyze()).violations).toEqual([]);
      }
    });
  }
});
