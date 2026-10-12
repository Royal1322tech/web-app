> Historical source notes. Next.js setup and earlier verification claims do not describe the active Vite project. See ../../README.md and ../migration.md.

# Recovery and Section 2 fidelity — 2026-10-11

## Result

Continued the existing implementation; no replacement hotel UI. Restored the large entrance plus six gallery tiles in Figma order, including the previously missing blue bedroom. Removed the interrupted thumbnail-only layout. Corrected responsive image sizes, source dimensions, native-resolution caps and image URLs (old URLs could return stale optimized thumbnails).

Rooms & Boards and Location now share a circular section heading: 46px light-blue circle, 24px teal bed/pin SVG, 12px text gap. Room search uses the pale-blue four-column row with both date controls, existing guest selector, and Search. The existing board preference remains available in a disclosure. Property facts retain the reference's tinted check-in/out block, fact rows and full-width map action, using unknown values rather than invented property details.

Restored the chart's 20 bars, USD axis/grid, two-line dates and sample availability legend. Typed fixtures are separate from the component; selection shows a sample price and explicitly unavailable booking. The location area keeps its heading/address, View More, rounded responsive map, and Google Maps link. Search/card structure and existing interactions remain intact; shared cards only receive accurate image dimensions/sizes and stable thumbnail cropping.

Screenshots at 375, 768 and 1440px were visually compared with the supplied Section 2 reference. This is not a pixel-perfect claim: fixture text, truthful unknown property facts, the actual Alexandria map, low-resolution source limits and accessible mobile reflow differ from the reference.

## Images

See [the exact asset mapping and dimensions](section-2.md#image-mapping). All seven files match their supplied original bytes (SHA-256 checked). Six obsolete thumbnail files were removed; replacements have new names to avoid stale optimizer caches. The blue bedroom is new. No screenshot was used as a UI or map replacement. Source watermarks and baked-in rounded corners were preserved.

The new originals greatly improve the card and gallery imagery. Remaining source limits:

- Entrance: 816×676, rendered about 772px wide at 1440px. It cannot provide full 2× desktop detail; approximately 1600×1352 is needed.
- Bedroom: 288×200; bathroom: 252×200. These are not 4× exports. Their display sizes are capped, with a small gutter where needed. At least roughly 576×400 and 552×420 are needed for the current 2× desktop tiles.
- Recommendation lobby/pool remain 286px wide; at least 572px originals are needed for 2× display. No matching replacements were supplied.

Next Image's default quality remains 75; increasing quality would not restore absent source detail. Responsive requests were decoded and inspected at DPR 2, not inferred from URL widths. Large supporting tiles receive 384px images on mobile/tablet and 640px at desktop. The optimizer preserves native limits for smaller sources.

## Map

The original unavailable-location message belongs to the three fictional fixtures, which lack coordinates. Eastern Al Montazah already has published coordinates 31.27859, 30.02302 from a third-party property-information page; no coordinates were changed or invented. Authoritative production hotel coordinates remain a backend requirement.

OpenStreetMap's actual hosted interactive embed loads near the viewport with IntersectionObserver and `loading="lazy"`; manual loading remains a fallback. No map package, API key, new environment variable or new project dependency is required. Provider attribution remains intact. The external Google Maps link is always available for a mapped property; missing-coordinate fixtures retain an honest fallback and a link to the corresponding mapped hotel. Cross-origin/provider failures cannot all be detected by iframe `onError`, so the external link remains available independently.

Verified against the live provider, without mocked responses: marker, zoom, mouse pan, keyboard pan, mobile touch pan, lazy activation, Google Maps coordinate URL and missing-coordinate fallback. Physical devices and other browser engines were not tested.

## Previously unfinished recovery work

Completed `/forgot-password`, `/verify-otp`, `/reset-password`, plus the existing login's recovery link. The auth shell accepts localized direction and back navigation while preserving existing defaults. It reuses the official logo and the existing login travel asset matching the supplied recovery screenshots; no duplicated imagery.

EN/AR form labels, errors and RTL layouts work. Four-digit OTP entry supports numeric validation, Arabic digit normalization, focus movement, arrows, Backspace and paste. Passwords have independent visibility controls, required/matching validation and provisional 8–128 character UI limits.

Only local validation occurs. No OTP is generated or verified; no email is sent or password changed. Forms do not advance as if verification succeeded. No new endpoints, requests, success states or secret storage were added. Real sending, verification, reset authorization, account support, server password policy and rate limits await Laravel. Direct routes currently expose design previews, not a recovery authorization mechanism.

## Actual verification

- `npm run lint`: passed, exit 0.
- `npx tsc --noEmit`: passed, exit 0.
- `npm run build`: passed, exit 0; all three recovery routes and existing routes built.
- Chromium browser suite: 14/14 groups passed — recovery validation/navigation/pending states, OTP keyboard/paste, password visibility/matching/limits, Arabic validation/RTL, gallery order/dialog/keyboard, icons, chart selection, room search, live map, missing-location fallback, responsive EN/AR checks, accessibility, favourites persistence, registration, existing page smoke and runtime-error checks.
- No horizontal overflow at 375/768/1440px for all recovery pages, search and hotel details in EN/AR.
- Axe WCAG 2 A/AA scans: no violations on the three recovery screens and hotel details. Automated scans are not a complete accessibility audit.
- Registration regression completed Company → Contact → Documents → Review, required validation, in-memory file selection, disabled Submit and reload guard.
- Additional checks passed for actual hotel-name filtering and price sorting, DPR 2 image delivery, asset hashes, and mobile map touch/zoom.
- No browser runtime errors or recovery POSTs; OTP/password values were absent from local/session storage and URLs.
- After final property-panel/map sizing changes, affected responsive/icon/axe/live-map checks were repeated at all three sizes. The final image-size correction was checked against decoded mobile responses.

Browser tools were installed only in `/tmp/royal-recovery-check`, outside the project. Scripts/results: `/tmp/royal-recovery-check/verify.cjs`, `media-map.cjs`, `final-details.cjs`, `/tmp/royal-verification.json`, `/tmp/royal-media-map.json`. Screenshots: `/tmp/royal-final-details-{375,768,1440}.png`, `/tmp/royal-search-final.png`, and `/tmp/royal-forgot-password-{375,768,1440}-{en,ar}.png`. Initial follow-up axe invocation required an explicit Playwright browser context; the harness was corrected before its final run. No project test or runtime dependencies were added.

## Changed files in this continuation

There is no Git metadata in this checkout; source changes were compared against a pre-edit snapshot. Earlier completed homepage, booking, favourite, navigation and registration implementations were preserved.

- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`
- `src/app/(auth)/verify-otp/page.tsx`
- `src/components/layout/auth-shell.tsx`
- `src/features/auth/components/login-form.tsx`
- `src/features/auth/recovery/components/forgot-password-form.tsx`
- `src/features/auth/recovery/components/otp-verification-form.tsx`
- `src/features/auth/recovery/components/recovery-shell.tsx`
- `src/features/auth/recovery/components/reset-password-form.tsx`
- `src/features/auth/recovery/messages.ts`
- `src/features/auth/recovery/recovery.module.css`
- `src/features/auth/recovery/schemas/recovery.schema.ts`
- `src/features/hotels/components/hotel-details.tsx`
- `src/features/hotels/components/hotel-gallery.tsx`
- `src/features/hotels/components/hotel-map.tsx`
- `src/features/hotels/components/hotel-result-card.tsx`
- `src/features/hotels/components/price-chart.tsx`
- `src/features/hotels/components/recommended-hotels.tsx`
- `src/features/hotels/components/section-heading.tsx`
- `src/features/hotels/data/hotels.fixture.ts`
- `src/features/hotels/data/prices.fixture.ts`
- `src/features/hotels/hotels.module.css`

Asset changes:

- `public/images/hotels/bathroom-original.png`
- `public/images/hotels/beach-original.png`
- `public/images/hotels/bedroom-original.png`
- `public/images/hotels/blue-bedroom.png`
- `public/images/hotels/breakfast-original.png`
- `public/images/hotels/entrance-original.png`
- `public/images/hotels/spa-original.png`

Removed obsolete originals: `public/images/hotels/{entrance,bedroom,spa,beach,bathroom,breakfast}.png`.

Documentation: `docs/section-2.md`, `docs/recovery-and-fidelity.md`.
