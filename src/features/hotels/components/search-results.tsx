import { readStayQuery, stayQuery } from "../lib/stay-query";
import { StatePreview } from "@/components/ui/system-state";
import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { HotelSearchForm } from "@/features/home/components/hotel-search-form";
import { type HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
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
  const [query, setQuery] = useSearchParams();
  return (
    <SearchResultsContent
      key={query.toString()}
      query={query}
      onSearch={(criteria) => setQuery(stayQuery(criteria))}
    />
  );
}
function SearchResultsContent({
  query,
  onSearch,
}: {
  query: Pick<URLSearchParams, "get">;
  onSearch: (criteria: HotelSearchCriteria) => void;
}) {
  const { t } = useLocale();
  const [criteria] = useState(() => readStayQuery(query));
  const [filters, setFilters] = useState({ ...defaultFilters });
  const [sort, setSort] = useState<HotelSort>("recommended");
  const [open, setOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const result = filterHotels(
    hotels,
    filters,
    criteria?.destination || "",
    sort,
  );
  return (
    <CatalogShell title={t("Search", "بحث")}>
      <h1>{t("Hotel Search Results", "نتائج البحث عن الفنادق")}</h1>
      <HotelSearchForm compact initialValues={criteria} onSearch={onSearch} />
      <button
        className={`${styles.secondary} ${styles.mobileFilters}`}
        aria-expanded={open}
        ref={filterTrigger}
        aria-controls="mobile-hotel-filters"
        onClick={() => {
          setOpen(true);
          drawer.current?.showModal();
        }}
      >
        {t("Filters", "التصفية")}
      </button>
      <dialog
        ref={drawer}
        id="mobile-hotel-filters"
        className={styles.filterDrawer}
        aria-labelledby="mobile-filter-title"
        onClose={() => {
          setOpen(false);
          filterTrigger.current?.focus();
        }}
      >
        <div className={styles.drawerHeading}>
          <h2 id="mobile-filter-title">{t("Filters", "التصفية")}</h2>
          <button
            className={styles.secondary}
            onClick={() => drawer.current?.close()}
          >
            {t("Close", "إغلاق")}
          </button>
        </div>
        {open && <HotelFiltersPanel value={filters} onChange={setFilters} />}
        <button
          className={styles.primary}
          onClick={() => drawer.current?.close()}
        >
          {t(`Show ${result.length} hotels`, `عرض ${result.length} فنادق`)}
        </button>
      </dialog>
      <StatePreview
        emptyTitle={t("No hotels to display", "لا توجد فنادق للعرض")}
      >
        <div className={styles.resultsLayout}>
          <div id="hotel-filters" className={styles.filterContainer}>
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
      </StatePreview>
      <Comparison />
    </CatalogShell>
  );
}
