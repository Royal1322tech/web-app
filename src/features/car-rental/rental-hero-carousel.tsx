import { useRef } from "react";
import { RotationToggle } from "@/components/motion/rotation-toggle";
import { useHeroRotation } from "@/components/motion/use-hero-rotation";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { useLocale } from "@/features/localization/locale-provider";

const INTERVAL_MS = 4000;
const slides = [
  { src: "/images/rental/luxury-arrival.webp", width: 1536, height: 1024, position: "center 57%" },
  { src: "/images/rental/hero-open-road.jpg", width: 2200, height: 1467, position: "center 55%" },
  { src: "/images/rental/hero-city-dusk.jpg", width: 2200, height: 1468, position: "center 50%" },
  { src: "/images/rental/hero-sedan-motion.jpg", width: 2200, height: 1467, position: "center 60%" },
] as const;

/**
 * Car Rental hero with a decorative background that crossfades every four seconds, with one
 * pause control. Timing and image loading live in useHeroRotation.
 */
export function RentalHeroCarousel({ title }: { title: string }) {
  const { t } = useLocale();
  const root = useRef<HTMLElement>(null);
  const { index, running, paused, reduced, togglePaused, isLoaded } = useHeroRotation(root, { count: slides.length, intervalMs: INTERVAL_MS });

  return (
    <section ref={root} className="rental-hero rental-hero--carousel" aria-labelledby="rental-hero-title">
      {slides.map((slide, position) => (
        <div key={slide.src} className="rental-hero__slide" data-slide={position} data-active={position === index} data-motion={running} aria-hidden="true">
          {isLoaded(position) && (
            <ResponsiveImage src={slide.src} alt="" width={slide.width} height={slide.height} sizes="(max-width: 1320px) 100vw, 1280px" eager={position === 0} loading="eager" style={{ objectPosition: slide.position }} />
          )}
        </div>
      ))}
      <div className="rental-hero-copy">
        <p className="rental-kicker">{t("ROYAL VACATION · THE ROAD AHEAD", "رويال فاكيشن · رحلتك القادمة")}</p>
        <h1 id="rental-hero-title">{title}</h1>
        <p>{t("A considered journey, from arrival to departure.", "رحلة مدروسة من الوصول إلى المغادرة.")}</p>
      </div>
      <RotationToggle className="rental-hero__toggle" paused={paused} reduced={reduced} onToggle={togglePaused} />
    </section>
  );
}
