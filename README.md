# Royal Vacation frontend

Official local project: `/home/mekawy/royal-frontend`.

The official frontend is this React + Vite + TypeScript + Tailwind CSS 4 project in `Royal1322tech/web-app`, branch `main`. The former `/home/mekawy/royal-frontend-code` directory is retained only as a migration backup, not a second maintained application.

## Development

Use Node.js 22.12+ (the team's Docker and CI use Node 22) and the committed npm lockfile:

```sh
npm ci
npm run dev
```

Vite prints the development URL. Development and production builds generate responsive WebP variants from unchanged supplied assets. Generated variants and build output are ignored by Git. The committed image manifest allows typechecking immediately after installation.

```sh
npm run lint
npx tsc --noEmit
npm run build
npx playwright install chromium
npm run test
```

Browser tests use the production preview on port 4173. Set `PLAYWRIGHT_BASE_URL` to test a running Docker container or staging. Tests use disposable browser contexts and fixture data; no account or registration information is submitted.

## Routes

| URL                          | Screen                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `/`                          | Welcome when signed out; homepage, hotel search, deals, partner benefits, collections, footer after demo sign-in         |
| `/car-rental`                | Branded B2B service overview and explicit rental demonstration |
| `/car-rental/search` | Fictional vehicle search, criteria, filters and sorting |
| `/car-rental/vehicles/:id` | Vehicle specifications, sample conditions and selection |
| `/car-rental/summary`, `/car-rental/driver`, `/car-rental/payment` | Rental summary, validated fictional driver information and payment outcome previews |
| `/car-rental/bookings`, `/car-rental/bookings/:id` | In-memory rentals, confirmation/pending/failure details, modification/cancellation |
| `/search`                    | Sample results, filters, sorting, comparison, rooms and rate details         |
| `/hotels/:hotelId`           | Gallery, facts, stay form, date prices and interactive map                   |
| `/bookings`                  | Demo bookings, filters, sorting and management links                         |
| `/bookings/:id`              | Demo booking details, timeline, modify/cancel previews                       |
| `/bookings/:id/voucher`      | Print-ready voucher for confirmed demo records                               |
| `/booking/summary`           | Selected room, dates, occupancy and conditions                               |
| `/booking/guests`            | Validated fictional guest/contact information                                |
| `/booking/payment`           | Credit/test payment UI and explicit outcome previews                         |
| `/booking/result/:id`        | Confirmed, pending or failed simulation                                      |
| `/agency`, `/agency/edit`    | Demo agency profile and validated local edits                                |
| `/notifications`             | Session notification list and read/unread controls                           |
| `/verify-email`              | Explicit email verification state preview                                    |
| `/wallet`                    | Illustrative credit overview and insufficient-balance state                  |
| `/transactions`              | Searchable/filterable/paginated transaction examples                         |
| `/favourites`                | Browser-local saved hotels                                                   |
| `/welcome`                   | Agency account entry                                                         |
| `/login`                     | Sign in                                                                      |
| `/forgot-password`           | Recovery request                                                             |
| `/verify-otp`                | Four-digit verification form                                                 |
| `/reset-password`            | New password form                                                            |
| `/register/agency`           | Redirect to company information                                              |
| `/register/agency/company`   | Company Information                                                          |
| `/register/agency/contact`   | Contact Information                                                          |
| `/register/agency/documents` | Documents Upload                                                             |
| `/register/agency/review`    | Review & Submit                                                              |

Unknown hotels/routes show a not-found screen. Later registration steps redirect to the first incomplete prerequisite. Direct URLs and refreshes work through Vite locally and the nginx SPA fallback in Docker.

## Architecture

- `src/app`: React Router tree, lazy route modules, global CSS and locale-provider composition.
- `src/pages`: page compositions and persistent nested registration layout.
- `src/features`: home, hotels, bookings, preferences, authentication/recovery, registration and localization. Fixtures, CSS Modules, React Hook Form and Zod remain feature-owned.
- `src/components`: shared branding, layout and UI controls, including native responsive images.
- `src/lib/api`: typed transport requiring a runtime response parser; no endpoint or response contract is assumed.
- `public/images`: supplied source images. `scripts/optimize-images.mjs` creates content-hashed WebP variants without upscaling.
- `tests`: Playwright route, interaction, responsive and accessibility regressions.

## API configuration and scope

Committed `.env.development`, `.env.production` and `.env.example` contain only:

```dotenv
VITE_API_BASE_URL=https://staging-api.royalis.tech
```

Use ignored `.env.local` or `.env.production.local` for local overrides. Vite embeds `VITE_` variables at build time; never put secrets in them. Docker includes only the committed production environment file. Rebuild to change that configuration.

`requestJson` in `src/lib/api/client.ts` accepts an endpoint, a parser from `unknown` to the confirmed response type, and fetch options including an abort signal. It rejects other origins and does not send cookies or log response bodies. Fixture screens do not call it until backend contracts are supplied.

Live search, inventory, rates, bookings, payments, login, recovery and registration submission remain unavailable. An explicitly labeled frontend demonstration now connects room selection, booking summary, guest entry, simulated payment outcomes, booking management and printable demo vouchers. No requests, card credentials, supplier changes or money movement occur. The processing preview advances manually; no fake loading delay is used.

`src/features/demo` owns typed fixtures and the React context demo-state layer. The temporary `src/features/auth/demo-auth.ts` service validates the public demo account **demo@royalvacation.test / Demo@12345** locally. It never calls an authentication API or creates a token. Only a non-sensitive marker is stored in `sessionStorage`; the password and personal data are never stored. Demo access survives reloads in the same tab. This client-side gate is not production security or backend-verified authentication.

Signed-out `/` shows the existing Welcome page. All routes default to protected, including unknown routes. Public exceptions are `/welcome`, `/login`, `/forgot-password`, `/verify-otp`, `/reset-password`, and the existing four `/register/agency` steps. Internal deep links first show Welcome, then return to the requested local path (including query/hash) after sign-in. External return URLs are rejected. Signed-in visits to Welcome or Login return home. Sign Out removes demo access, resets in-memory data, and returns to Welcome; history navigation cannot render protected content. Locale, currency, nationality and favourites are preserved.

Guest details, selections, bookings, agency edits and notification state remain in memory and reset on refresh. Registration values/files remain in memory and reset on refresh or leaving registration; file validation checks metadata, not authenticity. Real submission remains disabled, with a separately labeled demo receipt preview that never signs users in or creates an account. Laravel must supply real authentication, authorization, session expiry/revocation, account approval and recovery before real user data is supported.

Playwright uses the actual login form through `tests/helpers/demo-login.ts`, without injecting auth storage or bypassing the gate. `npm run test` runs the existing complete `test:e2e` suite.

Review the implementation checklist, boundaries and validation in [frontend upgrade](docs/frontend-upgrade.md). Brand originals and SVG interpretations are in `public/brand`; runtime layered animation is in `src/components/brand-logo.tsx`. No runtime dependencies were added.

Public/catalog and recovery screens preserve English/Arabic and RTL/LTR support. Welcome supports English/Arabic using its original account-selection composition. Sign-in and registration retain their supplied English presentation. Full Arabic agency translation is not implemented. Source-resolution limits and provisional validation rules are documented in `docs/history`.

## Git and deployment

Use only Royal1322tech authentication and `git@github.com:Royal1322tech/web-app.git`. Author identity is configured locally; unrelated account settings are untouched. Preserve local work before rebasing, inspect staged changes, and follow the team's workflow:

```sh
# Commit reviewed local work first if the tree is dirty.
git pull --rebase origin main
git status
git add .
git commit -m "Frontend development"
git push origin main
```

Exclude credentials, generated output and unrelated files before committing. Never force push. The existing pipeline remains **Frontend CI → Frontend Docker Build → Frontend Auto Deploy**. CI includes TypeScript and browser checks. Docker still builds on Node 22 and serves `dist` with nginx; `nginx.conf` adds history fallback and caching. Team image names, workflow triggers, deployment host and remote deployment script remain unchanged.

- Repository: https://github.com/Royal1322tech/web-app
- Actions: https://github.com/Royal1322tech/web-app/actions
- Staging: https://staging.royalis.tech

Actions inspection requires Royal1322tech API authentication; SSH alone does not authorize CLI API calls. Never use another project's credentials here.

See [migration verification](docs/migration.md). The old directory must not be deleted without final owner confirmation.

See [Welcome, account navigation and logo verification](docs/welcome-account-logo.md) for the focused restoration and animation changes.

The compact mobile header exposes language/account/notification/cart tools through the navigation toggle. Hero CTA arrows use SVG rather than emoji-capable characters. Rental demo state is part of the existing `DemoProvider`, with three typed fictional vehicles and no supplier connections; refresh or Sign Out clears rental selections, driver details and records. See [polish and rental handoff](docs/frontend-polish.md).


## Final demo presentation update

Sign-in credentials are intentionally absent from the rendered website; login fields start empty. The route guard owns the successful-login redirect so session activation cannot race a second redirect to the homepage. Tests authenticate through the real form and scope header logout separately from workspace logout.

The existing Welcome composition now includes a decorative CSS/SVG flight path with a reduced-motion fallback. Registration keeps all four steps but no longer asks for Role. Hotel search carries optional `nationality` in its criteria and query string: country codes reuse the registration country list; `Global` preserves the existing unrestricted preference. The form initializes from the navbar preference when no search nationality is supplied. Editing search nationality does not write global preferences, alter currency/language, or change fixture pricing.

Contact Us and the shared footer use the owner-approved email `royal.travel@royalvacation.online` and WhatsApp `https://wa.me/201070724143` (display `+20 01070724143`). No address or app-download URL is invented. Contact Us omits the footer; its form still creates a local preview only. Existing transaction history, booking behavior, hero slideshow, hotel carousels, video and assets are unchanged.

## Targeted premium controls and readability

Welcome now loops the existing emblem airplane on a seven-second orbit, with a static reduced-motion fallback. Registration uses pinned `libphonenumber-js` metadata and local `flag-icons` SVGs for international phone selection/validation; the phone country remains independent of nationality. The shared header language control reuses Popover and locale persistence. Hotel filters retain the original fixture data and add known-city filtering and six stable board categories; unsupported board categories are visibly unavailable. See [enhancement scope and integration boundaries](docs/premium-frontend-enhancement.md).
