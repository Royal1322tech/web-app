import { expect, type Page } from "@playwright/test";
import { pickDate } from "./date-picker";

export const groupTrip = { destination: "Luxor", passengers: "12", start: "2030-11-20", end: "2030-11-22" };
export const groupContact = { name: "Demo Traveller", email: "demo@example.com", agency: "Sample Agency", subject: "Spring group trip", message: "Fictional travel requirements for a preview." };

const next = (page: Page) => page.getByRole("button", { name: /^(Next step|الخطوة التالية)$/ }).click();

export async function fillGroupTrip(page: Page, trip: Partial<typeof groupTrip> = groupTrip) {
  // Departure and end dates use the shared calendar; the other fields are typed.
  for (const [key, value] of Object.entries(trip)) {
    if (key === "start" || key === "end") await pickDate(page, `enquiry-${key}`, value);
    else await page.locator(`#enquiry-${key}`).fill(value);
  }
  await next(page);
}

export async function fillGroupContact(page: Page, contact: Partial<typeof groupContact> = groupContact) {
  for (const [key, value] of Object.entries(contact)) await page.locator(`#enquiry-${key}`).fill(value);
  await next(page);
}

/** Walks the wizard to the review step and opens the local preview. */
export async function completeGroupWizard(page: Page) {
  await fillGroupTrip(page);
  await fillGroupContact(page);
  await page.getByRole("button", { name: /^(Review request|مراجعة الطلب)$/ }).click();
  await expect(page.getByRole("heading", { name: /Request ready — not sent yet|الطلب جاهز — لم يُرسل بعد/ })).toBeVisible();
}
