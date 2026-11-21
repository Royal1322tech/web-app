import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { SystemState } from "@/components/ui/system-state";
import { b2bSession } from "@/features/auth/b2b-session";
import { Workspace } from "@/features/demo/shared";
import { useLocale } from "@/features/localization/locale-provider";
import { formatCalendarDate } from "@/lib/format-date";
import { classifyPriceReductionError, listPriceReductionRequests, requestStatusLabel, type PriceReductionFailure, type PriceReductionPage } from "../api/b2b-price-reduction";
import styles from "./price-requests-page.module.css";

const failureText: Record<PriceReductionFailure, [string, string]> = {
  signed_out: ["Your session has ended. Sign in again to see your requests.", "انتهت جلستك. سجّل الدخول مرة أخرى لعرض طلباتك."],
  forbidden: ["Your account can't view price requests.", "لا يمكن لحسابك عرض طلبات الأسعار."],
  validation: ["This page of requests couldn't be loaded.", "تعذر تحميل هذه الصفحة من الطلبات."],
  rate_limited: ["Too many requests. Please wait a moment and try again.", "طلبات كثيرة. يرجى الانتظار قليلًا ثم المحاولة مرة أخرى."],
  network: ["We couldn't reach the server. Check your connection and try again.", "تعذر الوصول إلى الخادم. تحقق من اتصالك وحاول مرة أخرى."],
  timeout: ["The request took too long. Please try again.", "استغرق الطلب وقتًا طويلًا. يرجى المحاولة مرة أخرى."],
  unavailable: ["Price requests are unavailable right now. Please try again later.", "طلبات الأسعار غير متاحة حاليًا. يرجى المحاولة لاحقًا."],
};

/** The company's price reduction requests, from GET /b2b/price-reduction-requests (15 per page). */
export function PriceRequestsPage() {
  const { t, locale } = useLocale();
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: PriceReductionPage; failure?: PriceReductionFailure } | null>(null);
  const key = `${page}:${attempt}`;
  const current = result?.key === key ? result : null;

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const token = b2bSession.token();
      if (!token) { setResult({ key, failure: "signed_out" }); return; }
      listPriceReductionRequests(page, { token, signal: controller.signal })
        .then((data) => { if (!controller.signal.aborted) setResult({ key, data }); })
        .catch((error: unknown) => { if (!controller.signal.aborted) setResult({ key, failure: classifyPriceReductionError(error) }); });
    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, page]);

  const date = (value: string | null) => {
    if (!value) return null;
    const day = value.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(day) ? formatCalendarDate(day, locale) : null;
  };
  const data = current?.data;
  return (
    <Workspace title={t("Price requests", "طلبات الأسعار")}>
      <p className={styles.intro}>{t("Requests for a lower hotel price that your company has sent, with their review status.", "طلبات خفض أسعار الفنادق التي أرسلتها شركتك، مع حالة مراجعتها.")}</p>
      {!current ? (
        <div className={styles.loading} aria-busy="true" data-requests-state="loading"><p role="status">{t("Loading your requests…", "جارٍ تحميل طلباتك…")}</p></div>
      ) : current.failure ? (
        <div role="alert" data-requests-state={current.failure}>
          <SystemState title={t("Requests couldn't be loaded", "تعذر تحميل الطلبات")} description={t(...failureText[current.failure])} onRetry={current.failure === "signed_out" || current.failure === "forbidden" ? undefined : () => setAttempt((value) => value + 1)} />
        </div>
      ) : data && data.items.length === 0 ? (
        <div data-requests-state="empty">
          <SystemState title={t("No price requests yet", "لا توجد طلبات أسعار بعد")} description={t("Open a hotel's rooms from your search results and choose Request a Lower Price.", "افتح غرف فندق من نتائج البحث واختر «اطلب سعرًا أقل».")} />
          <p className={styles.emptyAction}><Link className="button button--primary" to="/search">{t("Search hotels", "ابحث عن فنادق")}</Link></p>
        </div>
      ) : data && (
        <section className={styles.list} aria-label={t("Your price requests", "طلبات الأسعار الخاصة بك")} data-requests-state="list">
          <p className={styles.total}>{t(`${data.total} ${data.total === 1 ? "request" : "requests"}`, `${data.total} طلب`)}</p>
          <ul>
            {data.items.map((item) => (
              <li key={item.id} className={styles.item}>
                <div className={styles.main}>
                  <p className={styles.number}><bdi dir="ltr">{item.request_no ?? item.id}</bdi></p>
                  {item.hotel_name && <h2><bdi>{item.hotel_name}</bdi></h2>}
                  <p className={styles.meta}>
                    {item.room_name && <span><Icon name="bed" aria-hidden="true" /><bdi>{item.room_name}</bdi></span>}
                    {(date(item.checkin) || date(item.checkout)) && <span><Icon name="calendar" aria-hidden="true" /><bdi>{[date(item.checkin), date(item.checkout)].filter(Boolean).join(" – ")}</bdi></span>}
                    {date(item.created_at) && <span>{t("Sent", "أُرسل")} <bdi>{date(item.created_at)}</bdi></span>}
                  </p>
                </div>
                <div className={styles.side}>
                  <span className={styles.status} data-status={item.status ?? undefined}>{requestStatusLabel(item.status, t)}</span>
                  {item.requested_price && <strong><bdi dir="ltr">{item.currency ? `${item.currency} ` : ""}{item.requested_price}</bdi></strong>}
                </div>
              </li>
            ))}
          </ul>
          {data.lastPage > 1 && (
            <nav className={styles.pager} aria-label={t("Request pages", "صفحات الطلبات")}>
              <button type="button" className="button button--outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("Previous", "السابق")}</button>
              <span aria-current="page">{t(`Page ${data.page} of ${data.lastPage}`, `الصفحة ${data.page} من ${data.lastPage}`)}</span>
              <button type="button" className="button button--outline" disabled={page >= data.lastPage} onClick={() => setPage(page + 1)}>{t("Next", "التالي")}</button>
            </nav>
          )}
        </section>
      )}
    </Workspace>
  );
}
