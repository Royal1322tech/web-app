# Footer and authentication logo polish

## Scope

The existing homepage footer is now a shared `SiteFooter` component. Its navy background, landscape asset, copy, demo notice and four destinations are preserved. The brand aligns opposite a two-column navigation group on desktop; below 768px the brand and navigation stack. Logical layout mirrors in Arabic.

Links use the existing SVG Icon component: car, building (hotels and agency), user (partner access). Each full link has a minimum 44px target, gold keyboard outline, subtle icon lift and an underline originating from the reading direction. The landscape remains decorative.

## Logo variants

`BrandLogo` accepts `variant="static" | "auth" | "footer"`; the existing homepage and loading variants remain unchanged.

- Login, Welcome and the persistent registration shell use the same short auth entrance: globe fade/scale, a curved plane flight, staggered ROYAL and VACATION. Total sequence: 1.45 seconds, once per mount.
- Registration retains its shell across all four steps, so validation, typing and step navigation do not replay the logo.
- Footer logo is a home link. It stays static until hover or keyboard focus, then plays a 700ms local plane gesture and 900ms gold trail accent once. No full reveal or loop.
- Reduced motion disables animations and removes the auth motion path, preserving the original plane position.
- SVG animation changes no layout dimensions, does not intercept controls and adds no dependencies. Accessible brand labels are preserved; internal SVG shapes remain hidden from assistive technology.

## Files for this change

- `src/features/home/components/site-footer.tsx` (new)
- `src/features/home/components/home-screen.tsx`
- `src/features/home/home.module.css`
- `src/components/brand-logo.tsx`
- `src/app/brand.css`
- `src/pages/login.tsx`
- `src/features/welcome/components/welcome-screen.tsx`
- `src/features/agency-registration/components/registration-shell.tsx`
- `tests/footer-auth.spec.ts` (new)
- This document

## Verification

Focused browser coverage includes English/Arabic footer layouts at 375, 768 and 1440px, SVG links, keyboard outlines, hover settlement, reduced motion, footer accessibility, auth entrance geometry and original plane positions, and registration DOM/data persistence between steps. Existing tests cover the full four-step registration flow, file retention, login validation, recovery, hotels, car rentals and account previews.

All checks run against the production build in Chromium. These viewport checks are not a claim of testing native Safari/iOS. Authentication and registration keep their existing frontend-only behavior; no backend contract or transaction was added.

Validation on 2026-10-14: npm ci, lint, standalone TypeScript check and production build passed. The complete browser suite passed 67/67 tests. After the final footer background sizing adjustment, production build and the 11 focused footer/auth tests passed again. English desktop and Arabic mobile footer screenshots were visually reviewed. No commit, push or deployment was performed.
