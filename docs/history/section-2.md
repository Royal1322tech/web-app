> Historical source notes. Next.js setup and earlier verification claims do not describe the active Vite project. See ../../README.md and ../migration.md.

# Section 2 implementation — 2026-10-11

Latest corrections, verification results and changed-file inventory: [Recovery and Section 2 fidelity](recovery-and-fidelity.md).

## Routes and behaviour

- `/search`: shared validated date/destination/room controls; hotel name, board, star, review, profile, amenity, price, and package filters; sorting; favourites; comparison; hotel/room navigation. Results are explicitly local fixture matches, not live availability.
- `/hotels/[hotelId]`: seven supplied gallery images with keyboard-capable dialog, property summary, amenities, overview, date/room and board controls, selectable sample price chart, interactive map, and recommended hotels. Unknown hotel IDs use Next's not-found behaviour.
- `/bookings`: labelled sample records, booking ID, booking/check-in date range, status, owner, traveller, destination, reference and cancellation-fee filters; sorting/result limit; inline details. No reservation, cancellation, payment, or confirmation is created.
- `/favourites`: add/remove, empty state, comparison, and browser-local persistence. No server account is implied.

The header links to these routes and replaces the flag with EN/AR selection. The homepage keeps its layout and original assets; validated search now navigates to the local results screen with typed criteria in its URL. Quotes, cart, notifications, rental booking, and unavailable booking actions remain clearly unavailable.

## Architecture and localization

App Router pages remain server entry points. Interactivity is isolated in the hotel, booking, preference, and localization features. Shared search still uses the existing React Hook Form/Zod schema and provisional guest limits. Hotel and booking filtering are pure functions, separate from fixture data and components. No endpoints, response formats, authentication or data-access services were invented.

`LocaleProvider` provides EN/AR selection, translations, and document language/direction. Static homepage sections use small translated text leaves; interactive components use the locale hook and explicit bilingual strings. Existing homepage copy is centralized in `messages.ts`; typed hotel records carry bilingual display text. Logical CSS properties and direction-aware room positioning/scrolling support RTL. Locale and non-sensitive favourite/comparison IDs are stored locally with memory fallback when browser storage is blocked. Persisted preferences apply after hydration; this implementation does not add localized URLs or server-side locale detection.

Localization covers the B2C homepage, header, and new screens. Existing agency Welcome/Login/registration retain English/LTR through explicit language boundaries. Their validation, provider, document selection, and submission behaviour are unchanged. The B2C preference is preserved when returning from agency screens.

## Image mapping

All files below are byte-for-byte copies from `/home/mekawy/Downloads/images royal/sec2/`:

| Supplied asset | Frontend file (under `public/images/hotels/`) | Pixels |
| --- | --- | --- |
| `image 12.png` | `entrance-original.png` — cards and main gallery | 816×676 |
| `image 13.png` | `bedroom-original.png` — top left tile | 288×200 |
| `Rectangle (1).png` | `spa-original.png` — top right tile | 1012×768 |
| `steven-ungermann-aRT5UCf2MYY-unsplash.png` | `blue-bedroom.png` — middle left tile | 1100×768 |
| `andrew-ruiz-fmz-B9At9iQ-unsplash.png` | `beach-original.png` — middle right tile | 1012×768 |
| `high-level-description-a-photograph-of-a_K9mMzrcZW160ohlzSSJUmA_sBXmJN6hRkOJEAtXtQ6ZPQ 4.png` | `bathroom-original.png` — bottom left tile | 252×200 |
| `Rectangle.png` | `breakfast-original.png` — bottom right tile | 1012×768 |

The new originals replace six low-resolution files; the missing blue bedroom is now supplied. Updated URLs avoid serving previously cached thumbnail optimizations. No duplicated originals, screenshots, artificial sharpening or watermark removal. Existing lobby/pool photographs remain the recommendation images.

Next Image uses source dimensions and responsive sizes. The gallery retains the Figma large entrance plus two-column/six-tile composition; small sources are capped at their native dimensions, including the dialog. The entrance still needs a roughly 1600×1352 original for a sharp 2× desktop display. Bedroom/bathroom need at least roughly 576×400 / 552×420; recommendation lobby/pool originals remain only 286px wide and need at least 572px for 2× rendering. The full design and London map screenshots remain reference-only.

## Interactive map

No map provider package, environment file, or provider credentials were found in the project. The integration uses the official [OpenStreetMap embed](https://wiki.openstreetmap.org/wiki/Export) when the location section approaches the viewport (IntersectionObserver), with a **Load interactive map** fallback. The iframe is lazy-loaded, supports marker/zoom/pan, preserves provider attribution, and adds no client map dependency or API key.

Eastern Al Montazah uses published coordinates **31.27859, 30.02302**, taken from the map/directions links in the [property information site's contact page](https://www.easternalmontazahhotel.com/contact). This is a third-party property-information source, not a hotel-owned verification; the production hotel service should supply authoritative coordinates. The London/Marble Arch map in Figma was not applied to an Alexandria hotel. Other sample hotels have no invented coordinates and show an explicit unavailable-location state. Range/non-finite checks reject invalid points. A separate Google Maps link remains available if embedding is blocked.

No credentials or setup are needed for this preview. External map/tile availability and provider terms remain dependencies; review hosting/provider requirements for production traffic. Hotel coordinates and property details should come from the future backend. The embed's own controls are supplied by OpenStreetMap.

## Initial implementation verification (historical)

- ESLint, `next typegen` / `tsc --noEmit`, and production build passed.
- Chromium tests passed for local search, filters/sorting, favourites across refresh, comparison table, homepage-to-search navigation, required child ages (0 and 17), gallery navigation/Escape, sample price selection, missing-location fallback, booking filters/details, and persistent Arabic RTL.
- The real OpenStreetMap frame loaded tiles and the hotel marker. Zoom and mouse drag-to-pan passed against the external provider, without mocked map responses.
- English and Arabic screenshots, no-horizontal-overflow checks, and axe WCAG A/AA scans passed for homepage/search/details/bookings/favourites at 320, 375, 768, 1024, and 1440px. Automated scans are not a complete accessibility audit.
- Mobile interaction checks passed for menu navigation, filter reveal, date-range validation/reset, booking ID filtering, Arabic room controls, board preference, and gallery.
- Regression passed for Welcome/Login and all four registration steps: required validation, entered values/files in Review, Back retention, disabled Submit, and direct-step guards. Arabic preference survives the agency flow. No runtime errors or application data submissions were observed.
- Pure-function checks passed for coordinate boundaries and combined hotel/booking filters. No project dependencies were added.
- Temporary browser scripts and logs: `/tmp/royal-section2-check/`. Screenshots: `/tmp/royal-section2-check/screens/`.

Checks used Chromium only; other browser engines, physical devices, and measured Core Web Vitals were not tested. Live inventory, rates, booking/account services, cart, payment, cancellation, and authoritative property details remain backend dependencies. Persisted favourites are browser-local rather than account-synced. Sample price dates and booking records are fixed fixtures.

## Initial implementation changed files (historical)

- `README.md`
- `docs/section-2.md`
- `public/images/hotels/bathroom.png`
- `public/images/hotels/beach.png`
- `public/images/hotels/bedroom.png`
- `public/images/hotels/breakfast.png`
- `public/images/hotels/entrance.png`
- `public/images/hotels/spa.png`
- `src/app/(public)/bookings/page.tsx`
- `src/app/(public)/favourites/page.tsx`
- `src/app/(public)/hotels/[hotelId]/page.tsx`
- `src/app/(public)/search/page.tsx`
- `src/app/layout.tsx`
- `src/components/layout/auth-shell.tsx`
- `src/features/agency-registration/components/registration-shell.tsx`
- `src/features/bookings/components/booking-filters.tsx`
- `src/features/bookings/components/bookings-screen.tsx`
- `src/features/bookings/data/bookings.fixture.ts`
- `src/features/bookings/lib/filter-bookings.ts`
- `src/features/home/components/featured-deals.tsx`
- `src/features/home/components/hero.tsx`
- `src/features/home/components/home-screen.tsx`
- `src/features/home/components/hotel-card.tsx`
- `src/features/home/components/hotel-collection.tsx`
- `src/features/home/components/hotel-search-form.tsx`
- `src/features/home/components/partner-benefits.tsx`
- `src/features/home/components/room-editor.tsx`
- `src/features/home/components/room-selector.tsx`
- `src/features/home/components/site-header.tsx`
- `src/features/home/components/unavailable-button.tsx`
- `src/features/home/home.module.css`
- `src/features/hotels/components/catalog-shell.tsx`
- `src/features/hotels/components/comparison.tsx`
- `src/features/hotels/components/favourites.tsx`
- `src/features/hotels/components/hotel-details.tsx`
- `src/features/hotels/components/hotel-filters.tsx`
- `src/features/hotels/components/hotel-gallery.tsx`
- `src/features/hotels/components/hotel-map.tsx`
- `src/features/hotels/components/hotel-result-card.tsx`
- `src/features/hotels/components/price-chart.tsx`
- `src/features/hotels/components/recommended-hotels.tsx`
- `src/features/hotels/components/search-results.tsx`
- `src/features/hotels/data/hotels.fixture.ts`
- `src/features/hotels/hotels.module.css`
- `src/features/hotels/lib/filter-hotels.ts`
- `src/features/hotels/lib/map-location.ts`
- `src/features/hotels/types.ts`
- `src/features/localization/locale-provider.tsx`
- `src/features/localization/messages.ts`
- `src/features/preferences/use-hotel-preferences.ts`
