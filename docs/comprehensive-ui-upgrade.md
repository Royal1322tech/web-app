# Comprehensive frontend upgrade — local work only

## Audit completed before implementation
- React 19 / Vite / strict TS / RHF / Zod; no carousel or animation dependency. CSS/SVG/IntersectionObserver motion already exists.
- Home: Hero + header, validated search with Hotels/Car Rental tabs, repeated featured fixtures, four partnership cards and photograph, hotel collection, footer.
- Hotel search, filters, details, per-occupant guest names, room occupancy rules, status previews, confirmed-only voucher and booking management already work as explicit demonstrations. Preserve them.
- Rental search, vehicle/details/driver/payment previews, rental management are implemented with in-memory state.
- Welcome/login/recovery and persistent four-step registration are implemented. Explicit DemoProvider entry controls agency/wallet/notifications. Real credentials are never accepted as authentication.
- No public contact route, group quotation, profile/settings routes, guest header buttons, or nationality/currency preferences. Existing pages/contact.tsx is registration contact information and must remain.
- Header mobile toggle at 600px; older CSS has overlapping 600/680/1000/1200/1440 rules. Hero has 660px minimum height and large copy padding. Search is pushed down.
- Typography uses OS-dependent Segoe UI/Tahoma/Arial and weights 650/750 with no bundled fonts: platform fallback explains inconsistent face/weight; actual iPhone rendering remains unverified.
- Four distinct hotel fixtures already exist. Reuse them with distinct existing photos and prices; do not create supplier inventory.
- Supplied video exists: H.264, 768×432, 26.94s, ~2.8MB. Preserve its content; no official contact details found.
- Existing requirements/history reviewed. Historical Next.js/B2C notes are superseded by current B2B README/AGENTS. Additional competitor screenshots mentioned in request were not attached.

## Implementation checklist
- [ ] Compact cinematic hero: generated original imagery, automatic transitions without visible controls, reduced motion, visibility pause; remove two CTAs.
- [ ] Bundle licensed consistent Latin/Arabic fonts with real weights; preserve logo typography.
- [ ] Compact featured hotel looping carousel, distinct existing samples, swipe and accessible pause/navigation.
- [ ] Partner video with poster, inline muted playback, pause, visibility/reduced-motion handling.
- [ ] Six B2B services and four distinct operational strengths, honest enquiry/demo wording.
- [ ] Header contact + guest buttons + demo account menu; shared independent nationality/currency preferences.
- [ ] Localized contact and group quotation preview forms; protected profile and settings.
- [ ] Audit all requested widths, EN/AR, accessibility, booking/rental/auth regressions.
- [ ] npm ci, lint, TypeScript, production build, browser suite; no push/deployment.

## Asset provenance
Generated using the built-in imagegen tool: cinematic/coastal-resort.png and cinematic/airport-transfers.png under public/images/home. Imaginary illustrative scenes, not verified hotel or supplier imagery. Existing assets preserved. Full prompt and media behavior details will be recorded here.
Video: owner-supplied Downloads/istockphoto-1209606008-640_adpp_is.mp4 copied to public/videos/partner-travel.mp4. Its stock-footage license has not been independently verified; no publication is performed in this task.

## Final behavior and references
- The hero crossfades three scenes every 8 seconds, pauses when hidden/offscreen, and has no visible playback buttons or navigation dots. Reduced motion stops autoplay and zoom. The separate transparent aircraft makes one short pass above the copy; original airplane-free scenery remains the first slide.
- Embla Carousel React 8.6 is the only added runtime dependency. Five distinct fixture hotels loop every 3.5 seconds. Hover, keyboard focus, visibility and reduced motion stop autoplay. Dragging or manual navigation pauses until Play is pressed. One DOM slide per hotel; offscreen slides are inert. If IntersectionObserver is unavailable, the carousel does not initialize rather than crashing the page.
- Guest navbar buttons reuse registration/login. Only explicit existing demo entry activates the account menu. Refresh/sign-out clears the demo session. Profile/settings reuse the existing demo provider; no credentials or real sessions are introduced.
- Nationality and currency are separate local preferences, independent of language. The supplied currency reference is followed with circular flags, selected blue rows, checkmarks and a scrollable currency group. Prices are not converted. Native radio groups support arrow keys; Escape/outside click dismiss the popup.
- Products/services and operational strengths use the owner's latest six-card/four-card references: inset service imagery, compact gold icon badges, centered navy/gold headings and floating circular navy icons. Original descriptions remain distinct and accurately describe frontend-only capabilities.
- Contact and group quotation validate and display a local preview. No request is delivered. No official contact information, prices, support hours or supplier availability were invented.

## Assets and licensing
- Hero: existing `public/images/home/flight/hero-clean.png`; new `public/images/home/cinematic/coastal-resort.png` and `airport-transfers.png`. Generated original scenes depict a fictional luxury coastal resort and executive vehicles at a fictional airport in warm cinematic light, with no text, supplier logos or baked-in airplanes. Responsive WebP variants are created by the existing optimizer.
- Aircraft: existing `public/images/home/flight/airplane.png` with transparency.
- Partner video: `public/videos/partner-travel.mp4`, copied unchanged from the supplied local MP4. Poster: existing `public/images/home/partner-travel.png`. Playback is muted, inline, looping; offscreen/hidden-page playback pauses; reduced motion initially shows a paused poster. Playback failures retain the poster and an honest status.
- Fonts: locally hosted Noto Sans and Noto Sans Arabic variable WOFF2 (100–900), with OFL licenses in `public/fonts`. This replaces inconsistent operating-system fallbacks, while keeping the logo's own typography. Sources: Google Fonts official font distribution and https://github.com/google/fonts.
- Flags: local SVGs from https://github.com/lipis/flag-icons, with MIT license and provenance in `public/flags`. No remote image dependency at runtime.

## Manual iPhone Safari review
Native iPhone Safari has not been tested. In Safari at 320–430px widths, verify:
1. Open the mobile navbar: language, nationality/currency, notification/cart/account controls, Register and Sign In remain reachable. Select Egypt + EGP, change language, reload; choices persist independently and prices remain USD.
2. Open/close the preferences with touch and a hardware keyboard; scroll currencies to USD; check RTL alignment and viewport containment.
3. Confirm compact hero text, early search, automatic crossfade and static Reduce Motion fallback. Both old CTA buttons are absent.
4. Swipe hotel cards, use previous/next and Play/Pause. Check pause after interaction and readable partial next card.
5. Scroll to Partner video: muted inline playback, Pause/Play, poster on blocked playback, and pause while offscreen/backgrounded.
6. Review service and strengths cards; navigate enquiries; submit invalid and fictional valid contact/group forms. Confirm “not sent” preview.
7. Enter the explicit demo, use profile/settings/account menu, hotel and rental journeys, sign out and refresh. No real reservation or payment should be represented.

## Precise homepage follow-up
The two hotel sections are intentionally different. Featured Deals keeps its existing card sizing and stepped Embla behavior; its pause toggle is available on keyboard focus only. Stay At Best Hotels now uses 280px cards (260px below 340px), 135px images and a CSS linear strip at 40px/s. Two equal-width groups loop by translating exactly half the track; existing fixtures repeat visually, with all repetitions aria-hidden and excluded from Tab order. Native keyboard/reduced-motion browsing exposes original cards only. Hover/touch pauses, and touch scroll offsets advance the same animation phase. The section keeps its city filter, favourites, prices and search links. No new hotel records are invented.
Hero timing is now 4s with an 800ms crossfade. Partner video retains its original playback lifecycle; its pause/play control appears on keyboard focus only. These focused changes do not modify navigation, currency preferences, enquiries or booking routes.
