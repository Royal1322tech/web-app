# Backend integration matrix

Based on `royal-travel-backend` at `8da6604`, plus the local fix branch `fix/api-route-whitespace-cors`. Statuses are judged from source. "Local test" means a real request to a real local Laravel with mail sent to Mailpit; no mocks.

## Staging after the transport fix (2026-11-13)

The updated collection is identical to the 2026-11-11 export. The transport bug is fixed. Responses carry real status codes and `application/json`, with no stray output. CORS allows only `https://staging.royalis.tech`: preflights return 204, allow the `content-type, accept, authorization, x-locale` headers, and set `max-age: 0`.

| # | Endpoint | Live result (no real account, no data changed) | Frontend | Status |
|---|---|---|---|---|
| 1 | Foundation check | 200 `{"locale","direction"}` | Sign-in and registration-submit screens (API mode) show a notice with a retry when the API can't be reached. Real browser test passes. | Connected |
| 2 | Register | 422 for empty body (rules above) | API-mode registration review step | Connected. Not run live: it creates a company and needs approval. |
| 3 | Login | 422 `{"message":"Invalid credentials or account not activated.","errors":{"email":[…]}}` for unknown credentials | API-mode sign-in; real browser test passes in EN and AR | Connected. Success path needs a test account. |
| 4 | Verify OTP | 422 `{"errors":{"otp":["Invalid or expired verification code."]}}` for an unknown challenge | API-mode code step | Connected. Success path needs a real challenge. |
| 5 | Logout | 401 `Unauthenticated.` with an invalid token | Header sign-out (API mode) | Connected. Success path needs a session. |
| 6 | Me | 401 `Unauthenticated.` with an invalid token. A stored session with a rejected token ends and returns to sign-in (real browser test). | Session check, header, agency profile | Connected. Success path needs a session. |
| 7 | B2C search | 503 `{"success":false,"code":"HOTEL_SUPPLIER_UNAVAILABLE","message":"Hotel search is currently unavailable.","data":{"hotels":[],"total":0}}`; limit 10 per window | Service `searchB2CHotels` with the request mapper and the envelope parser. No screen uses it: this app has no public (B2C) search page. | Partly ready: the hotel item format is unknown, because the supplier is unavailable |
| 8 | B2B search | 401 without a token | Not connected. Search pages keep the labelled sample data. | Blocked: needs a token to read its rules; item format unknown |

Real browser tests: `tests/real-backend/staging-readonly.spec.ts`. They are opt-in (`ROYAL_STAGING_READONLY=1`) and forward only those read-only requests to staging.

## Hoppscotch collection vs staging (2026-11-11)

Source of truth for routes: the "Api-collection" Hoppscotch export (8 requests). The probe used only GET, OPTIONS and POST requests with empty or deliberately invalid bodies, so every POST failed validation before any account, OTP or supplier search could be created. It used no credentials or tokens. After about 8 auth requests the auth routes answered `Too Many Attempts.`, so the shared rate limit is low.

| # | Endpoint | Observed on staging | Frontend |
|---|---|---|---|
| 1 | `GET /api/v1/foundation-check` | `{"locale":"en","direction":"ltr"}`, or `{"locale":"ar","direction":"rtl"}` with `X-Locale: ar` | `src/lib/api/foundation.ts` (service only, no screen) |
| 2 | `POST /api/v1/b2b/auth/register` | Required: `legal_name, business_type, registration_no, country_code, city, address, contact_name, contact_email, contact_phone, contact_nationality, contact_id_number, password`. `display_name`, `tax_no`, `employee_count` and `password_confirmation` are not required. | Connected in API mode; sends every required field |
| 3 | `POST /api/v1/b2b/auth/login` | Required: `email, password, company_id, channel` | Connected in API mode |
| 4 | `POST /api/v1/b2b/auth/verify-otp` | Required: `challenge_id, otp, channel` | Connected in API mode |
| 5 | `POST /api/v1/b2b/auth/logout` | `{"message":"Unauthenticated."}` without a token | Connected in API mode |
| 6 | `GET /api/v1/b2b/me` | `{"message":"Unauthenticated."}` without a token | Connected in API mode |
| 7 | `POST /api/v1/b2c/hotels/search` | Required: `checkin`, `checkout` (`Y-m-d`, checkout after checkin); `latitude` (−90..90), `longitude` (−180..180); `residency` (2 characters); `guests` (array, one item per room: `adults` integer required, `children` array present) | Request mapper only (`src/features/hotels/api/b2c-hotel-search.ts`); not sent, because the response format is unknown |
| 8 | `POST /api/v1/b2b/hotels/search` | 401 `{"message":"Unauthenticated."}` without a token, so its validation rules can't be read | Connected behind `VITE_HOTEL_SEARCH_MODE=api` with the company Bearer token. The Geo Search body follows the B2B specification. Hotel cards wait for a confirmed reply format. See `docs/b2b-hotel-search.md`. |

The response formats for login, verify-otp, me, logout and register come from backend source `8da6604`. None has been observed live, because no test account exists.

**The transport bug is unchanged.** Every response is HTTP 200 `text/html`, including validation errors, `Unauthenticated.` and `Too Many Attempts.`. Bodies start with a newline, and no `Access-Control-*` headers are sent, on preflights or on responses. Browsers on `https://staging.royalis.tech` therefore can't read any API response. The frontend domain does not proxy `/api`.

## Official OpenAPI vs staging (read-only probe, 2026-11-05)

Source: "Royal travel" OpenAPI 1.0.0. It contains request examples only, with no response or error schemas. The probe used GET and OPTIONS only, with no bodies or credentials. The local backend and its fix branch no longer exist. The "Local test" column below is historical.

| Documented endpoint | Staging routing | Frontend path | Status |
|---|---|---|---|
| `POST /up/api/v1/b2b/auth/register` | `/up/...` is **not found**. `/api/v1/b2b/auth/register` exists and accepts POST only. | `api/v1/b2b/auth/register` | Path resolved. Live use is blocked by the transport bug. |
| `POST /api/v1/b2b/auth/login` | Exists, POST only | same | Blocked by the transport bug |
| `POST /api/v1/b2b/auth/verify-otp` | Exists, POST only | same | Blocked by the transport bug |
| `GET /api/v1/b2b/me` (bearerAuth) | Exists. Without a token it returns `{"message":"Unauthenticated."}`. | same, with `Authorization: Bearer` | Blocked by the transport bug |
| *(not documented)* `POST /api/v1/b2b/auth/logout` | Exists, POST only | same | Blocked; undocumented |

**Transport bug:** every response comes back as HTTP **200** `text/html`, including 404, 405 and unauthenticated replies. The body starts with two newlines, and there are no `Access-Control-*` headers on GET or on the preflight from `https://staging.royalis.tech`. The likely cause is output before `<?php` in the route files, which prevents PHP from sending the real status and headers.

## Status key

| Status | Meaning |
|---|---|
| **A** | Ready to integrate |
| **B** | Logic exists, but no API adapter |
| **C** | Logic and API exist, but the environment blocks a live run |
| **D** | Logic incomplete |
| **E** | Needs further verification |

## Matrix

| # | Feature | Logic complete? | API exists? | Local test | Frontend connected? | Status | Blockers |
|---|---|---|---|---|---|---|---|
| 1 | B2B registration | Yes (`CompanyRegistrationController`) | `POST /api/v1/b2b/auth/register` | **Passed**: 201, pending company created; login refused before approval | **Yes** (API mode) | A | No file uploads in the API. A fresh database needs `RolesAndPermissionsSeeder`. |
| 2 | Login | Yes (`B2BLoginController::login`) | `POST /b2b/auth/login` | **Passed** | **Yes** | A | `company_id` entry is a product decision; the shared rate limit |
| 3 | OTP verification | Yes (`B2BLoginChallengeService`; 5 minutes, 5 attempts, single use) | `POST /b2b/auth/verify-otp` | **Passed**: real email in Mailpit | **Yes** | A | Staging mail settings unknown; no resend endpoint |
| 4 | Current user and profile | Yes (`B2BProfileController`) | `GET /b2b/me` | **Passed** | **Yes**: header, profile and agency details | A | `/me` has no phone number; no update API |
| 5 | Logout | Yes | `POST /b2b/auth/logout` | **Passed**: token revoked, `/me` returns 401 | **Yes** | A | — |
| 6 | Company management | Admin only (`AdminCompanyController`: create, approve, activate, deactivate, update) | Admin web routes only | Not run | Not applicable (admin) | B for B2B self-edit | No B2B company-update API; needs a product decision |
| 7 | Hotel search | Partly: `RateHawkSearchService::searchByGeo`, content enrichment and filters live **inside the admin Blade controller** | **Update 2026-11-11:** `POST /api/v1/b2c/hotels/search` and `POST /api/v1/b2b/hotels/search` are now routed (see the section above) | Not run | Request mapper only (B2C) | E | Response format, search radius, child entry format, B2B payload, and how destinations map to coordinates |
| 8 | Hotel details | `RateHawkHotelContentService::getHotel` | None | Not run | No | B and C | Same as 7 |
| 9 | Room availability | Normalizer, plus a session-bound cache token (admin only) | None | Not run | No | B and C | Rooms are tied to an admin web session |
| 10 | Hotel pricing | `HotelPricingService::quoteUsd` (USD; Royal and company markup) | None. The B2B markup controller exists but **has no route**. | Unit tests pass | No | B | Search never applies pricing (`selling_price: null`) |
| 11 | Booking creation | **No**: models and tables only, no service | None | — | No (demo) | D | No booking orchestration, supplier prebook or booking call, or idempotency handling |
| 12 | Booking history | Admin list only (`AdminBookingService::paginate`, not company-scoped) | None | — | No | D | Nothing creates bookings yet; no B2B company scoping |
| 13 | Booking details | Models only | None | — | No | D | Same as 12 |
| 14 | Booking cancellation | `CancellationRequest` and `Refund` models only | None | — | No | D | No logic |
| 15 | Group requests | `GroupRequest` and `GroupOffer` models only | None | — | No (session demo) | D | No logic |
| 16 | Car rental | Transport models only (`TransportProvider`, `Vehicle`, `Driver`) | None | — | No (demo) | D | No logic |
| 17 | Private chauffeur | Same as 16 | None | — | No (preview) | D | No logic |
| 18 | Wallet and transactions | Finance models only (balance, credit, movements) | None | — | No (demo) | D | No logic |
| 19 | Loyalty points | Nothing | None | — | No (demo) | D | Not modelled |
| 20 | Support tickets | Nothing | None | — | No (demo) | D | Not modelled |
| 21 | Notifications | `Notification` model; Laravel mail notifications for OTP and invitations only | None | — | No (demo) | D | No in-app notification logic |
| 22 | Admin-managed content | No CMS logic found | None | — | — | E/D | Nothing to integrate |

## Proposed thin adapters (not implemented; each needs approval)

1. **`GET /api/v1/b2b/hotels/search`** (`auth:sanctum`, company scope from the token, `company.permission:hotels.view`).
   - Move the search, filter and enrichment code out of `Admin\HotelSearchController` into a shared service, so admin and B2B both use it.
   - Return selling prices from `HotelPricingService::quoteUsd($supplierTotal, 'b2b', $companyId)`. Never return supplier amounts or commission.
   - Return opaque, server-held rate tokens bound to the **token's company**, not to a web session.
   - **Decisions needed:** the destination model (the frontend offers Alexandria, Cairo, Hurghada and Sharm El Sheikh; the backend has coordinates for Dubai, Cairo and Riyadh), how occupancy maps, and residency.
2. **`GET /api/v1/b2b/hotels/{hid}`**: hotel content through `RateHawkHotelContentService`.
3. **`GET /api/v1/b2b/hotels/rooms/{token}`**: the rooms view, using the same cached snapshot and checking the company instead of the session.
4. **Auth hardening:** named rate limiters per route, keyed by email or challenge plus IP, instead of the shared `throttle:5,1` bucket. Also an OTP resend endpoint.

All four need RateHawk sandbox credentials for a live run. Booking, wallet, groups, transport, tickets and notifications have no business logic to adapt.
