# Production checklist

Audit date: 2026-10-19. This checklist concerns the local frontend; it does not certify the backend or hosted infrastructure.

## Verified

- [x] Existing React/Vite application and lockfile retained; no parallel application introduced.
- [x] Working tree was inspected from starting commit `7a844720b6cb3e3bc52959036102773ee8ec99a3`; existing work was preserved.
- [x] 249 ISO country codes are available; `Global` is absent; nationality, currency, and locale remain independent.
- [x] Nationality persists and synchronizes between shared preferences, hotel search, query state, and Hotel Details.
- [x] Public login landing uses the supplied Royal Vacation MP4, a frame-derived poster, native controls, deferred preload, and localized text tracks.
- [x] Public header contains Products, Why Royal Vacation, Contact Us, and EN/AR controls; the logo returns to `/login`, and agency registration remains the sign-in card entry point.
- [x] Login heading is clear in English and Arabic; desktop and 375px English/Arabic screenshots were inspected for contrast, alignment, responsive stacking, and overflow.
- [x] Public login hero uses a compact centered sign-in card; the video, public navigation, and subsequent landing sections remain present.
- [x] Board filter availability is derived from matching room-rate offers and current catalog filters; labels are normalized and disabled options provide accessible explanations.
- [x] Three localized demo hotels with occupancy-aware rooms and mixed board offers are integrated into search, detail, selection, and booking flows. Reused local photos are identified as illustrative.
- [x] My Bookings uses compact booking metadata, local-preview status labels, and accessible separate hotel-class/guest-score ratings.
- [x] Change Room preserves stay criteria and replaces the selected offer while resetting policy acknowledgement and payment selection.
- [x] Booking result displays the actual current draft and payment choice without claiming a supplier reservation or real payment.
- [x] Responsive WebP sources remain generated for 25 local photos; non-primary images are lazy, first-result images receive priority, the promotional video uses `preload="none"`, and the map iframe is lazy.
- [x] Group Quotation is available in main navigation; Chauffeur/Transfers actions still use enquiry routes.
- [x] Hotel details place stay search before the gallery and preserve criteria.
- [x] Booking vouchers do not present a stay total as an issued invoice and do not invent hotel contact information.
- [x] Invoice/accounting screens have explicit empty states and do not fabricate records or transitions.
- [x] Booking summary cards apply/clear status filters without dropping other search criteria.
- [x] Cancellation policy snapshots are deep-copied; unsupported fee/refund outcomes fail closed; local cancellation updates only status and timeline.
- [x] Final `npm run lint`, `npx tsc --noEmit`, and `npm run build` passed.
- [x] Final `npm run test` passed: 245/245 Playwright tests.
- [x] Clean `npm ci` completed; final lint, TypeScript, production build, dependency audit, and `git diff --check` passed.
- [x] `npm audit` reported zero known vulnerabilities.
- [x] Local screenshots were reviewed for desktop/mobile login (English and Arabic), desktop hotel search/details/My Bookings/booking result, 375px Arabic hotel details, and the existing 320px footer layout. The tested pages had no horizontal overflow.
- [x] No commit, push, or deployment occurred; GitHub Actions were not triggered.

## Not verified

- [ ] Hosted staging behavior, HTTPS, CDN/media caching, production headers, and rollback.
- [ ] Rights/brand clearance for the user-supplied video, which visibly includes a Hilton hotel lobby.
- [ ] GitHub Actions run status and deployment health. Workflow files were inspected only.
- [ ] Server-side authentication, role/agency isolation, supplier booking persistence, actual payments/refunds, or accounting controls.
- [ ] Production monitoring, alerting, error tracking, backups, rate limiting, privacy retention, and accessibility with assistive technology.
- [ ] Lighthouse/real-device performance, production data volume, and load/capacity testing.
- [ ] Supplier policy and cancellation scenarios beyond the typed, local rule evaluator; current sample rates contain no policy rules.

Recommended next action: review the completed local pages and diff, then approve a separate release plan. Do not treat local browser checks as deployment evidence.

## Blocked

- [ ] Real hotel and vehicle inventory, pricing, booking creation, cancellation, and policy snapshots require Laravel and supplier contracts. Next action: define versioned response models including exact terms, deadline/time zone, currency, and booking-time snapshot semantics.
- [ ] Refund estimates and settlement states require verified payment records and supplier/refund eligibility. Next action: implement a provider-backed payment ledger and server-authoritative refund lifecycle; until then the frontend must keep saying amounts are undetermined.
- [ ] Official invoice and accounting review records require backend issuance, legal/tax rules, persistence, permissions, and audit history. Next action: agree ownership and contracts before populating the existing empty screens.
- [ ] A real hotel phone number and verified support service require owner-supplied property/contact data. Next action: supply verified fields through the property API; current UI omits absent values.
- [ ] Public distribution rights for the user-supplied promotional footage have not been verified. Next action: obtain owner/legal clearance for its visible third-party Hilton branding or provide an approved asset.
- [ ] Production readiness requires an integrated environment, security review, infrastructure evidence, and measured load/performance results. Next action: complete the production action plan in `PRODUCTION_READINESS_AUDIT.md`.

## Verdict

- Frontend staging review: **READY FOR FRONTEND STAGING REVIEW**; local lint, typecheck, build, screenshot inspection, and full browser suite passed. Hosted staging itself remains unverified.
- Full production readiness: **PRODUCTION READINESS NOT VERIFIED**.
