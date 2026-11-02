import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { detectLogoFormat, LOGO_MAX_BYTES, logoFileIssue } from "../src/features/agency-registration/lib/company-logo";
import { companySchema } from "../src/features/agency-registration/schemas/registration.schema";
import { visit } from "./helpers/demo-login";
import { attachCompanyLogo, attachIdDocument, chooseOption, samplePdf, samplePngLogo } from "./helpers/registration";

const image = async (format: "png" | "jpeg" | "webp", width = 40, height = 20) =>
  sharp({ create: { width, height, channels: 3, background: "#0e4d92" } })[format]().toBuffer();

const input = (page: Page) => page.locator("#company-logo");
const error = (page: Page) => page.locator("#company-logo-error");
const preview = (page: Page) => page.locator(".company-logo__frame img");
const next = (page: Page) => page.getByRole("button", { name: "Next", exact: true }).click();

async function fillCompanyWithoutLogo(page: Page) {
  await page.getByLabel("Name of Company").fill("Logo Test Agency");
  await page.getByLabel("Number of Employees").fill("12");
  await chooseOption(page, "company-country", "Egypt");
  await chooseOption(page, "company-city", "Alexandria");
  await page.getByLabel("Commercial Registration Number").fill("CR-77");
  await page.getByLabel("Address of Company").fill("Alexandria");
}

test.describe("logo rules", () => {
  const file = (bytes: number, type: string) => new File([new Uint8Array(bytes)], "logo", { type });
  const company = { name: "A", employeeCount: "1", country: "EG", city: "EG-cairo", registrationNumber: "1", address: "A" };

  test("checks required, type and the exact 2MB limit", () => {
    expect(logoFileIssue(null)).toBe("Company logo is required.");
    expect(logoFileIssue(file(10, "image/svg+xml"))).toContain("Unsupported");
    expect(logoFileIssue(file(LOGO_MAX_BYTES, "image/png"))).toBeUndefined();
    expect(logoFileIssue(file(LOGO_MAX_BYTES + 1, "image/png"))).toContain("larger than 2MB");
    expect(logoFileIssue(file(0, "image/png"))).toContain("empty");
  });

  test("recognizes formats by content", async () => {
    expect(detectLogoFormat(await image("png"))).toBe("png");
    expect(detectLogoFormat(await image("jpeg"))).toBe("jpeg");
    expect(detectLogoFormat(await image("webp"))).toBe("webp");
    expect(detectLogoFormat(new TextEncoder().encode("%PDF-1.4 not an image"))).toBeUndefined();
  });

  test("the step guard's schema fails without a logo", () => {
    expect(companySchema.safeParse({ ...company, logo: null }).success).toBe(false);
    expect(companySchema.safeParse({ ...company, logo: file(10, "image/png") }).success).toBe(true);
  });
});

test.describe("Step 1", () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, "/register/agency/company");
  });

  test("a missing logo blocks Step 2; a valid one allows it and clears the error", async ({ page }) => {
    await fillCompanyWithoutLogo(page);
    await next(page);
    await expect(error(page)).toHaveText("Company logo is required.");
    await expect(page).toHaveURL(/\/company$/);
    await expect(input(page)).toBeFocused();
    await expect(input(page)).toHaveAttribute("aria-invalid", "true");
    // Enter in a text field submits the same form, and is blocked the same way.
    await page.getByLabel("Address of Company").press("Enter");
    await expect(page).toHaveURL(/\/company$/);
    await attachCompanyLogo(page);
    await expect(error(page)).toHaveCount(0);
    await next(page);
    await expect(page).toHaveURL(/\/contact$/);
  });

  test("direct navigation cannot skip the logo", async ({ page }) => {
    await fillCompanyWithoutLogo(page);
    await page.evaluate(() => {
      history.pushState({}, "", "/register/agency/contact");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    await expect(page).toHaveURL(/\/company$/);
    await expect(page.getByLabel("Name of Company")).toHaveValue("Logo Test Agency");
  });

  test("rejects unsupported types, oversized files and disguised files", async ({ page }) => {
    await input(page).setInputFiles(samplePdf("brochure.pdf"));
    await expect(error(page)).toContainText("Unsupported file type");
    await input(page).setInputFiles({ name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
    await expect(error(page)).toContainText("Unsupported file type");
    await input(page).setInputFiles({ name: "large.png", mimeType: "image/png", buffer: Buffer.concat([await image("png"), Buffer.alloc(LOGO_MAX_BYTES)]) });
    await expect(error(page)).toContainText("larger than 2MB");
    // A PDF renamed to .png, and a real PNG header with no image behind it.
    await input(page).setInputFiles({ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("%PDF-1.4 renamed file") });
    await expect(error(page)).toContainText("not a valid image");
    await input(page).setInputFiles({ name: "broken.png", mimeType: "image/png", buffer: (await image("png")).subarray(0, 12) });
    await expect(error(page)).toContainText("not a valid image");
    await expect(preview(page)).toHaveCount(0);
    await fillCompanyWithoutLogo(page);
    await next(page);
    await expect(page).toHaveURL(/\/company$/);
    await expect(error(page)).toHaveText("Company logo is required.");
  });

  test("accepts PNG, JPG and WEBP, with a working preview", async ({ page }) => {
    for (const [format, name] of [["png", "a.png"], ["jpeg", "b.jpg"], ["webp", "c.webp"]] as const) {
      await input(page).setInputFiles({ name, mimeType: `image/${format}`, buffer: await image(format) });
      await expect(page.locator(".company-logo__details strong")).toHaveText(name);
      await expect.poll(() => preview(page).evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(40);
      await expect(preview(page)).toHaveAttribute("src", /^blob:/);
    }
  });

  test("Change and Remove work, and a rejected replacement keeps the current logo", async ({ page }) => {
    await attachCompanyLogo(page, samplePngLogo("first.png"));
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Change Logo" }).click();
    await (await chooser).setFiles({ name: "second.png", mimeType: "image/png", buffer: await image("png") });
    await expect(page.locator(".company-logo__details strong")).toHaveText("second.png");

    await input(page).setInputFiles(samplePdf("wrong.pdf"));
    await expect(error(page)).toContainText("Unsupported file type");
    await expect(page.locator(".company-logo__details strong")).toHaveText("second.png");
    await input(page).setInputFiles({ name: "third.png", mimeType: "image/png", buffer: await image("png") });
    await expect(error(page)).toHaveCount(0);

    await page.getByRole("button", { name: "Remove Logo" }).click();
    await expect(preview(page)).toHaveCount(0);
    await expect(error(page)).toHaveText("Company logo is required.");
    await expect(input(page)).toBeFocused();
    await expect(page.getByText("Upload Company Logo")).toBeVisible();
  });

  test("each replaced logo's object URL is released", async ({ page }) => {
    await page.evaluate(() => {
      const revoked: string[] = [];
      (window as unknown as { revoked: string[] }).revoked = revoked;
      const original = URL.revokeObjectURL.bind(URL);
      URL.revokeObjectURL = (url) => { revoked.push(url); original(url); };
    });
    await attachCompanyLogo(page, samplePngLogo("first.png"));
    const first = await preview(page).getAttribute("src");
    await input(page).setInputFiles(samplePngLogo("second.png"));
    await expect(preview(page)).not.toHaveAttribute("src", first!);
    expect(await page.evaluate(() => (window as unknown as { revoked: string[] }).revoked)).toContain(first);
  });

  test("the upload area is keyboard-reachable and passes accessibility checks", async ({ page }) => {
    await page.getByLabel("Address of Company").focus();
    await page.keyboard.press("Tab");
    await expect(input(page)).toBeFocused();
    await expect(page.getByLabel(/Company Logo/)).toHaveAttribute("aria-required", "true");
    await next(page);
    const results = await new AxeBuilder({ page }).include(".company-logo").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
});

test("the logo persists between steps and Review shows the correct one", async ({ page }) => {
  await visit(page, "/register/agency/company");
  await fillCompanyWithoutLogo(page);
  await attachCompanyLogo(page, { name: "agency-mark.png", mimeType: "image/png", buffer: await image("png") });
  await next(page);
  await expect(page).toHaveURL(/\/contact$/);
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await expect(page.locator(".company-logo__details strong")).toHaveText("agency-mark.png");
  await expect.poll(() => preview(page).evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(40);
  await next(page);

  await page.getByLabel("Full Name").fill("Test Contact");
  await page.getByLabel("Nationality").selectOption("EG");
  await page.getByLabel("ID Number").fill("ID-100");
  await attachIdDocument(page);
  await page.getByPlaceholder("Enter phone number").fill("1001234567");
  await page.getByLabel("Email", { exact: false }).fill("contact@example.test");
  await next(page);
  await page.getByLabel("Corporate", { exact: true }).check();
  await page.locator("#document-commercialRegistration").setInputFiles(samplePdf("cr.pdf"));
  await page.locator("#document-taxCertificate").setInputFiles(samplePdf("tax.pdf"));
  await next(page);
  await expect(page).toHaveURL(/\/review$/);

  const review = page.locator(".review-logo");
  await expect(review).toContainText("Company Logo");
  await expect(review).toContainText("Provided");
  await expect(review).toContainText("agency-mark.png");
  await expect.poll(() => review.locator("img").evaluate((element: HTMLImageElement) => [element.naturalWidth, element.naturalHeight])).toEqual([40, 20]);
  await page.getByRole("button", { name: "Preview demo submission" }).click();
  await expect(page.getByText("No account was created and no information or documents were sent.")).toBeVisible();

  // Removing the logo makes the registration invalid until another is added.
  for (let step = 0; step < 3; step += 1) await page.getByRole("link", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Remove Logo" }).click();
  await next(page);
  await expect(page).toHaveURL(/\/company$/);
  await page.evaluate(() => {
    history.pushState({}, "", "/register/agency/review");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page).toHaveURL(/\/company$/);
});

for (const [width, locale, heading] of [[1440, "en", "Company Logo"], [768, "ar", "شعار الشركة"], [390, "ar", "شعار الشركة"], [390, "en", "Company Logo"]] as const) {
  test(`layout has no overflow at ${width}px ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript((value) => localStorage.setItem("royal-vacation.locale", value), locale);
    await visit(page, "/register/agency/company");
    await expect(page.locator(".company-logo label")).toContainText(heading);
    await next(page);
    if (locale === "ar") await expect(error(page)).toHaveText("شعار الشركة مطلوب.");
    await attachCompanyLogo(page);
    await expect(page.locator(".company-logo__actions button")).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });
}
