# Workspace, booking policy and comparison release

Starting revision: `1dde14413e0510a9ff2deb4e617078c9e83da581`.

## Preference CI failures

Both reported failures are consistent with a reproduced popover focus race. Pressing a radio label blurs the trigger before the label activates its input. The deferred blur handler observed focus outside the panel and unmounted it before pointer release. A deterministic regression holding the pointer across animation frames failed at both 430px and 768px on the original implementation. The fix closes on an actual focus transfer outside, leaving outside-pointer and Escape dismissal intact. The original preference and final-UI tests remain unchanged. No timeouts or checks were disabled.

## Frontend behavior

- `/points` is protected by the existing demo session gate. Typed, separate fixtures provide posted and pending points activity. Only posted entries affect totals. Search, type filtering, pagination and empty results are supported. No earning rules, redemption or cash conversion exist.
- The existing booking summary includes cancellation information and explicit, initially unchecked acknowledgment. Absent supplier policy is labeled unavailable in both room offers and booking review, without a refund guarantee. The model accepts supplied policy kind, deadline, timezone, penalty and conditions. Guest/payment routes and booking creation require review. Changing room/offer or stay criteria resets review. Retry of the identical failed attempt preserves its recorded acknowledgment; no acknowledgment is inferred for legacy fixture bookings.
- One shared workspace navigation is rendered by the catalog shell, using route metadata for workspace routes and the existing Workspace wrapper for checkout/rental screens. Group quotation and hotel bookings now retain it too. Mobile tabs scroll inside the header, with active links and RTL support.
- My Profile uses existing demo contact/agency data, the existing local edit form and workspace shortcuts. No verified status or tier is invented.
- The profile icon remains the only account dropdown trigger. Only its duplicate My Agency shortcut is removed; `/agency` and `/agency/edit` remain reachable from the workspace.
- Comparison cards use existing photos, prices, stars, reviews, breakfast and amenities. Choose Hotel links to known hotel details while retaining the current query string; currency preferences remain unchanged. Properties without a supported details route have disabled actions. Removal and clearing remain available.
- Only the Competitive Prices and A Clear Booking Journey heading decorations are removed. Homepage imagery, layout, video, hero and carousel implementations are preserved.

## Integration boundaries

Laravel still needs to supply authenticated identities, persistent profile data, a points ledger and authoritative supplier cancellation policies. Booking records and acknowledgment are demonstration state in memory, not security or legal acceptance stored by a backend. No new endpoint, payment, supplier inventory, deployment pipeline or map feature was introduced.

Tests cover the original CI failures, keyboard/popover behavior, workspace routes, profile editing, points accounting/history, cancellation review/reset/retry, comparison facts and navigation, unavailable properties, and responsive English/Arabic screens at 320, 375, 390, 430, 768, 1024 and 1440px. Screenshots and generated reports stay ignored.

## Changed files

- [README.md](../README.md)
- [docs/workspace-booking-comparison-release.md](../docs/workspace-booking-comparison-release.md)
- [src/app/router.tsx](../src/app/router.tsx)
- [src/components/ui/popover.tsx](../src/components/ui/popover.tsx)
- [src/features/demo/cancellation-policy-card.tsx](../src/features/demo/cancellation-policy-card.tsx)
- [src/features/demo/checkout.tsx](../src/features/demo/checkout.tsx)
- [src/features/demo/demo-provider.tsx](../src/features/demo/demo-provider.tsx)
- [src/features/demo/points-data.ts](../src/features/demo/points-data.ts)
- [src/features/demo/points.tsx](../src/features/demo/points.tsx)
- [src/features/demo/profile-settings.tsx](../src/features/demo/profile-settings.tsx)
- [src/features/demo/shared.tsx](../src/features/demo/shared.tsx)
- [src/features/demo/types.ts](../src/features/demo/types.ts)
- [src/features/demo/workspace-navigation.tsx](../src/features/demo/workspace-navigation.tsx)
- [src/features/demo/workspace.css](../src/features/demo/workspace.css)
- [src/features/home/components/partner-benefits.tsx](../src/features/home/components/partner-benefits.tsx)
- [src/features/home/components/site-header.tsx](../src/features/home/components/site-header.tsx)
- [src/features/hotels/cancellation-policy.ts](../src/features/hotels/cancellation-policy.ts)
- [src/features/hotels/components/catalog-shell.tsx](../src/features/hotels/components/catalog-shell.tsx)
- [src/features/hotels/components/comparison.tsx](../src/features/hotels/components/comparison.tsx)
- [src/features/hotels/components/room-options.tsx](../src/features/hotels/components/room-options.tsx)
- [src/features/hotels/data/rooms.fixture.ts](../src/features/hotels/data/rooms.fixture.ts)
- [src/features/hotels/hotels.module.css](../src/features/hotels/hotels.module.css)
- [tests/account-menu.spec.ts](../tests/account-menu.spec.ts)
- [tests/header-layout.spec.ts](../tests/header-layout.spec.ts)
- [tests/hero-flight.spec.ts](../tests/hero-flight.spec.ts)
- [tests/popover-focus.spec.ts](../tests/popover-focus.spec.ts)
- [tests/welcome-session.spec.ts](../tests/welcome-session.spec.ts)
- [tests/workspace-release.spec.ts](../tests/workspace-release.spec.ts)

## Release validation

Validated on Node 22.23.3: `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build` and the complete `npm run test:e2e` suite (171 passed, 0 failed). Focused accessibility checks wait for the existing dialog entrance animation to finish before measuring contrast; animation behavior is unchanged. Screenshots were inspected for desktop profile/comparison, tablet Arabic profile, and mobile Arabic points/comparison/cancellation review.

Authorized GitHub CLI access independently confirmed historical runs #18 and #19 failed in `Browser regression checks`: #18 lost the Egypt radio before its checked assertion; #19 timed out locating the EGP label after nationality selection. The original tests pass with the popover fix. Remote CI for this release is reported separately after the single final push.
