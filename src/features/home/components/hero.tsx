import { useEffect, useRef, useState } from "react";
import { useMediaEnvironment } from "@/components/motion/use-media-environment";
import { useLocale } from "@/features/localization/locale-provider";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import type { HeroContent } from "../types";
import { SiteHeader } from "./site-header";
import { HeroAirplane } from "./hero-airplane";
import styles from "./hero.module.css";

export function Hero({ content }: { content: HeroContent }) {
  const { t } = useLocale();
  const root = useRef<HTMLElement>(null);
  const { canAnimate } = useMediaEnvironment(root);
  const [active, setActive] = useState(0);
  const slides = [
    content,
    { image: "/images/home/cinematic/coastal-resort.png", alt: "", width: 1672, height: 941 },
    { image: "/images/home/cinematic/airport-transfers.png", alt: "", width: 1672, height: 941 },
  ];
  useEffect(() => {
    if (!canAnimate) return;
    const timer = window.setInterval(() => setActive(index => (index + 1) % 3), 4000);
    return () => clearInterval(timer);
  }, [canAnimate]);
  return (
    <section ref={root} className={styles.hero} aria-label={t("Royal Vacation agency platform", "منصة رويال فاكيشن للوكالات")}>
      <div className={styles.slides} aria-hidden="true">
        {slides.map((slide, index) => <div key={slide.image} className={styles.slide} data-active={active === index} data-motion={canAnimate}>
          <ResponsiveImage src={slide.image} alt="" width={slide.width} height={slide.height} sizes={index === 0 ? "(max-width:599px) 1280px, 100vw" : "(max-width:599px) 800px, 100vw"} eager={index === 0} />
        </div>)}
      </div>
      <HeroAirplane />
      <div className={styles.overlay} />
      <div className={styles.headerWrap}><SiteHeader /></div>
      {/* The imagery carries the hero; the page heading stays available to assistive technology. */}
      <h1 className="sr-only">{t("Royal Vacation agency platform", "منصة رويال فاكيشن للوكالات")}</h1>
    </section>
  );
}
