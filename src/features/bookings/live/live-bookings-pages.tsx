import { Link, useParams, useSearchParams } from "react-router-dom";
import { BackLink } from "@/components/ui/back-link";
import { Icon } from "@/components/ui/icon";
import { SystemState } from "@/components/ui/system-state";
import { Workspace } from "@/features/demo/shared";
import { useLocale } from "@/features/localization/locale-provider";
import { useB2BResource } from "@/lib/api/use-b2b-resource";
import { formatCalendarDate } from "@/lib/format-date";
import { bookingStatusLabel, classifyBookingError, getBooking, listBookings, statusesFor, type BookingFailure, type BookingScope, type BookingStatus, type LiveBooking } from "./b2b-bookings";
import { confirmationView, type ConfirmationView } from "./b2b-booking-confirm";
import { BookingConfirmPanel } from "./booking-confirm-panel";
import { BookingTicketsSection } from "@/features/support/live-support-pages";
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

const confirmationLabel: Partial<Record<ConfirmationView, [string, string]>> = {
  wallet_held: ["Wallet held", "المبلغ محجوز"], preparing: ["Preparing confirmation", "جارٍ تجهيز التأكيد"],
  manual_review: ["Manual review", "مراجعة يدوية"], uncertain: ["Outcome uncertain", "النتيجة غير مؤكدة"],
  processing: ["Supplier processing", "المورد يعالج الحجز"], failed: ["Expired before confirmation", "انتهت قبل التأكيد"],
};
/** The booking's status, with the confirmation progress when there is one. */
export function bookingStateText(booking: Pick<LiveBooking, "status" | "confirmation_state" | "confirmed_at">, t: (en: string, ar: string) => string) {
  const view = confirmationView(booking.status, booking.confirmation_state, booking.confirmed_at);
  const extra = confirmationLabel[view];
  return extra && booking.confirmation_state ? `${bookingStatusLabel(booking.status, t)} · ${t(...extra)}` : bookingStatusLabel(booking.status, t);
}

const scopes: { scope: BookingScope; label: [string, string]; empty: [string, string] }[] = [
  { scope: "mine", label: ["My bookings", "حجوزاتي"], empty: ["Bookings you create appear here.", "تظهر هنا الحجوزات التي تنشئها."] },
  { scope: "incomplete", label: ["Incomplete", "غير المكتملة"], empty: ["You have no drafts or bookings waiting to be completed.", "لا توجد لديك مسودات أو حجوزات بانتظار الإكمال."] },
  { scope: "company", label: ["Company bookings", "حجوزات الشركة"], empty: ["Your company's bookings appear here.", "تظهر هنا حجوزات شركتك."] },
];
const isScope = (value: string | null): value is BookingScope => value === "mine" || value === "incomplete" || value === "company";

/** Real bookings (API builds): the employee's own, their incomplete ones, and the company's. */
export function LiveBookingsPage() {
  const { t, locale } = useLocale();
  const [params, setParams] = useSearchParams();
  const scope: BookingScope = isScope(params.get("view")) ? (params.get("view") as BookingScope) : "mine";
  const rawStatus = params.get("status") ?? "";
  const status = (statusesFor(scope) as readonly string[]).includes(rawStatus) ? (rawStatus as BookingStatus) : "";
  const page = Math.max(1, Math.min(1000, Number.parseInt(params.get("page") ?? "1", 10) || 1));
  const update = (next: { view?: BookingScope; status?: string; page?: number }) => {
    const query = new URLSearchParams();
    const view = next.view ?? scope;
    if (view !== "mine") query.set("view", view);
    const nextStatus = next.view && next.view !== scope ? "" : next.status ?? status;
    if (nextStatus) query.set("status", nextStatus);
    const nextPage = next.page ?? 1;
    if (nextPage > 1) query.set("page", String(nextPage));
    setParams(query);
  };
  const { state, retry } = useB2BResource(`${scope}:${status}:${page}`, (token, signal) => listBookings(scope, status, page, { token, signal }), classifyBookingError);
  const lang = locale === "ar" ? "ar" : "en";
  const current = scopes.find((item) => item.scope === scope)!;

  return (
    <Workspace title={t(...current.label)}>
      <div className={styles.page} data-live-bookings data-scope={scope}>
        <nav className={styles.tabs} aria-label={t("Booking lists", "قوائم الحجوزات")}>
          {scopes.map((item) => (
            <Link key={item.scope} to={item.scope === "mine" ? "/bookings" : `/bookings?view=${item.scope}`} aria-current={item.scope === scope ? "page" : undefined} onClick={(event) => { event.preventDefault(); update({ view: item.scope }); }}>
              {t(...item.label)}
            </Link>
          ))}
        </nav>
        <div className={styles.toolbar}>
          <label className={styles.field}>
            <span>{t("Status", "الحالة")}</span>
            <select className="input" value={status} onChange={(event) => update({ status: event.target.value })}>
              <option value="">{t("All statuses", "كل الحالات")}</option>
              {statusesFor(scope).map((value) => <option key={value} value={value}>{bookingStatusLabel(value, t)}</option>)}
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
            <SystemState title={t("No bookings yet", "لا توجد حجوزات بعد")} description={status ? t("No bookings have this status.", "لا توجد حجوزات بهذه الحالة.") : t(...current.empty)} />
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
                      <b><bdi dir="ltr">{booking.booking_no}</bdi> · <span data-booking-state={booking.status}>{bookingStateText(booking, t)}</span></b>
                      <small>
                        {[booking.customer ? `${booking.customer.first_name} ${booking.customer.last_name}` : null,
                          [date(booking.check_in, lang), date(booking.check_out, lang)].filter(Boolean).join(" – ") || null,
                          money(booking)].filter(Boolean).join(" · ")}
                      </small>
                      {booking.status === "draft" && booking.can_resume_draft === true && !booking.confirmation_state && <small className={styles.badge} data-resumable>{t("Draft: continue to confirm", "مسودة: تابع للتأكيد")}</small>}
                      {booking.status === "draft" && booking.can_resume_draft === false && !booking.confirmation_state && <small className={styles.muted} data-resumable="false">{t("This draft can't be continued. Search again to book.", "لا يمكن متابعة هذه المسودة. ابحث مرة أخرى للحجز.")}</small>}
                    </span>
                    <Icon name="arrowRight" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
            {state.data.lastPage > 1 && (
              <nav className={styles.pager} aria-label={t("Booking pages", "صفحات الحجوزات")}>
                <button type="button" className="button button--outline" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>{t("Previous", "السابق")}</button>
                <span>{t(`Page ${state.data.page} of ${state.data.lastPage}`, `الصفحة ${state.data.page} من ${state.data.lastPage}`)}</span>
                <button type="button" className="button button--outline" disabled={page >= state.data.lastPage} onClick={() => update({ page: page + 1 })}>{t("Next", "التالي")}</button>
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
    <Workspace title={t("Booking details", "تفاصيل الحجز")} trail={[{ to: "/bookings", label: t("My bookings", "حجوزاتي") }]}>
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
                <div><dt>{t("Status", "الحالة")}</dt><dd data-booking-status={state.data.status}>{bookingStateText(state.data, t)}</dd></div>
                {state.data.order_no && <div><dt>{t("Order number", "رقم الطلب")}</dt><dd><bdi dir="ltr">{state.data.order_no}</bdi></dd></div>}
                {state.data.check_in && <div><dt>{t("Check-in", "الوصول")}</dt><dd>{date(state.data.check_in, lang)}</dd></div>}
                {state.data.check_out && <div><dt>{t("Check-out", "المغادرة")}</dt><dd>{date(state.data.check_out, lang)}</dd></div>}
                {state.data.rooms_count !== null && <div><dt>{t("Rooms", "الغرف")}</dt><dd>{state.data.rooms_count}</dd></div>}
                {money(state.data) && <div><dt>{t("Customer total", "إجمالي العميل")}</dt><dd><bdi dir="ltr">{money(state.data)}</bdi></dd></div>}
                {state.data.customer && (
                  <div><dt>{t("Customer", "العميل")}</dt><dd><Link to={`/customers/${encodeURIComponent(state.data.customer.id)}`}><bdi>{state.data.customer.first_name} {state.data.customer.last_name}</bdi></Link></dd></div>
                )}
              </dl>
              {state.data.status === "draft" && !state.data.confirmation_state && <p className={styles.muted}>{t("This is a booking draft: it isn't a confirmed reservation, and no payment has been taken.", "هذه مسودة حجز: ليست حجزًا مؤكدًا، ولم يتم أي دفع.")}</p>}
            </section>
            {state.data.status === "draft" && (state.data.can_resume_draft !== false || state.data.confirmation_state) && (
              <BookingConfirmPanel
                bookingId={state.data.booking_id}
                agencyPurchasePrice={state.data.agency_purchase_price}
                customerTotal={state.data.customer_total}
                currency={state.data.currency}
                initial={{ booking_id: state.data.booking_id, status: state.data.status, confirmation_state: state.data.confirmation_state, confirmed_at: state.data.confirmed_at }}
              />
            )}
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
            <BookingTicketsSection booking={state.data} />
          </>
        )}
      </div>
    </Workspace>
  );
}
