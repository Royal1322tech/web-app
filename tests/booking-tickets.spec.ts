import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { visit } from "./helpers/demo-login";
import { openHeaderTools } from "./helpers/header";

const axe = (page: Page) => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();

function trackWrites(page: Page) {
  const writes: string[] = [];
  page.on("request", (request) => { if (request.method() !== "GET") writes.push(request.url()); });
  return writes;
}

async function categoryOptions(page: Page) {
  return page.locator("#ticket-category option:not([disabled])").allTextContents();
}

async function recordRental(page: Page, outcome: "confirmed" | "pending" | "failed" | "insufficient") {
  await visit(page, "/car-rental/search");
  await page.getByLabel("Pickup date", { exact: true }).fill("2027-03-10");
  await page.getByLabel("Return date", { exact: true }).fill("2027-03-13");
  await page.getByRole("button", { name: "Search vehicles", exact: true }).click();
  await page.getByRole("link", { name: "View vehicle", exact: true }).first().click();
  await page.getByRole("button", { name: "Select vehicle", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("link", { name: "Continue to driver information" }).click();
  await page.getByLabel("Driver name", { exact: true }).fill("Sample Driver");
  await page.getByLabel("Driver email", { exact: true }).fill("driver@example.com");
  await page.getByLabel("Driver phone", { exact: true }).fill("+20 100 000 0000");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue to review booking" }).click();
  await page.getByRole("checkbox", { name: /I have reviewed the cancellation/ }).check();
  await page.getByRole("link", { name: "Continue to rental payment preview" }).click();
  await page.getByLabel("Payment outcome").selectOption(outcome);
  await page.getByRole("button", { name: "Continue to outcome" }).click();
}

test("the owner reports a hotel issue that is linked automatically and kept as a local preview", async ({ page }) => {
  const writes = trackWrites(page);
  await visit(page, "/bookings/DEMO-1004");
  await page.getByRole("link", { name: "Report an issue", exact: true }).click();
  await expect(page).toHaveURL(/\/bookings\/DEMO-1004\/tickets\/new$/);
  const summary = page.locator(".ticket-booking");
  await expect(summary).toContainText("DEMO-1004");
  await expect(summary).toContainText("Hotel booking");
  await expect(summary).toContainText("DEMO-D");
  // The booking comes from the record; there is no field to type or swap a booking reference.
  const fieldIds = await page.locator("form.ticket-form :is(input, select, textarea)").evaluateAll((els) => els.map((el) => el.id));
  expect(fieldIds).toEqual(["ticket-category", "ticket-subject", "ticket-description", "ticket-attachment"]);

  await page.getByRole("button", { name: "Create ticket", exact: true }).click();
  await expect(page.getByText("Choose an issue category.", { exact: true })).toBeVisible();
  await expect(page.getByText("Enter a subject.", { exact: true })).toBeVisible();
  await expect(page.getByText("Describe the issue.", { exact: true })).toBeVisible();
  await page.getByLabel("Issue category").selectOption("booking_change");
  await page.getByLabel("Subject").fill("Add a second guest name");
  await page.getByLabel("Description").fill("Please add the companion's name to this booking record.");
  await page.getByRole("button", { name: "Create ticket", exact: true }).click();

  await expect(page).toHaveURL(/\/tickets\/TKT-LOCAL-[A-Z0-9]{6}$/);
  await expect(page.getByRole("status").filter({ hasText: "Ticket created as a local preview" })).toBeVisible();
  await expect(page.getByText("Local preview — not sent to Royal Vacation support")).toBeVisible();
  await expect(page.locator(".ticket-header")).toContainText("DEMO-1004");
  await expect(page.locator(".ticket-header .ticket-status")).toHaveText("Open");
  await expect(page.getByText(/Support · sample reply/)).toHaveCount(0);

  await page.getByLabel("Add a message").fill("Following up with the companion's passport spelling.");
  await page.getByRole("button", { name: "Add message", exact: true }).click();
  await expect(page.locator(".ticket-messages > li")).toHaveCount(2);
  await expect(page.getByText("Message added to this local preview. It was not sent.")).toBeVisible();

  await page.locator(".ticket-booking").getByRole("link", { name: "View booking details" }).click();
  await expect(page).toHaveURL(/\/bookings\/DEMO-1004$/);
  await expect(page.locator(".ticket-support")).toContainText("Add a second guest name");
  await page.getByRole("navigation", { name: "Workspace navigation" }).getByRole("link", { name: "My Tickets" }).click();
  await expect(page.locator(".ticket-cards")).toContainText("Add a second guest name");
  expect(writes).toEqual([]);
});

test("every recorded hotel booking status is eligible with suitable categories", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-21T10:00:00"));
  const expected: [string, string, string][] = [
    ["DEMO-1001", "Confirmed · in progress", "Stay or room issue"],
    ["DEMO-1003", "Cancelled", "Cancellation or refund"],
    ["DEMO-1004", "Confirmed · upcoming", "Change to booking details"],
    ["DEMO-1005", "Failed", "Booking status or confirmation"],
  ];
  for (const [id, stage, category] of expected) {
    await visit(page, `/bookings/${id}/tickets/new`);
    await expect(page.locator(".ticket-booking")).toContainText(stage);
    const options = await categoryOptions(page);
    expect(options).toContain(category);
    expect(options).toContain("Other");
  }
  // A failed booking with a record is not limited to payment issues.
  expect((await categoryOptions(page)).length).toBeGreaterThan(2);
});

test("completed bookings remain eligible with no time limit", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2027-06-01T10:00:00"));
  await visit(page, "/bookings/DEMO-1001");
  await page.getByRole("link", { name: "Report an issue", exact: true }).click();
  await expect(page.locator(".ticket-booking")).toContainText("Completed");
  expect(await categoryOptions(page)).toContain("Stay or room issue");
});

test("rental bookings can be reported immediately after they are recorded, including pending and failed", async ({ page }) => {
  for (const [outcome, stage] of [["pending", "Pending"], ["failed", "Failed"]] as const) {
    await recordRental(page, outcome);
    await page.getByRole("button", { name: "Show outcome" }).click();
    await expect(page).toHaveURL(/\/car-rental\/bookings\/RENTAL-DEMO-/);
    const rentalId = page.url().split("/").pop()!;
    await page.getByRole("link", { name: "Report an issue", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/car-rental/bookings/${rentalId}/tickets/new$`));
    await expect(page.locator(".ticket-booking")).toContainText("Car rental");
    await expect(page.locator(".ticket-booking")).toContainText(stage);
    await page.getByLabel("Issue category").selectOption("payment");
    await page.getByLabel("Subject").fill(`Rental ${outcome} payment question`);
    await page.getByLabel("Description").fill("The payment preview shows a different amount than expected.");
    await page.getByRole("button", { name: "Create ticket", exact: true }).click();
    await expect(page.locator(".ticket-header")).toContainText(rentalId);
    await expect(page.locator(".ticket-header")).toContainText("Car rental");
    await page.locator(".ticket-booking").getByRole("link", { name: "View booking details" }).click();
    await expect(page.locator(".ticket-support")).toContainText(`Rental ${outcome} payment question`);
  }
});

test("attempts without a recorded booking cannot create a ticket", async ({ page }) => {
  await recordRental(page, "insufficient");
  await expect(page.getByRole("alert")).toContainText("credit is insufficient");
  await page.locator(".rental-nav").getByRole("link", { name: "Rental records" }).click();
  await expect(page.locator('a[href*="/car-rental/bookings/RENTAL-DEMO-"]')).toHaveCount(0);
  for (const url of ["/car-rental/bookings/RENTAL-DEMO-MISSING/tickets/new", "/bookings/DEMO-9999/tickets/new"]) {
    await visit(page, url);
    await expect(page.getByRole("heading", { name: "Booking not found" })).toBeVisible();
    await expect(page.locator("form.ticket-form")).toHaveCount(0);
  }
});

test("another agency user's booking tickets stay private everywhere", async ({ page }) => {
  await visit(page, "/bookings/DEMO-1002");
  await expect(page.getByRole("link", { name: "Report an issue" })).toHaveCount(0);
  await expect(page.locator(".ticket-support")).toContainText("available only to the user who made it");
  await expect(page.locator("main")).not.toContainText("Colleague ticket");

  await visit(page, "/bookings/DEMO-1002/tickets/new");
  await expect(page.getByRole("heading", { name: "Only the booking owner can report an issue" })).toBeVisible();
  await expect(page.locator("form.ticket-form")).toHaveCount(0);

  await visit(page, "/tickets/TKT-SAMPLE-0003");
  await expect(page.getByRole("heading", { name: "Ticket not found" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/Colleague|Private sample|DEMO-1002/);

  await visit(page, "/tickets");
  await expect(page.locator(".ticket-cards")).toContainText("TKT-SAMPLE-0001");
  await expect(page.locator(".ticket-cards")).toContainText("TKT-SAMPLE-0002");
  await expect(page.locator("main")).not.toContainText("TKT-SAMPLE-0003");
});

test("signed-out visitors cannot open tickets by URL", async ({ page }) => {
  await page.goto("/tickets/TKT-SAMPLE-0001");
  await expect(page.locator(".welcome-content")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Cancellation fee applied");
});

test("My Tickets tracks tickets without standalone creation", async ({ page }) => {
  await visit(page, "/tickets");
  await expect(page.locator('a[href$="/tickets/new"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Create ticket|New ticket/ })).toHaveCount(0);
  const cards = page.locator(".ticket-cards > li");
  await expect(cards.first()).toContainText("Waiting for your reply");
  await page.getByLabel("Booking type").selectOption("rental");
  await expect(page.getByRole("heading", { name: "No tickets match these filters" })).toBeVisible();
  await page.locator("main").getByRole("button", { name: "Clear filters" }).first().click();
  await page.getByLabel("Status").selectOption("resolved");
  await expect(cards).toHaveCount(1);
  await expect(page.locator(".ticket-cards")).toContainText("TKT-SAMPLE-0002");
  expect((await axe(page)).violations).toEqual([]);
});

for (const width of [375, 1440]) {
  test(`ticket screens are bilingual, accessible and fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("royal-vacation.locale", "ar"));
    await visit(page, "/tickets/TKT-SAMPLE-0001");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator(".ticket-header .ticket-status")).toHaveText("بانتظار ردك");
    await expect(page.getByText("رد تجريبي", { exact: false }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect((await axe(page)).violations).toEqual([]);
    await visit(page, "/bookings/DEMO-1003/tickets/new");
    await expect(page.getByRole("heading", { name: "راجع تذكرتك المفتوحة أولًا" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect((await axe(page)).violations).toEqual([]);
  });
}

test("ticket search matches references and subjects and combines with filters", async ({ page }) => {
  await visit(page, "/tickets");
  const search = page.getByRole("searchbox", { name: "Search tickets" });
  const cards = page.locator(".ticket-cards > li");
  await search.fill("tkt-sample-0001");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Cancellation fee applied");
  await search.fill("DEMO-1001");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("TKT-SAMPLE-0002");
  await search.fill("early check-in");
  await expect(cards).toHaveCount(1);
  await page.getByLabel("Status").selectOption("closed");
  await expect(page.getByRole("heading", { name: "No tickets match these filters" })).toBeVisible();
  await page.getByLabel("Status").selectOption("all");
  await search.fill("TKT-SAMPLE-0003");
  await expect(cards).toHaveCount(0);
  await page.locator(".ticket-results-bar").getByRole("button", { name: "Clear filters" }).click();
  await expect(search).toHaveValue("");
  await expect(cards).toHaveCount(2);
  await cards.first().getByRole("link").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/tickets\/TKT-SAMPLE-0001$/);
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("My Tickets");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("TKT-SAMPLE-0001");
});

test("account workspace navigation appears only on appropriate pages", async ({ page }) => {
  const workspace = page.getByRole("navigation", { name: "Workspace navigation" });
  for (const route of ["/profile", "/tickets", "/tickets/TKT-SAMPLE-0001", "/transactions", "/bookings/DEMO-1001"]) {
    await visit(page, route);
    await expect(workspace).toHaveCount(1);
  }
  for (const route of ["/bookings", "/wallet", "/group-quotation", "/bookings/DEMO-1004/tickets/new"]) {
    await visit(page, route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(workspace).toHaveCount(0);
  }
  await visit(page, "/wallet");
  await expect(page.locator("header nav").getByRole("link", { name: "Wallet", exact: true })).toHaveAttribute("href", "/wallet");
  await expect(page.locator("header nav").getByRole("link", { name: "Wallet", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Account overview" })).toBeVisible();
});

for (const [width, layout] of [[1440, "sidebar"], [1024, "row"], [375, "row"]] as const) {
  test(`account navigation is a compact ${layout} at ${width}px without page overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await visit(page, "/profile");
    const nav = (await page.locator(".workspace-nav").boundingBox())!;
    const heading = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
    if (layout === "sidebar") {
      expect(nav.x + nav.width).toBeLessThan(heading.x);
      expect(nav.width).toBeLessThanOrEqual(240);
    } else {
      expect(nav.height).toBeLessThan(64);
      expect(nav.y + nav.height).toBeLessThan(heading.y);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const first = page.locator(".workspace-nav a").first();
    await first.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(first).toBeFocused();
    await expect(first).toHaveCSS("outline-style", "solid");
  });
}

test("account navigation offers My Tickets and the complete grouped account map", async ({ page }) => {
  await visit(page, "/tickets");
  const workspace = page.getByRole("navigation", { name: "Workspace navigation" });
  for (const group of ["Bookings", "Finance", "Account"]) await expect(workspace.getByRole("group", { name: group })).toBeVisible();
  for (const label of ["My Bookings", "My Rentals", "My Tickets", "Wallet", "Transactions", "Invoices", "Accounting Review", "Points", "My Profile", "Agency Profile", "Notifications", "Account Settings"]) {
    await expect(workspace.getByRole("link", { name: label, exact: true })).toHaveCount(1);
  }
  await expect(workspace.getByRole("link", { name: "My Tickets", exact: true })).toHaveAttribute("aria-current", "page");
  await openHeaderTools(page);
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.locator("header").getByRole("link", { name: "My Tickets", exact: true })).toHaveAttribute("href", "/tickets");
  await visit(page, "/group-quotation");
  await expect(page.getByRole("navigation", { name: "Workspace navigation" })).toHaveCount(0);
});

for (const locale of ["en", "ar"] as const) {
  test(`home hero uses the approved copy in ${locale}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("royal-vacation.locale", value), locale);
    await visit(page, "/");
    const hero = page.locator("section[aria-label]").first();
    await expect(hero.locator("h1")).toHaveText(locale === "en" ? "Exceptional stays.Stronger partnerships." : "إقامات استثنائية.شراكات أقوى.");
    await expect(hero).toContainText(locale === "en" ? "THE WORLD, THROUGH YOUR AGENCY" : "العالم من خلال وكالتك");
    await expect(hero).toContainText(
      locale === "en"
        ? "Find the right hotels, compare room options, and manage travel bookings with confidence — all in one place."
        : "اعثر على الفنادق المناسبة، وقارن خيارات الغرف، وأدِر حجوزات السفر بثقة — كل ذلك في مكان واحد.",
    );
  });
}

test("partner video controls stay visible for touch and reduced-motion users", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await visit(page, "/");
  const section = page.locator("[data-partner-video]");
  await section.scrollIntoViewIfNeeded();
  const video = section.locator("video");
  await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.paused)).toBe(true);
  const play = section.getByRole("button", { name: "Play video", exact: true });
  await expect(play).toBeVisible();
  expect((await play.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await play.tap().catch(() => play.click());
  await expect(section.getByRole("button", { name: "Pause video", exact: true })).toBeVisible();
});

test("login keeps the centred card with refined proportions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  const card = (await page.locator("#login").boundingBox())!;
  const hero = (await page.locator("section[class*=hero]").boundingBox())!;
  expect(card.width).toBeLessThanOrEqual(440);
  expect(Math.abs(hero.x + hero.width / 2 - (card.x + card.width / 2))).toBeLessThanOrEqual(1);
  expect(card.y + card.height).toBeLessThanOrEqual(900);
  await expect(page.getByText("Frontend preview only. Authentication is not verified by a server.")).toBeVisible();
});
