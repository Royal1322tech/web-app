import { useRef, useState } from "react";
import type { Hotel } from "../types";
import { HotelCard } from "./hotel-card";
import { useLocale } from "@/features/localization/locale-provider";
import styles from "../home.module.css";
import marquee from "./hotel-collection.module.css";
import { useMediaEnvironment } from "@/components/motion/use-media-environment";
import type { CSSProperties } from "react";

const SCROLL_SPEED_PX_PER_SECOND = 40;

export function HotelCollection({ hotels }: { hotels: readonly Hotel[] }) {
  const { t, locale } = useLocale();
  const [city, setCity] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [filtered, setFiltered] = useState(false);
  const root = useRef<HTMLElement>(null);
  const { canAnimate, reduced } = useMediaEnvironment(root);
  const [touching, setTouching] = useState(false);
  const visibleHotels = hotels.filter(
    (hotel) => !selectedCity || hotel.city === selectedCity,
  );
  return (
    <section ref={root} className={styles.section} aria-labelledby="collection-title">
      <div className={styles.sectionHeading}>
        <h2 id="collection-title">{t("Stay At Best Hotels")}</h2>
        <p>
          {t(
            "Discover handpicked hotels tailored to your needs and budget, making it easy to find the perfect stay for every trip.",
          )}
        </p>
      </div>
      <div className={styles.collectionToolbar}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSelectedCity(city);
            setFiltered(true);
          }}
        >
          <label htmlFor="hotel-city">
            {t("City")}
            <select
              id="hotel-city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            >
              <option value="">{t("All cities")}</option>
              {[...new Set(hotels.map((hotel) => hotel.city))].map((value) => (
                <option key={value} value={value}>
                  {t(value)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={styles.primaryButton}>
            {t("Search")}
          </button>
        </form>
      </div>
      <p className={styles.sampleNote} role="status">
        {filtered
          ? t(
              `${visibleHotels.length} sample hotels shown. This filters preview content only.`,
              `يتم عرض ${visibleHotels.length} فنادق تجريبية. التصفية تخص المحتوى التجريبي فقط.`,
            )
          : t("Sample collection — not live listings or availability.")}
      </p>
      <div key={selectedCity} className={marquee.viewport} data-collection-marquee data-running={canAnimate && !touching} data-reduced={reduced}
        onScroll={event => {
          const viewport = event.currentTarget;
          const offset = viewport.scrollLeft;
          const animation = viewport.firstElementChild?.getAnimations()[0];
          if (!offset || !animation || reduced) return;
          const duration = Number(animation.effect?.getTiming().duration);
          const distance = (viewport.firstElementChild?.scrollWidth ?? 0) / 2;
          if (!duration || !distance) return;
          animation.currentTime = (Number(animation.currentTime) + offset / distance * duration + duration) % duration;
          viewport.scrollLeft = 0;
        }}
        onTouchStart={() => setTouching(true)} onTouchEnd={() => setTouching(false)} onTouchCancel={() => setTouching(false)}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Native keyboard scrolling pauses decorative motion.
        role="region" aria-label={t("Sample hotel collection")} tabIndex={0}>
        <div className={marquee.track} style={{ "--travel-duration": `${Math.max(6, visibleHotels.length * 2) * 296 / SCROLL_SPEED_PX_PER_SECOND}s` } as CSSProperties}>
          {[0, 1].map(group => <div className={marquee.group} key={group} aria-hidden={group === 1 ? true : undefined}>
            {Array.from({ length: Math.max(6, visibleHotels.length * 2) }, (_, index) => {
              const hotel = visibleHotels[index % visibleHotels.length];
              return hotel && <div className={marquee.card} dir={locale === "ar" ? "rtl" : "ltr"} key={`${hotel.id}-${index}`} aria-hidden={group === 1 || index >= visibleHotels.length ? true : undefined}>
                <HotelCard hotel={hotel} duplicate={group === 1 || index >= visibleHotels.length} />
              </div>;
            })}
          </div>)}
        </div>
      </div>
    </section>
  );
}
