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
import { EventDistance, HotelMapView } from "./hotel-map-view";
import { eventDistanceKm, sortByEventDistance } from "../lib/event-proximity";
import type { GeoPoint } from "../lib/geo";
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
  const [sort, setSort] = useState<HotelSort | "nearest">("recommended");
  const [view, setView] = useState<"list" | "map">("list");
  const [event, setEvent] = useState<GeoPoint | null>(null);
  const [open, setOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const activeCount = Object.entries(filters).reduce((count, [key, value]) => count + (Array.isArray(value) ? value.length : key === "packaging" ? Number(value !== "all") : Number(Boolean(value))), 0);
  const baseSort = sort === "nearest" ? "recommended" : sort;
  const filtered = filterHotels(
    hotels,
    filters,
    criteria?.destination || "",
    baseSort,
  );
  // Proximity only reorders the results the filters already produced.
  const result = sort === "nearest" && event ? sortByEventDistance(filtered, event) : filtered;
  const boardCandidates = filterHotels(
    hotels,
    { ...filters, board: [] },
    criteria?.destination || "",
    baseSort,
  );
  const clearEvent = () => {
    setEvent(null);
    if (sort === "nearest") setSort("recommended");
  };
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
        {t("Filters", "التصفية")}{activeCount > 0 && ` (${activeCount})`}
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
        {open && <HotelFiltersPanel value={filters} onChange={setFilters} availableHotels={boardCandidates} />}
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
            <HotelFiltersPanel value={filters} onChange={setFilters} availableHotels={boardCandidates} />
          </div>
          <div>
            <div className={styles.listHeader}>
              <h2>{t("Our top choices for you", "أفضل اختياراتنا لك")}</h2>
              <div className={styles.resultsTools}>
              <div className={styles.viewSwitch} role="group" aria-label={t("Results view", "طريقة عرض النتائج")}>
                <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>{t("List View", "عرض القائمة")}</button>
                <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>{t("Map View", "عرض الخريطة")}</button>
              </div>
              <label>
                {t("Sort by", "ترتيب حسب")}
                <select
                  aria-label={t("Sort by", "ترتيب حسب")}
                  value={sort}
                  onChange={(e) => setSort(e.target.value as HotelSort | "nearest")}
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
                  <option value="nearest" disabled={!event}>
                    {t("Nearest to Event", "الأقرب إلى الفعالية")}
                  </option>
                </select>
              </label>
              </div>
            </div>
            <div className={styles.muted}>
              <p role="status">{result.length} {t("hotel results", "نتائج الفنادق")}</p>
              <p>{t("Illustrative prices · availability requires supplier confirmation.", "أسعار توضيحية · التوافر يتطلب تأكيد المورد.")}</p>
            </div>
            {view === "map" && result.length > 0 && (
              <HotelMapView hotels={result} event={event} criteria={criteria} onSelectEvent={setEvent} onClearEvent={clearEvent} />
            )}
            {view === "list" && (
              <div className={styles.results}>
                {result.map((h, index) => (
                  <HotelResultCard
                    key={h.id}
                    hotel={h}
                    dates={criteria}
                    eager={index === 0}
                    distanceBadge={event ? <EventDistance distance={eventDistanceKm(h, event)} /> : undefined}
                  />
                ))}
              </div>
            )}
            {!result.length && (
              <p className={styles.empty}>
                {t(
                  "No hotels match these filters. Try resetting the filters.",
                  "لا توجد فنادق تطابق عوامل التصفية. جرّب إعادة ضبطها.",
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
