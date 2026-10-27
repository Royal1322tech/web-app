import { test, expect } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { visit } from "./helpers/demo-login";
import { selectLanguage, openHeaderTools, closeHeaderMenu } from "./helpers/header";
import type { CancellationPolicy } from "../src/features/hotels/cancellation-policy";
import { parseCancellationPolicy } from "../src/features/hotels/lib/parse-cancellation-policy";
import { LocaleProvider } from "../src/features/localization/locale-provider";
import { formatPolicyDeadline, VoucherCancellationPolicy } from "../src/features/demo/voucher-cancellation-policy";

const render = (policy?: CancellationPolicy) =>
  renderToStaticMarkup(createElement(LocaleProvider, { children: createElement(VoucherCancellationPolicy, { policy }) }));
const notSuppliedNote = "This does not mean the booking is non-refundable";

test.describe("voucher cancellation policy states", () => {
  test("free cancellation shows the supplied deadline with date, time and zone", () => {
    const markup = render({
      kind: "free",
      deadline: "2027-02-10T21:59:00Z",
      timezone: "Africa/Cairo",
      conditions: { en: "Changes require supplier approval", ar: "التعديلات تتطلب موافقة المورد" },
    });
    expect(markup).toContain('data-policy="free"');
    expect(markup).toContain("Free cancellation");
    expect(markup).toContain("Free cancellation until");
    expect(markup).toContain("Feb 10, 2027");
    expect(markup).toMatch(/11:59\sPM · Africa\/Cairo/);
    expect(markup).toContain("Changes require supplier approval");
    expect(markup).not.toContain(notSuppliedNote);
  });

  test("free cancellation without a deadline does not invent one", () => {
    const markup = render({ kind: "free" });
    expect(markup).toContain("no deadline was supplied");
    expect(markup).not.toContain("Free cancellation until");
  });

  test("non-refundable is stated explicitly and is distinct from missing data", () => {
    const markup = render({ kind: "non-refundable", penalty: { en: "Full stay charged", ar: "تُحتسب الإقامة كاملة" } });
    expect(markup).toContain('data-policy="non-refundable"');
    expect(markup).toContain("Non-refundable");
    expect(markup).toContain("This rate is non-refundable.");
    expect(markup).toContain("Full stay charged");
    expect(markup).not.toContain(notSuppliedNote);
    expect(markup).not.toContain("Free cancellation");
  });

  for (const [label, policy] of [["missing", undefined], ["unavailable", { kind: "unavailable" }]] as const) {
    test(`${label} policy shows not supplied without any dates or terms`, () => {
      const markup = render(policy);
      expect(markup).toContain('data-policy="unavailable"');
      expect(markup).toContain("Not supplied");
      expect(markup).toContain(notSuppliedNote);
      expect(markup).not.toContain("This rate is non-refundable.");
      expect(markup).not.toContain("<dl");
      expect(markup).not.toContain("<table");
    });
  }

  test("conditional rules render one row per supplied period", () => {
    const markup = render({
      kind: "conditional",
      timezone: "Africa/Cairo",
      rules: [
        { cancelledOnOrBefore: "2027-02-08 12:00", charge: { kind: "percentage", percentage: 25 } },
        { cancelledOnOrAfter: "2027-02-08 12:00", charge: { kind: "non-refundable" } },
      ],
    });
    expect(markup.match(/<tr>/g)).toHaveLength(3);
    expect(markup).toContain("25%");
    expect(markup).toMatch(/Feb 8, 2027, 12:00\sPM · Africa\/Cairo/);
  });

  test("deadline formatting never adds missing parts", () => {
    expect(formatPolicyDeadline("2027-02-10", undefined, "en")).toBe("Feb 10, 2027");
    expect(formatPolicyDeadline("2027-02-10T18:00", undefined, "en")).not.toContain("·");
    expect(formatPolicyDeadline("2027-02-10T18:00", "Asia/Riyadh", "en")).toMatch(/6:00\sPM · Asia\/Riyadh$/);
    expect(formatPolicyDeadline("2027-02-10T16:00:00Z", undefined, "en")).toMatch(/· UTC$/);
    expect(formatPolicyDeadline("before arrival", undefined, "en")).toBe("before arrival");
    expect(formatPolicyDeadline("2027-02-10T18:00", "Asia/Riyadh", "ar")).toContain("Asia/Riyadh");
  });

  test("integration parser accepts the typed shape and rejects malformed payloads", () => {
    const valid = { kind: "free", deadline: "2027-02-10T21:59:00Z", rules: [{ charge: { kind: "amount", amount: 40, currency: "USD" } }] };
    expect(parseCancellationPolicy(valid)).toEqual(valid);
    expect(parseCancellationPolicy({ kind: "refundable" })).toBeUndefined();
    expect(parseCancellationPolicy({ kind: "conditional", rules: [{ charge: { kind: "amount", amount: -5, currency: "USD" } }] })).toBeUndefined();
    expect(parseCancellationPolicy(null)).toBeUndefined();
  });
});

test("voucher shows the cancellation section, improved actions and prints the policy", async ({ page }) => {
  await visit(page, "/bookings/DEMO-1001/voucher");
  const voucher = page.locator("article.voucher");
  const policy = voucher.locator(".voucher-policy");
  await expect(policy.getByRole("heading", { name: "Cancellation Policy" })).toBeVisible();
  // The demo booking carries no supplier policy, so the voucher must say so instead of guessing.
  await expect(policy).toHaveAttribute("data-policy", "unavailable");
  await expect(policy).toContainText(notSuppliedNote);
  await expect(voucher).not.toContainText("Cancellation terms were not supplied for this rate.");

  const back = page.getByRole("link", { name: "Back to booking" });
  await expect(back).toHaveAttribute("href", "/bookings/DEMO-1001");
  await expect(back).toHaveClass(/button--outline/);
  const print = page.getByRole("button", { name: "Print voucher" });
  await expect(print.locator("svg")).toHaveCount(1);
  const toolbar = (await page.locator(".voucher-toolbar").boundingBox())!;
  const documentBox = (await voucher.boundingBox())!;
  expect(Math.abs(toolbar.x - documentBox.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(toolbar.width - documentBox.width)).toBeLessThanOrEqual(1);
  await page.evaluate(() => { window.print = () => { document.body.dataset.printed = "true"; }; });
  await print.click();
  await expect(page.locator("body")).toHaveAttribute("data-printed", "true");

  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".voucher-toolbar")).toBeHidden();
  await expect(policy).toBeVisible();
  await expect(policy.locator(".voucher-policy__summary")).toBeVisible();
  await page.emulateMedia({ media: "screen" });

  await openHeaderTools(page);
  await selectLanguage(page, "ar");
  await closeHeaderMenu(page);
  await expect(policy.getByRole("heading", { name: "سياسة الإلغاء" })).toBeVisible();
  await expect(policy).toContainText("غير مقدمة");
  await expect(policy).toContainText("هذا لا يعني أن الحجز غير قابل للاسترداد");
  await expect(page.getByRole("link", { name: "العودة للحجز" })).toBeVisible();
  await expect(page.getByRole("button", { name: "طباعة القسيمة" })).toBeVisible();
});
