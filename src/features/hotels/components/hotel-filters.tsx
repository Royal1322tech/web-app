import { boardPlans, hotelBoardPlans } from "../lib/board-plans";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { hotels } from "../data/hotels.fixture";
import type { HotelFilters } from "../types";
import { amenityLabels } from "../data/hotels.fixture";
import { defaultFilters } from "../lib/filter-hotels";
import { useLocale } from "@/features/localization/locale-provider";
import styles from "../hotels.module.css";
export function HotelFiltersPanel({
  value,
  onChange,
}: {
  value: HotelFilters;
  onChange: (next: HotelFilters) => void;
}) {
  const { locale, t } = useLocale();
  const [showAmenities, setShowAmenities] = useState(false);
  const amenities = [...new Set(hotels.flatMap(hotel => hotel.amenities))];
  const availableBoards = new Set(hotels.flatMap(hotel => hotelBoardPlans(hotel)));
  const cities = [...new Map(hotels.map(hotel => [hotel.city.en, hotel.city])).values()];
  const priceCeiling = Math.max(
    ...hotels.map((hotel) => hotel.nightlyRate),
    Number(value.minPrice) || 0,
    Number(value.maxPrice) || 0,
  );
  const priceLimit = Math.ceil(priceCeiling / 50) * 50;
  function update<K extends keyof HotelFilters>(key: K, next: HotelFilters[K]) {
    onChange({ ...value, [key]: next });
  }
  function toggle<T>(values: T[], item: T) {
    return values.includes(item)
      ? values.filter((v) => v !== item)
      : [...values, item];
  }
  return (
    <aside
      className={styles.sidebar}
      aria-label={t("Hotel filters", "تصفية الفنادق")}
    >
      <h2>{t("Hotel filters", "تصفية الفنادق")}</h2>
      <form
        className={styles.filterSearch}
        onSubmit={(event) => {
          event.preventDefault();
          update("name", value.name.trim());
        }}
      >
        <label>
          {t("Hotel Name", "اسم الفندق")}
          <input
            type="search"
            value={value.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </label>
        <button
          type="submit"
          className={styles.primary}
          aria-label={t("Search hotel name", "بحث باسم الفندق")}
        >
          <Icon name="search" />
        </button>
      </form>
      {value.name && <button type="button" className={styles.textAction} onClick={() => update("name", "")}>{t("Clear hotel name", "مسح اسم الفندق")}</button>}
      <details open>
        <summary>{t("Area / Location", "المنطقة / الموقع")}</summary>
        {cities.map(city => <label className={styles.check} key={city.en}>
          <input type="checkbox" checked={value.cities.includes(city.en)} onChange={() => update("cities", toggle(value.cities, city.en))} />{city[locale]}
        </label>)}
      </details>
      <details open>
        <summary>{t("Top product", "أفضل الخيارات")}</summary>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={value.luxury}
            onChange={(e) => update("luxury", e.target.checked)}
          />
          {t("Luxury Collection", "مجموعة فاخرة")}
        </label>
      </details>
      <details open>
        <summary>{t("Board", "الوجبات")}</summary>
        {boardPlans.map(plan => (
          <label className={styles.check} key={plan.value}>
            <input type="checkbox" checked={value.board.includes(plan.value)} disabled={!availableBoards.has(plan.value)}
              onChange={() => update("board", toggle(value.board, plan.value))} />
            <span>{plan[locale]}</span>
          </label>
        ))}
        <p className={styles.unsupported}>{t("Other meal plans are not listed for these offers.", "خطط الوجبات الأخرى غير مدرجة لهذه العروض.")}</p>
      </details>
      <details open>
        <summary>{t("Category", "الفئة")}</summary>
        <div className={styles.starFilters}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n}>
              <input
                type="checkbox"
                checked={value.stars.includes(n)}
                onChange={() => update("stars", toggle(value.stars, n))}
              />
              {n} ★
            </label>
          ))}
        </div>
      </details>
      <details open>
        <summary>{t("Customer Review", "تقييم النزلاء")}</summary>
        {[0, 4, 3.5, 3].map((n) => (
          <label className={styles.check} key={n}>
            <input
              type="radio"
              name="review"
              checked={value.minimumReview === n}
              onChange={() => update("minimumReview", n)}
            />
            {n === 4
              ? t("Very Good 4+", "جيد جداً ٤+")
              : n === 3.5
                ? t("Good 3.5+", "جيد ٣٫٥+")
                : n === 3
                  ? t("Nice 3+", "مقبول ٣+")
                  : t("All", "الكل")}
          </label>
        ))}
      </details>
      <details open>
        <summary>{t("Establishment profile", "نوع المنشأة")}</summary>
        {[
          ["business", t("Business Hotels", "فنادق الأعمال")],
          ["luxury", t("Luxury Collection", "مجموعة فاخرة")],
        ].map(([id, label]) => (
          <label className={styles.check} key={id}>
            <input
              type="checkbox"
              checked={value.profiles.includes(id)}
              onChange={() => update("profiles", toggle(value.profiles, id))}
            />
            {label}
          </label>
        ))}
      </details>
      <details open>
        <summary>{t("Amenities", "المرافق")}</summary>
        {amenities.map((a, index) => (
          <label
            className={styles.check}
            key={a}
            hidden={!showAmenities && index >= 5}
          >
            <input
              type="checkbox"
              checked={value.amenities.includes(a)}
              onChange={() => update("amenities", toggle(value.amenities, a))}
            />
            {amenityLabels[a][locale]}
          </label>
        ))}
        <button
          type="button"
          className={styles.textAction}
          aria-expanded={showAmenities}
          onClick={() => setShowAmenities(!showAmenities)}
        >
          {showAmenities
            ? t("View Less", "عرض أقل")
            : t("View More", "عرض المزيد")}{" "}
          <Icon name="chevron" />
        </button>
      </details>
      <details open>
        <summary>{t("Price (USD)", "السعر (دولار)")}</summary>
        <div className={styles.twoColumns}>
          <label>
            {t("Min.", "الأدنى")}
            <input
              type="number"
              min="0"
              value={value.minPrice}
              onChange={(e) => update("minPrice", e.target.value)}
            />
          </label>
          <label>
            {t("Max.", "الأقصى")}
            <input
              type="number"
              min="0"
              value={value.maxPrice}
              onChange={(e) => update("maxPrice", e.target.value)}
            />
          </label>
        </div>
        <div className={styles.priceSliders}>
          <input
            type="range"
            aria-label={t("Minimum price", "الحد الأدنى للسعر")}
            min="0"
            max={priceLimit}
            value={Math.max(0, Number(value.minPrice) || 0)}
            onChange={(event) =>
              onChange({
                ...value,
                minPrice: event.target.value,
                maxPrice: String(
                  Math.max(
                    Number(event.target.value),
                    Number(value.maxPrice) || priceLimit,
                  ),
                ),
              })
            }
          />
          <input
            type="range"
            aria-label={t("Maximum price", "الحد الأقصى للسعر")}
            min="0"
            max={priceLimit}
            value={
              value.maxPrice === ""
                ? priceLimit
                : Math.max(0, Number(value.maxPrice))
            }
            onChange={(event) =>
              onChange({
                ...value,
                maxPrice: event.target.value,
                minPrice: String(
                  Math.min(
                    Number(event.target.value),
                    Number(value.minPrice) || 0,
                  ),
                ),
              })
            }
          />
        </div>
        {(Number(value.minPrice) < 0 || Number(value.maxPrice) < 0) && <p role="alert">{t("Prices must be zero or greater.", "يجب ألا يقل السعر عن صفر.")}</p>}
        {value.minPrice &&
          value.maxPrice &&
          Number(value.minPrice) > Number(value.maxPrice) && (
            <p role="alert">
              {t(
                "Minimum must not exceed maximum.",
                "يجب ألا يتجاوز الحد الأدنى الحد الأقصى.",
              )}
            </p>
          )}
      </details>
      <details open>
        <summary>{t("Product packaging", "الباقات")}</summary>
        {[
          ["all", t("All", "الكل")],
          ["with", t("With Package", "مع باقة")],
          ["without", t("Without Package", "بدون باقة")],
        ].map(([id, label]) => (
          <label className={styles.check} key={id}>
            <input
              type="radio"
              name="packaging"
              checked={value.packaging === id}
              onChange={() => update("packaging", id)}
            />
            {label}
          </label>
        ))}
      </details>
      <button
        className={styles.secondary}
        onClick={() => onChange({ ...defaultFilters })}
      >
        {t("Reset filters", "إعادة ضبط التصفية")}
      </button>
    </aside>
  );
}
