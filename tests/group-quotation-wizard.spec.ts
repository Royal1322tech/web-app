import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { visit } from "./helpers/demo-login";
import { selectLanguage } from "./helpers/header";
import { fillGroupContact, fillGroupTrip, groupContact, groupTrip } from "./helpers/group-quotation";

// The step's short fade finishes first, so contrast is read from the settled colours.
const axe = async (page: Page) => {
  await page.locator(".wizard-step:not([hidden])").evaluate((step) => Promise.all(step.getAnimations().map((animation) => animation.finished)));
  return new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
};
const next = (page: Page) => page.getByRole("button", { name: "Next step", exact: true });
const stepHeading = (page: Page) => page.locator(".wizard-step:not([hidden]) h2");

test.describe("group quotation wizard", () => {
  test("every existing field exists, in the right step, with its required rules", async ({ page }) => {
    await visit(page, "/group-quotation");
    for (const id of ["destination", "start", "end", "passengers", "rooms"]) await expect(page.locator(`#enquiry-${id}`)).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(3);
    await expect(page.getByRole("radio", { name: "Hotels and transportation" })).toBeChecked();
    for (const id of ["name", "email", "agency", "subject", "message"]) await expect(page.locator(`#enquiry-${id}`)).toBeHidden();

    await next(page).click();
    await expect(stepHeading(page)).toContainText("Step 1 of 3");
    for (const message of ["Enter a destination or route.", "Choose today or a future date.", "Choose an end date on or after departure.", "Enter a whole number from 1 to 5000."]) await expect(page.getByText(message, { exact: true })).toBeVisible();
    await expect(page.locator("#enquiry-destination")).toHaveAttribute("aria-describedby", "enquiry-destination-error");
    await expect(page.locator("#enquiry-destination")).toHaveCSS("border-top-color", "rgb(171, 37, 62)");
    await expect(page.locator("#enquiry-destination")).toBeFocused();

    // Rooms stays optional, but its rule still applies when it is filled.
    await page.locator("#enquiry-rooms").fill("0");
    await fillGroupTrip(page);
    await expect(page.getByText("Enter a whole number from 1 to 1000.", { exact: true })).toBeVisible();
    await page.locator("#enquiry-rooms").fill("");
    await next(page).click();

    await expect(stepHeading(page)).toContainText("Group & Contact");
    await expect(stepHeading(page)).toBeFocused();
    await next(page).click();
    for (const message of ["Enter your name.", "Enter a valid email.", "Enter your agency name.", "Use at least 10 characters."]) await expect(page.getByText(message, { exact: true })).toBeVisible();
    await expect(page.locator("#enquiry-subject")).toHaveValue("Group quotation request");
    await page.locator("#enquiry-subject").fill("");
    await next(page).click();
    await expect(page.getByText("Enter a subject.", { exact: true })).toBeVisible();
  });

  test("Back and the progress indicator keep every value, and later steps can't be skipped to", async ({ page }) => {
    await visit(page, "/group-quotation");
    await expect(page.getByRole("button", { name: "Back", exact: true })).toHaveCount(0);
    await expect(page.locator(".wizard-progress button")).toHaveCount(0);
    await page.locator("#enquiry-rooms").fill("6");
    await page.getByRole("radio", { name: "Transportation", exact: true }).check();
    await fillGroupTrip(page);
    await expect(page.locator('.wizard-progress li[aria-current="step"]')).toContainText("Group & Contact");
    await page.locator("#enquiry-name").fill(groupContact.name);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(stepHeading(page)).toBeFocused();
    await expect(page.locator("#enquiry-destination")).toHaveValue(groupTrip.destination);
    await expect(page.locator("#enquiry-rooms")).toHaveValue("6");
    await expect(page.getByRole("radio", { name: "Transportation", exact: true })).toBeChecked();
    await next(page).click();
    await expect(page.locator("#enquiry-name")).toHaveValue(groupContact.name);
    await page.locator(".wizard-progress button").first().click();
    await expect(page.locator("#enquiry-start")).toHaveValue(groupTrip.start);
  });

  test("Enter in a field neither submits nor changes step, and steppers change the counts", async ({ page }) => {
    await visit(page, "/group-quotation");
    await page.locator("#enquiry-destination").fill("Luxor");
    await page.locator("#enquiry-destination").press("Enter");
    await expect(stepHeading(page)).toContainText("Step 1 of 3");
    await expect(page.locator(".field-error")).toHaveCount(0);
    await page.getByRole("button", { name: "Increase Passengers" }).click();
    await page.getByRole("button", { name: "Increase Passengers" }).click();
    await expect(page.locator("#enquiry-passengers")).toHaveValue("2");
    await page.getByRole("button", { name: "Decrease Passengers" }).click();
    await page.getByRole("button", { name: "Decrease Passengers" }).click();
    await expect(page.locator("#enquiry-passengers")).toHaveValue("1");

    await fillGroupTrip(page);
    await page.locator("#enquiry-name").press("Enter");
    await expect(stepHeading(page)).toContainText("Step 2 of 3");
    // New lines remain possible in the message.
    await page.locator("#enquiry-message").fill("First line");
    await page.locator("#enquiry-message").press("Enter");
    await page.locator("#enquiry-message").pressSequentially("Second line");
    await expect(page.locator("#enquiry-message")).toHaveValue("First line\nSecond line");
    await expect(stepHeading(page)).toContainText("Step 2 of 3");
  });

  test("review is accurate, edit returns and keeps data, and the preview follows edits", async ({ page }) => {
    await visit(page, "/group-quotation");
    await page.locator("#enquiry-rooms").fill("7");
    await page.getByRole("radio", { name: "Hotels", exact: true }).check();
    await fillGroupTrip(page);
    await fillGroupContact(page);
    const review = page.locator(".wizard-review");
    await expect(stepHeading(page)).toContainText("Review & Save");
    for (const value of ["Luxor", "12", "7", "Hotels", groupContact.name, groupContact.email, groupContact.agency, groupContact.subject, groupContact.message]) await expect(review).toContainText(value);
    await expect(review).toContainText(/Nov 20, 2030.*Nov 22, 2030/);

    await page.getByRole("button", { name: "Review request" }).click();
    await expect(page.getByRole("heading", { name: "Request ready — not sent yet" })).toBeVisible();

    await page.getByRole("button", { name: "Edit trip details" }).click();
    await expect(stepHeading(page)).toContainText("Trip Details");
    await expect(page.locator("#enquiry-passengers")).toHaveValue("12");
    await page.locator("#enquiry-destination").fill("Aswan");
    await next(page).click();
    await next(page).click();
    await expect(review).toContainText("Aswan");
    await expect(review).not.toContainText("Luxor");
    // Editing withdrew the earlier preview, so stale details can't be saved.
    await expect(page.getByRole("button", { name: "Save request" })).toHaveCount(0);
    await page.getByRole("button", { name: "Edit contact details" }).click();
    await expect(page.locator("#enquiry-name")).toHaveValue(groupContact.name);
    await next(page).click();
    await page.getByRole("button", { name: "Edit message" }).click();
    await expect(page.locator("#enquiry-message")).toHaveValue(groupContact.message);
  });

  for (const [locale, width, rooms] of [["en", 1440, "7"], ["ar", 390, "7"]] as const) {
    test(`the whole journey in ${locale} at ${width}px reaches the same request, once, with exact details`, async ({ page, context }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      const writes: string[] = [];
      page.on("request", (request) => { if (request.method() !== "GET") writes.push(request.url()); });
      await page.setViewportSize({ width, height: 900 });
      await visit(page, "/group-quotation");
      await selectLanguage(page, locale);
      if (locale === "ar") await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await page.locator("#enquiry-rooms").fill(rooms);
      expect((await axe(page)).violations).toEqual([]);
      await fillGroupTrip(page);
      await expect(page.locator(".wizard-step:not([hidden]) h2")).toBeFocused();
      expect((await axe(page)).violations).toEqual([]);
      await fillGroupContact(page);
      expect((await axe(page)).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await page.locator(".wizard-actions button[type=submit]").click();
      const save = page.locator(".wizard-preview button");
      await save.dblclick();
      await expect(page.locator(".group-saving")).toBeVisible();
      await expect(page.locator(".group-saving__ring")).toBeInViewport();
      await expect(page.locator(".group-wizard")).toBeHidden();
      const result = page.locator('.group-result[data-result="saved"]');
      await expect(result).toBeVisible();
      const reference = (await result.locator(".group-result__reference strong").textContent())!;
      await result.locator(".group-result__reference button").click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(reference);
      await expect(result.locator('.group-result__actions a[href="/"]')).toBeVisible();
      await result.locator('.group-result__actions a[href="/group-requests"]').click();
      const rows = page.locator("tbody tr").filter({ hasText: "GRP-LOCAL-" });
      await expect(rows).toHaveCount(1);
      await expect(rows).toContainText(reference);
      await rows.locator("a").click();
      await expect(page.locator(".group-detail__head")).toContainText(reference);
      for (const value of [groupTrip.destination, groupTrip.passengers, rooms, groupContact.name, groupContact.email, groupContact.agency, groupContact.subject, groupContact.message]) await expect(page.locator(".group-detail")).toContainText(value);
      expect(writes).toEqual([]);
    });
  }

  test("help content and its links stay available", async ({ page }) => {
    await visit(page, "/group-quotation");
    const help = page.locator(".wizard-help");
    await expect(help).toContainText("Please do not enter payment details or identity documents");
    for (const [name, href] of [["General agency enquiry", "/contact"], ["Explore hotels", "/search"], ["Explore car rentals", "/car-rental"], ["My Group Requests", "/group-requests"]]) await expect(help.getByRole("link", { name })).toHaveAttribute("href", href);
  });

  test("reduced motion removes step animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await visit(page, "/group-quotation");
    await expect(page.locator(".wizard-step:not([hidden])")).toHaveCSS("animation-name", "none");
  });

  for (const width of [390, 768, 1024, 1440, 1920]) {
    for (const locale of ["en", "ar"] as const) {
      test(`every step fits ${width}px in ${locale} with large touch targets`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await visit(page, "/group-quotation");
        await selectLanguage(page, locale);
        const fits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
        await fits();
        await fillGroupTrip(page);
        await fits();
        await fillGroupContact(page);
        await fits();
        for (const button of await page.locator(".wizard-actions button").all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      });
    }
  }
});
