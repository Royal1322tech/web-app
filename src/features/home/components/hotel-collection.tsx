import { useEffect, useRef, useState } from "react";
import type { Hotel } from "../types";
import { HotelCard } from "./hotel-card";
import { useLocale } from "@/features/localization/locale-provider";
import styles from "../home.module.css";

export function HotelCollection({ hotels }: { hotels: readonly Hotel[] }) {
  const { t, locale } = useLocale();
  const [city, setCity] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [filtered, setFiltered] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const visibleHotels = hotels.filter(
    (hotel) => !selectedCity || hotel.city === selectedCity,
  );
  const [canScroll, setCanScroll] = useState({ previous: false, next: false });
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    function updateArrows() {
      if (!element) return;
      const position = Math.abs(element.scrollLeft);
      setCanScroll({
        previous: position > 2,
        next: position < element.scrollWidth - element.clientWidth - 2,
      });
    }
    const observer = new ResizeObserver(updateArrows);
    observer.observe(element);
    element.addEventListener("scroll", updateArrows, { passive: true });
    const frame = requestAnimationFrame(updateArrows);
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", updateArrows);
      cancelAnimationFrame(frame);
    };
  }, [selectedCity, locale]);
  function scroll(direction: number) {
    track.current?.scrollBy({
      left:
        (locale === "ar" ? -direction : direction) * track.current.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  return (
    <section className={styles.section} aria-labelledby="collection-title">
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
        <div className={styles.collectionArrows}>
          <button
            type="button"
            aria-label={t("Previous hotels")}
            disabled={!canScroll.previous}
            onClick={() => scroll(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label={t("Next hotels")}
            disabled={!canScroll.next}
            onClick={() => scroll(1)}
          >
            ›
          </button>
        </div>
      </div>
      <p className={styles.sampleNote} role="status">
        {filtered
          ? t(
              `${visibleHotels.length} sample hotels shown. This filters preview content only.`,
              `يتم عرض ${visibleHotels.length} فنادق تجريبية. التصفية تخص المحتوى التجريبي فقط.`,
            )
          : t("Sample collection — not live listings or availability.")}
      </p>
      <div
        ref={track}
        className={styles.hotelTrack}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Focus enables keyboard scrolling of the horizontal collection.
        tabIndex={0}
        aria-label={t("Sample hotel collection")}
      >
        {visibleHotels.map((hotel) => (
          <HotelCard key={hotel.id} hotel={hotel} />
        ))}
      </div>
    </section>
  );
}
