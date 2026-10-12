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

| URL | Screen |
| --- | --- |
| `/` | Homepage, hotel search, deals, partner benefits, collections, footer |
| `/search` | Sample results, filters, sorting, comparison, rooms and rate details |
| `/hotels/:hotelId` | Gallery, facts, stay form, date prices and interactive map |
| `/bookings` | Sample bookings, filters and sorting |
| `/favourites` | Browser-local saved hotels |
| `/welcome` | Agency account entry |
| `/login` | Sign in |
| `/forgot-password` | Recovery request |
| `/verify-otp` | Four-digit verification form |
| `/reset-password` | New password form |
| `/register/agency` | Redirect to company information |
| `/register/agency/company` | Company Information |
| `/register/agency/contact` | Contact Information |
| `/register/agency/documents` | Documents Upload |
| `/register/agency/review` | Review & Submit |

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

Live search, inventory, rates, bookings, cart/payment, login, recovery and registration submission remain unavailable. No fake success or endpoints were added. Favourites and locale persist in browser storage. Registration values/files stay in memory and reset on refresh or leaving registration. File validation checks metadata, not authenticity.

Public/catalog and recovery screens preserve English/Arabic and RTL/LTR support. Welcome, sign-in and registration retain their supplied English presentation. Full Arabic agency translation is not implemented. Source-resolution limits and provisional validation rules are documented in `docs/history`.

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
