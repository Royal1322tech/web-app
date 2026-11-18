# End-to-end testing

All browser tests use Playwright. There are two kinds, kept apart:

| Kind | Where | Backend | Runs in CI |
|---|---|---|---|
| **Mocked browser E2E** | `tests/*.spec.ts` | Every API call is answered by the test (`page.route`). The API-mode builds point at `api.royal.test`, which never resolves | Yes, on every push and pull request (`npm run test:e2e`) |
| **Real staging E2E** | `tests/real-backend/staging-journeys.spec.ts` | The live staging site and API. Nothing is mocked | **No.** It's opt-in and run by hand |
| Real staging, auth only (older) | `tests/real-backend/staging-readonly.spec.ts` | Staging API through a relay, with fake credentials | No (`ROYAL_STAGING_READONLY=1`) |
| Real local backend (older) | `tests/real-backend/auth-local.spec.ts` | Local Laravel plus Mailpit | No (`ROYAL_REAL_BACKEND=1`). **Out of date:** it expects the old emailed sign-in code, but sign-in now returns a token directly |

Mocked tests check what the frontend sends and how it reacts. They don't show that the real backend works.

## Builds used by the mocked tests

`playwright.config.ts` starts four preview servers:

| Port | Build | Used by |
|---|---|---|
| 4173 | Demo | Most UI tests |
| 4174 | Real sign-in, with the Company ID field | Auth and activation tests |
| 4175 | Real sign-in, without the Company ID field | The "sign-in unavailable" test |
| 4176 | Real sign-in plus company hotel search | Hotel search tests, `e2e-journeys.spec.ts` |

## Real staging journeys

```
# Public checks only (read-only page loads; no sign-in):
npm run test:e2e:staging

# Plus the signed-in journey, with a dedicated TEST company account (never a customer's):
ROYAL_STAGING_EMAIL=… ROYAL_STAGING_PASSWORD=… ROYAL_STAGING_COMPANY_ID=… npm run test:e2e:staging
```

- **Credentials:** without them, the signed-in tests are skipped and reported as `BLOCKED`.
- **Allowlist:** only foundation-check, sign-in (once per run), `/me`, hotel search and sign-out can reach the API. Registration, activation codes, resend and bookings are blocked, and trying them fails the test.
- **Frontend and backend results are separate:**
  - `[frontend]` checks that the page shows what the API actually returned.
  - `[backend]` checks that hotel search returned hotels. It's a soft check, so a supplier outage is reported with its real status and code without hiding the frontend result.
- **Rate limit:** auth routes allow about 5 requests a minute per IP, so run this file on its own.

## Coverage

| Feature | What's covered | Spec |
|---|---|---|
| Sign-in | Success, wrong password, inactive company, invalid Company ID, 429 with and without `Retry-After`, one request per submit, reload, logout, Arabic, keyboard | `auth-integration` |
| Registration | API contract, Company ID shown after success, duplicates, 429, network failure, Arabic at phone width, axe | `auth-integration`, `company-logo` |
| Activation | Public access, prefill, code removed from the URL, success then `/login`, nothing stored, 422/429/4xx/5xx/network, resend cooldown, Arabic, layout | `account-activation`, `e2e-journeys` |
| Hotel search | Form → request mapping, results, cards, prices only when verified, pagination, failure messages, home sections, Arabic, layout | `b2b-hotel-search` |
| Hotel search journeys | Staging's real 503 body, Retry, late replies ignored after the destination changes, Back/Forward, reload, sign-out | `e2e-journeys` |
| Routes | Public pages without a session, 404 when signed in, unknown pages when signed out, private pages after sign-out | `e2e-journeys`, `auth-integration` |
| Rooms and prebook | Not on `main`. The tests exist only alongside the unreleased local work | — |

## Fixed defects with regression tests

- **Home page Retry:** Retry in "A world of stays" didn't refresh "Stay At Best Hotels". Fixed with a shared retry counter in `useDefaultHotelSearch`. The `e2e-journeys` tests check that both sections reload together, with one request per Retry.
