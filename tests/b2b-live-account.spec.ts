import { expect, test, type Page, type Request } from "@playwright/test";

/*
 * Customers, bookings, finance and loyalty pages in the API build (port 4176) against MOCKED
 * responses in the backend contract (ROYAL_TRAVEL_B2B_API_HANDOFF.md). Never contacts staging.
 */
const APP = "http://127.0.0.1:4176";
const COMPANY = "8f14e45f-ceea-467a-9575-3c4b1f0b5c1a";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, X-Locale", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const profile = { message: "ok", data: { user: { id: 7, name: "Laila Hassan", email: "laila@example.com" }, company: { id: COMPANY, name: "Nile Gate Tours", legal_name: "Nile Gate Tours LLC", display_name: "Nile Gate Tours", status: "approved", account_currency: "USD", preferred_locale: "en", country_code: "EG", city: "Alexandria", address: "1 Corniche Road", business_type: "travel_agency", registration_no: "CR-1", tax_no: null, employee_count: 12 }, membership: { role_code: "company_admin", status: "active" } } };
const paginator = (data: unknown[], page = 1, last = 1, total = data.length) => ({ current_page: page, data, first_page_url: "x", from: data.length ? 1 : null, last_page: last, last_page_url: "x", links: [], next_page_url: null, path: "x", per_page: 20, prev_page_url: null, to: data.length || null, total });
const customer = (n: number) => ({ id: `00000000-0000-4000-8000-00000000000${n}`, first_name: ["Nour", "Hana", "Omar"][n % 3], last_name: "Adel", email: `c${n}@example.test`, phone: null, created_at: "2030-11-01T10:00:00+00:00", updated_at: "2030-11-01T10:00:00+00:00" });
const booking = (n: number, status = "draft") => ({ booking_id: `b0000000-0000-4000-8000-00000000000${n}`, booking_no: `HTL-TEST000000000${n}`, order_no: `ORD-TEST000000000${n}`, service_type: "hotel", status, currency: "USD", customer_total: "118.55", check_in: "2030-12-06", check_out: "2030-12-09", rooms_count: 1, customer: { id: customer(1).id, first_name: "Hana", last_name: "Adel" }, created_at: "2030-11-20T10:00:00+00:00", updated_at: "2030-11-20T10:00:00+00:00" });
const finance = { account: { currency: "USD", wallet_cents: 50000, wallet_reserved_cents: 10000, wallet_available_cents: 40000, credit_limit_cents: 100000, credit_used_cents: 25000, credit_available_cents: 75000, credit_frozen: false, total_available_cents: 115000 },
  entries: [{ id: "e1", type: "wallet_topup", amount_cents: 50000, wallet_after_cents: 50000, limit_after_cents: 100000, used_after_cents: 25000, frozen_after: false, reference: "TOPUP-001", reason: "Bank transfer", created_at: "2030-11-02T08:00:00+00:00" }] };

type Handler = (request: Request, url: URL) => { status?: number; json?: unknown } | undefined;
async function signedIn(page: Page, handler: Handler, locale: "en" | "ar" = "en") {
  const calls: string[] = [];
  await page.addInitScript(({ companyId, locale }) => {
    if (!sessionStorage.getItem("royal-travel.b2b-session.v1")) sessionStorage.setItem("royal-travel.b2b-session.v1", JSON.stringify({ token: "12|mocked", expiresAt: Date.now() + 3_600_000, companyId }));
    localStorage.setItem("royal-vacation.locale", locale);
  }, { companyId: COMPANY, locale });
  await page.route("https://api.royal.test/**", (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const url = new URL(request.url());
    calls.push(`${request.method()} ${url.pathname}${url.search}`);
    if (url.pathname === "/api/v1/b2b/me") return route.fulfill({ headers: cors, json: profile });
    const reply = handler(request, url);
    if (reply) return route.fulfill({ status: reply.status ?? 200, headers: cors, json: reply.json ?? {} });
    return route.fulfill({ headers: cors, json: { locale: "en", direction: "ltr" } });
  });
  return calls;
}
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe("customers (mocked API)", () => {
  test("list, search, create with validation, and details; another company's customer is not found", async ({ page }) => {
    const posts: Request[] = [];
    const calls = await signedIn(page, (request, url) => {
      if (url.pathname === "/api/v1/b2b/customers" && request.method() === "GET") return { json: url.searchParams.get("q") === "hana" ? paginator([customer(1)]) : paginator([customer(0), customer(1)]) };
      if (url.pathname === "/api/v1/b2b/customers" && request.method() === "POST") { posts.push(request); return { status: 201, json: { data: { ...customer(2), ...request.postDataJSON() } } }; }
      if (url.pathname === `/api/v1/b2b/customers/${customer(0).id}`) return { json: { data: customer(0) } };
      if (url.pathname.startsWith("/api/v1/b2b/customers/")) return { status: 404, json: { message: "Not found." } };
      return undefined;
    });
    await page.goto(`${APP}/customers`);
    const list = page.locator("[data-customers-state=list]");
    await expect(list.locator("li")).toHaveCount(2);
    await page.getByLabel("Search by name, email or phone").fill("hana");
    await expect(list.locator("li")).toHaveCount(1);
    expect(calls).toContain("GET /api/v1/b2b/customers?page=1&q=hana");

    await page.getByRole("button", { name: "Add customer" }).click();
    const form = page.locator("[data-new-customer]");
    await form.getByLabel("First name").fill("Omar");
    await form.getByLabel("Last name").fill("Adel");
    await form.getByRole("button", { name: "Save customer" }).click();
    await expect(form.getByText("Enter an email or a phone number.")).toBeVisible();
    expect(posts).toHaveLength(0);
    await form.getByLabel("Email").fill("omar@example.test");
    await form.getByRole("button", { name: "Save customer" }).click();
    await expect(form).toHaveCount(0);
    expect(posts[0].postDataJSON()).toEqual({ first_name: "Omar", last_name: "Adel", email: "omar@example.test" });

    await page.goto(`${APP}/customers/${customer(0).id}`);
    await expect(page.locator("[data-customer-detail]")).toContainText("Nour Adel");
    await expect(page.locator("[data-customer-detail]")).toContainText("c0@example.test");
    await page.goto(`${APP}/customers/11111111-1111-4111-8111-111111111111`);
    await expect(page.locator("[data-customer-state=not_found]")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);
  });
});

test.describe("bookings (mocked API)", () => {
  test("my bookings, incomplete and company bookings use their own endpoints, filters and pages", async ({ page }) => {
    const calls = await signedIn(page, (_request, url) => {
      if (url.pathname === "/api/v1/b2b/bookings/my-bookings") return { json: url.searchParams.get("page") === "2" ? paginator([booking(3, "confirmed")], 2, 2, 21) : paginator([{ ...booking(1), can_resume_draft: true }, booking(2, "confirmed")], 1, 2, 21) };
      if (url.pathname === "/api/v1/b2b/bookings/my-incomplete") return { json: paginator([{ ...booking(4, "draft"), can_resume_draft: false }, { ...booking(5, "draft"), confirmation_state: "finish_unknown" }]) };
      if (url.pathname === "/api/v1/b2b/bookings") return { json: paginator([booking(6, "cancelled")]) };
      return undefined;
    });
    await page.goto(`${APP}/bookings`);
    const list = page.locator("[data-bookings-state=list]");
    await expect(page.getByRole("heading", { name: "My bookings" })).toBeVisible();
    await expect(list.locator("li")).toHaveCount(2);
    await expect(list.locator("li").first().locator("[data-resumable]")).toContainText("Draft: continue to confirm");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(list.locator("li")).toHaveCount(1);
    expect(calls).toContain("GET /api/v1/b2b/bookings/my-bookings?page=2");
    await page.getByLabel("Status").selectOption("pending_supplier");
    await expect.poll(() => calls).toContain("GET /api/v1/b2b/bookings/my-bookings?page=1&status=pending_supplier");

    await page.getByRole("link", { name: "Incomplete" }).click();
    await expect(page).toHaveURL(/view=incomplete/);
    await expect.poll(() => calls).toContain("GET /api/v1/b2b/bookings/my-incomplete?page=1");
    await expect(list.locator("li").first()).toContainText("HTL-TEST0000000004");
    await expect(list.locator("li")).toHaveCount(2);
    // Only incomplete statuses are offered here.
    await expect(page.getByLabel("Status").locator("option")).toHaveText(["All statuses", "Draft", "Pending", "Waiting for supplier"]);
    await expect(list.locator("li").first().locator("[data-resumable=false]")).toContainText("can't be continued");
    await expect(list.locator("li").nth(1)).toContainText("Outcome uncertain");

    await page.getByRole("link", { name: "Company bookings" }).click();
    await expect(list.locator("li").first()).toContainText("HTL-TEST0000000006");
    await expect(list.locator("li")).toHaveCount(1);
    await expect.poll(() => calls).toContain("GET /api/v1/b2b/bookings?page=1");
    await expect(list).toContainText("Cancelled");
  });

  test("company bookings with status filter and details; no cancel, payment or voucher actions", async ({ page }) => {
    const calls = await signedIn(page, (_request, url) => {
      if (url.pathname === "/api/v1/b2b/bookings") return { json: url.searchParams.get("status") === "confirmed" ? paginator([booking(2, "confirmed")]) : paginator([booking(1), booking(2, "confirmed")]) };
      if (url.pathname.endsWith("/tickets")) return { json: paginator([]) };
      if (url.pathname === `/api/v1/b2b/bookings/${booking(1).booking_id}`) return { json: { data: { ...booking(1), guests: [{ first_name: "Hana", last_name: "Adel", guest_type: "adult", is_lead: true, room_index: null, age: null, nationality_code: "EG" }, { first_name: "Omar", last_name: "Adel", guest_type: "child", is_lead: false, room_index: null, age: 7, nationality_code: null }] } } };
      if (url.pathname.startsWith("/api/v1/b2b/bookings/")) return { status: 404, json: { message: "Booking not found." } };
      return undefined;
    });
    await page.goto(`${APP}/bookings?view=company`);
    const list = page.locator("[data-bookings-state=list]");
    await expect(list.locator("li")).toHaveCount(2);
    await expect(list.locator("li").first()).toContainText("HTL-TEST0000000001");
    await expect(list.locator("li").first()).toContainText("USD 118.55");
    await expect(page.getByText(/DEMO-|Sample Traveller/)).toHaveCount(0);
    await page.getByLabel("Status").selectOption("confirmed");
    await expect(list.locator("li")).toHaveCount(1);
    expect(calls).toContain("GET /api/v1/b2b/bookings?page=1&status=confirmed");

    await page.goto(`${APP}/bookings/${booking(1).booking_id}`);
    const detail = page.locator("[data-live-booking]");
    await expect(detail).toContainText("HTL-TEST0000000001");
    await expect(detail.locator("[data-booking-status]")).toHaveText("Draft");
    await expect(detail).toContainText("Hana Adel");
    await expect(detail).toContainText("Lead guest");
    await expect(detail).toContainText("isn't a confirmed reservation");
    await expect(detail.getByRole("button", { name: /cancel|pay|voucher/i })).toHaveCount(0);
    // Without an agency purchase price in the details, the draft can't be confirmed from here.
    await expect(detail.locator("[data-confirm-blocked=price]")).toBeVisible();
    await expect(detail.getByRole("button", { name: "Confirm booking" })).toHaveCount(0);
    await expect(detail.locator("[data-ticket-eligible=false]")).toBeVisible();
    await page.goto(`${APP}/bookings/b0000000-0000-4000-8000-000000000999`);
    await expect(page.locator("[data-booking-state=not_found]")).toBeVisible();
  });
});

test.describe("finance and loyalty (mocked API)", () => {
  test("wallet and credit from the API in cents; activity; no example figures", async ({ page }) => {
    await signedIn(page, (_request, url) => {
      if (url.pathname === "/api/v1/b2b/finance") return { json: finance };
      if (url.pathname === "/api/v1/b2b/loyalty") return { json: { company_id: COMPANY, balances: { pending: 0, available: 100 }, transactions: [], redemption_enabled: false } };
      return undefined;
    });
    await page.goto(`${APP}/wallet`);
    const wallet = page.locator("[data-live-wallet]");
    await expect(wallet.locator("[data-metric=wallet_available]")).toContainText("$400.00");
    await expect(wallet.locator("[data-metric=wallet_reserved]")).toContainText("$100.00");
    await expect(wallet.locator("[data-metric=credit_available]")).toContainText("$750.00");
    await expect(wallet.locator("[data-metric=total_available]")).toContainText("$1,150.00");
    await expect(wallet.locator("[data-finance-entries]")).toContainText("Wallet top-up");
    await expect(wallet.locator("[data-finance-entries]")).toContainText("TOPUP-001");
    await expect(page.getByText(/examples and don't reflect|TX-DEMO|Show insufficient/)).toHaveCount(0);
    await expect(wallet.locator(".loyalty-summary")).toContainText("100");
    await page.goto(`${APP}/transactions`);
    await expect(page.locator("[data-live-transactions] [data-finance-entries] li")).toHaveCount(1);
  });

  test("an employee without payments.view sees a clear message, not figures", async ({ page }) => {
    await signedIn(page, (_request, url) => {
      if (url.pathname === "/api/v1/b2b/finance") return { status: 403, json: { message: "You do not have permission." } };
      if (url.pathname === "/api/v1/b2b/loyalty") return { json: { company_id: COMPANY, balances: { pending: 0, available: 0 }, transactions: [], redemption_enabled: false } };
      return undefined;
    });
    await page.goto(`${APP}/wallet`);
    await expect(page.locator("[data-finance-state=forbidden]")).toContainText("Only company administrators");
    await expect(page.locator("[data-metric]")).toHaveCount(0);
  });

  test("loyalty uses entry_type, balance_bucket and note", async ({ page }) => {
    await signedIn(page, (_request, url) => {
      if (url.pathname === "/api/v1/b2b/loyalty") return { json: { company_id: COMPANY, balances: { pending: 20, available: 100 }, redemption_enabled: false, transactions: [
        { id: "l1", booking_id: null, entry_type: "manual_credit", points: 100, balance_bucket: "available", note: "Welcome bonus", created_at: "2030-11-02T08:00:00Z" },
        { id: "l2", booking_id: "b1", entry_type: "booking_earn", points: 20, balance_bucket: "pending", note: null, created_at: "2030-11-03T08:00:00Z" },
      ] } };
      return undefined;
    });
    await page.goto(`${APP}/points`);
    const rows = page.locator(".points-list li");
    await expect(rows.first()).toContainText("Welcome bonus");
    await expect(rows.first()).toContainText("Credit by Royal Vacation");
    await expect(rows.first()).toContainText("Available");
    await expect(rows.nth(1)).toContainText("Earned from a booking");
    await expect(rows.nth(1)).toContainText("Pending");
  });
});

test.describe("layout", () => {
  for (const [locale, width] of [["en", 375], ["ar", 375], ["en", 768], ["ar", 1440]] as const) {
    test(`${locale} ${width}px: customers, bookings and wallet fit without sideways scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await signedIn(page, (_request, url) => {
        if (url.pathname === "/api/v1/b2b/customers") return { json: paginator([customer(0), customer(1)]) };
        if (url.pathname === "/api/v1/b2b/bookings/my-bookings") return { json: paginator([booking(1)]) };
        if (url.pathname === "/api/v1/b2b/finance") return { json: finance };
        if (url.pathname === "/api/v1/b2b/loyalty") return { json: { company_id: COMPANY, balances: { pending: 0, available: 100 }, transactions: [], redemption_enabled: false } };
        return undefined;
      }, locale);
      for (const [path, marker] of [["/customers", "[data-customers-state=list]"], ["/bookings", "[data-bookings-state=list]"], ["/wallet", "[data-metric]"]] as const) {
        await page.goto(`${APP}${path}`);
        await expect(page.locator(marker).first()).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
        expect(await overflow(page), path).toBeLessThanOrEqual(0);
      }
    });
  }
});

test.describe("booking status on the details page (mocked API)", () => {
  test("a processing booking is polled until the backend confirms; then a ticket can be opened", async ({ page }) => {
    const id = booking(7).booking_id;
    let polls = 0;
    await signedIn(page, (_request, url) => {
      if (url.pathname === `/api/v1/b2b/bookings/${id}`) return { json: { data: { ...booking(7), confirmation_state: "processing", agency_purchase_price: "100.00", guests: [] } } };
      if (url.pathname === `/api/v1/b2b/bookings/${id}/status`) { polls++; return { json: { booking_id: id, status: "confirmed", confirmation_state: "confirmed", confirmed_at: "2030-12-01T10:00:00.000000Z" } }; }
      if (url.pathname === `/api/v1/b2b/bookings/${id}/tickets`) return { json: paginator([]) };
      return undefined;
    });
    await page.goto(`${APP}/bookings/${id}`);
    await expect(page.locator("[data-confirm-view=processing]")).toContainText("Supplier processing");
    await expect(page.getByRole("button", { name: "Confirm booking" })).toHaveCount(0);
    await expect(page.locator("[data-confirm-view=confirmed]")).toBeVisible({ timeout: 15000 });
    expect(polls).toBeGreaterThanOrEqual(1);
  });
});

test.describe("support tickets (mocked API)", () => {
  const TICKET = "71c1c1c1-0000-4000-8000-000000000001";
  const confirmed = { ...booking(8, "confirmed"), confirmation_state: "confirmed", confirmed_at: "2030-12-01T10:00:00.000000Z" };
  const ticket = (status = "open") => ({ id: TICKET, ticket_no: "TKT-TEST000000000001", booking_id: confirmed.booking_id, company_id: COMPANY, created_by: 7, category: "room_issue", subject: "AC not working", status, created_at: "2030-12-02T10:00:00Z", updated_at: "2030-12-02T11:00:00Z" });
  const messages = (page = 1, last = 1) => paginator([{ id: `m${page}`, actor_type: page === 1 ? "employee" : "support", body: page === 1 ? "Please assist.\nRoom 204." : "<b>We are on it</b>", created_at: "2030-12-02T10:00:00Z" }], page, last);

  test("list, create with categories from the API and an Idempotency-Key, then one ticket opened", async ({ page }) => {
    const posts: Request[] = [];
    const calls = await signedIn(page, (request, url) => {
      if (url.pathname === "/api/v1/b2b/tickets/categories") return { json: ["booking_issue", "room_issue", "new_issue"] };
      if (url.pathname === "/api/v1/b2b/tickets") return { json: paginator([ticket()]) };
      if (url.pathname === `/api/v1/b2b/bookings/${confirmed.booking_id}`) return { json: { data: { ...confirmed, guests: [] } } };
      if (url.pathname === `/api/v1/b2b/bookings/${confirmed.booking_id}/tickets` && request.method() === "POST") { posts.push(request); return { status: 201, json: ticket() }; }
      if (url.pathname === `/api/v1/b2b/tickets/${TICKET}`) return { json: { ticket: ticket(), messages: messages() } };
      return undefined;
    });
    await page.goto(`${APP}/tickets`);
    await expect(page.locator("[data-tickets] li")).toHaveCount(1);
    await expect(page.locator("[data-tickets]")).toContainText("AC not working");
    await expect(page.locator("[data-tickets]")).toContainText("Room issue");
    expect(calls).toContain("GET /api/v1/b2b/tickets?page=1");

    await page.goto(`${APP}/bookings/${confirmed.booking_id}/tickets/new`);
    const form = page.locator("[data-ticket-form]");
    // Categories come from the API; unknown values are shown readably but sent unchanged.
    await expect(form.getByLabel("Category").locator("option")).toHaveText(["Choose a category", "Booking issue", "Room issue", "new issue"]);
    await form.getByRole("button", { name: "Open ticket" }).click();
    await expect(form.getByText("Choose a category.")).toBeVisible();
    expect(posts).toHaveLength(0);
    await form.getByLabel("Category").selectOption("room_issue");
    await form.getByLabel("Subject").fill("AC not working");
    await form.getByLabel("Description").fill("Please assist with the room issue.");
    await form.getByRole("button", { name: "Open ticket" }).dblclick();
    await expect(page).toHaveURL(new RegExp(`/tickets/${TICKET}$`));
    expect(posts).toHaveLength(1);
    expect(posts[0].postDataJSON()).toEqual({ category: "room_issue", subject: "AC not working", description: "Please assist with the room issue." });
    expect(posts[0].headers()["idempotency-key"]).toMatch(/^ticket_[a-f0-9]{32}$/);
  });

  test("a booking that isn't confirmed can't have a ticket", async ({ page }) => {
    await signedIn(page, (_request, url) => {
      if (url.pathname === "/api/v1/b2b/tickets/categories") return { json: ["room_issue"] };
      if (url.pathname === `/api/v1/b2b/bookings/${booking(1).booking_id}`) return { json: { data: { ...booking(1), guests: [] } } };
      return undefined;
    });
    await page.goto(`${APP}/bookings/${booking(1).booking_id}/tickets/new`);
    await expect(page.locator("[data-ticket-eligible=false]")).toBeVisible();
    await expect(page.locator("[data-ticket-form]")).toHaveCount(0);
  });

  test("details show the latest message page as plain text; a reply is sent once with a key, retried with the same key", async ({ page }) => {
    const replies: Request[] = [];
    const calls = await signedIn(page, (request, url) => {
      if (url.pathname === `/api/v1/b2b/tickets/${TICKET}` && request.method() === "GET") return { json: { ticket: ticket("waiting_for_customer"), messages: url.searchParams.get("page") === "2" ? messages(2, 2) : messages(1, 2) } };
      if (url.pathname === `/api/v1/b2b/tickets/${TICKET}/messages`) { replies.push(request); return replies.length === 1 ? { status: 503, json: { message: "x" } } : { status: 201, json: { status: "sent", message_id: "m3" } }; }
      return undefined;
    });
    await page.goto(`${APP}/tickets/${TICKET}`);
    await expect(page.locator("[data-ticket-status]")).toHaveText("Waiting for your reply");
    // The latest page (2 of 2) is shown; markup in a message is shown as text, not HTML.
    await expect(page.getByText("<b>We are on it</b>")).toBeVisible();
    await expect(page.locator("[data-ticket-messages] b", { hasText: "We are on it" })).toHaveCount(0);
    expect(calls).toContain(`GET /api/v1/b2b/tickets/${TICKET}?page=2`);
    await page.getByRole("button", { name: "Previous" }).click();
    await expect(page.locator("[data-ticket-messages]")).toContainText("Room 204.");
    const reply = page.getByLabel("Your reply");
    await reply.fill("Thank you for your assistance.");
    await page.getByRole("button", { name: "Send reply" }).click();
    await expect(page.locator("[data-reply-failure=unavailable]")).toBeVisible();
    await page.getByRole("button", { name: "Send reply" }).click();
    await expect(page.getByText("Reply sent.")).toBeVisible();
    expect(replies).toHaveLength(2);
    expect(replies[0].postDataJSON()).toEqual({ message: "Thank you for your assistance." });
    expect(replies[1].headers()["idempotency-key"]).toBe(replies[0].headers()["idempotency-key"]);
    await expect(reply).toHaveValue("");
  });

  for (const status of ["resolved", "closed"]) {
    test(`${status} tickets can't be replied to`, async ({ page }) => {
      await signedIn(page, (_request, url) => (url.pathname === `/api/v1/b2b/tickets/${TICKET}` ? { json: { ticket: ticket(status), messages: messages() } } : undefined));
      await page.goto(`${APP}/tickets/${TICKET}`);
      await expect(page.locator("[data-ticket-closed]")).toBeVisible();
      await expect(page.getByLabel("Your reply")).toHaveCount(0);
    });
  }

  for (const [locale, width] of [["ar", 375], ["en", 768], ["ar", 1440]] as const) {
    test(`${locale} ${width}px: tickets, conversation and the incomplete list fit`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await signedIn(page, (_request, url) => {
        if (url.pathname === "/api/v1/b2b/tickets") return { json: paginator([ticket()]) };
        if (url.pathname === `/api/v1/b2b/tickets/${TICKET}`) return { json: { ticket: ticket(), messages: messages() } };
        if (url.pathname === "/api/v1/b2b/bookings/my-incomplete") return { json: paginator([{ ...booking(5), confirmation_state: "processing" }]) };
        return undefined;
      }, locale);
      for (const [path, marker] of [["/tickets", "[data-tickets]"], [`/tickets/${TICKET}`, "[data-ticket-messages]"], ["/bookings?view=incomplete", "[data-bookings-state=list]"]] as const) {
        await page.goto(`${APP}${path}`);
        await expect(page.locator(marker)).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
        expect(await overflow(page), path).toBeLessThanOrEqual(0);
      }
    });
  }
});
