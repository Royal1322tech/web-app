import { useEffect, useState } from "react";
import { Skeleton, SystemState } from "@/components/ui/system-state";
import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import { useLocale } from "@/features/localization/locale-provider";
import { b2bSession } from "@/features/auth/b2b-session";
import { useTravelPreferences } from "@/features/preferences/travel-preferences";
import {
  classifyB2BSearchError,
  isB2BSearchCurrency,
  searchB2BHotels,
  toB2BHotelSearchRequest,
  type B2BHotelSearchRequest,
  type B2BHotelSearchResult,
  type B2BSearchFailure,
} from "../api/b2b-hotel-search";
import { findDestination } from "../data/destinations";
import styles from "../hotels.module.css";

type SearchState =
  | { status: "loading" }
  | { status: "error"; failure: B2BSearchFailure }
  | { status: "done"; result: B2BHotelSearchResult };

/**
 * Results from the company (B2B) hotel search API, sent with the signed-in company's token. Sample hotels are never shown here, including after a
 * failure. Hotel cards stay off until the backend confirms the fields of a successful reply.
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
  if (!request) {
    return <SystemState title={t("Check your search", "راجع بيانات البحث")} description={t("Choose a destination from the list and a nationality, then search again.", "اختر وجهة من القائمة وجنسية، ثم ابحث مرة أخرى.")} />;
  }
  return (
    <>
      {currency !== preferences.currency && (
        <p className={styles.muted} role="note">
          {t(`Hotel search supports USD, EGP and SAR, so this search uses USD instead of ${preferences.currency}.`, `يدعم البحث عن الفنادق الدولار والجنيه المصري والريال السعودي، لذلك يستخدم هذا البحث الدولار بدلاً من ${preferences.currency}.`)}
        </p>
      )}
      <SearchRun key={requestKey} request={request} />
    </>
  );
}

function SearchRun({ request: initial }: { request: B2BHotelSearchRequest }) {
  const { t } = useLocale();
  // The parent keys this component by the request body, so a changed search remounts it.
  const [request] = useState(initial);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<SearchState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    // Deferred so a mount that is immediately undone (React Strict Mode in development) sends nothing.
    const timer = setTimeout(() => {
      const token = b2bSession.token();
      if (!token) { setState({ status: "error", failure: "signed_out" }); return; }
      searchB2BHotels(request, { token, signal: controller.signal, locale: request.language })
        .then((result) => { if (!controller.signal.aborted) setState({ status: "done", result }); })
        .catch((error: unknown) => { if (!controller.signal.aborted) setState({ status: "error", failure: classifyB2BSearchError(error) }); });
    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [request, attempt]);

  const retry = () => { setState({ status: "loading" }); setAttempt((value) => value + 1); };

  if (state.status === "loading") {
    return (
      <div aria-busy="true">
        <p className={styles.muted} role="status">{t("Searching hotels…", "جارٍ البحث عن الفنادق…")}</p>
        <Skeleton />
      </div>
    );
  }

  if (state.status === "error") {
    const message = failureMessages[state.failure];
    return (
      <div data-search-state={state.failure} role="alert">
        <SystemState title={t(...message.title)} description={t(...message.description)} onRetry={message.retry ? retry : undefined} />
      </div>
    );
  }

  const { total } = state.result;
  if (total === 0) {
    return (
      <div data-search-state="empty">
        <SystemState title={t("No hotels found", "لم يتم العثور على فنادق")} description={t("No hotels are available for these dates and guests. Try other dates or another destination.", "لا توجد فنادق متاحة لهذه التواريخ وعدد النزلاء. جرّب تواريخ أو وجهة أخرى.")} />
      </div>
    );
  }
  return (
    <div data-search-state="results-pending" role="status">
      <SystemState
        title={t(`${total} hotels found`, `تم العثور على ${total} فندق`)}
        description={t("Hotel details can't be displayed yet. Hotel results will appear here once online hotel search is fully enabled. Booking isn't available online.", "لا يمكن عرض تفاصيل الفنادق بعد. ستظهر النتائج هنا عند تفعيل البحث عن الفنادق بالكامل. الحجز غير متاح عبر الإنترنت.")}
      />
    </div>
  );
}

type Text = [en: string, ar: string];
const failureMessages: Record<B2BSearchFailure, { title: Text; description: Text; retry: boolean }> = {
  signed_out: {
    title: ["Your session has ended", "انتهت جلستك"],
    description: ["Sign in again to search hotels.", "سجّل الدخول مرة أخرى للبحث عن الفنادق."],
    retry: false,
  },
  forbidden: {
    title: ["Hotel search isn't enabled for your account", "البحث عن الفنادق غير مفعّل لحسابك"],
    description: ["Your company account doesn't have access to hotel search. Contact us to enable it.", "لا يملك حساب شركتك صلاحية البحث عن الفنادق. تواصل معنا لتفعيلها."],
    retry: false,
  },
  validation: {
    title: ["Check your search", "راجع بيانات البحث"],
    description: ["Some search details weren't accepted. Check the dates, nationality and guests, then search again.", "لم يتم قبول بعض بيانات البحث. راجع التواريخ والجنسية والنزلاء، ثم ابحث مرة أخرى."],
    retry: false,
  },
  rate_limited: {
    title: ["Too many searches", "عدد كبير من عمليات البحث"],
    description: ["Please wait a minute before searching again.", "يرجى الانتظار دقيقة قبل البحث مرة أخرى."],
    retry: true,
  },
  supplier_unavailable: {
    title: ["Hotel search is unavailable", "البحث عن الفنادق غير متاح"],
    description: ["Online hotel search isn't available right now. Please try again later or contact us for help with your booking.", "البحث عن الفنادق عبر الإنترنت غير متاح حالياً. يرجى المحاولة لاحقاً أو التواصل معنا للمساعدة في الحجز."],
    retry: true,
  },
  not_ready: {
    title: ["Search results aren't ready", "نتائج البحث غير جاهزة"],
    description: ["The hotel search is still being prepared. Please try again in a moment.", "لا يزال البحث عن الفنادق قيد التجهيز. يرجى المحاولة بعد قليل."],
    retry: true,
  },
  network: {
    title: ["Can't reach hotel search", "تعذر الوصول إلى البحث عن الفنادق"],
    description: ["Check your internet connection and try again.", "تحقق من اتصالك بالإنترنت وحاول مرة أخرى."],
    retry: true,
  },
  timeout: {
    title: ["The search took too long", "استغرق البحث وقتاً طويلاً"],
    description: ["Hotel search didn't respond in time. Please try again.", "لم يستجب البحث عن الفنادق في الوقت المحدد. يرجى المحاولة مرة أخرى."],
    retry: true,
  },
  unavailable: {
    title: ["Hotel search is unavailable", "البحث عن الفنادق غير متاح"],
    description: ["Something went wrong on our side. Please try again later.", "حدث خطأ من جهتنا. يرجى المحاولة لاحقاً."],
    retry: true,
  },
  unexpected: {
    title: ["Results can't be displayed", "تعذر عرض النتائج"],
    description: ["We received a response we couldn't read, so no hotels are shown. Please try again later.", "تلقينا رداً لم نتمكن من قراءته، لذلك لا تظهر أي فنادق. يرجى المحاولة لاحقاً."],
    retry: true,
  },
};
