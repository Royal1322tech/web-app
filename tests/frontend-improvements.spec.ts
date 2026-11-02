import { test, expect, type Page } from "@playwright/test";
import { visit } from "./helpers/demo-login";
import { attachCompanyLogo, attachIdDocument, chooseOption, fillCompanyStep, samplePdf } from "./helpers/registration";
import { directionsUrl, haversineKm } from "../src/features/hotels/lib/geo";
import { businessTypes, requiredDocumentsFor } from "../src/features/agency-registration/data/business-types";
import { citiesForCountry, cityLabel } from "../src/features/agency-registration/data/locations";

async function contactStep(page: Page) {
  await page.getByLabel("Full Name").fill("Test Contact");
  await page.getByLabel("Nationality").selectOption("EG");
  await page.getByLabel("ID Number").fill("ID-100");
  await attachIdDocument(page, "passport.pdf");
  await page.getByPlaceholder("Enter phone number").fill("1001234567");
  await page.getByLabel("Email", { exact: false }).fill("contact@example.test");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/\/documents$/);
}

test.describe("company information", () => {
  test("uses the Commercial Registration Number label", async ({ page }) => {
    await visit(page, "/register/agency/company");
    await expect(page.getByLabel("Commercial Registration Number")).toBeVisible();
    await expect(page.getByText("Company Registration Number")).toHaveCount(0);
  });

  test("country and city search case-insensitively, depend on each other and reset", async ({ page }) => {
    await visit(page, "/register/agency/company");
    const country = page.locator("#company-country");
    const city = page.locator("#company-city");
    await expect(city).toBeDisabled();

    await country.fill("sAuDi");
    await expect(page.getByRole("option", { name: "Saudi Arabia" })).toBeVisible();
    await country.fill("zzzz");
    await expect(page.locator(".searchable-select__empty").filter({ visible: true })).toHaveText("No countries match your search.");

    await country.fill("egy");
    await country.press("ArrowDown");
    await country.press("ArrowUp");
    await country.press("Enter");
    await expect(country).toHaveValue("Egypt");
    await expect(city).toBeEnabled();

    await city.fill("ALEX");
    await expect(page.getByRole("option")).toHaveText(["Alexandria"]);
    await city.press("Enter");
    await expect(city).toHaveValue("Alexandria");

    // Cities from another country are not offered.
    await city.fill("Jeddah");
    await expect(page.locator(".searchable-select__empty").filter({ visible: true })).toHaveText("No cities match your search.");
    await city.press("Escape");
    await expect(city).toHaveValue("Alexandria");

    await chooseOption(page, "company-country", "Saudi Arabia");
    await expect(city).toHaveValue("");
    await chooseOption(page, "company-city", "jed");
    await expect(city).toHaveValue("Jeddah");
  });

  test("city is required and selections persist across steps", async ({ page }) => {
    await visit(page, "/register/agency/company");
    await page.getByLabel("Name of Company").fill("Required City Agency");
    await page.getByLabel("Number of Employees").fill("8");
    await chooseOption(page, "company-country", "Egypt");
    await page.getByLabel("Commercial Registration Number").fill("CR-1");
    await page.getByLabel("Address of Company").fill("Cairo");
    await attachCompanyLogo(page);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.locator("#company-city-error")).toHaveText("Select your company city.");
    await expect(page).toHaveURL(/\/company$/);

    await chooseOption(page, "company-city", "Cairo");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page).toHaveURL(/\/contact$/);
    await page.getByRole("link", { name: "Back", exact: true }).click();
    await expect(page.locator("#company-country")).toHaveValue("Egypt");
    await expect(page.locator("#company-city")).toHaveValue("Cairo");
  });

  test("location data uses stable IDs and localized labels", () => {
    const cities = citiesForCountry("AE");
    expect(cities.length).toBeGreaterThan(0);
    expect(new Set(cities.map(({ id }) => id)).size).toBe(cities.length);
    expect(cityLabel("EG", "EG-cairo", "ar")).toBe("القاهرة");
    expect(citiesForCountry("ZZ")).toEqual([]);
  });
});

test("ID document upload validates type and size, and can be replaced and removed", async ({ page }) => {
  await visit(page, "/register/agency/company");
  await fillCompanyStep(page, { name: "ID Test Agency", registration: "CR-2" });
  const input = page.locator("#contact-id-document");
  const error = page.locator("#contact-id-document-error");

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(error).toHaveText("Select your ID document.");

  await input.setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
  await expect(error).toContainText("Unsupported file type");
  await input.setInputFiles({ name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  await expect(error).toContainText("This file is too large");
  await expect(input).toHaveAttribute("aria-invalid", "true");

  await input.setInputFiles({ name: "scan.jpg", mimeType: "image/jpeg", buffer: Buffer.from("jpeg") });
  await expect(error).toHaveCount(0);
  await expect(page.locator("#contact-id-document-selected")).toHaveText("scan.jpg");
  await input.setInputFiles(samplePdf("passport.pdf"));
  await expect(page.locator("#contact-id-document-selected")).toHaveText("passport.pdf");

  await page.getByRole("button", { name: "Remove Attach ID Document" }).click();
  await expect(page.locator("#contact-id-document-selected")).toHaveText("");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(error).toHaveText("Select your ID document.");

  // The file stays in memory only.
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
  expect(stored).not.toContain("passport.pdf");
});

test.describe("business types", () => {
  test("only Travel Agency and Corporate are defined, with their required documents", () => {
    expect(businessTypes.map(({ value }) => value)).toEqual(["travel_agency", "corporate"]);
    expect(requiredDocumentsFor("travel_agency")).toEqual(["commercialRegistration", "tourismLicence", "taxCertificate"]);
    expect(requiredDocumentsFor("corporate")).toEqual(["commercialRegistration", "taxCertificate"]);
    expect(requiredDocumentsFor("")).toEqual([]);
    expect(requiredDocumentsFor("aviation")).toEqual([]);
  });

  test("documents follow the business type and review shows only applicable ones", async ({ page }) => {
    await visit(page, "/register/agency/company");
    await fillCompanyStep(page, { name: "Business Type Agency", registration: "CR-3" });
    await contactStep(page);

    await expect(page.getByText("Choose your business type to see the required documents.")).toBeVisible();
    await expect(page.locator("input[type=file]")).toHaveCount(0);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText("Select your company business type.")).toBeVisible();

    await page.getByLabel("Travel Agency", { exact: true }).check();
    await expect(page.locator("input[type=file]")).toHaveCount(3);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.locator("#document-tourismLicence-error")).toBeVisible();

    await page.getByLabel("Corporate", { exact: true }).check();
    await expect(page.locator("#document-tourismLicence")).toHaveCount(0);
    await expect(page.locator("#document-tourismLicence-error")).toHaveCount(0);
    // Only the two documents Corporate still requires keep their errors.
    await expect(page.locator("[role=alert]")).toHaveCount(2);
    await page.locator("#document-commercialRegistration").setInputFiles(samplePdf("cr.pdf"));
    await page.locator("#document-taxCertificate").setInputFiles(samplePdf("tax.pdf"));
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page).toHaveURL(/\/review$/);

    const review = page.locator("main");
    await expect(review).toContainText("Company Business Type");
    await expect(review).toContainText("Corporate");
    await expect(review).toContainText("Alexandria");
    await expect(review).toContainText("Commercial Registration Number");
    await expect(review).toContainText("passport.pdf");
    await expect(page.getByText("cr.pdf", { exact: true })).toBeVisible();
    await expect(page.getByText("tax.pdf", { exact: true })).toBeVisible();
    await expect(review).not.toContainText("Tourism");
  });

  test("offers only Travel Agency and Corporate; Travel Agency needs all three documents", async ({ page }) => {
    await visit(page, "/register/agency/company");
    await fillCompanyStep(page, { name: "Travel Agency Test", registration: "CR-4" });
    await contactStep(page);
    const options = page.locator(".business-type input[type=radio]");
    await expect(options).toHaveCount(2);
    await expect(page.locator(".business-type__option")).toHaveText(["Travel Agency", "Corporate"]);
    await expect(page.getByText(/Aviation/)).toHaveCount(0);

    await page.getByLabel("Travel Agency", { exact: true }).check();
    await page.locator("#document-commercialRegistration").setInputFiles(samplePdf("cr.pdf"));
    await page.locator("#document-taxCertificate").setInputFiles(samplePdf("tax.pdf"));
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page).toHaveURL(/\/documents$/);
    await expect(page.locator("#document-tourismLicence-error")).toBeVisible();
    await page.locator("#document-tourismLicence").setInputFiles(samplePdf("licence.pdf"));
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page).toHaveURL(/\/review$/);
    await expect(page.locator("main")).toContainText("Travel Agency");
    for (const file of ["cr.pdf", "licence.pdf", "tax.pdf"]) await expect(page.getByText(file, { exact: true })).toBeVisible();
  });
});

test.describe("welcome", () => {
  test("language switcher toggles locale and direction", async ({ page }) => {
    await page.goto("/welcome");
    const english = page.getByRole("button", { name: "English" });
    const arabic = page.getByRole("button", { name: "العربية" });
    await expect(english).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your Journey Starts Here");
    await expect(page.getByText("Your gateway to seamless travel partnerships.")).toBeVisible();
    await expect(page.getByText("Built for travel professionals.")).toBeVisible();

    await arabic.click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(arabic).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("رحلتك تبدأ من هنا");
    await expect(page.getByText("مصممة لمحترفي السفر.")).toBeVisible();
    await english.click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  test("account cards are single links without nested controls, usable by keyboard", async ({ page }) => {
    await page.goto("/welcome");
    const cards = page.locator(".account-card");
    await expect(cards).toHaveCount(2);
    await expect(cards.locator("a, button, input")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Existing Partner" })).toHaveAttribute("href", "/login");
    const register = page.getByRole("link", { name: "New Travel Agency" });
    await expect(register).toHaveAttribute("href", "/register/agency");

    await register.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/register\/agency/);
    await page.goto("/welcome");
    await page.locator(".account-card").first().click({ position: { x: 20, y: 20 } });
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("hotel location", () => {
  test("haversine distance and directions URL", () => {
    const london = { latitude: 51.5074, longitude: -0.1278 };
    const paris = { latitude: 48.8566, longitude: 2.3522 };
    expect(haversineKm(london, paris)).toBeGreaterThan(342);
    expect(haversineKm(london, paris)).toBeLessThan(345);
    expect(haversineKm(paris, paris)).toBe(0);
    const url = directionsUrl(paris);
    expect(url).toContain("https://www.google.com/maps/dir/?api=1&destination=48.8566%2C2.3522");
    expect(url).not.toContain("origin");
  });

  test("shows straight-line distance after permission is granted on click", async ({ page, context }) => {
    await visit(page, "/hotels/eastern-al-montazah");
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 30.0444, longitude: 31.2357 });
    const section = page.locator("#location");
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole("heading", { name: "Location & Directions" })).toBeVisible();
    await expect(section.locator(".leaflet-container")).toBeVisible();
    await expect(section.getByRole("link", { name: "Get Directions" })).toHaveAttribute("href", /google\.com\/maps\/dir/);
    await expect(section.locator(".hotel-location__distance")).toHaveCount(0);

    await section.getByRole("button", { name: "Use My Location" }).click();
    await expect(section.locator(".hotel-location__distance strong")).toHaveText(/^\d+ km$/);
    await expect(section).toContainText("Straight-line distance from your location — not a driving distance.");
    await section.getByRole("button", { name: "Clear my location" }).click();
    await expect(section.locator(".hotel-location__distance")).toHaveCount(0);
  });

  for (const [code, text] of [
    [1, "Location permission was denied."],
    [2, "Your location could not be determined."],
    [3, "Finding your location took too long."],
  ] as const) {
    test(`reports geolocation error code ${code}`, async ({ page }) => {
      await page.addInitScript((errorCode) => {
        Object.defineProperty(navigator, "geolocation", {
          configurable: true,
          value: {
            getCurrentPosition: (_success: unknown, failure: (error: object) => void) =>
              failure({ code: errorCode, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: "" }),
          },
        });
      }, code);
      await visit(page, "/hotels/eastern-al-montazah");
      const section = page.locator("#location");
      await section.scrollIntoViewIfNeeded();
      await section.getByRole("button", { name: "Use My Location" }).click();
      await expect(section.getByRole("status")).toContainText(text);
      await expect(section.locator(".hotel-location__distance")).toHaveCount(0);
    });
  }

  test("does not invent a location for hotels without verified coordinates", async ({ page }) => {
    await visit(page, "/hotels/coastal-retreat-demo");
    const section = page.locator("#location");
    await section.scrollIntoViewIfNeeded();
    await expect(section).toContainText("A verified location is not available for this listing");
    await expect(section.locator(".leaflet-container")).toHaveCount(0);
    await expect(section.getByRole("button", { name: "Use My Location" })).toHaveCount(0);
  });
});

test("voucher shows booking content, demo warnings, no prices, and prints cleanly", async ({ page }) => {
  await visit(page, "/bookings/DEMO-1001/voucher");
  const voucher = page.locator("article.voucher");
  await expect(voucher.getByRole("heading", { name: "Accommodation Voucher" })).toBeVisible();
  await expect(voucher).toContainText("DEMO-1001");
  await expect(voucher).toContainText("NOT VALID FOR TRAVEL");
  await expect(voucher).toContainText("It is not a supplier confirmation");
  await expect(voucher).toContainText("Not available — demonstration record");
  for (const heading of ["Hotel", "Stay", "Room details", "Travellers"]) {
    await expect(voucher.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
  await expect(voucher.locator("table")).toHaveCount(2);
  await expect(voucher).toContainText(/Generated on/);
  await expect(voucher).not.toContainText(/USD|EGP|Total price/);
  const print = page.getByRole("button", { name: "Print voucher" });
  await expect(print).toBeVisible();

  await page.emulateMedia({ media: "print" });
  await expect(print).toBeHidden();
  await expect(page.locator("header").first()).toBeHidden();
  await expect(voucher.locator(".voucher__header")).toBeVisible();
  await expect(voucher.locator(".voucher__footer")).toBeVisible();
  await expect(voucher.locator(".watermark")).toBeVisible();
});
