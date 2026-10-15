# Targeted frontend enhancement

Starting commit: `ec0073c3dd6a74d2f3366c7f25f5080b98ebb4fd` (the existing single profile-icon account menu is preserved).

## Implementation and boundaries

- Welcome reuses the existing separate SVG airplane element. A seven-second, closed elliptical CSS motion path is scoped to Welcome; no extra plane, logo replacement, asset modification or layout animation. Reduced motion restores the original static emblem. Other logo animations remain unchanged.
- Registration keeps its four steps and in-memory React Hook Form state. `libphonenumber-js/max` supplies all supported phone countries, calling codes and strict number metadata. `flag-icons` supplies locally bundled SVG flags, independent of emoji support or remote CDNs. Country search accepts localized/English names, ISO codes and dialing codes. Country and national-number state are separate from nationality. Invalid or mismatched country numbers cannot advance; review uses the validated E.164 number. This validates format, not ownership or reachability. No submission or account creation was added.
- The existing Popover is reused for phone countries and language choices, with native keyboard controls, Escape/outside dismissal and viewport positioning. Language persists through the existing locale provider, updates direction without navigation, and leaves form/search state intact. The phone field alone localizes its labels/errors and direction within the existing English registration presentation.
- Existing hotel filtering/sorting/drawer remains intact. Added known-city filtering, an explicit name-clear action, data-derived amenities, active filter counts, negative-price validation and stable board categories. Prices remain explicitly USD: no exchange rates are available.
- The six board categories are Room Only, Breakfast / Bed & Breakfast, Half Board, Full Board, All Inclusive and Ultra All Inclusive. Only the first two are backed by the current sample-rate fixtures. The other four are displayed as disabled with localized “Not in sample data” notices. `HotelListing.boardPlans` accepts verified categories later; no supplier alias is guessed. The legacy breakfast flag describes the existing sample card's meal basis, not live inventory.
- Known city, stars, review scores, sample nightly price, amenities and existing business/luxury/package fields are filterable in combination. Unknown property type, district, Wi-Fi, parking, airport shuttle and other absent fields are not fabricated. Hotel images, fixtures and room rates are unchanged.
- Shared footer retains navy, original logo/illustration, real official email/WhatsApp destinations, legitimate links, badges and disclaimer. Four balanced desktop groups, readable copy, wrapping contact information and localized Coming Soon replace the sparse layout. Badges remain non-links. Contact Us still has no shared footer.
- Catalog card addresses, helper text, filters, registration review/help, workspace metrics/table details/booking steps have scoped readability improvements. Homepage sections, card proportions, carousel code/speeds/direction, hero, video and maps are untouched.

## Integration remaining

Laravel/supplier integration must supply verified rate-level board categories, availability, currency pricing/conversion, property classifications, districts and amenity data before exposing more active filters. “All Inclusive All Meal” requires supplier clarification. Real registration, OTP/phone ownership verification, authentication, account approval, booking and payments remain backend work. Frontend demo authentication is not production security.

## Verification

`npm ci`, lint, TypeScript, production build and the full Playwright suite are required before push. Tests use the real demo sign-in UI. New coverage checks all seven requested viewport widths (320, 375, 390, 430, 768, 1024 and 1440), English/Arabic, SVG flags, invalid/valid phones, country/nationality independence, step persistence, keyboard dismissal, orbit continuity/reduced motion, board data boundaries, combined filters/reset/empty results and footer accessibility. Existing authentication, booking, carousels, contact and map checks remain enabled.

Dependencies: [libphonenumber-js](https://github.com/catamphetamine/libphonenumber-js), [flag-icons](https://github.com/lipis/flag-icons). Versions are pinned in package.json and the lockfile; update phone metadata through reviewed dependency updates.

## Changed files

- `README.md`
- `docs/premium-frontend-enhancement.md`
- `package-lock.json`
- `package.json`
- `src/app/globals.css`
- `src/components/ui/popover.tsx`
- `src/features/agency-registration/components/contact-phone-field.css`
- `src/features/agency-registration/components/contact-phone-field.tsx`
- `src/features/agency-registration/components/registration-review.tsx`
- `src/features/agency-registration/lib/phone.ts`
- `src/features/agency-registration/schemas/registration.schema.ts`
- `src/features/demo/workspace.css`
- `src/features/home/components/app-store-badges.module.css`
- `src/features/home/components/site-footer.tsx`
- `src/features/home/components/site-header.module.css`
- `src/features/home/components/site-header.tsx`
- `src/features/home/home.module.css`
- `src/features/hotels/components/hotel-filters.tsx`
- `src/features/hotels/components/search-results.tsx`
- `src/features/hotels/hotels.module.css`
- `src/features/hotels/lib/board-plans.ts`
- `src/features/hotels/lib/filter-hotels.ts`
- `src/features/hotels/types.ts`
- `src/features/localization/language-selector.css`
- `src/features/localization/language-selector.tsx`
- `src/features/welcome/components/welcome-screen.tsx`
- `src/features/welcome/welcome.css`
- `tests/account-menu.spec.ts`
- `tests/b2b-upgrade.spec.ts`
- `tests/car-rental.spec.ts`
- `tests/contact-redesign.spec.ts`
- `tests/demo-auth.spec.ts`
- `tests/final-ui.spec.ts`
- `tests/footer-auth.spec.ts`
- `tests/header-layout.spec.ts`
- `tests/helpers/header.ts`
- `tests/hero-flight.spec.ts`
- `tests/migration.spec.ts`
- `tests/mobile-polish.spec.ts`
- `tests/preferences-enquiries.spec.ts`
- `tests/premium-enhancement.spec.ts`
- `tests/rental-journey.spec.ts`

## Completed local validation

- `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build`: passed.
- `npm run test` → `npm run test:e2e`: **146 passed**, no skipped tests or failures (4.4 minutes).
- The two affected existing drawer/layout regressions were verified separately before the final full run.
- Browser screenshots inspected for settled Welcome, Arabic phone selection at 320px (including territory flags), desktop search/filter cards, Arabic mobile language menu and desktop footer. Automated layout checks cover all seven requested widths and both locales. Generated images/reports are excluded from Git.
- Existing maps, fixtures, original assets, homepage slideshow/carousel implementations and deployment workflows are unchanged.
