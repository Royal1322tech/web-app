import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Chooses a day in a shared calendar picker (e.g. `#check-in`, `#enquiry-start`, `#chauffeur-date`), as a user would: open it,
 * jump to the month and year, then press the day. Fails if the day is disabled (e.g. in the past).
 */
export async function pickDate(scope: Page | Locator, id: string, day: string) {
  const [year, month] = day.split("-").map(Number);
  await scope.locator(`#${id}`).click();
  const panel = scope.locator(`[data-date-picker="${id}"] [data-date-panel]`);
  await expect(panel).toBeVisible();
  await panel.getByLabel(/^(Year|السنة)$/).selectOption(String(year));
  await panel.getByLabel(/^(Month|الشهر)$/).selectOption(String(month - 1));
  const button = panel.locator(`[data-date="${day}"]`);
  await expect(button).toBeEnabled();
  await button.click();
  await expect(panel).toHaveCount(0);
}
