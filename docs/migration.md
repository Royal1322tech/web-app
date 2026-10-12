# React + Vite migration — 2026-10-12

Official local project: `/home/mekawy/royal-frontend`.

All implementation work belongs to the official `Royal1322tech/web-app` repository on `main`. The old `/home/mekawy/royal-frontend-code` directory remains an unchanged backup pending deployment verification and final owner approval to remove it.

## Preserved work

All 80 feature/shared source files transferred, with framework imports and navigation adapted. All 15 original route pages/entry points retained, including registration redirect and dynamic hotel details. React Router replaces Next file routing; nested registration context retains draft values and File objects across steps. Routes load lazily.

All 20 supplied images plus both favicons match source SHA-256 hashes in `original-assets.sha256.json`. CSS rules are retained; only the Tailwind import scan scope changed to `src`, preventing report/test text from changing generated utilities. No design sections, fixture files or interactions were removed. Next dependencies, routing, image APIs, generated types, configuration and client directives are absent from the active application.

Reviewed against supplied `Section 1.png`, `Section 2.png` and `Registration 1.png`: homepage section order/imagery, gallery arrangement, room-search layout, chart, welcome/login and registration compositions. This preserves the corrected implementation; it is not a pixel-perfect claim. Sample text, truthful unknown property facts, native interactive map and source-resolution limits remain.

Room/rate dialogs retain their existing entry point under **View Rooms** on search and booking cards. Hotel details retain stay search, gallery, chart and location. Live inventory and transactions remain unavailable.

## Verification

- Lockfile installation and Node 22 Alpine Docker build succeed. The final nginx container passes all 13 browser checks, including direct-route refreshes.
- Vite development server starts and renders the app.
- Lint, strict TypeScript and production build pass.
- Production Playwright suite: 13 passing checks. Covers direct routes/refreshes, not-found pages, search validation and query navigation, rooms/child ages, filters/sorting/comparison, saved favourites, gallery and rate dialogs, date chart and map URL, registration prerequisites/files/drafts, authentication validation without network submission, booking filters, OTP entry and password mismatch.
- No horizontal overflow at 320, 375, 768 and 1440px on checked public/authentication/registration-entry screens. Arabic and RTL persist after refresh at each width.
- Automated axe WCAG A/AA checks pass on homepage, hotel, search, login and company screens; not a complete accessibility certification.
- Production dependency audit reports zero vulnerabilities at verification time.

Tests use Chromium. Other engines, physical devices and measured Core Web Vitals remain unverified. OpenStreetMap is an external dependency. Screenshots/traces live in ignored `test-results`.

## Deployment and account boundaries

Preserved the team's three workflows and targets. Added CI typechecking/browser checks and nginx SPA fallback. Production configuration contains only the public staging API origin. Original images remain as fallbacks; WebP variants are generated during builds.

SSH identifies Royal1322tech. Repository-local author and committer: `Royal1322tech <340480975+Royal1322tech@users.noreply.github.com>`, matching recent official commits. Global account settings remain unchanged. Actions API inspection requires isolated Royal1322tech authentication.

## Remaining product dependencies

Backend contracts, sessions, uploads, real inventory/rates/bookings and payment are not implemented. Agency welcome/login/registration retain English UI. Sample data, provisional constraints, browser-local favourites and in-memory registration remain intentional limitations. No secrets, supplier costs or markup were introduced.

Retirement requires a verified push and staging deployment. Deleting the old directory always requires explicit final owner confirmation. See the delivery report for final Git and deployment status.
