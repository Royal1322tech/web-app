# Homepage hero: custom image generation brief

**Status (2026-11-11):** done. The owner generated the four images externally with ChatGPT's image-generation tool and supplied them at 1672 × 941. They are installed as `public/images/home/hero/{maldives,dubai,santorini,switzerland}-ai.png` and are the hero's four slides (see `homeHeroSlides` in `src/features/home/data/home-content.ts`). They were not upscaled. If they are regenerated at 2560 px or wider, replace the files and update their sizes in `homeHeroSlides`. The brief below is kept for that.

## Technical requirements (all four images)

| Requirement | Value |
|---|---|
| Aspect ratio | 16:9 (21:9 also works) |
| Minimum size | 2560 × 1440 px. Prefer 3840 × 2160 if the generator supports it, so retina screens get a sharp image. |
| Delivery format | PNG or high-quality JPEG (quality 90 or above), sRGB. The build creates the WebP sizes and a phone crop. Don't pre-compress or sharpen. |
| Content | No text, logos, watermarks, airplanes, or people in the foreground |
| Usage rights | The generator's terms must allow commercial use without attribution. Record the tool, its version, the date and the final prompt for each image. |

## Composition safe zones

The hero is about 1440 × 620 px on desktop. Each image is cropped to fill it.
- **Top 20%:** sits behind the white floating header. Keep it simple, such as sky or soft background.
- **Left third (English) and right third (Arabic):** the headline sits here, bottom-aligned at roughly 45–80% of the height. Keep both side thirds calm and evenly lit, with no strong landmark or bright highlight.
- **Centre band (about 35–65% of the width):** put the landmark here. Phones crop to a near-square around a chosen point, so the subject must survive a centre crop of about 45% of the width.
- **Bottom 15%:** the search card's tabs overlap it. Low detail is fine.
- **Tones:** mid-to-deep tones on both sides, because white text must stay readable over them. Avoid overexposed sky behind the text areas.

## Shared style (append to every prompt)

> Ultra-photorealistic luxury travel campaign photograph, shot on a full-frame camera with a 24mm lens, natural light, consistent warm-neutral cinematic colour grade, gentle contrast, rich but natural colours, true-to-life architecture and textures, realistic shadows and reflections, fine detail without artificial sharpening, wide 16:9 landscape composition with the main subject in the centre third and calm, evenly lit negative space on both the left and right thirds, uncluttered sky in the top fifth.

**Negative prompt** (if the tool supports one):

> text, letters, watermark, logo, signage, brand names, airplane, aircraft, contrail, drone, people in the foreground, crowds, cartoon, illustration, CGI look, oversaturated, HDR halo, lens flare streaks, distorted buildings, warped lines, impossible architecture, duplicated structures, mirrored artefacts, unrealistic reflections, blurry, noise, jpeg artefacts, frame, border, vignette

## Prompts

### 1. Maldives (first slide, loaded with the page)

> Aerial photograph of an exclusive luxury resort in the Maldives: a curved row of elegant thatched overwater villas on slender wooden stilts, extending from a small island of natural palms into a crystal-clear turquoise lagoon that deepens to sapphire at the reef edge. Warm early-morning sunlight from the right, soft long shadows, visible ripples and sandbar textures, calm water. The villas and island sit in the centre third. The left and right thirds are open lagoon and gentle sea. Soft pale sky with a few high clouds at the very top. [Shared style]

File: `public/images/home/hero/maldives-overwater-villas.png`. Phone focus: about 0.5.

### 2. Dubai

> Wide-angle golden-hour view of Dubai's luxury coastline from the sea: a calm turquoise Arabian Gulf in the foreground, a long pale-sand beach, premium low-rise waterfront resorts with palm-lined promenades, and the modern skyline rising behind them in soft atmospheric haze. Warm low sun from the left, gentle glow on the glass façades, realistic city scale and perspective. Skyline concentrated in the centre third, open water and quieter coastline on both sides, clear gradient sky above. No identifiable landmark logos or signage. [Shared style]

File: `public/images/home/hero/dubai-golden-coast.png`. Phone focus: about 0.5.

### 3. Santorini

> Cinematic panorama of a Santorini cliffside village at sunset: whitewashed cubic houses and blue-domed chapels cascading down the caldera cliff, with terraces and an infinity pool. Below them, the deep blue Aegean Sea with small islands on the horizon. Warm pink and golden sunset light grazing the white walls, soft pastel sky. The village and domes sit in the centre third. The left third is open sea and sky, the right third is a softer continuation of the cliff in shade. [Shared style]

File: `public/images/home/hero/santorini-caldera-sunset.png`. Phone focus: about 0.55.

### 4. Switzerland

> Panoramic Swiss Alps landscape in soft natural daylight: a crystal-clear emerald alpine lake with a perfectly still surface, a single tasteful luxury timber-and-stone chalet with warm interior light on the far shore among pines, and majestic snow-capped peaks rising behind. Gentle morning mist on the water. The chalet and main peak sit in the centre third. Calm water and forested slopes fill the left and right thirds. Clean blue sky with light cloud at the top. [Shared style]

File: `public/images/home/hero/swiss-alpine-lake-chalet.png`. Phone focus: about 0.5.

## Integrating the images

1. Save the four files under `public/images/home/hero/` with the names above.
2. Add their phone-crop focus points to `phoneCrops` in `scripts/optimize-images.mjs`.
3. Replace `homeHero` and `homeHeroSlides` in `src/features/home/data/home-content.ts`. Use the real pixel sizes, with the order Maldives, Dubai, Santorini, Switzerland. `homeHero` is the first slide, and its alt text should describe that image.
4. Point the `/` entry of `heroes` in `vite.config.ts` at the first image, so it is preloaded with the page.
5. Update the tests that pin the slide count and first image: `tests/hero-slideshow.spec.ts`, `tests/ui-ux-upgrade.spec.ts`, `tests/hero-flight.spec.ts` and `tests/b2b-upgrade.spec.ts`.
6. Run `npm run lint`, `npx tsc --noEmit`, `npm run build` and `npm run test:e2e`. Then check every slide at 1440, 1024, 834 and 390 px, in English and Arabic.

The rotation timing, gentle zoom, pause control and reduced-motion behaviour need no changes. No photo credit is shown, so the generator's terms must allow commercial use without attribution.

## Acceptance checklist

- No text, logos, airplanes or people in the foreground. Architecture is not warped, and reflections are physically plausible.
- The four images look like one campaign: similar colour grade, contrast and warmth.
- White headline text reads clearly over both side thirds, in English and Arabic.
- The landmark is still visible in the phone crop.
- Sharp at 2560 px with no visible banding or artefacts.
