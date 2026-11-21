import { useState } from "react";
import { Link } from "react-router-dom";
import { SystemState } from "@/components/ui/system-state";
import { Workspace } from "@/features/demo/shared";
import { useLocale } from "@/features/localization/locale-provider";
import { formatCalendarDate } from "@/lib/format-date";
import type { LoyaltyFailure } from "./b2b-loyalty";
import { useLoyalty } from "./use-loyalty";

const PER_PAGE = 10;
const failureText: Record<LoyaltyFailure, [string, string]> = {
  signed_out: ["Your session has ended. Sign in again to see your points.", "انتهت جلستك. سجّل الدخول مرة أخرى لعرض نقاطك."],
  forbidden: ["Your account can't view loyalty points.", "لا يمكن لحسابك عرض نقاط الولاء."],
  rate_limited: ["Too many requests. Please wait a moment and try again.", "طلبات كثيرة. يرجى الانتظار قليلًا ثم المحاولة مرة أخرى."],
  network: ["We couldn't reach the server. Check your connection and try again.", "تعذر الوصول إلى الخادم. تحقق من اتصالك وحاول مرة أخرى."],
  unavailable: ["Loyalty points are unavailable right now. Please try again later.", "نقاط الولاء غير متاحة حاليًا. يرجى المحاولة لاحقًا."],
};

/** Loyalty points from GET /b2b/loyalty, in the existing Points page design. */
export function LoyaltyPointsPage() {
  const { t, locale } = useLocale();
  const { state, retry } = useLoyalty();
  const [page, setPage] = useState(0);
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const date = (value: string | null) => (value && /^\d{4}-\d{2}-\d{2}/.test(value) ? formatCalendarDate(value.slice(0, 10), locale) : null);
  const label = (value: string | null) => {
    if (!value) return null;
    const known: Record<string, [string, string]> = { earned: ["Earned", "مكتسبة"], earn: ["Earned", "مكتسبة"], redeemed: ["Redeemed", "مستبدلة"], adjustment: ["Adjustment", "تعديل"], expired: ["Expired", "منتهية"], pending: ["Pending", "معلق"], available: ["Available", "متاح"], posted: ["Posted", "مسجل"], reversed: ["Reversed", "معكوس"] };
    const pair = known[value.toLowerCase()];
    return pair ? t(...pair) : value.replace(/[_-]+/g, " ");
  };

  return (
    <Workspace title={t("Points", "النقاط")}>
      {state.status === "loading" && <div aria-busy="true" data-loyalty-state="loading"><p role="status">{t("Loading your points…", "جارٍ تحميل نقاطك…")}</p></div>}
      {state.status === "error" && (
        <div role="alert" data-loyalty-state={state.failure}>
          <SystemState title={t("Points couldn't be loaded", "تعذر تحميل النقاط")} description={t(...failureText[state.failure])} onRetry={state.failure === "signed_out" || state.failure === "forbidden" ? undefined : retry} />
        </div>
      )}
      {state.status === "done" && (() => {
        const { loyalty } = state;
        const pages = Math.max(1, Math.ceil(loyalty.transactions.length / PER_PAGE));
        const shown = loyalty.transactions.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
        return (
          <div data-loyalty-state="done">
            {!loyalty.redemptionEnabled && <p className="fine-print">{t("Points can't be redeemed yet.", "لا يمكن استبدال النقاط حاليًا.")}</p>}
            <div className="points-metrics">
              <section className="workspace-card" data-points="available"><h2>{t("Available points", "النقاط المتاحة")}</h2><strong><bdi>{number(loyalty.available)}</bdi></strong></section>
              <section className="workspace-card" data-points="pending"><h2>{t("Pending points", "النقاط المعلقة")}</h2><strong><bdi>{number(loyalty.pending)}</bdi></strong></section>
            </div>
            <section className="workspace-card points-history">
              <p className="workspace-eyebrow">{t("RECENT ACTIVITY", "النشاط الأخير")}</p>
              <h2>{t("Points transaction history", "سجل معاملات النقاط")}</h2>
              {loyalty.transactions.length === 0 ? (
                <div data-loyalty-state="empty">
                  <p role="status">{t("No points activity yet. Points your company earns will appear here.", "لا يوجد نشاط نقاط بعد. ستظهر هنا النقاط التي تكسبها شركتك.")}</p>
                  <p><Link to="/search">{t("Search hotels", "ابحث عن فنادق")}</Link></p>
                </div>
              ) : (
                <>
                  <ul className="points-list">
                    {shown.map((entry, index) => (
                      <li key={entry.id ?? `${page}-${index}`}>
                        <div>
                          <h3>{entry.description ?? label(entry.type) ?? t("Points activity", "نشاط النقاط")}</h3>
                          <p>{[date(entry.date), entry.reference].filter(Boolean).map((part, i) => <span key={i}>{i > 0 && " · "}<bdi>{part}</bdi></span>)}</p>
                        </div>
                        <div>{entry.type && <span>{label(entry.type)}</span>}{entry.status && <p>{label(entry.status)}</p>}</div>
                        {entry.points !== null && <strong className={entry.points > 0 ? "points-positive" : ""}><bdi>{entry.points > 0 ? "+" : ""}{number(entry.points)}</bdi> <small>{t("pts", "نقطة")}</small></strong>}
                      </li>
                    ))}
                  </ul>
                  {pages > 1 && (
                    <nav className="workspace-actions" aria-label={t("Points pagination", "صفحات النقاط")}>
                      <button type="button" className="button button--outline" disabled={page === 0} onClick={() => setPage(page - 1)}>{t("Previous", "السابق")}</button>
                      <span>{t(`Page ${page + 1} of ${pages}`, `الصفحة ${page + 1} من ${pages}`)}</span>
                      <button type="button" className="button button--outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>{t("Next", "التالي")}</button>
                    </nav>
                  )}
                </>
              )}
            </section>
          </div>
        );
      })()}
    </Workspace>
  );
}

/** A compact points summary for the Wallet page, linking to the full Points page. */
export function LoyaltySummaryCard() {
  const { t, locale } = useLocale();
  const { state, retry } = useLoyalty();
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  return (
    <section className="workspace-card loyalty-summary" aria-labelledby="loyalty-summary-title" data-loyalty-state={state.status === "error" ? state.failure : state.status}>
      <p className="workspace-eyebrow">{t("LOYALTY POINTS", "نقاط الولاء")}</p>
      <h2 id="loyalty-summary-title">{t("Your points", "نقاطك")}</h2>
      {state.status === "loading" && <p role="status">{t("Loading your points…", "جارٍ تحميل نقاطك…")}</p>}
      {state.status === "error" && <p role="alert">{t(...failureText[state.failure])} {state.failure !== "signed_out" && state.failure !== "forbidden" && <button type="button" className="text-button" onClick={retry}>{t("Try again", "حاول مرة أخرى")}</button>}</p>}
      {state.status === "done" && (
        <dl className="loyalty-summary__values">
          <div><dt>{t("Available", "المتاحة")}</dt><dd><bdi>{number(state.loyalty.available)}</bdi></dd></div>
          <div><dt>{t("Pending", "المعلقة")}</dt><dd><bdi>{number(state.loyalty.pending)}</bdi></dd></div>
        </dl>
      )}
      <Link to="/points">{t("View points activity", "عرض نشاط النقاط")}</Link>
    </section>
  );
}
