import { HotelIllustration } from "./hotel-illustration";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Hotel } from "../types";
import { HotelCard } from "./hotel-card";
import { useLocale } from "@/features/localization/locale-provider";
import styles from "../home.module.css";
import marquee from "./hotel-collection.module.css";
import { useMediaEnvironment } from "@/components/motion/use-media-environment";

const SCROLL_SPEED_PX_PER_SECOND = 40;

export interface CollectionItem {
  key: string;
  /** `duplicate` is true for the copies that keep the strip seamless; they are hidden from assistive technology. */
  render: (duplicate: boolean) => ReactNode;
}

/**
 * "Stay At Best Hotels": the illustration, heading, description, a toolbar, a status note and the
 * strip of cards that slides to the left. Touch, hover and focus pause it; reduced motion stops it.
 */
export function HotelCollectionShell({ toolbar, note, items, animate = true, stripKey, label }: {
  toolbar: ReactNode;
  note: ReactNode;
  items: readonly CollectionItem[];
  /** False while placeholders are shown. */
  animate?: boolean;
  /**
   * Changing it rebuilds the strip, e.g. after the demo city filter. Live data doesn't pass it: the strip
   * stays the same element while hotels load, so focus, touch and scroll position survive, and the
   * slide starts when placeholders give way to hotels.
   */
  stripKey?: string;
  label?: string;
}) {
  const { t, locale } = useLocale();
  const root = useRef<HTMLElement>(null);
  const { canAnimate, reduced } = useMediaEnvironment(root);
  const [touching, setTouching] = useState(false);
  const count = Math.max(6, items.length * 2);
  return (
    <section ref={root} className={styles.section} aria-labelledby="collection-title">
      <HotelIllustration />
      <div className={styles.sectionHeading}>
        <h2 id="collection-title">{t("Stay At Best Hotels")}</h2>
        <p>
          {t(
            "Discover handpicked hotels tailored to your needs and budget, making it easy to find the perfect stay for every trip.",
          )}
        </p>
      </div>
      <div className={styles.collectionToolbar}>{toolbar}</div>
      {note}
      <div key={stripKey} className={marquee.viewport} data-collection-marquee data-running={animate && canAnimate && !touching} data-reduced={reduced || !animate}
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
        role="region" aria-label={label ?? t("Hotel collection", "مجموعة الفنادق")} tabIndex={0}>
        <div className={marquee.track} style={{ "--travel-duration": `${count * 296 / SCROLL_SPEED_PX_PER_SECOND}s` } as CSSProperties}>
          {[0, 1].map(group => <div className={marquee.group} key={group} aria-hidden={group === 1 ? true : undefined}>
            {Array.from({ length: count }, (_, index) => {
              const item = items[index % items.length];
              const duplicate = group === 1 || index >= items.length;
              return item && <div className={marquee.card} dir={locale === "ar" ? "rtl" : "ltr"} key={`${item.key}-${index}`} aria-hidden={duplicate ? true : undefined}>
                {item.render(duplicate)}
              </div>;
            })}
          </div>)}
        </div>
      </div>
    </section>
  );
}

/** The sample collection, used in demo builds: a city filter over the labelled sample hotels. */
export function HotelCollection({ hotels }: { hotels: readonly Hotel[] }) {
  const { t } = useLocale();
  const [city, setCity] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [filtered, setFiltered] = useState(false);
  const visibleHotels = hotels.filter(
    (hotel) => !selectedCity || hotel.city === selectedCity,
  );
  return (
    <HotelCollectionShell
      stripKey={selectedCity}
      toolbar={
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSelectedCity(city);
            setFiltered(true);
          }}
        >
          <label htmlFor="hotel-city">
            <span className="sr-only">{t("City")}</span>
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
      }
      note={
        <p className={styles.sampleNote} role="status">
          {filtered
            ? t(
                `${visibleHotels.length} hotels shown. Rates are illustrative; availability requires supplier confirmation.`,
                `${visibleHotels.length} فنادق معروضة. الأسعار توضيحية والتوافر يتطلب تأكيد المورد.`,
              )
            : t("Illustrative hotel listings · Availability requires supplier confirmation.", "فنادق توضيحية · التوافر يتطلب تأكيد المورد.")}
        </p>
      }
      items={visibleHotels.map((hotel) => ({ key: hotel.id, render: (duplicate) => <HotelCard hotel={hotel} duplicate={duplicate} /> }))}
    />
  );
}
