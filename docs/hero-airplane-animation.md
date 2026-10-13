# Cinematic hero airplane — local implementation

## Scene and assets

The original `/images/home/daytime-hero.png` contains the airplane in its pixels. It is preserved unchanged. The homepage now uses a separate plane-free derivative, never the original plane-bearing image behind the animated aircraft.

- `public/images/home/flight/hero-clean.png`: 2048×768 edited background plate, same 8:3 scene/crop and atmosphere. Produced with the built-in imagegen tool from the original photograph.
- `public/images/home/flight/airplane.png`: 768×288 photorealistic transparent aircraft derived from the original perspective, white/blue colors and light direction. Generated at 2048×768, then downscaled with Sharp; alpha is preserved.
- Existing image build pipeline produces responsive WebP variants. Background outputs range from 12.8 kB (320px) to 208 kB (2048px); aircraft outputs are 13.1–39.0 kB. No image or animation dependency was added.

The edited plate is generative, not a pixel-identical inpaint. Small texture/details can differ from the source; the scene, resort/car positioning and composition were visually checked. All supplied original assets remain intact. The aircraft is a matching visual interpretation, not a technical model of a particular airliner.

## Behavior and accessibility

`HeroAirplane` is an absolutely positioned, `aria-hidden`, non-interactive layer. Only the aircraft uses transform/opacity keyframes. It begins outside the left edge, follows a shallow curved climb with small rotation and scale changes, and exits right. The desktop sky mask lets it emerge beyond the resort roof. The overlay keeps its light consistent with the hero atmosphere; it sits behind all copy and controls.

The passage starts after the image loads, lasts 4.8 seconds (4.2 on mobile), with a 150ms initial delay and one iteration. Total automatic movement completes within five seconds. It does not loop or need an additional pause button. Remounting the homepage can replay the passage. No layout dimensions, expensive filters, JavaScript animation loop or continuous trail are used.

Desktop/tablet/mobile each use an appropriate aircraft size and sky band above the headline and car. Clipping prevents horizontal overflow. English and Arabic use the same physical flight direction. Reduced-motion disables flight and displays one stationary aircraft. A failed aircraft load stays hidden over the clean plate; the original baked airplane is not restored underneath.

The old pointer-depth hook was removed from this hero so the entire background no longer moves. Other components' animations, homepage structure, copy, navbar, buttons, hotel search/Car Rental tabs and booking behavior remain in place.

## Files

- `src/features/home/components/hero.tsx`: stationary background and aircraft integration.
- `src/features/home/components/hero-airplane.tsx`: image-ready decorative layer.
- `src/features/home/components/hero-airplane.module.css`: finite responsive flight and static fallback.
- `src/features/home/data/home-content.ts`: clean plate and accurate background alt text.
- `src/generated/image-sources.json`: generated responsive asset references.
- `tests/hero-flight.spec.ts`: flight bounds, static background, header stability, clipping, single-aircraft markup, reduced motion, RTL and alpha checks.
- `tests/b2b-upgrade.spec.ts`: reduced-motion check now targets the stationary hero background.

## Generation prompts

Built-in **imagegen** was used, not the CLI/API fallback. Project assets are saved under the paths above; generated originals remain in the Codex generated-images directory.

### Background

Use case: precise-object-edit. Edit target: supplied 1440x540 Royal Vacation homepage photograph. Remove ONLY the passenger airplane in the upper sky (approximately x935–1168,y50–141) and seamlessly inpaint that small region with the surrounding pale blue sky and soft white clouds. Preserve the exact full wide 8:3 composition, crop, pixel alignment, coastal resort architecture on the left, luggage, pool, sea, mountains, car on the right, trees, reflections, lighting, colors, and all scene details outside that small airplane region. Do not redesign or regenerate the scene. No airplane anywhere in the final image. No text, overlays or added objects. This is a clean background plate for an animation; maximum fidelity to the existing photograph is essential.

### Aircraft extraction

Use case: background-extraction. Input is the Royal Vacation hero photograph. Extract/recreate ONLY the small passenger airplane visible in its upper sky as a high-quality photorealistic transparent cutout for compositing back into exactly this scene. Keep that airplane's perspective: seen from below and slightly behind its left side, nose pointing up-right, white fuselage, dark blue underside/tail, visible swept wings and two engines, subtle warm sunlight on the top/right and cool shaded underside. Preserve the existing airplane's recognizable shape and proportions; remove tiny landing wheels if feasible for a cruising aircraft. Entire airplane including all wing tips and tail must fit in a tightly framed wide canvas with modest transparent padding. Actual transparent alpha background, no sky, no clouds, no ground shadow, no scenery, no lettering added, no trail, no border. A realistic photographic asset, not an icon, cartoon or illustration.

### Selected aircraft refinement

Use case: background-extraction. Correct this transparent airplane cutout for actual website compositing. Keep ONLY the solid aircraft, with crisp photographic silhouette edges and very narrow normal antialiasing. Remove ALL the cloudy halo, glow, haze, shadow and colored backdrop around it. Every pixel beyond the aircraft silhouette must be fully transparent alpha zero, including the gaps between wings and fuselage. Aircraft itself should be fully opaque, retaining the same perspective, white/blue colors, lighting, twin engines, wings, tail and nose pointing right/up. No scenery, no glow, no smoke, no sky, no trail, no cast shadow. Keep all wing tips inside the canvas. Actual transparency, not a checkerboard or black backdrop.

## Verification

Results recorded after the final test run. No commits, pushes or deployment.
