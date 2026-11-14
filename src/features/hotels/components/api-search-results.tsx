import { useEffect, useRef, useState } from "react";
import { SystemState } from "@/components/ui/system-state";
import { Icon } from "@/components/ui/icon";
import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import { useLocale } from "@/features/localization/locale-provider";
import { b2bSession } from "@/features/auth/b2b-session";
import { useTravelPreferences } from "@/features/preferences/travel-preferences";
import { ApiError } from "@/lib/api/client";
import {
  classifyB2BSearchError,
  isB2BSearchCurrency,
  searchB2BHotels,
  toB2BHotelSearchRequest,
  totalPages,
  type B2BHotelSearchRequest,
  type B2BHotelSearchResult,
  type B2BSearchFailure,
} from "../api/b2b-hotel-search";
import { findDestination } from "../data/destinations";
import { emptyPageFilters, filterPage, pageFiltersActive, type PageFilters } from "../lib/live-hotels";
import { LiveHotelCard, LiveHotelCardSkeleton } from "./live-hotel-card";
import { searchFailureMessages } from "./search-failure-messages";
import styles from "./api-search-results.module.css";

/**
 * Results from the company (B2B) hotel search, sent with the signed-in company's token. Every hotel
 * on the loaded page is shown as returned. Sample hotels are never shown, including after a failure.
 */
export function ApiSearchResults({ criteria }: { criteria?: HotelSearchCriteria }) {
  const { t, locale } = useLocale();
  const preferences = useTravelPreferences();
  const currency = isB2BSearchCurrency(preferences.currency) ? preferences.currency : "USD";
  const destination = findDestination(criteria?.destination);
  const request = criteria && destination
    ? toB2BHotelSearchRequest(criteria, destination.point, { language: locale === "ar" ? "ar" : "en", currency })
    : null;
  const requestKey = request ? JSON.stringify(request) : "";

  if (!criteria) {
    return <SystemState title={t("Start a hotel search", "ابدأ البحث عن فندق")} description={t("Choose a destination, dates and guests, then select Search.", "اختر الوجهة والتواريخ والنزلاء، ثم اضغط بحث.")} />;
  }
  if (!request || !destination) {
    return <SystemState title={t("Check your search", "راجع بيانات البحث")} description={t("Choose a destination from the list and a nationality, then search again.", "اختر وجهة من القائمة وجنسية، ثم ابحث مرة أخرى.")} />;
  }
  return (
    <>
      {currency !== preferences.currency && (
        <p className={styles.note} role="note">
          {t(`Hotel search supports USD, EGP and SAR, so this search uses USD instead of ${preferences.currency}.`, `يدعم البحث عن الفنادق الدولار والجنيه المصري والريال السعودي، لذلك يستخدم هذا البحث الدولار بدلاً من ${preferences.currency}.`)}
        </p>
      )}
      {/* Keyed by the search body: changed criteria start again at page 1. */}
      <SearchRun key={requestKey} request={request} destinationName={t(destination.name.en, destination.name.ar)} />
    </>
  );
}

function SearchRun({ request: initial, destinationName }: { request: B2BHotelSearchRequest; destinationName: string }) {
  const { t } = useLocale();
  const [request] = useState(initial);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  // Pages already received for this search, so going back never asks the API again.
  const [pages, setPages] = useState<ReadonlyMap<number, B2BHotelSearchResult>>(() => new Map());
  const [failure, setFailure] = useState<{ page: number; attempt: number; kind: B2BSearchFailure } | null>(null);
  const [pagingUnsupported, setPagingUnsupported] = useState(false);
  const [filters, setFilters] = useState<PageFilters>(emptyPageFilters);
  const top = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);

  const current = pages.get(page);
  const failed = failure && failure.page === page && failure.attempt === attempt ? failure.kind : null;
  const state = current ? { status: "done" as const, result: current } : failed ? { status: "error" as const, failure: failed } : { status: "loading" as const };
  const perPage = pages.get(1)?.perPage;

  useEffect(() => {
    if (pages.has(page)) return;
    const controller = new AbortController();
    // Deferred so a mount that is immediately undone (React Strict Mode in development) sends nothing.
    const timer = setTimeout(() => {
      const token = b2bSession.token();
      if (!token) { setFailure({ page, attempt, kind: "signed_out" }); return; }
      // Page 1 is the confirmed search body exactly. Later pages add page and per_page to the full body.
      const paging = page > 1 && perPage ? { page, per_page: perPage } : undefined;
      searchB2BHotels(request, { token, signal: controller.signal, locale: request.language, page: paging })
        .then((result) => {
          if (controller.signal.aborted) return;
          if (page > 1 && result.page !== page) {
            // The API answered with a different page: it does not page this search. Stay on page 1.
            setPagingUnsupported(true);
            setPage(1);
            return;
          }
          setPages((previous) => new Map(previous).set(page, result));
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          if (page > 1 && error instanceof ApiError && error.kind === "validation" && (error.fieldErrors.page || error.fieldErrors.per_page)) {
            setPagingUnsupported(true);
            setPage(1);
            return;
          }
          setFailure({ page, attempt, kind: classifyB2BSearchError(error) });
        });
    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [request, page, attempt, pages, perPage]);

  useEffect(() => {
    if (firstLoad.current) { firstLoad.current = false; return; }
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    top.current?.focus({ preventScroll: true });
  }, [page]);

  const first = pages.get(1);
  const pageCount = first && !pagingUnsupported ? totalPages(first) : 1;
  const goTo = (next: number) => { if (next >= 1 && next <= pageCount && next !== page) { setFilters(emptyPageFilters); setPage(next); } };
  const retry = () => { setAttempt((value) => value + 1); };

  const summary = first && (
    <div className={styles.summary}>
      <div>
        <h2 className={styles.count}>
          {t(`${first.total} ${first.total === 1 ? "hotel" : "hotels"} in ${destinationName}`, `${first.total} فندق في ${destinationName}`)}
        </h2>
        {pageCount > 1 && <p className={styles.pageOf} aria-live="polite">{t(`Page ${page} of ${pageCount}`, `الصفحة ${page} من ${pageCount}`)}</p>}
      </div>
      {!first.pricingVerified && (
        <p className={styles.preview}><Icon name="info" />{t("Availability preview: prices aren't verified yet and booking is unavailable.", "معاينة التوافر: لم يتم التحقق من الأسعار بعد والحجز غير متاح.")}</p>
      )}
    </div>
  );

  return (
    <div className={styles.results} ref={top} tabIndex={-1} aria-label={t("Hotel results", "نتائج الفنادق")}>
      {summary}
      {pagingUnsupported && (
        <p className={styles.note} role="status">{t("Only the first page of results can be shown for this search.", "يمكن عرض الصفحة الأولى فقط من نتائج هذا البحث.")}</p>
      )}

      {state.status === "loading" && (
        <div aria-busy="true" data-search-state="loading">
          <p className={styles.srOnly} role="status">{t("Searching hotels…", "جارٍ البحث عن الفنادق…")}</p>
          {!first && <p className={styles.loadingText} aria-hidden="true">{t("Searching hotels…", "جارٍ البحث عن الفنادق…")}</p>}
          <div className={styles.grid}>{Array.from({ length: 6 }, (_, index) => <LiveHotelCardSkeleton key={index} />)}</div>
        </div>
      )}

      {state.status === "error" && (
        <div data-search-state={state.failure} role="alert">
          <SystemState
            title={t(...searchFailureMessages[state.failure].title)}
            description={t(...searchFailureMessages[state.failure].description)}
            onRetry={searchFailureMessages[state.failure].retry ? retry : undefined}
          />
        </div>
      )}

      {state.status === "done" && state.result.total === 0 && (
        <div data-search-state="empty">
          <SystemState title={t("No hotels found", "لم يتم العثور على فنادق")} description={t("No hotels are available for these dates and guests. Try other dates or another destination.", "لا توجد فنادق متاحة لهذه التواريخ وعدد النزلاء. جرّب تواريخ أو وجهة أخرى.")} />
        </div>
      )}

      {state.status === "done" && state.result.total > 0 && (
        <div data-search-state="results">
          <PageFilterBar value={filters} onChange={setFilters} />
          {state.result.hotels.length === 0 ? (
            <SystemState title={t("This page has no hotels", "لا توجد فنادق في هذه الصفحة")} description={t("Go back to the previous page.", "ارجع إلى الصفحة السابقة.")} />
          ) : (
            <HotelGrid result={state.result} filters={filters} onClear={() => setFilters(emptyPageFilters)} />
          )}
        </div>
      )}

      {pageCount > 1 && (
        <nav className={styles.pager} aria-label={t("Result pages", "صفحات النتائج")}>
          <button type="button" onClick={() => goTo(page - 1)} disabled={page <= 1 || state.status === "loading"}>
            <Icon name="back" />{t("Previous", "السابق")}
          </button>
          <span aria-current="page">{t(`Page ${page} of ${pageCount}`, `الصفحة ${page} من ${pageCount}`)}</span>
          <button type="button" onClick={() => goTo(page + 1)} disabled={page >= pageCount || state.status === "loading"}>
            {t("Next", "التالي")}<Icon name="arrowRight" />
          </button>
        </nav>
      )}
    </div>
  );
}

function HotelGrid({ result, filters, onClear }: { result: B2BHotelSearchResult; filters: PageFilters; onClear: () => void }) {
  const { t } = useLocale();
  const shown = filterPage(result.hotels, filters);
  return (
    <>
      {pageFiltersActive(filters) && (
        <p className={styles.filterCount} role="status">
          {t(`${shown.length} of ${result.hotels.length} hotels on this page match`, `${shown.length} من ${result.hotels.length} فنادق في هذه الصفحة مطابقة`)}
          <button type="button" onClick={onClear}>{t("Clear filters", "مسح عوامل التصفية")}</button>
        </p>
      )}
      <ul className={styles.grid} aria-label={t("Hotels", "الفنادق")}>
        {shown.map((hotel, index) => (
          <li key={`${result.page}-${hotel.result_index ?? "x"}-${index}`}>
            <LiveHotelCard hotel={hotel} result={result} eager={index < 3} />
          </li>
        ))}
      </ul>
    </>
  );
}

/** Filters for the hotels on the loaded page only; there is no price filter while prices are unverified. */
function PageFilterBar({ value, onChange }: { value: PageFilters; onChange: (next: PageFilters) => void }) {
  const { t } = useLocale();
  return (
    <fieldset className={styles.filters}>
      <legend>{t("Filter this page", "تصفية هذه الصفحة")}</legend>
      <label>
        <span>{t("Hotel name or address", "اسم الفندق أو العنوان")}</span>
        <input type="search" value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} />
      </label>
      <label>
        <span>{t("Stars", "النجوم")}</span>
        <select value={value.minStars} onChange={(event) => onChange({ ...value, minStars: Number(event.target.value) })}>
          <option value={0}>{t("Any", "الكل")}</option>
          {[3, 4, 5].map((stars) => <option key={stars} value={stars}>{t(`${stars}+ stars`, `${stars}+ نجوم`)}</option>)}
        </select>
      </label>
      <label className={styles.check}>
        <input type="checkbox" checked={value.breakfastOnly} onChange={(event) => onChange({ ...value, breakfastOnly: event.target.checked })} />
        <span>{t("Breakfast available", "الإفطار متاح")}</span>
      </label>
    </fieldset>
  );
}
