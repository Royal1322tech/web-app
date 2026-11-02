import { expect, type Page } from "@playwright/test";

// A real 1×1 PNG, so the browser's decode check passes.
export const samplePngLogo = (name = "logo.png") => ({
  name,
  mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64"),
});

/** Attaches a valid logo and waits for it to pass the content check. */
export async function attachCompanyLogo(page: Page, file = samplePngLogo()) {
  await page.locator("#company-logo").setInputFiles(file);
  await expect(page.locator(".company-logo__frame img")).toBeVisible();
}

export const samplePdf = (name: string) => ({
  name,
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n test"),
});

/** Picks an option in a searchable combobox by typing and accepting the first match. Works in either locale. */
export async function chooseOption(page: Page, id: string, search: string) {
  const box = page.locator(`#${id}`);
  await box.fill(search);
  await page.locator(`#${id}-listbox [role=option]`).first().waitFor();
  await box.press("Enter");
}

/** Completes Step 1 (Company Information) with Egypt / Alexandria and continues. */
export async function fillCompanyStep(page: Page, { name, registration }: { name: string; registration: string }) {
  await page.getByLabel("Name of Company").fill(name);
  await page.getByLabel("Number of Employees").fill("12");
  await chooseOption(page, "company-country", "Egypt");
  await chooseOption(page, "company-city", "Alexandria");
  await page.getByLabel("Commercial Registration Number").fill(registration);
  await page.getByLabel("Address of Company").fill("Alexandria");
  await attachCompanyLogo(page);
  await page.getByRole("button", { name: "Next", exact: true }).click();
}

export async function attachIdDocument(page: Page, name = "id.pdf") {
  await page.locator("#contact-id-document").setInputFiles(samplePdf(name));
}
