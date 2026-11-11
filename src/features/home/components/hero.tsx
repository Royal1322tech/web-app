import { useRef, type CSSProperties } from "react";
import { RotationToggle } from "@/components/motion/rotation-toggle";
import { useHeroRotation } from "@/components/motion/use-hero-rotation";
import { useLocale } from "@/features/localization/locale-provider";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import type { HeroSlide } from "../types";
import { SiteHeader } from "./site-header";
import styles from "./hero.module.css";

const INTERVAL_MS = 4500;

export function Hero({ slides }: { slides: readonly HeroSlide[] }) {
  const { t } = useLocale();
  const root = useRef<HTMLElement>(null);
  const { index, running, paused, reduced, togglePaused, isLoaded } = useHeroRotation(root, { count: slides.length, intervalMs: INTERVAL_MS });
  return (
    <section ref={root} className={styles.hero} aria-label={t("Royal Vacation agency platform", "منصة رويال فاكيشن للوكالات")}>
      <div className={styles.slides} aria-hidden="true">
        {slides.map((slide, position) => <div key={slide.src} className={styles.slide} data-slide={position} data-active={index === position} data-motion={running}>
          {isLoaded(position) && <ResponsiveImage src={slide.src} alt="" width={slide.width} height={slide.height} sizes="100vw" eager={position === 0} loading="eager" style={{ "--slide-position": slide.position } as CSSProperties} />}
        </div>)}
      </div>
      <div className={styles.overlay} />
      <div className={styles.headerWrap}><SiteHeader /></div>
      {/* The page heading stays available to assistive technology; the tagline is display copy. */}
      <h1 className="sr-only">{t("Royal Vacation agency platform", "منصة رويال فاكيشن للوكالات")}</h1>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{t("Royal Vacation · Travel partners", "رويال فاكيشن · شركاء السفر")}</p>
        <p className={styles.tagline}>
          {t("Your Gateway to", "بوابتك إلى")} <span>{t("Extraordinary Travel", "رحلات استثنائية")}</span>
        </p>
        <p className={styles.lede}>{t("Discover exceptional stays and seamless travel experiences with Royal Vacation.", "اكتشف إقامات مميزة وتجارب سفر سلسة مع رويال فاكيشن.")}</p>
      </div>
      <div className={styles.meta}>
        <RotationToggle className={styles.toggle} paused={paused} reduced={reduced} onToggle={togglePaused} />
      </div>
    </section>
  );
}
