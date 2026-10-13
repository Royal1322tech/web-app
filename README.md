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
npm run test:e2e
```

Browser tests use the production preview on port 4173. Set `PLAYWRIGHT_BASE_URL` to test a running Docker container or staging. Tests use disposable browser contexts and fixture data; no account or registration information is submitted.

## Routes

| URL                          | Screen                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `/`                          | Homepage, hotel search, deals, partner benefits, collections, footer         |
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

`src/features/demo` owns typed fixtures and the React context demo-state layer. Guests open `/welcome` from the header account icon. The existing `DemoProvider` also owns an explicit, memory-only demo session: enter it using “Explore demo agency workspace” on Login or the partner-access screen. Profile, profile editing, notifications, wallet, transactions and email-verification preview withhold their contents until that explicit action. This is a frontend preview boundary, not backend authentication. Sign Out returns to Welcome and clears session edits/selections; refresh also resets access. Guest details, selections, bookings, agency edits and notification state exist only in memory and reset on refresh. Favourites and locale retain their existing browser storage. Registration values/files remain in memory and reset on refresh or leaving registration; file validation checks metadata, not authenticity. Real submission remains disabled, with a separately labeled demo receipt preview.

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
