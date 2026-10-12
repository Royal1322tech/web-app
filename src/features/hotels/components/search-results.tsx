import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { HotelSearchForm } from "@/features/home/components/hotel-search-form";
import {
  hotelSearchSchema,
  type HotelSearchCriteria,
} from "@/features/home/schemas/hotel-search.schema";
import { useLocale } from "@/features/localization/locale-provider";
import { hotels } from "../data/hotels.fixture";
import { defaultFilters, filterHotels } from "../lib/filter-hotels";
import type { HotelSort } from "../types";
import { CatalogShell } from "./catalog-shell";
import { HotelFiltersPanel } from "./hotel-filters";
import { HotelResultCard } from "./hotel-result-card";
import { Comparison } from "./comparison";
import styles from "../hotels.module.css";
export function SearchResults() {
  const [query] = useSearchParams();
  return <SearchResultsContent key={query.toString()} query={query} />;
}
function SearchResultsContent({
  query,
}: {
  query: Pick<URLSearchParams, "get">;
}) {
  const { t } = useLocale();
  const [initial] = useState<HotelSearchCriteria | undefined>(() => {
    try {
      const result = hotelSearchSchema.safeParse({
        destination: query.get("destination"),
        checkIn: query.get("checkIn"),
        checkOut: query.get("checkOut"),
        rooms: JSON.parse(query.get("rooms") || "[]"),
      });
      return result.success ? result.data : undefined;
    } catch {
      return undefined;
    }
  });
  const [criteria, setCriteria] = useState(initial);
  const [filters, setFilters] = useState({ ...defaultFilters });
  const [sort, setSort] = useState<HotelSort>("recommended");
  const [open, setOpen] = useState(false);
  const result = filterHotels(
    hotels,
    filters,
    criteria?.destination || "",
    sort,
  );
  return (
    <CatalogShell title={t("Search", "بحث")}>
      <h1 className="sr-only">
        {t("Hotel Search Results", "نتائج البحث عن الفنادق")}
      </h1>
      <HotelSearchForm compact initialValues={initial} onSearch={setCriteria} />
      <button
        className={`${styles.secondary} ${styles.mobileFilters}`}
        aria-expanded={open}
        aria-controls="hotel-filters"
        onClick={() => setOpen(!open)}
      >
        {t("Filters", "التصفية")}
      </button>
      <div className={styles.resultsLayout}>
        <div
          id="hotel-filters"
          className={`${styles.filterContainer} ${open ? styles.filtersOpen : ""}`}
        >
          <HotelFiltersPanel value={filters} onChange={setFilters} />
        </div>
        <div>
          <div className={styles.listHeader}>
            <h2>{t("Our top choices for you", "أفضل اختياراتنا لك")}</h2>
            <label>
              {t("Sort by", "ترتيب حسب")}
              <select
                aria-label={t("Sort by", "ترتيب حسب")}
                value={sort}
                onChange={(e) => setSort(e.target.value as HotelSort)}
              >
                {[
                  ["recommended", t("Recommended", "موصى به")],
                  [
                    "priceLow",
                    t("Price: low to high", "السعر: من الأقل للأعلى"),
                  ],
                  [
                    "priceHigh",
                    t("Price: high to low", "السعر: من الأعلى للأقل"),
                  ],
                  ["rating", t("Guest rating", "تقييم النزلاء")],
                ].map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p role="status" className={styles.muted}>
            {result.length} {t("sample results", "نتائج تجريبية")}
          </p>
          <div className={styles.results}>
            {result.map((h) => (
              <HotelResultCard key={h.id} hotel={h} dates={criteria} />
            ))}
          </div>
          {!result.length && (
            <p className={styles.empty}>
              {t(
                "No sample hotels match these filters. Try resetting the filters.",
                "لا توجد فنادق تجريبية تطابق هذه التصفية. جرّب إعادة ضبطها.",
              )}
            </p>
          )}
        </div>
      </div>
      <Comparison />
    </CatalogShell>
  );
}
