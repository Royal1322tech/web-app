import { useRef, type CSSProperties } from "react";
import { RotationToggle } from "@/components/motion/rotation-toggle";
import { useHeroRotation } from "@/components/motion/use-hero-rotation";
import { useLocale } from "@/features/localization/locale-provider";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import type { HeroContent } from "../types";
import { SiteHeader } from "./site-header";
import { HeroAirplane } from "./hero-airplane";
import styles from "./hero.module.css";

const INTERVAL_MS = 4500;

export function Hero({ content }: { content: HeroContent }) {
  const { t } = useLocale();
  const root = useRef<HTMLElement>(null);
  const slides = [
    { src: content.image, width: content.width, height: content.height, position: "65% center" },
    { src: "/images/welcome/resort-aerial.jpg", width: 1600, height: 1067, position: "center 58%" },
    { src: "/images/home/cinematic/coastal-resort.png", width: 1672, height: 941, position: "center" },
    { src: "/images/services/apartment-rentals.jpg", width: 1400, height: 934, position: "center 55%" },
    { src: "/images/services/flights.jpg", width: 1400, height: 930, position: "center 64%" },
    { src: "/images/home/cinematic/airport-transfers.png", width: 1672, height: 941, position: "center" },
  ];
  const { index, running, paused, reduced, togglePaused, isLoaded } = useHeroRotation(root, { count: slides.length, intervalMs: INTERVAL_MS });
  return (
    <section ref={root} className={styles.hero} aria-label={t("Royal Vacation agency platform", "منصة رويال فاكيشن للوكالات")}>
      <div className={styles.slides} aria-hidden="true">
        {slides.map((slide, position) => <div key={slide.src} className={styles.slide} data-slide={position} data-active={index === position} data-motion={running}>
          {isLoaded(position) && <ResponsiveImage src={slide.src} alt="" width={slide.width} height={slide.height} sizes="100vw" eager={position === 0} loading="eager" style={{ "--slide-position": slide.position } as CSSProperties} />}
        </div>)}
      </div>
      <HeroAirplane />
      <div className={styles.overlay} />
      <div className={styles.headerWrap}><SiteHeader /></div>
      {/* The imagery carries the hero; the page heading stays available to assistive technology. */}
      <h1 className="sr-only">{t("Royal Vacation agency platform", "منصة رويال فاكيشن للوكالات")}</h1>
      <RotationToggle className={styles.toggle} paused={paused} reduced={reduced} onToggle={togglePaused} />
    </section>
  );
}
