import { useId, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import type { B2BHotelSearchResult } from "../api/b2b-hotel-search";
import { amenityLabels } from "../data/hotels.fixture";
import { boardPlans } from "../lib/board-plan-definitions";
import { verifiedPrice } from "../lib/live-hotels";
import {
  activeLiveFilterCount,
  emptyLiveFilters,
  hotelBoards,
  liveFiltersChanged,
  pageAreas,
  pageOnlyFilterCount,
  priceFilterSupported,
  type LiveFilters,
} from "../lib/live-filters";
import type { Amenity } from "../types";
import styles from "./api-search-results.module.css";

const amenityOrder = Object.keys(amenityLabels) as Amenity[];
const toggle = <T,>(values: readonly T[], item: T) => (values.includes(item) ? values.filter((value) => value !== item) : [...values, item]);

/**
 * The hotel filter sidebar for live search results: a sidebar on wide screens, a panel behind a
 * "Filters" button on narrower ones. Sections backed by data narrow the hotels (on the loaded page,
 * or through the search when `server` is on); sections with nothing to match are shown disabled.
 */
export function LiveHotelFilters({ result, value, onChange, shown, server = false }: { result: B2BHotelSearchResult; value: LiveFilters; onChange: (next: LiveFilters) => void; shown: number; server?: boolean }) {
  const { t, locale } = useLocale();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [moreAmenities, setMoreAmenities] = useState(false);
  const update = <K extends keyof LiveFilters>(key: K, next: LiveFilters[K]) => onChange({ ...value, [key]: next });

  const total = result.hotels.length;
  const areas = pageAreas(result.hotels);
  const boards = new Set(result.hotels.flatMap((hotel) => [...hotelBoards(hotel)]));
  const priceApplies = priceFilterSupported(result);
  const prices = result.hotels.map((hotel) => verifiedPrice(hotel, result)?.amount).filter((amount): amount is number => amount !== undefined);
  const priceLimit = Math.max(50, Math.ceil(Math.max(0, ...prices, Number(value.minPrice) || 0, Number(value.maxPrice) || 0) / 50) * 50);
  const currency = result.currency ?? "USD";
  const count = activeLiveFilterCount(value, priceApplies, server);
  const pageOnly = pageOnlyFilterCount(value, priceApplies, server);
  const unavailable = <p className={styles.sectionNote}>{t("Not available for these results.", "غير متاح لهذه النتائج.")}</p>;

  return (
    <aside className={styles.sidebar} aria-label={t("Hotel filters", "تصفية الفنادق")}>
      <button type="button" className={styles.filterToggle} aria-expanded={open} aria-controls="api-hotel-filters" onClick={() => setOpen((current) => !current)}>
        <Icon name="search" />{t("Filters", "التصفية")}{count > 0 && <span className={styles.badge}>{count}</span>}
        <span className={styles.chevron} aria-hidden="true"><Icon name="chevron" /></span>
      </button>
      <div id="api-hotel-filters" className={styles.sidebarPanel} data-open={open || undefined}>
        <div className={styles.filters} role="group" aria-labelledby={`${id}-title`}>
          <h2 id={`${id}-title`} className={styles.filtersTitle}>{t("Hotel filters", "تصفية الفنادق")}</h2>

          <Section title={t("Hotel Name", "اسم الفندق")} open>
            <label className={styles.field}>
              <span className={styles.srOnly}>{t("Hotel name or address", "اسم الفندق أو العنوان")}</span>
              <span className={styles.inputWrap}>
                <Icon name="search" />
                <input type="search" value={value.name} placeholder={t("Hotel name or address", "اسم الفندق أو العنوان")} onChange={(event) => update("name", event.target.value)} />
              </span>
            </label>
            {value.name && <button type="button" className={styles.textAction} onClick={() => update("name", "")}>{t("Clear hotel name", "مسح اسم الفندق")}</button>}
          </Section>

          <Section title={t("Area / Location", "المنطقة / الموقع")} open>
            {areas.length === 0 && !value.areas.length
              ? <p className={styles.sectionNote}>{t("No areas are listed for these hotels.", "لا توجد مناطق مدرجة لهذه الفنادق.")}</p>
              : [...areas, ...value.areas.filter((area) => !areas.some((item) => item.area === area)).map((area) => ({ area, count: 0 }))].map(({ area, count: hotels }) => (
                <label className={styles.check} key={area}>
                  <input type="checkbox" checked={value.areas.includes(area)} onChange={() => update("areas", server ? (value.areas.includes(area) ? [] : [area]) : toggle(value.areas, area))} />
                  <bdi>{area}</bdi><span className={styles.optionCount}>{hotels}</span>
                </label>
              ))}
          </Section>

          <Section title={t("Top product", "أفضل الخيارات")} disabled>
            {unavailable}
            <label className={styles.check} data-unavailable>
              <input type="checkbox" checked={false} disabled />
              <span>{t("Luxury Collection", "مجموعة فاخرة")}</span>
            </label>
          </Section>

          <Section title={t("Board", "الوجبات")} open>
            <label className={styles.check}>
              <input type="checkbox" checked={value.breakfastOnly} onChange={(event) => update("breakfastOnly", event.target.checked)} />
              <span>{t("Breakfast available", "الإفطار متاح")}</span>
            </label>
            {boardPlans.map((plan) => {
              const unavailable = !boards.has(plan.value) && !value.boards.includes(plan.value);
              return (
                <label className={styles.check} key={plan.value} data-unavailable={unavailable || undefined}>
                  <input type="checkbox" checked={value.boards.includes(plan.value)} disabled={unavailable} aria-describedby={unavailable ? `${id}-board-note` : undefined} onChange={() => update("boards", toggle(value.boards, plan.value))} />
                  <span>{plan[locale]}</span>
                </label>
              );
            })}
            <p id={`${id}-board-note`} className={styles.sectionNote}>{t("Options are enabled only when a matching room offer is listed.", "تُفعّل الخيارات فقط عند إدراج عرض غرفة مطابق.")}</p>
          </Section>

          <Section title={t("Category", "الفئة")} open>
            <div className={styles.starFilters}>
              {[1, 2, 3, 4, 5].map((stars) => (
                <label key={stars} className={styles.starChip}>
                  <input type="checkbox" checked={value.stars.includes(stars)} onChange={() => update("stars", toggle(value.stars, stars))} />
                  <span aria-hidden="true">{stars} ★</span>
                  <span className={styles.srOnly}>{t(`${stars} ${stars === 1 ? "star" : "stars"}`, `${stars} نجوم`)}</span>
                </label>
              ))}
            </div>
          </Section>

          <Section title={t("Customer Review", "تقييم النزلاء")} disabled>
            {unavailable}
            {[0, 4, 3.5, 3].map((score) => (
              <label className={styles.check} key={score} data-unavailable>
                <input type="radio" name={`${id}-review`} checked={score === 0} disabled readOnly />
                <span>{score === 4 ? t("Very Good 4+", "جيد جداً ٤+") : score === 3.5 ? t("Good 3.5+", "جيد ٣٫٥+") : score === 3 ? t("Nice 3+", "مقبول ٣+") : t("All", "الكل")}</span>
              </label>
            ))}
          </Section>

          <Section title={t("Establishment profile", "نوع المنشأة")} disabled>
            {unavailable}
            {([["business", t("Business Hotels", "فنادق الأعمال")], ["luxury", t("Luxury Collection", "مجموعة فاخرة")]] as const).map(([key, label]) => (
              <label className={styles.check} key={key} data-unavailable>
                <input type="checkbox" checked={false} disabled />
                <span>{label}</span>
              </label>
            ))}
          </Section>

          <Section title={t("Amenities", "المرافق")} disabled={!server}>
            {!server && unavailable}
            {amenityOrder.map((amenity, index) => (
              <label className={styles.check} key={amenity} hidden={!moreAmenities && index >= 5} data-unavailable={!server || undefined}>
                <input type="checkbox" checked={server && value.amenities.includes(amenity)} disabled={!server} onChange={() => update("amenities", toggle(value.amenities, amenity))} />
                <span>{amenityLabels[amenity][locale]}</span>
              </label>
            ))}
            <button type="button" className={styles.textAction} aria-expanded={moreAmenities} onClick={() => setMoreAmenities((current) => !current)}>
              {moreAmenities ? t("View Less", "عرض أقل") : t("View More", "عرض المزيد")}
              <span className={styles.chevron} data-up={moreAmenities || undefined} aria-hidden="true"><Icon name="chevron" /></span>
            </button>
          </Section>

          <Section title={t(`Price (${currency})`, `السعر (${currency})`)} disabled={!priceApplies} open={priceApplies}>
            {!priceApplies && <p className={styles.sectionNote}>{t("Available once prices are confirmed.", "يتاح بعد تأكيد الأسعار.")}</p>}
            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>{t("Min.", "الأدنى")}</span>
                <input type="number" inputMode="decimal" min="0" disabled={!priceApplies} value={value.minPrice} onChange={(event) => update("minPrice", event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>{t("Max.", "الأقصى")}</span>
                <input type="number" inputMode="decimal" min="0" disabled={!priceApplies} value={value.maxPrice} onChange={(event) => update("maxPrice", event.target.value)} />
              </label>
            </div>
            <div className={styles.priceSliders}>
              <input type="range" aria-label={t("Minimum price", "الحد الأدنى للسعر")} disabled={!priceApplies} min="0" max={priceLimit} step="10" value={Math.max(0, Number(value.minPrice) || 0)}
                onChange={(event) => onChange({ ...value, minPrice: event.target.value, maxPrice: String(Math.max(Number(event.target.value), Number(value.maxPrice) || priceLimit)) })} />
              <input type="range" aria-label={t("Maximum price", "الحد الأقصى للسعر")} disabled={!priceApplies} min="0" max={priceLimit} step="10" value={value.maxPrice === "" ? priceLimit : Math.max(0, Number(value.maxPrice))}
                onChange={(event) => onChange({ ...value, maxPrice: event.target.value, minPrice: String(Math.min(Number(event.target.value), Number(value.minPrice) || 0)) })} />
            </div>
            {(Number(value.minPrice) < 0 || Number(value.maxPrice) < 0) && <p className={styles.fieldError} role="alert">{t("Prices must be zero or greater.", "يجب ألا يقل السعر عن صفر.")}</p>}
            {value.minPrice && value.maxPrice && Number(value.minPrice) > Number(value.maxPrice) && <p className={styles.fieldError} role="alert">{t("Minimum must not exceed maximum.", "يجب ألا يتجاوز الحد الأدنى الحد الأقصى.")}</p>}
          </Section>

          <Section title={t("Product packaging", "الباقات")} disabled={!server}>
            {!server && unavailable}
            {([["all", t("All", "الكل")], ["with", t("With Package", "مع باقة")], ["without", t("Without Package", "بدون باقة")]] as const).map(([key, label]) => (
              <label className={styles.check} key={key} data-unavailable={!server || undefined}>
                <input type="radio" name={`${id}-packaging`} checked={server ? value.packaging === key : key === "all"} disabled={!server} onChange={() => update("packaging", key)} />
                <span>{label}</span>
              </label>
            ))}
          </Section>

          <div className={styles.filterFooter}>
            {pageOnly > 0 && <p className={styles.filterCount} role="status">{t(`${shown} of ${total} hotels on this page match`, `${shown} من ${total} فنادق في هذه الصفحة مطابقة`)}</p>}
            <button type="button" className={styles.resetButton} disabled={!liveFiltersChanged(value)} onClick={() => onChange({ ...emptyLiveFilters })}>
              <Icon name="close" />{t("Reset filters", "إعادة ضبط التصفية")}
            </button>
            <button type="button" className={styles.showResults} onClick={() => setOpen(false)}>
              {t(`Show ${shown} ${shown === 1 ? "hotel" : "hotels"}`, `عرض ${shown} فندق`)}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Section({ title, disabled = false, open = false, children }: { title: string; disabled?: boolean; open?: boolean; children: ReactNode }) {
  return (
    <details className={styles.section} open={open} data-disabled={disabled || undefined}>
      <summary><span>{title}</span><span className={styles.chevron} aria-hidden="true"><Icon name="chevron" /></span></summary>
      <div className={styles.sectionBody}>{children}</div>
    </details>
  );
}
