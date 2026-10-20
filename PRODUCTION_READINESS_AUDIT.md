# Production readiness audit

Audit date: 2026-10-19
Starting commit: `7a844720b6cb3e3bc52959036102773ee8ec99a3`
Target: frontend-only review of `Royal1322tech/web-app` on local `main`.
Scope is limited to the existing React frontend. No backend, CI workflow, hosting, or production configuration was changed.

## Executive summary

The frontend refinements build and typecheck locally, the dependency audit found no known vulnerabilities, and all 245 Playwright tests pass. The frontend is suitable for a **frontend staging review**. The application is **not production ready**: login, supplier inventory/rates, booking creation/cancellation, payment, invoice issuance, accounting, and persistent data still require backend contracts and enforcement. No live supplier cancellation or refund can be performed or verified from this frontend.

Cancellation data is modeled as a booking-time snapshot and the UI fails closed for unavailable or ambiguous rules. The current fixture rates contain no supplier policy data, so the UI correctly shows that cancellation terms, fees, and refunds cannot be determined. The booking flow currently prepares local details but does not create a new booking record; a future booking API must write the selected policy snapshot at creation time.

## Architecture findings

- Existing feature ownership remains intact: `src/features` contains domain screens and state; route composition stays in `src/app/router.tsx`.
- Shared nationality is owned by `useTravelPreferences`; hotel forms continue to use React Hook Form/Zod. The country list is reused rather than duplicated.
- The landing page composes existing brand, login, product, strength, language, and footer components. It does not replace the authenticated homepage.
- Invoice and accounting screens are intentionally read-only and empty without source records. Their data models are optional and typed.
- `snapshotCancellationPolicy` and `assessCancellation` centralize snapshotting and rule evaluation. Unknown time zones, malformed deadlines, absent rates, and percentage bases are not guessed.
- Client-side domain state and fixtures remain local/session scoped. Backend readiness will require API parsing and server-owned state, not frontend-only status transitions.
- The source change set adds no runtime dependencies. The supplied MP4 is 6.3 MB; it uses a poster and `preload="none"`. A performance budget, CDN, and device/network measurements have not been verified.
- Board filters are based on the matching current hotel/rate fixtures. Added demo hotels are clearly identified, and unavailable policies/availability are not represented as supplier facts. Change Room updates the selected room/rate while clearing acknowledgement/payment state.
- The booking result reads the current in-memory draft and stays neutral about supplier submission and payment. Direct route-level LCP is not available for this result because it requires an in-memory multi-step booking flow.

## Security findings

- `npm audit` reported **0 vulnerabilities** at audit time.
- No `.env` file or credential was changed. The only Vite variable key observed in the local environment-key review was `VITE_API_BASE_URL`, which must remain a public, non-secret API origin; values were not printed or reviewed.
- README documents that local sign-in is not server verified and stores only a non-sensitive session marker. This is not production authentication or authorization.
- Client-side checks cannot secure roles, agency ownership, personal data, payment, cancellation, or invoice access. The current accounting view has no role-differentiated approval actions; Laravel must enforce user/accountant separation, reviewer permissions, and no-self-approval on every relevant request.
- New local cancellation does not call a supplier, mark a refund, or change invoice settlement/accounting review. Enquiry flows remain enquiries.
- Static workflow inspection found CI on `main` and pull requests, followed by Docker image publication and an automatic staging deployment workflow on successful pushes. These workflows were not edited or invoked. A push to `main` may trigger the established deployment chain; no push occurred during this task.
- No secrets scan against repository history, penetration test, or authenticated infrastructure review was performed.

## Performance findings

- Vite build comparison for this pass: main JS **473.17 kB / 149.74 kB gzip → 478.71 kB / 151.31 kB gzip** (+5.54 kB raw, +1.57 kB gzip); login route **7.00 kB / 2.87 kB gzip → 6.14 kB / 2.61 kB gzip** (−0.86 kB raw, −0.26 kB gzip). Search route remains about **11.20 kB / 4.01 kB gzip**. This is a small main-chunk increase for the additional hotel fixtures/data and a smaller login chunk; route splitting remains in place. CSS remains production-minified and Vite-extracted; no manual preload was added.
- Local Chromium headless measurements after the change (Vite preview, 1440×900, unthrottled, `networkidle`, same reused browser context): login LCP **172 ms**, CLS **0.0000**; search **128 ms**, **0.0125**; hotel details **108 ms**, **0.0125**; My Bookings **80 ms**, **0.0125**. The earlier local run recorded 164/0.0083, 96/0.025, 84/0.0375, and 64/0.05 respectively. These are noisy local lab readings, not Lighthouse scores; the current run did not collect TBT or INP. Route resource byte totals vary with cache and viewport, so are not treated as an apples-to-apples transfer-size comparison.
- A real booking flow reached the prepared result and was visually inspected. Because the result requires in-memory flow state and is a client-side route, browser navigation timing does not provide a separate document LCP for it. No screenshot was taken before the page-load measurements; separate screenshots were used for visual review.
- Responsive WebP source sets were prepared for 25 local original images. The result-flow first card/summary image is eager; other images remain lazy. The video is **6.3 MB** and uses `preload="none"`; no promotional MP4 request was observed on initial login load. The hotel map iframe remains lazy.
- Screenshots at 1440px and 375px were inspected across login, search, detail, My Bookings, and booking result, including Arabic RTL views. Browser checks reported no horizontal overflow. No Lighthouse run, real-device profiling, CDN cache test, or memory profile was performed.
- The promotional video is **6.3 MB**, loads only on user playback due to `preload="none"`, and has a poster. Localized text tracks capture the visible promotional captions. The video has no audio stream.
- The user-supplied footage visibly contains a Hilton-branded hotel lobby. The source was retained as requested, but rights/brand clearance for public distribution was not verified.
- Existing responsive-image generation produced WebP variants for 25 source images during build. No Lighthouse run, real-device profiling, CDN cache test, or memory profile was performed.
- Large fixture catalog behavior and production data volume have not been load tested.

## Scalability findings

- Current in-memory records and fixture data do not demonstrate multi-user concurrency, durable booking writes, distributed consistency, or race-safe cancellation.
- Future cancellation endpoints should accept an idempotency key and booking version, apply server-side time-zone-aware policy rules using the stored policy snapshot, and return a durable cancellation state separately from refund/settlement state.
- No throughput or concurrent-user claims are made. No load test was run.

## Test evidence

| Command | Result | Evidence |
| --- | --- | --- |
| `npm ci` | PASS | Clean lockfile install completed; install summary reported 0 vulnerabilities. npm emitted a non-fatal notice about the allow-scripts policy for esbuild and a deprecation notice for the locked ESLint release; the subsequent build passed. |
| `npm run lint` | PASS | Final local run passed. |
| `npx tsc --noEmit` | PASS | Final local run passed. |
| `npm run build` | PASS | Vite production output generated; Zod/Rollup comment-annotation warnings remain non-fatal. |
| `npm run test` | PASS | 245/245 Playwright tests passed in 6.9 minutes. |
| `npm audit` | PASS | `found 0 vulnerabilities`. |
| `git diff --check` | PASS | No whitespace errors after the final report updates. |

The full suite includes the new demo hotel search/offers, board filters, Arabic details and fallback image, Change Room criteria and rate replacement, My Bookings rating/status layout, prepared booking-result honesty, and compact login hero alongside the existing cancellation, payment preview, registration, contact, rental, responsive, accessibility, and Arabic RTL coverage.

### Former failures resolved

The prior 11 failures were stale browser expectations, not application regressions: seven contact viewport cases expected the former private-header selector/title/layout; two contact submissions omitted required fields and queried an outdated status locator; the route-guard test incorrectly treated `/contact` as private; and the premium redesign test expected the public footer to be absent. These now assert the public contact design and valid form behavior. A separate partner-benefits breakpoint assertion was intermittently seeing hover transitions because the cursor remained over a card; the test moves the pointer away before measuring entrance animations, while a dedicated test continues to cover hover. Assertions were not weakened.

## Laravel integration requirements

Required contracts and controls remain to be agreed with the backend owner; no endpoint names are assumed:

- Server authentication, session lifecycle, password recovery, agency membership, user roles, and authorization on every booking, guest, voucher, invoice, and accounting request.
- Supplier-backed hotel and vehicle search, inventory, prices, room/rate identifiers, currency, cancellation rules, no-show/early-departure terms, and policy snapshot version/time zone.
- Booking creation that stores selected room/rate, guest data, calculated amounts, and the policy snapshot atomically and durably.
- Idempotent supplier cancellation workflow with authoritative cancellation timestamp and charge/refund eligibility separate from payment settlement. Local simulation must not be promoted as supplier cancellation.
- Payment processor integration, verified callbacks/webhooks, settlement/refund records, reconciliation, and authorization. The current payment UI does not process money.
- Invoice issuance, tax/legal data, immutable invoice references/line items, and accounting review/reconciliation records.
- Verified property contact details, notification delivery, observability, rate limiting, and error reporting.

## Infrastructure requirements not verified

Hosting and release rollback; TLS/HTTPS; CDN, cache headers and media delivery; production environment/secrets; database performance and backups; monitoring and alerting; error tracking; rate limiting/WAF; capacity and load tests; privacy retention; and supplier/payment sandbox-to-production readiness. Static GitHub workflow files were reviewed, but no GitHub Actions execution or deployment environment was accessed.

## Risk register

| Risk | Severity | Affected area | Recommended action | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| Frontend-only sign-in is not a security boundary | High | `src/features/auth`, route gate | Integrate server authentication, session revocation, roles, and server authorization before real agency data | Auth/authorization tests against backend | Open; documented |
| No supplier booking, live prices, or inventory | High | Hotel and rental flows | Define supplier-backed contracts and persist authoritative booking data | Integration tests and supplier sandbox | Blocked on backend |
| Cancellation terms absent from current hotel rate fixtures | High | `src/features/hotels/data/rooms.fixture.ts`, booking/cancellation | Supply versioned policy data and persist a policy snapshot at booking creation | Time-zone/rule integration tests using supplier fixtures | Fail-closed local UI implemented; data blocked |
| No payment, settlement, or refund integration | High | Hotel payment and cancellation | Integrate provider, verified callbacks, settlement/refund ledger and reconciliation | Payment sandbox + signed callback tests | Blocked on backend/provider |
| Invoice and accounting data are not issued or persisted | High | `/invoices`, `/accounting-review`, booking detail | Define legal invoice and accounting ownership, permissions, and write lifecycle | Backend authorization and audit-log tests | Empty-state UI implemented; data blocked |
| Automatic staging deployment follows successful main push | Medium | `.github/workflows/frontend-*.yml` | Account for the existing deployment chain in any future release approval | Observe workflow run and staging health checks | Workflow inspected; not triggered |
| Large media and route chunks need field performance evidence | Medium | promotional media, contact and registration chunks | Measure with target devices/networks; consider CDN/adaptive media where justified | Lighthouse/real-device performance budget | Local sizes recorded; runtime unverified |
| Supplied video includes third-party Hilton branding | Medium | `public/videos/royal-promo.mp4` and poster | Confirm usage rights or obtain approved replacement before public distribution | Owner/legal asset clearance | Unverified; original user asset retained |
| Vite build reports dependency annotation warnings | Low | Zod dependency output | Revisit when updating Zod/Rollup; do not patch vendored source for this cosmetic warning | Build log after dependency upgrade | Non-fatal warning remains |

## Follow-up verification — 2026-10-19

This section records fresh production-build evidence from the follow-up availability, rating/RTL, and performance work. It supersedes older statements above that said Lighthouse had not been run; those older measurements remain historical.

- Environment: local Vite production preview at `http://127.0.0.1:4173/login`; Lighthouse CLI 13.5.0; Google Chrome for Testing 156.0.8078.4; Node 24.21.0. Lighthouse default simulated mobile profile (412×823, 1.75 DPR, 150 ms RTT, 1,638 Kbps download and 4× CPU slowdown), and desktop preset. Three runs per profile. These are local lab measurements, not field Core Web Vitals.
- Mobile results (runs 1/2/3): Performance 88/88/88; LCP 3.604/3.680/3.682 s; CLS 0.0097 each; TBT 51.5/4.5/2.5 ms. Median: **88**, LCP **3.680 s**, CLS **0.0097**, TBT **4.5 ms**. The 100-point mobile target and ≤2.5 s LCP target were **not met**. Lighthouse identifies the video-section heading (`#video-title`, 687 px from the top at the emulated viewport) as the LCP element. The supplied video remains `preload="none"`; the video file was not requested on initial load.
- Desktop results (runs 1/2/3): Performance 100/100/100; LCP 0.713/0.787/0.788 s; CLS 0.0090 each; TBT 0 ms. Median: **100**, LCP **0.787 s**, CLS **0.0090**, TBT **0 ms**. This is a local lab result, not a production guarantee.
- Fresh post-split login transfer total was 474,162 bytes mobile and 396,877 bytes desktop. Compared with the pre-split run, mobile transfer fell 10,002 bytes; desktop fell 10,002 bytes. The main entry chunk fell from 151,951 to 116,765 transferred bytes (about 35.2 KB), while raw build output changed from 479,250 to 362,307 bytes (about 116.9 KB); provider code is now in its own 23,070-byte raw chunk. Mobile TBT fell from 51.5 ms to a 4.5 ms median, while LCP did not improve. Lighthouse still flags approximately 72 KiB of unused JavaScript savings across the entry and schema chunks. CSS remains extracted/minified; its 9,152-byte transferred base stylesheet was observed. The initial login request also transfers the 73,189-byte video poster; no video body was downloaded.
- Optimization: authenticated demo state is deferred behind the session gate rather than imported into public login/contact entry code. This removed unnecessary demo/booking state from the unauthenticated initial entry. Existing route splitting, responsive image variants, font preload, lazy map, and video `preload="none"` were retained. No additional speculative CSS, image, or media changes were made.
- Lighthouse coverage is limited to the public login URL. Hotel search, details, My Bookings, and booking result require frontend demo session and/or in-memory booking state; direct Lighthouse CLI navigation cannot provide representative state without an authenticated user flow. Those journeys are covered by Playwright regression tests, not claimed as Lighthouse measurements. INP was not measured because there was no interaction-based Lighthouse flow.
- Remaining bottlenecks: the mobile LCP is late because the below-fold promotional video heading is selected as the LCP candidate; unused entry/schema JavaScript remains; the poster and three responsive image resources contribute to transfer on the login route. The post-change measurement did not reduce LCP and did not reach mobile 100. Do not hide content or remove the existing video to improve the score. Hosting cache/compression behavior and real-device performance remain unverified.

### Follow-up code verification

- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed; Vite emits two non-fatal Zod comment-annotation warnings.
- `npm run test`: passed, **252 passed, 2 skipped, 0 failed** (254 tests; 7.8 minutes). The two skips are the accepted/failed Reduce Price API response cases, which require a configured test endpoint. The unconfigured-service UI path is tested and does not report a false success.
- `npx playwright test tests/public-contact.spec.ts`: passed, 11/11 after fixing the public chauffeur route to read session state from the shared auth store while demo state remains lazy-loaded.
- `npm audit`: passed, 0 vulnerabilities.
- `git diff --check`: passed.

## Final Lighthouse optimization follow-up — 2026-10-19

This run followed two focused public-entry reductions: the public login form now uses native input validation instead of loading React Hook Form/Zod for two fields, and the signed-out welcome screen is lazy-loaded from the session gate. Existing session behavior, validation messages, password visibility, and the promotional video were retained. The native form keeps its own required/email validation and focuses the first invalid field.

### Public login comparison

Environment: local production build served by Vite Preview at `http://127.0.0.1:4173`; Lighthouse CLI 13.5.0; Chrome for Testing 156.0.8078.4; Node 24.21.0. Mobile used Lighthouse's simulated mobile conditions at 412×823, DPR 1.75, 150 ms RTT, 1,638 Kbps download, and 4× CPU slowdown. Desktop used the Lighthouse desktop profile at 1440×900. Three production-preview runs were collected per profile. These are synthetic lab values, not field Core Web Vitals.

Reproducible single-run CLI form (repeat three times for the table above):

```sh
CHROME_PATH=/home/mekawy/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome npx --yes lighthouse http://127.0.0.1:4173/login --only-categories=performance --output=json --output-path=/tmp/royal-login-final-mobile-cli.json --quiet --chrome-flags='--headless --no-sandbox'
CHROME_PATH=/home/mekawy/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome npx --yes lighthouse http://127.0.0.1:4173/login --only-categories=performance --preset=desktop --output=json --output-path=/tmp/royal-login-final-desktop-cli.json --quiet --chrome-flags='--headless --no-sandbox'
```

Authenticated pages were measured via Lighthouse User Flow with an actual form login and `disableStorageReset`; the runner command was `node /tmp/royal-lh-routes-3.mjs mobile` and `node /tmp/royal-lh-routes-3.mjs desktop`. These temporary runners are outside the project. A final single-run CLI confirmation after the three-run measurements scored mobile 91 (LCP 3.314 s, CLS 0.00972, TBT 27 ms) and desktop 100 (LCP 0.705 s, CLS 0.00899, TBT 0 ms), within the observed run-to-run variance.

| Route | Device | Before | After | LCP median | CLS | TBT median | FCP median |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/login` | Mobile | 88 | 91 | 3.308 s | 0.00972 | 27 ms | 1.807 s |
| `/login` | Desktop | 100 | 100 | 0.668 s | 0.00899 | 0 ms | 0.446 s |

Before values are the three-run login baseline recorded in the preceding follow-up above: mobile 88 (LCP median 3.680 s; CLS 0.00972; TBT median 4.5 ms), desktop 100 (LCP median 0.787 s; CLS 0.00899; TBT 0 ms). After values come from three independent Lighthouse CLI runs per profile (mobile scores 91/91/91; desktop 100/100/100). The mobile score improved by three points and LCP by about 372 ms, but the requested 100 score and ≤2.5 s LCP target were **not achieved**. The lower TBT median in the earlier baseline shows these synthetic task timings vary; the code change does not establish an interaction latency improvement.

The measured initial transfer fell from 474,150 to 432,055 bytes on mobile and from 396,865 to 354,770 bytes on desktop (about 42.1 KB per profile). Lighthouse's estimated unused JavaScript savings fell from 73,801 to 52,687 bytes. The shared entry asset changed from 362.30 KB raw / 116.31 KB gzip to 352.45 KB raw / 112.54 KB gzip. The public login no longer initially downloads the form-schema chunk, and the signed-out welcome page is not part of the entry chunk. These changes reduce public-entry work without removing any page content.

Trace evidence still names the promotional video section heading `#video-title` as the login page's LCP candidate (at about 687 px from the top in the emulated mobile viewport). In the inspected trace its LCP element-render delay was roughly 127–175 ms and TTFB roughly 2.5–3.2 ms; the remaining aggregate mobile LCP remains above target, and the evidence does not justify a specific larger causal claim. The 73,189-byte promotional poster is requested on initial load; the video itself remains `preload="none"` and is not transferred. Lighthouse still estimates about 52.7 KB unused JavaScript. No speculative poster/video removal or content hiding was applied.

### Authenticated route flow measurements

The browser signed in through the real public form with the repository's documented demo account, then Lighthouse User Flow navigated to the representative fixture-backed routes. The route heading, final URL, and active session marker were checked on every run. Three runs per route and profile were taken in one authenticated flow; later navigations therefore benefit from browser caching and are not independent cold-cache visits. Values below are medians of those three runs. Route score and asset transfer can differ substantially between first and warmed navigation.

| Route | Device | Performance median | LCP median | CLS | TBT median | Transfer median |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Sharm hotel search | Mobile | 99 | 1.743 s | 0.02187 | 31 ms | 5,878 B |
| Royal Azure hotel details | Mobile | 100 | 1.730 s | 0.02187 | 34.5 ms | 6,005 B |
| My Bookings | Mobile | 100 | 1.662 s | 0.02187 | 26 ms | 5,468 B |
| Sharm hotel search | Desktop | 88 | 1.735 s | 0.01250 | 8.5 ms | 5,878 B |
| Royal Azure hotel details | Desktop | 89 | 1.662 s | 0.01250 | 27.5 ms | 6,132 B |
| My Bookings | Desktop | 90 | 1.657 s | 0.01250 | 27.5 ms | 5,468 B |

The first desktop detail visit transferred 254,558 bytes and scored 79 while subsequent cached visits transferred about 6.1 KB and scored 89. This illustrates why the repeated median alone must not be treated as a cold-load budget. Search first visits transferred 38,249 B desktop and 86,433 B mobile; later same-session navigations transferred about 5.9 KB. Booking summary was exercised by selecting an actual room in the authenticated UI and measured as a Lighthouse timespan: performance score 100 for the available timespan audits, CLS 0, TBT 0, transfer 10,990 B. Lighthouse timespan does not provide navigation LCP/FCP for that SPA transition. A reliable Lighthouse measurement for the prepared booking-result state was not obtained, so it remains unverified here; existing Playwright coverage verifies its user-facing behavior. INP was not reported because no valid field interaction sample was collected.

### Final code and verification notes

- Fresh `npm run build` completed with 680 transformed modules and existing non-fatal Rollup annotation warnings from Zod. Build output confirms route-level chunks remain separate; the public login entry does not eagerly import demo provider code, and the welcome page has a separate lazy chunk.
- Final verification on this code state: `npm run lint` passed; `npx tsc --noEmit` passed; `npm run build` passed; `npm run test` passed with **252 passed, 2 skipped, 0 failed** (254 total; 7.9 minutes); `npm audit` found 0 vulnerabilities; `git diff --check` passed. The two skipped cases require an actual configured Reduce Price backend endpoint and cover accepted and failed API responses; the client handles the unconfigured endpoint honestly.
- The 100/100 mobile target is **not achieved**. The mobile login score is 91 and LCP median 3.308 s; hotel results also vary by initial cache and route assets. Deployment compression/cache behavior and real-device/field Core Web Vitals remain unmeasured.
- Backend integration, production authentication, supplier inventory/booking, payment, email delivery, hosting/CDN behavior, and load capacity remain outside frontend-only verification. These lab results do not establish production scalability.

## Prioritized action plan

**Before frontend staging review:** review this local diff and have the owner approve whether to use the existing main-branch workflow. This task intentionally leaves the deployment chain untouched.

**Before production:** complete server authentication/authorization, supplier search and booking persistence, policy snapshot handling, actual cancellation/payment/refund integration, invoice/accounting contracts, operational monitoring, security/privacy review, and measured performance/capacity validation. Keep the current fail-closed UI until real policy/payment facts exist.

## Readiness verdicts

- Frontend staging readiness: **READY FOR FRONTEND STAGING REVIEW**. This verdict means review of the frontend demonstration only; hosted staging itself was not changed or verified.
- Full production readiness: **PRODUCTION READINESS NOT VERIFIED**. Backend, database, authentication controls, supplier/payment integrations, and infrastructure have not been integrated or tested.
