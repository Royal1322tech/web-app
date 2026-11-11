import type { HeroContent, HeroSlide } from "../types";

/** The first slide; it is also preloaded with the HTML (see `heroes` in vite.config.ts). */
export const homeHero: HeroContent = {
  image: "/images/home/hero/maldives-ai.png",
  alt: "Overwater villas above a turquoise lagoon at sunrise",
  width: 1672,
  height: 941,
};

/*
 * Custom AI-generated hero images supplied by the owner (1672 × 941, not upscaled). They need
 * no photo credit. Phones use the crops set in scripts/optimize-images.mjs.
 */
export const homeHeroSlides: readonly HeroSlide[] = [
  { src: homeHero.image, width: homeHero.width, height: homeHero.height, position: "center 58%" },
  { src: "/images/home/hero/dubai-ai.png", width: 1672, height: 941, position: "center 42%" },
  { src: "/images/home/hero/santorini-ai.png", width: 1672, height: 941, position: "center 44%" },
  { src: "/images/home/hero/switzerland-ai.png", width: 1672, height: 941, position: "center 40%" },
];
