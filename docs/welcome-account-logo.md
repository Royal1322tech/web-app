# Welcome screen, account navigation and homepage logo

Local frontend changes for the 2026-10-13 request. No backend integration, dependencies, commits, pushes or deployment.

## Welcome restoration

- Kept the original `WelcomeScreen`/`AuthShell` composition and unchanged `public/images/welcome-travel.png` coastal photograph.
- Desktop: 39.2% photograph, full layout height, rounded end corners, white content area, centered existing logo, Welcome heading/subtitle and balanced side-by-side account cards.
- Scoped original teal tokens/buttons and card spacing to `.auth-page--welcome`, leaving Login and other pages' colors intact.
- Tablet/mobile: photo above content, cards stack on small screens, 48px buttons. Welcome now follows the existing locale, including Arabic text and RTL; registration/login retain their existing presentation.
- Sign In → `/login`; Register → `/register/agency/company` through the existing registration redirect.
- The current attachment contained the request text only; no new Figma screenshot was available for a pixel-by-pixel comparison. The repository's original structure/image and the explicit proportions/text in the request were used.

## Account behavior

- Guest header account icon → `/welcome`.
- Explicit demo entry → `demoSessionActive` in the existing `DemoProvider`; no second store, cookie or localStorage session is introduced.
- Existing Login's “Explore demo agency workspace” action activates the session and opens `/agency`; real Sign In still only validates and shows its disconnected notice.
- Guest direct visits to `/agency`, `/agency/edit`, `/notifications`, `/wallet`, `/transactions` or `/verify-email` show a partner-access screen with no agency data, with choices to open Welcome or explicitly enter the sample workspace.
- Active demo header account icon → `/agency`. Existing workspace links retain access to profile, wallet, notifications and transactions.
- Sign Out in workspace navigation clears the session, selected room, guests, profile edits, records and notification changes, then returns to Welcome. Refresh also resets the in-memory session. Back navigation cannot reveal guarded account content after Sign Out.
- This is a frontend demonstration boundary, not a real authentication/security mechanism.

## Homepage logo

- Reused the current layered SVG and existing header dimensions.
- `HomepageBrandLogo` introduces the emblem with fade/scale, moves its plane along a cubic SVG motion path, applies one gentle wave cycle and reveals the wordmark.
- All motion finishes within 1.8 seconds and settles to the original static geometry. No continuous rotation, timers or layout dimensions are animated.
- One introduction per document; returning home through client navigation does not replay it. A fresh document may play it again.
- Reduced-motion uses the static SVG, without a motion path. Other logos/loaders keep their existing animations.

## Changed source files

- `src/features/welcome/components/welcome-screen.tsx`, `src/features/welcome/welcome.css`: restored scoped composition and localized copy.
- `src/components/layout/auth-shell.tsx`: correct responsive image sizing for the now-visible mobile welcome photograph.
- `src/features/demo/demo-provider.tsx`, `session-gate.tsx`, `shared.tsx`, `account.tsx`: existing context session actions, guest boundary, Sign Out and explicit demo wording.
- `src/features/auth/components/login-form.tsx`: explicit demo entry.
- `src/features/home/components/site-header.tsx`: guest/demo account destination and homepage introduction.
- `src/components/brand-logo.tsx`, `src/app/brand.css`: finite layered SVG introduction and scoped access-panel style.
- `src/app/router.tsx`: grouped account-related demo routes under the access boundary.
- `tests/welcome-session.spec.ts`: seven focused browser tests. Existing account/header tests now explicitly enter the demo or expect guest Welcome, preserving feature assertions.

## Validation

- `npm ci`, `npm run lint`, `npx tsc --noEmit`, production build: passed.
- Seven focused browser tests passed: English/Arabic at 375/1440px, card/image geometry, guest/Login/Registration routes, demo Profile/Wallet/Notifications/Transactions, Sign Out/back behavior, refresh reset, SVG end geometry/no layout shift/no replay, reduced motion and Welcome Axe scans.
- Desktop English and mobile Arabic screenshots visually inspected; review `test-results/welcome-en-1440.png` and `test-results/welcome-ar-375.png`.
- Full production-build regression suite: **40 passed (44.7s)**, including hotel booking, Car Rental, registration/recovery, header centering and the seven new scenarios. All 22 original asset hashes still match. `git diff --check` passed.
