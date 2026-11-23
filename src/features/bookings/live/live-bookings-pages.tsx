import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BackLink } from "@/components/ui/back-link";
import { Icon } from "@/components/ui/icon";
import { SystemState } from "@/components/ui/system-state";
import { Workspace } from "@/features/demo/shared";
import { useLocale } from "@/features/localization/locale-provider";
import { useB2BResource } from "@/lib/api/use-b2b-resource";
import { formatCalendarDate } from "@/lib/format-date";
import { bookingStatuses, bookingStatusLabel, classifyBookingError, getBooking, listBookings, type BookingFailure, type BookingStatus, type LiveBooking } from "./b2b-bookings";
import styles from "@/features/customers/customers.module.css";

const failureText: Record<BookingFailure | "signed_out", [string, string]> = {
  signed_out: ["Your session has ended. Sign in again.", "انتهت جلستك. سجّل الدخول مرة أخرى."],
  forbidden: ["Your account can't view bookings.", "لا يمكن لحسابك عرض الحجوزات."],
  not_found: ["This booking wasn't found in your company.", "لم يُعثر على هذا الحجز في شركتك."],
  rate_limited: ["Too many requests. Please wait a moment and try again.", "طلبات كثيرة. يرجى الانتظار قليلًا ثم المحاولة مرة أخرى."],
  network: ["We couldn't reach the server. Check your connection and try again.", "تعذر الوصول إلى الخادم. تحقق من اتصالك وحاول مرة أخرى."],
  unavailable: ["Bookings can't be loaded right now. Please try again later.", "تعذر تحميل الحجوزات حاليًا. يرجى المحاولة لاحقًا."],
};
const date = (value: string | null, locale: "en" | "ar") => (value && /^\d{4}-\d{2}-\d{2}/.test(value) ? formatCalendarDate(value.slice(0, 10), locale) : null);
const money = (booking: Pick<LiveBooking, "customer_total" | "currency">) => (booking.customer_total ? `${booking.currency ?? ""} ${booking.customer_total}`.trim() : null);

/** Real company bookings (API builds). */
export function LiveBookingsPage() {
  const { t, locale } = useLocale();
  const [status, setStatus] = useState<BookingStatus | "">("");
  const [page, setPage] = useState(1);
  const { state, retry } = useB2BResource(`${status}:${page}`, (token, signal) => listBookings(status, page, { token, signal }), classifyBookingError);
  const lang = locale === "ar" ? "ar" : "en";

  return (
    <Workspace title={t("My Bookings", "حجوزاتي")}>
      <div className={styles.page} data-live-bookings>
        <div className={styles.toolbar}>
          <label className={styles.field}>
            <span>{t("Status", "الحالة")}</span>
            <select className="input" value={status} onChange={(event) => { setStatus(event.target.value as BookingStatus | ""); setPage(1); }}>
              <option value="">{t("All statuses", "كل الحالات")}</option>
              {bookingStatuses.map((value) => <option key={value} value={value}>{bookingStatusLabel(value, t)}</option>)}
            </select>
          </label>
          <Link className="button button--primary" to="/search">{t("Search hotels", "ابحث عن فنادق")}</Link>
        </div>
        {state.status === "loading" && <p className={styles.muted} role="status" data-bookings-state="loading">{t("Loading bookings…", "جارٍ تحميل الحجوزات…")}</p>}
        {state.status === "error" && (
          <div role="alert" data-bookings-state={state.failure}>
            <SystemState title={t("Bookings couldn't be loaded", "تعذر تحميل الحجوزات")} description={t(...failureText[state.failure])} onRetry={state.failure === "signed_out" || state.failure === "forbidden" ? undefined : retry} />
          </div>
        )}
        {state.status === "done" && state.data.items.length === 0 && (
          <div data-bookings-state="empty">
            <SystemState title={t("No bookings yet", "لا توجد حجوزات بعد")} description={status ? t("No bookings have this status.", "لا توجد حجوزات بهذه الحالة.") : t("Booking drafts you create from a hotel's rooms appear here.", "تظهر هنا مسودات الحجز التي تنشئها من غرف الفندق.")} />
          </div>
        )}
        {state.status === "done" && state.data.items.length > 0 && (
          <>
            <p className={styles.muted}>{t(`${state.data.total} ${state.data.total === 1 ? "booking" : "bookings"}`, `${state.data.total} حجز`)}</p>
            <ul className={styles.list} aria-label={t("Bookings", "الحجوزات")} data-bookings-state="list">
              {state.data.items.map((booking) => (
                <li key={booking.booking_id}>
                  <Link className={styles.row} to={`/bookings/${encodeURIComponent(booking.booking_id)}`}>
                    <span>
                      <b><bdi dir="ltr">{booking.booking_no}</bdi> · {bookingStatusLabel(booking.status, t)}</b>
                      <small>
                        {[booking.customer ? `${booking.customer.first_name} ${booking.customer.last_name}` : null,
                          [date(booking.check_in, lang), date(booking.check_out, lang)].filter(Boolean).join(" – ") || null,
                          money(booking)].filter(Boolean).join(" · ")}
                      </small>
                    </span>
                    <Icon name="arrowRight" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
            {state.data.lastPage > 1 && (
              <nav className={styles.pager} aria-label={t("Booking pages", "صفحات الحجوزات")}>
                <button type="button" className="button button--outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("Previous", "السابق")}</button>
                <span>{t(`Page ${state.data.page} of ${state.data.lastPage}`, `الصفحة ${state.data.page} من ${state.data.lastPage}`)}</span>
                <button type="button" className="button button--outline" disabled={page >= state.data.lastPage} onClick={() => setPage(page + 1)}>{t("Next", "التالي")}</button>
              </nav>
            )}
          </>
        )}
      </div>
    </Workspace>
  );
}

/** One company booking with its guests (API builds). Read-only: no cancel, payment or voucher actions. */
export function LiveBookingDetailPage() {
  const { t, locale } = useLocale();
  const { id = "" } = useParams();
  const { state, retry } = useB2BResource(id, (token, signal) => getBooking(id, { token, signal }), classifyBookingError);
  const lang = locale === "ar" ? "ar" : "en";

  return (
    <Workspace title={t("Booking details", "تفاصيل الحجز")}>
      <div className={styles.page} data-live-booking>
        <BackLink to="/bookings">{t("Back to my bookings", "العودة إلى حجوزاتي")}</BackLink>
        {state.status === "loading" && <p className={styles.muted} role="status">{t("Loading booking…", "جارٍ تحميل الحجز…")}</p>}
        {state.status === "error" && (
          <div role="alert" data-booking-state={state.failure}>
            <SystemState title={t("Booking couldn't be shown", "تعذر عرض الحجز")} description={t(...failureText[state.failure])} onRetry={["signed_out", "forbidden", "not_found"].includes(state.failure) ? undefined : retry} />
          </div>
        )}
        {state.status === "done" && (
          <>
            <section className={styles.card} aria-labelledby="booking-summary">
              <h2 id="booking-summary"><bdi dir="ltr">{state.data.booking_no}</bdi></h2>
              <dl className={styles.facts}>
                <div><dt>{t("Status", "الحالة")}</dt><dd data-booking-status={state.data.status}>{bookingStatusLabel(state.data.status, t)}</dd></div>
                {state.data.order_no && <div><dt>{t("Order number", "رقم الطلب")}</dt><dd><bdi dir="ltr">{state.data.order_no}</bdi></dd></div>}
                {state.data.check_in && <div><dt>{t("Check-in", "الوصول")}</dt><dd>{date(state.data.check_in, lang)}</dd></div>}
                {state.data.check_out && <div><dt>{t("Check-out", "المغادرة")}</dt><dd>{date(state.data.check_out, lang)}</dd></div>}
                {state.data.rooms_count !== null && <div><dt>{t("Rooms", "الغرف")}</dt><dd>{state.data.rooms_count}</dd></div>}
                {money(state.data) && <div><dt>{t("Customer total", "إجمالي العميل")}</dt><dd><bdi dir="ltr">{money(state.data)}</bdi></dd></div>}
                {state.data.customer && (
                  <div><dt>{t("Customer", "العميل")}</dt><dd><Link to={`/customers/${encodeURIComponent(state.data.customer.id)}`}><bdi>{state.data.customer.first_name} {state.data.customer.last_name}</bdi></Link></dd></div>
                )}
              </dl>
              {state.data.status === "draft" && <p className={styles.muted}>{t("This is a booking draft: it isn't a confirmed reservation, and no payment has been taken.", "هذه مسودة حجز: ليست حجزًا مؤكدًا، ولم يتم أي دفع.")}</p>}
            </section>
            <section className={styles.card} aria-labelledby="booking-guests">
              <h2 id="booking-guests">{t("Guests", "الضيوف")}</h2>
              {state.data.guests.length === 0 ? <p className={styles.muted}>{t("No guests recorded.", "لا يوجد ضيوف مسجلون.")}</p> : (
                <ul className={styles.list}>
                  {state.data.guests.map((guest, index) => (
                    <li key={`${guest.first_name}-${guest.last_name}-${index}`} className={styles.row}>
                      <span>
                        <b><bdi>{guest.first_name} {guest.last_name}</bdi></b>
                        <small>{[guest.guest_type === "child" ? t("Child", "طفل") : t("Adult", "بالغ"), guest.is_lead ? t("Lead guest", "الضيف الرئيسي") : null, guest.nationality_code].filter(Boolean).join(" · ")}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </Workspace>
  );
}
