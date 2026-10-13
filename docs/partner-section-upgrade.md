# Why Partner With Us — focused upgrade

## Files

- `src/features/home/components/partner-benefits.tsx`: existing four cards and travel photography, decorative SVG accents, localized glass badge, bounded parallax.
- `src/features/home/components/partner-benefits.module.css`: section-only styling, staggered reveals, hover elevation/zoom, responsive and reduced-motion behavior.
- `src/components/motion/travel-trail.tsx`: optional `draw` mask with unique SVG identifier; other callers retain their existing behavior.
- `tests/partner-benefits.spec.ts`: responsive, Arabic/English, accessibility, image, motion and observer-fallback coverage.
- This document.

## Assets and content

Reuses the five supplied images unchanged: `handpicked-hotels.png`, `car-rental.png`, `competitive-prices.png`, `secure-booking.png`, and `partner-travel.png`. Existing responsive WebP generation and lazy loading remain in use. No downloads, image-generation service, external font, or runtime dependency was added. Small original card images retain their source-resolution limitations.

All four titles and descriptions remain unchanged, including the existing car-rental implementation notice and booking demo voucher wording. The only new copy is “Built for Travel Partners”, localized in Arabic. No backend, account, inventory or booking logic changes.

## Motion and layout

The existing one-time scroll observer coordinates a 2.8-second masked flight-path drawing and airplane flight, heading/subtitle reveal, staggered card entrances, image reveal, and badge entrance. Cards use a consistent row height and image frame; desktop retains four cards opposite the suitcase/sea photograph, with stacked content on smaller screens.

Fine-pointer hover raises cards 3px and scales thumbnails by 1.045. The car route draws once; the pricing tag tilts once; the booking check draws once. None loops.

The photograph's scroll drift is clamped to ±8px. A passive scroll listener and a single scheduled animation frame run only while the photograph is visible. Cleanup covers navigation and preference changes. Motion changes no layout dimensions. The badge sits over open sky, leaving the suitcase and travel essentials visible.

Reduced motion disables the animation and parallax; content also remains visible without IntersectionObserver. Decorative SVGs are hidden from assistive technology. Cards remain editorial content, not misleading focusable controls.

## Release boundaries

The owner subsequently requested publishing all current changes together. This release therefore also includes the earlier footer/auth, header/hero, rental demonstration, demo state, shared styles, documentation and tests. See footer-auth-polish.md and frontend-polish.md for those changes. An isolated worktree based on current main is populated with the complete reviewed changes and tested before release; generated output, environment files and temporary artifacts are excluded from the commit.

Browser tests use Chromium at phone, tablet and desktop widths. Native iPhone Safari and physical Android Chrome are not available here; responsive emulation is not a claim of testing those devices.

GitHub SSH identity was verified as Royal1322tech. GitHub CLI is signed into a different account and was not used for repository operations; no global authentication was changed. Unauthenticated Actions API access returned 404, so workflow status requires authorized Royal1322tech API access.
