import { useEffect, useRef, useState, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useMediaEnvironment } from "@/components/motion/use-media-environment";
import { Text, useLocale } from "@/features/localization/locale-provider";
import { featuredHotels } from "../data/hotels.fixture";
import { HotelCard } from "./hotel-card";
import styles from "../home.module.css";
import carousel from "./featured-deals.module.css";

/** The sample carousel, used in demo builds. Live builds use the same carousel with API hotels. */
export function FeaturedDeals() {
  const { t } = useLocale();
  return (
    <HotelCarousel
      note={<p className={styles.sampleNote}><Text en="Illustrative rates · Confirm availability with the supplier." ar="أسعار توضيحية · يرجى تأكيد التوافر مع المورد." /></p>}
      slides={featuredHotels.map((hotel) => ({ key: hotel.id, node: <HotelCard hotel={hotel} compact /> }))}
      label={t("Featured hotels", "فنادق مميزة")}
    />
  );
}

export function HotelCarousel({ note, slides, label, footer, busy = false }: {
  note: ReactNode;
  slides: readonly { key: string; node: ReactNode }[];
  label: string;
  footer?: ReactNode;
  busy?: boolean;
}) {
  const { locale, t } = useLocale();
  const root = useRef<HTMLElement>(null);
  const { canAnimate, reduced } = useMediaEnvironment(root);
  const [emblaRef, api] = useEmblaCarousel({ active: typeof IntersectionObserver !== "undefined", loop: true, align: "start", direction: locale === "ar" ? "rtl" : "ltr", duration: reduced ? 0 : 25 });
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(0);
  const [inView, setInView] = useState<number[]>([0, 1, 2, 3, 4]);
  useEffect(() => {
    if (!api) return;
    const update = () => { setSelected(api.selectedScrollSnap()); setInView(api.slidesInView()); };
    const stop = () => setPaused(true);
    api.on("select", update).on("slidesInView", update).on("reInit", update).on("pointerDown", stop);
    const frame = requestAnimationFrame(update);
    return () => { cancelAnimationFrame(frame); api.off("select", update).off("slidesInView", update).off("reInit", update).off("pointerDown", stop); };
  }, [api]);
  useEffect(() => {
    if (!api || !canAnimate || paused || hovered || focused) return;
    const timer = window.setInterval(() => api.scrollNext(), 3500);
    return () => clearInterval(timer);
  }, [api, canAnimate, paused, hovered, focused]);
  const move = (direction: number) => {
    setPaused(true);
    if (direction > 0) api?.scrollNext(); else api?.scrollPrev();
  };
  return (
    <section ref={root} className={`${styles.section} ${carousel.section}`} aria-labelledby="deals-title">
      <div className={carousel.heading}>
        <div><h2 id="deals-title" className={styles.dealsTitle}><Text en="A world of stays. One workspace." ar="عالم من الإقامات. مساحة عمل واحدة." /></h2>
          {note}</div>
        <div className={carousel.controls}>
          <button type="button" onClick={() => move(-1)} aria-label={t("Previous featured hotel", "الفندق المميز السابق")}>‹</button>
          <button type="button" onClick={() => move(1)} aria-label={t("Next featured hotel", "الفندق المميز التالي")}>›</button>
          {!reduced && <button className={carousel.keyboardControl} type="button" onClick={() => setPaused(!paused)}>{paused ? t("Play", "تشغيل") : t("Pause", "إيقاف")}</button>}
        </div>
      </div>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- Named carousel region supports documented Arrow-key browsing alongside native navigation buttons. */}
      <div className={carousel.viewport} ref={emblaRef} role="region" aria-roledescription={t("carousel", "عرض شرائح")} aria-label={label} aria-busy={busy || undefined} tabIndex={0}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
        onKeyDown={event => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move((event.key === "ArrowRight") !== (locale === "ar") ? 1 : -1); }
        }}>
        <div className={carousel.track}>
          {slides.map((slide, index) => <div key={slide.key} className={carousel.slide} role="group" aria-roledescription={t("slide", "شريحة")} aria-label={`${index + 1} / ${slides.length}`} inert={!inView.includes(index)}>{slide.node}</div>)}
        </div>
      </div>
      {slides.length > 0 && <p className={carousel.position} aria-live={paused ? "polite" : "off"}>{selected + 1} / {slides.length} · {t("Swipe to explore", "اسحب للاستكشاف")}</p>}
      {footer}
    </section>
  );
}
