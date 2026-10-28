// Non-destructive browser smoke test for a deployed Royal Vacation frontend.
// Usage: node scripts/staging-smoke.mjs [baseUrl]
// Signs in with the public frontend demo account (no backend), visits representative pages and
// fails on missing content or browser errors. It never submits bookings, payments or requests.
import { chromium } from "playwright";

const base = (process.argv[2] ?? "https://staging.royalis.tech").replace(/\/$/, "");
const demo = { email: "demo@royalvacation.test", password: "Demo@12345" };
const failures = [];
const errors = [];

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${page.url()}: ${message.text()}`);
  });

  async function check(name, action) {
    try {
      await action();
      console.log(`ok   ${name}`);
    } catch (error) {
      failures.push(name);
      console.log(`FAIL ${name}: ${error.message.split("\n")[0]}`);
    }
  }
  const visible = (locator) => locator.first().waitFor({ state: "visible", timeout: 15000 });

  await check("welcome page", async () => {
    await page.goto(`${base}/welcome`);
    await visible(page.getByRole("heading", { level: 1 }));
  });
  await check("demo sign-in", async () => {
    await page.goto(`${base}/login`);
    await page.getByLabel("Email", { exact: true }).fill(demo.email);
    await page.getByLabel("Password", { exact: true }).fill(demo.password);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 });
  });
  await check("home search", async () => {
    await page.goto(`${base}/`);
    await visible(page.locator("#hotel-search"));
  });
  await check("hotel search results", async () => {
    await page.goto(`${base}/search`);
    await visible(page.locator("article"));
  });
  await check("hotel details and rooms", async () => {
    await page.goto(`${base}/hotels/eastern-al-montazah`);
    await visible(page.getByRole("heading", { level: 1 }));
    await visible(page.locator("#rooms"));
  });
  await check("My Bookings", async () => {
    await page.goto(`${base}/bookings`);
    await visible(page.getByText("Booking reference"));
  });
  await check("booking details", async () => {
    await page.goto(`${base}/bookings/DEMO-1001`);
    await visible(page.getByText("DEMO-1001"));
  });
  await check("voucher", async () => {
    await page.goto(`${base}/bookings/DEMO-1001/voucher`);
    await visible(page.locator("article.voucher"));
  });
  await check("wallet", async () => {
    await page.goto(`${base}/wallet`);
    await visible(page.getByRole("heading", { level: 1 }));
  });
  await check("no horizontal overflow on mobile", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/bookings/DEMO-1001`);
    await visible(page.getByText("DEMO-1001"));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) throw new Error(`page is ${overflow}px wider than the viewport`);
  });
} finally {
  await browser.close();
}

if (errors.length) {
  console.log(`FAIL browser errors (${errors.length}):`);
  for (const error of errors.slice(0, 10)) console.log(`     ${error}`);
}
if (failures.length || errors.length) process.exit(1);
console.log("Staging smoke test passed.");
