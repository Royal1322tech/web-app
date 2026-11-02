import { useEffect, useRef, useState } from "react";
import { useMediaEnvironment } from "@/components/motion/use-media-environment";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { useLocale } from "@/features/localization/locale-provider";

const INTERVAL_MS = 5000;
const slides = [
  { src: "/images/rental/luxury-arrival.webp", width: 1536, height: 1024, position: "center 57%" },
  { src: "/images/rental/hero-open-road.jpg", width: 2200, height: 1467, position: "center 55%" },
  { src: "/images/rental/hero-city-dusk.jpg", width: 2200, height: 1468, position: "center 50%" },
  { src: "/images/rental/hero-sedan-motion.jpg", width: 2200, height: 1467, position: "center 60%" },
] as const;

/**
 * Car Rental hero with a decorative background that crossfades every five seconds. It has no
 * controls. It rests while the page is hidden or offscreen, and stays on the first image with
 * reduced motion. Only the shown and next images are requested.
 */
export function RentalHeroCarousel({ title }: { title: string }) {
  const { t } = useLocale();
  const root = useRef<HTMLElement>(null);
  const { canAnimate } = useMediaEnvironment(root);
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set([0]));
  const next = (index + 1) % slides.length;

  useEffect(() => {
    if (!canAnimate) return;
    const timer = window.setTimeout(() => {
      setSeen((current) => new Set(current).add(next));
      setIndex(next);
    }, INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [canAnimate, next]);

  return (
    <section ref={root} className="rental-hero rental-hero--carousel" aria-labelledby="rental-hero-title">
      {slides.map((slide, position) => (
        <div key={slide.src} className="rental-hero__slide" data-active={position === index} aria-hidden="true">
          {(seen.has(position) || (canAnimate && position === next)) && (
            <ResponsiveImage src={slide.src} alt="" width={slide.width} height={slide.height} sizes="(max-width: 1320px) 100vw, 1280px" eager={position === 0} style={{ objectPosition: slide.position }} />
          )}
        </div>
      ))}
      <div className="rental-hero-copy">
        <p className="rental-kicker">{t("ROYAL VACATION · THE ROAD AHEAD", "رويال فاكيشن · رحلتك القادمة")}</p>
        <h1 id="rental-hero-title">{title}</h1>
        <p>{t("A considered journey, from arrival to departure.", "رحلة مدروسة من الوصول إلى المغادرة.")}</p>
      </div>
    </section>
  );
}
