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
import { emptyLiveFilters, filterLiveHotels, type LiveFilters } from "../lib/live-filters";
import { LiveHotelFilters } from "./live-hotel-filters";
import { LiveHotelCard, LiveHotelCardSkeleton, type RoomsAction } from "./live-hotel-card";
import { stayQuery } from "../lib/stay-query";
import { roomsPath, type RoomsHotelSummary } from "../lib/rooms-route";
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
      {/* Keyed by the search body: changed criteria start again at page 1. */}
      <SearchRun key={requestKey} request={request} destinationName={t(destination.name.en, destination.name.ar)} roomsQuery={stayQuery(criteria)} />
    </>
  );
}

function SearchRun({ request: initial, destinationName, roomsQuery }: { request: B2BHotelSearchRequest; destinationName: string; roomsQuery: string }) {
  const { t } = useLocale();
  const [request] = useState(initial);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  // Pages already received for this search, so going back never asks the API again.
  const [pages, setPages] = useState<ReadonlyMap<number, B2BHotelSearchResult>>(() => new Map());
  const [failure, setFailure] = useState<{ page: number; attempt: number; kind: B2BSearchFailure } | null>(null);
  const [pagingUnsupported, setPagingUnsupported] = useState(false);
  const [filters, setFilters] = useState<LiveFilters>(emptyLiveFilters);
  const [sort, setSort] = useState<PageSort>("recommended");
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
  const goTo = (next: number) => { if (next >= 1 && next <= pageCount && next !== page) { setFilters(emptyLiveFilters); setPage(next); } };
  const retry = () => { setAttempt((value) => value + 1); };

  const summary = first && (
    <div className={styles.summary}>
      <div>
        <h2 className={styles.count}>
          {t(`${first.total} ${first.total === 1 ? "hotel" : "hotels"} in ${destinationName}`, `${first.total} فندق في ${destinationName}`)}
        </h2>
        {pageCount > 1 && <p className={styles.pageOf} aria-live="polite">{t(`Page ${page} of ${pageCount}`, `الصفحة ${page} من ${pageCount}`)}</p>}
      </div>
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
          <ul className={styles.list}>{Array.from({ length: 4 }, (_, index) => <li key={index}><LiveHotelCardSkeleton variant="row" /></li>)}</ul>
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
        <div data-search-state="results" className={styles.layout}>
          <LiveHotelFilters result={state.result} value={filters} onChange={setFilters} shown={filterLiveHotels(state.result, filters).length} />
          <div className={styles.main}>
            {state.result.hotels.length === 0 ? (
              <SystemState title={t("This page has no hotels", "لا توجد فنادق في هذه الصفحة")} description={t("Go back to the previous page.", "ارجع إلى الصفحة السابقة.")} />
            ) : (
              <>
                <div className={styles.listTools}>
                  <label className={styles.sortField}>
                    <span>{t("Sort by", "الترتيب حسب")}</span>
                    <select value={sort} onChange={(event) => setSort(event.target.value as PageSort)}>
                      <option value="recommended">{t("Recommended", "المقترح")}</option>
                      <option value="stars">{t("Star rating: high to low", "التصنيف: من الأعلى")}</option>
                      <option value="name">{t("Name: A to Z", "الاسم: أ إلى ي")}</option>
                    </select>
                  </label>
                </div>
                <HotelList result={state.result} filters={filters} sort={sort} roomsQuery={roomsQuery} />
              </>
            )}
          </div>
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

/** Sorting the loaded page by values the API actually returns. "Recommended" keeps the supplier's order. */
type PageSort = "recommended" | "stars" | "name";

function sortPage(hotels: B2BHotelSearchResult["hotels"], sort: PageSort) {
  if (sort === "recommended") return hotels;
  // Hotels without the value keep their order and go last: nothing is guessed.
  return hotels.map((hotel, index) => ({ hotel, index })).sort((a, b) => {
    if (sort === "stars") {
      const x = a.hotel.stars ?? -1, y = b.hotel.stars ?? -1;
      return y - x || a.index - b.index;
    }
    if (!a.hotel.name || !b.hotel.name) return (a.hotel.name ? 0 : 1) - (b.hotel.name ? 0 : 1) || a.index - b.index;
    return a.hotel.name.localeCompare(b.hotel.name) || a.index - b.index;
  }).map(({ hotel }) => hotel);
}

function HotelList({ result, filters, sort, roomsQuery }: { result: B2BHotelSearchResult; filters: LiveFilters; sort: PageSort; roomsQuery: string }) {
  const { t } = useLocale();
  const shown = sortPage(filterLiveHotels(result, filters), sort);
  if (shown.length === 0) {
    return <p className={styles.noMatch} data-search-state="no-match">{t("No hotels on this page match these filters.", "لا توجد فنادق في هذه الصفحة تطابق عوامل التصفية هذه.")}</p>;
  }
  return (
    <ul className={styles.list} aria-label={t("Hotels", "الفنادق")}>
      {shown.map((hotel, index) => (
        <li key={`${result.page}-${hotel.result_index ?? "x"}-${index}`}>
          <LiveHotelCard hotel={hotel} result={result} variant="row" eager={index < 2} rooms={roomsActionFor(hotel, roomsQuery)} />
        </li>
      ))}
    </ul>
  );
}

/** "View rooms" only for a hotel with a real hid. The URL carries the search criteria, never tokens. */
function roomsActionFor(hotel: B2BHotelSearchResult["hotels"][number], query: string): RoomsAction {
  if (!hotel.hid) return "unavailable";
  const summary: RoomsHotelSummary = { hid: hotel.hid, name: hotel.name, address: hotel.address, stars: hotel.stars, image: hotel.image };
  return { href: roomsPath(hotel.hid, query), state: { hotel: summary } };
}
