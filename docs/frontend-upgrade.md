> Initial upgrade handoff. Later owner-approved work adds compact mobile navigation and the rental demonstration; see [frontend polish](frontend-polish.md) for current status.

# B2B frontend upgrade checklist

All work local. No backend, commits, pushes, deployment, real reservations or money movement.

## Inspection

- Existing: lazy React Router pages, bilingual catalog/recovery, CSS Modules, responsive image pipeline, RHF/Zod forms, native dialogs, saved hotels, comparison, gallery, OSM map, date prices, registration guards and memory-only documents.
- Gaps: hotel details does not render rooms; cart actions unavailable; no checkout, voucher, booking actions, profile, notifications or wallet. Recovery screens validate but do not connect into a demonstration journey.
- Keep all existing routes, fixtures and original assets. Car Rental is explicitly in scope per owner clarification. Preserve and brand its existing tab/placeholder, imagery, and entry points; vehicle search and booking are not yet implemented.
- Brand attachments: image-1 is the concept board; image-2 is the logo. Originals copied verbatim to public/brand/reference.

## Implementation and evidence gates

- [x] Brand variants, semantic tokens, typography, reusable motion/loading/states.
- [x] Homepage, navigation, footer and shared catalog styling.
- [x] Search, mobile filters, hotel details and selectable room/rate states.
- [x] Typed memory-only demo store; summary, guests, payment scenarios, result, voucher.
- [x] Booking details, status filtering, cancellation/modification, timeline.
- [x] Profile/edit, notifications, email verification, coherent demo recovery.
- [x] Wallet, transactions, details, filters and reusable empty/error/loading previews.
- [x] Desktop/mobile/RTL, keyboard, reduced motion, print and accessibility verification.
- [x] npm ci; lint; TypeScript; build; existing and new Playwright scenarios.
- [x] Final requirement-by-requirement audit, README and handoff.

Demo guest/profile data stays only in React memory and resets on refresh. Financial fixtures are illustrative and must not define production credit rules. Demo state controls explicitly preview outcomes without artificial network delays.

## Implementation map

| Requirement                           | Implementation                                                                                                                             | Verification evidence                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Preserve existing app/routes/features | Existing feature modules and registration provider retained; React Router expanded                                                         | Original migration suite; registration draft retained across steps    |
| Branding and originals                | `public/brand/reference/*`, layered `src/components/brand-logo.tsx`, full/navbar/emblem/favicon SVG and mobile PNG                         | Original attachment hashes; rendered screenshots                      |
| Tokens and typography                 | `src/app/brand.css`; navy/blue, strategic gold, semantic statuses and finances, system fonts with Arabic fallback                          | Contrast scans; English/Arabic screenshots                            |
| Motion/loading                        | `Reveal`, layered animated emblem, real router loading, route transition without remounting, hover and dialog CSS, reduced-motion override | Reduced-motion browser checks; no artificial timers                   |
| Homepage/search                       | B2B hero/CTAs, original optimized imagery, working search, hotel cards, mobile filter dialog                                               | Search/query/filter/comparison/favourite regression tests             |
| Hotel/room states                     | Existing gallery/map/chart, details room options, board filtering, room/rate dialogs, sold-out demo, capacity checks                       | Room tests; selected stay/price consistency                           |
| Booking journey                       | Demo provider, summary, RHF/Zod guests, four payment outcomes, result, printable voucher                                                   | Desktop/mobile checkout, retry, print and no-network-write assertions |
| Booking management                    | Existing filters retained; added failed records, details, timeline, cancel/modify native dialogs                                           | Modification total/date checks; cancellation and voucher availability |
| Agency/auth                           | Profile/edit, notifications, email-state preview, explicit demo access and recovery links, registration submission preview                 | Profile validation, read filters, recovery/registration regression    |
| Wallet/transactions                   | Typed financial fixtures, balances, insufficient-credit view, search/type/status filters, pagination, details dialog                       | Finance interactions and accessibility                                |
| Shared states                         | `SystemState`, `StatePreview`, `Skeleton`, inline/brand/page loaders                                                                       | Explicit loading/empty/error/unavailable previews and retry           |
| Responsive/accessibility              | Logical CSS, native dialogs, stable field names/descriptions, table scroll regions, print styles                                           | 320/375/768/1024/1440/1869/1920 widths, RTL, Axe scans, keyboard/return focus        |

## Deliberate frontend boundaries

- No real authentication, email delivery, supplier inventory, payments, cancellations or credit changes. The existing transport is unused by demo screens.
- The supplied double room supports two adults. Larger groups can use multiple double rooms; child inventory and other properties' room data are unavailable rather than invented.
- Guest/contact/profile values and demo records stay in memory. Reload restores seeded records and clears the active booking. Existing language/favourites storage remains.
- Credit metrics are calculated from the illustrative transaction fixtures: completed rows yield USD 2,500 available and USD 1,500 used; pending debits total USD 552. New booking previews do not debit this statement. These are not production credit rules.
- Registration retains its original English presentation and memory-only file handling. Existing public/recovery Arabic support is retained; new workspace screens provide bilingual UI.
- Original image resolution and fixture inaccuracies remain source limitations. No supplier verification is implied.


## Final local handoff — 2026-10-13

1. **Completed work:** shared Royal Vacation branding and motion, connected frontend hotel booking demonstration, booking management, account and financial screens. Car Rental placeholder restored and accessible through a new overview route.
2. **Preserved screens:** homepage, search/results/filtering/comparison/favourites, hotel gallery/map/price chart and room dialogs, bookings list, login/recovery, welcome and all registration steps. All 22 supplied asset hashes match `docs/original-assets.sha256.json`.
3. **New screens:** `/car-rental`, `/booking/summary`, `/booking/guests`, `/booking/payment`, `/booking/result/:id`, `/bookings/:id`, `/bookings/:id/voucher`, `/agency`, `/agency/edit`, `/notifications`, `/verify-email`, `/wallet`, `/transactions`. README contains the complete route table.
4. **Incomplete:** vehicle search/results/details, driver information, rental checkout/confirmation/voucher and rental management. Those did not exist in the inspected Git baseline. Production authentication, registration submission, email/OTP delivery, inventory, reservations and payments require approved backend contracts; current flows explicitly remain demonstrations.
5. **Design system:** navy/royal blue surfaces and text, strategic gold, semantic status tokens, bold heading/price hierarchy and English/Arabic system fonts. Navigation increased to 17px/700; language to 16px/700; account controls have 44px targets and 24px icons.
6. **Logo assets:** `public/brand/` contains full/navbar/emblem/favicon SVG variants and mobile PNG; `public/brand/reference/` preserves the supplied originals. `src/components/brand-logo.tsx` implements layered SVG interpretations, not an automated raster-to-vector conversion.
7. **Motion:** shared `Reveal`, pointer-based hero depth, decorative travel trail, SVG logo sequence, route entry, card/button/tab/dialog feedback, staggered sections, skeletons and status transitions. Fine-pointer checks, cleanup and reduced-motion fallbacks apply; no artificial loading delay.
8. **Demo architecture:** typed fixtures and `DemoProvider` in `src/features/demo`; room capacity policy centralized; URL stay criteria retained across search, reload, hotel changes and room selection. Sensitive form/demo data remains in memory and resets on refresh. Existing locale/favourites persistence remains.
9. **Important source areas:** `src/app/{router.tsx,brand.css}`, `src/components/{brand-logo.tsx,motion,ui/system-state.tsx}`, `src/features/{home,hotels,demo,car-rental}`, auth/recovery/registration components and `tests/`.
10. **Dependencies:** none added; package manifest and lockfile unchanged.
11. **Validation:** `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build` passed; production-build browser suite **33 passed in 39.6s**. `git diff --check` passed. Tests include original flows, demo outcomes, validation, cancellation/modification, RTL, refresh, Axe scans and reduced motion.
12. **Performance/accessibility:** lazy routes and existing optimized image pipeline retained, no animation library added. Entry JS build output is about 440.45 kB / 138.59 kB gzip; this is a build measurement, not a Lighthouse score. Automated accessibility checks cover selected screens, not a certification or complete manual audit.
13. **Local review:** development at `http://localhost:5173/`; inspect `/car-rental`, `/search`, `/hotels/eastern-al-montazah`, `/bookings`, `/agency`, `/wallet`, `/transactions`. Start checkout through a supported room. Review screenshots in `test-results/`, including `header-en-1869.png`, `header-ar-1869.png`, `header-ar-375.png` and `car-rental-ar-375.png`.
14. **Known limits/next steps:** original low-resolution images and sample hotel data are retained; registration retains its English presentation. Agree vehicle designs and supplier contracts before implementing live rentals. No commits, pushes, deployment, CI triggers, remote or credential changes were performed.

## Header/layout verification

The current source contains language, notification, cart and account controls. Prior Git used unavailable buttons for notification/cart; current links open the clearly labeled frontend workspace. The screenshot's missing controls were not reproduced in a clean production browser. The running development server did return Vite `504 Outdated Optimize Dep`; a config reload (mtime only, no config-content change) restored it, and the actual development page was rechecked at 1869px.

Header and homepage content now have explicit centered widths capped at 1280px; the root fills available width, including the existing flex-based auth layout. Below 1200px the main navigation collapses while account controls remain visible. Browser regression tests assert all four controls are fully in view, clickable and connected, and measure equal side margins for the header/search/content at 375, 1024, 1440, 1869 and 1920px in both languages. No overflow-hiding workaround was introduced.
