# B2B authentication integration (Phase 1)

Real sign-in against the Laravel B2B API, behind a build-time flag. **Demo login stays the default.**

## Configuration

| Variable | Effect |
|---|---|
| `VITE_AUTH_MODE` unset or anything except `api` | Demo login, unchanged. The API is never called for authentication. |
| `VITE_AUTH_MODE=api` | Real sign-in. The demo credentials stop working in this build. |
| `VITE_AUTH_COMPANY_ID_ENTRY=true` | API mode only: shows a **Company ID** field. The login API requires the company's UUID, and how users should supply it is not yet decided. Without this flag, API mode shows "sign-in unavailable" and sends nothing. |
| `VITE_API_BASE_URL` | API origin, for example `https://staging-api.royalis.tech`. Paths add `/api/v1/...`. |

These are read when the app is built, so each mode is a separate build. There is no automatic fallback from API mode to demo mode.

## Contract used

Requests follow the official **"Royal travel" OpenAPI 1.0.0** (servers: `https://staging-api.royalis.tech`). That document contains request examples only. It documents no response bodies, error shapes or required fields, so the response shapes below come from the backend source as it was read earlier and are **not confirmed by the OpenAPI document**.

Registration: the OpenAPI document lists `POST /up/api/v1/b2b/auth/register`. A read-only probe of staging on 2026-11-05 showed:
- `GET /up/api/v1/b2b/auth/register` returns "The route up/api/v1/b2b/auth/register could not be found."
- `GET /api/v1/b2b/auth/register` returns "The GET method is not supported … Supported methods: POST."

The frontend therefore posts to `/api/v1/b2b/auth/register`. `/up` is Laravel's health-check page, and the prefix in the document looks like an editing error. Confirm this with the backend team.


| Step | Request | Success response |
|---|---|---|
| Login | `POST /api/v1/b2b/auth/login` with `{email, password, company_id, channel: "website"}` | `{challenge_id, expires_in}`, and a 6-digit code is emailed |
| Verify | `POST /api/v1/b2b/auth/verify-otp` with `{challenge_id, otp, channel}` | `{token_type: "Bearer", access_token, expires_in, company_id, user}` |
| Current user | `GET /api/v1/b2b/me` with a Bearer token | `{data: {user, company, membership}}` |
| Logout | `POST /api/v1/b2b/auth/logout` with a Bearer token | Revokes the token |

Every response is checked against a schema. A malformed reply, including a 2xx status with an error body, is treated as an error, never as success.

## Behaviour

- **Code expiry:** the countdown uses the server's `expires_in`. An expired code can't be submitted, and **Back to sign in** starts again with an empty password field.
- **No resend:** there is no resend button, because no resend endpoint exists.
- **Company check:** after verification, `/me` must return the same company the token was issued for. Otherwise the session is discarded.
- **Restored sessions:** after a reload, the stored session is confirmed with `/me` before any private page renders.
  - A 401 ends the session and returns to sign-in with "Your session has ended".
  - A 403 ends it with "Your company access is no longer active".
  - Network failures keep the token and offer **Try again** or **Sign out**.
- **Token expiry:** the session ends when the token expires. There is no refresh token.
- **Logout:** always clears local state. If the server can't confirm the token was revoked, the user is told so instead of being shown a normal sign-out.
- **Requests:** every request sends `X-Locale` (`en` or `ar`) and uses `credentials: "omit"`. Requests time out after 15 seconds.
- **Error messages:** messages shown to users are the app's own, in English and Arabic. Server wording is never displayed.
- **Business pages:** after a real sign-in, business pages still show the labelled demo data, because their APIs don't exist yet.

## Session storage and its limits

- **Where the token lives:** in memory, and in `sessionStorage` under `royal-travel.b2b-session.v1` as `{token, expiresAt, companyId}`. It survives a reload but not closing the tab.
- **XSS exposure:** `sessionStorage` is readable by any script running on this origin, so an XSS flaw could expose the token. Mitigations are a strict content security policy, no third-party scripts on authenticated pages, and short token lifetimes.
- **What is never stored:** passwords and codes are never stored, and the token is never written to `localStorage` or to logs.
- **Isolation:** the demo login uses a different key, `royal-vacation.demo-auth.v1`, which is ignored in API mode.

## Code

| Area | File |
|---|---|
| API client | `src/lib/api/client.ts`: timeout, JSON parsing, error categories, 422 field errors, a central 401 handler, Bearer token, `X-Locale` |
| Flags | `src/features/auth/auth-config.ts` |
| Contracts | `src/features/auth/b2b-auth-api.ts` (zod parsers) |
| Session store | `src/features/auth/b2b-session.ts` |
| Demo/API switch used by the app | `src/features/auth/app-session.ts` |
| Login and code steps | `src/features/auth/components/api-login-form.tsx` |
| Server unreachable | `src/features/auth/components/session-unavailable.tsx` |

## Tests

- **Where:** `tests/auth-integration.spec.ts` runs against two extra API-mode builds that Playwright starts on ports 4174 and 4175.
- **What they hit:** these builds point at `https://api.royal.test`, which never resolves. Every request is answered by the test's mocks. **These tests do not verify the real backend.**

## Registration and profile in API mode

**Registration** submits to `POST /api/v1/b2b/auth/register`:
- **Password:** the review step adds password and confirm fields, following the backend's rules.
- **Field mapping:** the city is sent as its English name and the nationality as the English country name.
- **Files:** the logo, ID document and company documents are **not sent**, because the API doesn't accept files. The page says so.
- **Result:** shows the company ID needed to sign in, with the status "Awaiting approval".

**Profile pages:**
- `/profile` shows the account from `GET /b2b/me`.
- `/agency` shows the company details from `/me`. Bookings and activity on that page are still sample data.
- `/agency/edit` says editing isn't available online, because there is no update API.

**Sample-data notice:** every other private page shows "Sample data: this page isn't connected to your account yet."

## Password recovery in API mode

`/forgot-password`, `/verify-otp` and `/reset-password` show the original recovery screens, with a note at the top: "Password recovery isn't available online yet. These screens are a preview: no email is sent and no code is checked." It links to Contact. The screens make no API calls, because no recovery API exists. The API collection has no endpoint to request a reset code, verify one, or set a new password.

The 4-digit code screen at `/verify-otp` belongs to the password-recovery preview. It is not the login code and is never connected to `POST /api/v1/b2b/auth/verify-otp`. That endpoint only accepts a challenge from a successful login, and it issues a sign-in token, not a reset token. The real login code step is part of the login page.

## Real local testing (historical)

> The local backend checkout was removed on 2026-11-05. This section records what was verified then. The test now refuses to run unless `ROYAL_API_URL` is a `localhost`/`127.0.0.1` address, because it creates data and must never target staging or production.

The full flow has been run against a **real local Laravel backend**: the backend fix branch `fix/api-route-whitespace-cors` in `~/royal-travel-backend-dev`, with mail sent to Mailpit. The flow covered Login, the real emailed code, verification, `/me`, logout, and revocation (`/me` returning 401).

`tests/real-backend/auth-local.spec.ts` repeats this. It is skipped unless `ROYAL_REAL_BACKEND=1`.

Prerequisites:
- The local stack: the `royal-dev-postgres`, `royal-dev-mailpit` and `royal-dev-php` containers.
- A fictional approved test company. Its credentials are in `~/.royal-dev-test-account`, which is outside the repository.

```bash
# Frontend in API mode, pointed at the local backend (port 4178 is an allowed CORS origin locally).
VITE_AUTH_MODE=api VITE_AUTH_COMPANY_ID_ENTRY=true VITE_API_BASE_URL=http://127.0.0.1:8000 \
  npx vite build --outDir dist-auth-local --emptyOutDir
npx vite preview --outDir dist-auth-local --host 127.0.0.1 --port 4178 --strictPort &

# Sign in by hand at http://127.0.0.1:4178/login and read the code at http://127.0.0.1:8025, or run:
set -a; . ~/.royal-dev-test-account; set +a
ROYAL_REAL_BACKEND=1 ROYAL_TEST_EMAIL="$EMAIL" ROYAL_TEST_PASSWORD="$PASSWORD" ROYAL_TEST_COMPANY_ID="$COMPANY_ID" \
ROYAL_RESET_THROTTLE="docker exec royal-dev-php php artisan cache:clear" PLAYWRIGHT_BASE_URL=http://127.0.0.1:4178 \
  npx playwright test tests/real-backend --workers=1
```

The backend allows only **5 requests per minute per IP across register, login and verify-otp combined**. That's why the test clears the local rate-limit cache before each case.

## Before verifying on staging

Staging status from a read-only probe on 2026-11-05: every response, including not-found, 405 and unauthenticated replies, is **HTTP 200 `text/html`** with a body that starts with two newlines and no CORS headers. For example, `GET /api/v1/b2b/me` without a token returns status 200 with `{"message":"Unauthenticated."}`. The frontend treats such replies as invalid responses and never as success. The browser blocks them anyway because CORS is missing.


1. The backend must remove the blank line before `<?php` in `routes/api_v1.php` and `routes/b2b.php`, and deploy. Until then, staging returns HTTP 200 `text/html` without CORS headers for every request, and the browser can't use it.
2. Check that `GET /api/v1/b2b/me` without a token returns **401** JSON, and that a preflight from the frontend origin returns `Access-Control-Allow-Origin`.
3. Get an approved test company: an email, a password and its company ID.
4. Build locally with `VITE_AUTH_MODE=api VITE_AUTH_COMPANY_ID_ENTRY=true`, then sign in with the real emailed code. Check `/me` identity in the account menu, then sign out.
