import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BackLink } from "@/components/ui/back-link";
import { Icon } from "@/components/ui/icon";
import { SystemState } from "@/components/ui/system-state";
import { b2bSession } from "@/features/auth/b2b-session";
import { getBooking, classifyBookingError, type LiveBooking } from "@/features/bookings/live/b2b-bookings";
import { Workspace } from "@/features/demo/shared";
import { useLocale } from "@/features/localization/locale-provider";
import { ApiError } from "@/lib/api/client";
import { useB2BResource } from "@/lib/api/use-b2b-resource";
import { formatCalendarDate } from "@/lib/format-date";
import {
  BODY_MAX,
  SUBJECT_MAX,
  bookingAcceptsTickets,
  classifySupportError,
  createTicket,
  fetchTicketCategories,
  getTicket,
  isRetryableSupportFailure,
  listBookingTickets,
  listTickets,
  replyToTicket,
  supportIdempotencyKey,
  ticketAcceptsReplies,
  ticketCategoryLabel,
  ticketStatusLabel,
  type Page,
  type SupportFailure,
  type Ticket,
} from "./b2b-support";
import styles from "@/features/customers/customers.module.css";
import support from "./support.module.css";

type Text = [string, string];
const failureText: Record<SupportFailure | "signed_out", Text> = {
  signed_out: ["Your session has ended. Sign in again.", "انتهت جلستك. سجّل الدخول مرة أخرى."],
  forbidden: ["Your account can't use support tickets.", "لا يمكن لحسابك استخدام تذاكر الدعم."],
  not_found: ["This ticket or booking wasn't found for your account.", "لم يُعثر على هذه التذكرة أو الحجز لحسابك."],
  conflict: ["This request conflicts with an earlier one. Refresh and check before sending again.", "يتعارض هذا الطلب مع طلب سابق. حدّث الصفحة وتحقق قبل الإرسال مرة أخرى."],
  validation: ["Check the highlighted fields.", "تحقق من الحقول المحددة."],
  rate_limited: ["Too many requests. Please wait a minute and try again.", "طلبات كثيرة. يرجى الانتظار دقيقة ثم المحاولة مرة أخرى."],
  network: ["We couldn't reach the server. Your message may not have been sent: try again, it won't be sent twice.", "تعذر الوصول إلى الخادم. ربما لم تُرسل رسالتك: حاول مرة أخرى، ولن تُرسل مرتين."],
  unavailable: ["Support isn't available right now. Please try again later.", "الدعم غير متاح حاليًا. يرجى المحاولة لاحقًا."],
};
const day = (value: string | null, locale: string) => (value && /^\d{4}-\d{2}-\d{2}/.test(value) ? formatCalendarDate(value.slice(0, 10), locale === "ar" ? "ar" : "en") : null);

function Pager({ page, lastPage, onPage, label }: { page: number; lastPage: number; onPage: (page: number) => void; label: string }) {
  const { t } = useLocale();
  if (lastPage <= 1) return null;
  return (
    <nav className={styles.pager} aria-label={label}>
      <button type="button" className="button button--outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>{t("Previous", "السابق")}</button>
      <span>{t(`Page ${page} of ${lastPage}`, `الصفحة ${page} من ${lastPage}`)}</span>
      <button type="button" className="button button--outline" disabled={page >= lastPage} onClick={() => onPage(page + 1)}>{t("Next", "التالي")}</button>
    </nav>
  );
}

function TicketRows({ tickets }: { tickets: Ticket[] }) {
  const { t, locale } = useLocale();
  return (
    <ul className={styles.list} aria-label={t("Support tickets", "تذاكر الدعم")} data-tickets>
      {tickets.map((ticket) => (
        <li key={ticket.id}>
          <Link className={styles.row} to={`/tickets/${encodeURIComponent(ticket.id)}`}>
            <span>
              <b><bdi>{ticket.subject}</bdi></b>
              <small>{[ticket.ticket_no, ticketCategoryLabel(ticket.category, t), day(ticket.updated_at ?? ticket.created_at, locale)].filter(Boolean).join(" · ")}</small>
              <small className={support.status} data-ticket-status={ticket.status}>{ticketStatusLabel(ticket.status, t)}</small>
            </span>
            <Icon name="arrowRight" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ResourceError({ failure, retry, title }: { failure: SupportFailure | "signed_out"; retry: () => void; title: string }) {
  const { t } = useLocale();
  return (
    <div role="alert" data-support-state={failure}>
      <SystemState title={title} description={t(...failureText[failure])} onRetry={["signed_out", "forbidden", "not_found"].includes(failure) ? undefined : retry} />
    </div>
  );
}

/** The employee's support tickets (API builds). */
export function LiveTicketsPage() {
  const { t } = useLocale();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const { state, retry } = useB2BResource<Page<Ticket>, SupportFailure>(`tickets:${page}`, (token, signal) => listTickets(page, { token, signal }), classifySupportError);
  return (
    <Workspace title={t("My Tickets", "تذاكري")}>
      <div className={styles.page} data-live-tickets>
        <p className={styles.muted}>{t("Open a ticket from a confirmed booking's details. Royal Vacation support replies here.", "افتح تذكرة من تفاصيل حجز مؤكد. يرد فريق دعم رويال فاكيشن هنا.")}</p>
        {state.status === "loading" && <p className={styles.muted} role="status">{t("Loading tickets…", "جارٍ تحميل التذاكر…")}</p>}
        {state.status === "error" && <ResourceError failure={state.failure} retry={retry} title={t("Tickets couldn't be loaded", "تعذر تحميل التذاكر")} />}
        {state.status === "done" && state.data.items.length === 0 && (
          <div data-support-state="empty"><SystemState title={t("No tickets yet", "لا توجد تذاكر بعد")} description={t("Tickets you open about your bookings appear here.", "تظهر هنا التذاكر التي تفتحها بخصوص حجوزاتك.")} /></div>
        )}
        {state.status === "done" && state.data.items.length > 0 && (
          <>
            <TicketRows tickets={state.data.items} />
            <Pager page={state.data.page} lastPage={state.data.lastPage} label={t("Ticket pages", "صفحات التذاكر")} onPage={(next) => setParams(next > 1 ? { page: String(next) } : {})} />
          </>
        )}
      </div>
    </Workspace>
  );
}

/** Tickets for one booking, on its details page (API builds). */
export function BookingTicketsSection({ booking }: { booking: Pick<LiveBooking, "booking_id" | "status" | "confirmed_at"> }) {
  const { t } = useLocale();
  const [page, setPage] = useState(1);
  const { state, retry } = useB2BResource<Page<Ticket>, SupportFailure>(`booking-tickets:${booking.booking_id}:${page}`, (token, signal) => listBookingTickets(booking.booking_id, page, { token, signal }), classifySupportError);
  const eligible = bookingAcceptsTickets(booking);
  return (
    <section className={styles.card} aria-labelledby="booking-tickets" data-booking-tickets>
      <h2 id="booking-tickets">{t("Support tickets", "تذاكر الدعم")}</h2>
      {state.status === "loading" && <p className={styles.muted} role="status">{t("Loading tickets…", "جارٍ تحميل التذاكر…")}</p>}
      {state.status === "error" && <ResourceError failure={state.failure} retry={retry} title={t("Tickets couldn't be loaded", "تعذر تحميل التذاكر")} />}
      {state.status === "done" && state.data.items.length === 0 && <p className={styles.muted}>{t("No tickets for this booking.", "لا توجد تذاكر لهذا الحجز.")}</p>}
      {state.status === "done" && state.data.items.length > 0 && (
        <>
          <TicketRows tickets={state.data.items} />
          <Pager page={state.data.page} lastPage={state.data.lastPage} label={t("Ticket pages", "صفحات التذاكر")} onPage={setPage} />
        </>
      )}
      {eligible
        ? <div className={styles.actions}><Link className="button button--primary" to={`/bookings/${encodeURIComponent(booking.booking_id)}/tickets/new`}>{t("Open a support ticket", "افتح تذكرة دعم")}</Link></div>
        : <p className={styles.muted} data-ticket-eligible="false">{t("Support tickets can be opened once the supplier has confirmed the booking.", "يمكن فتح تذاكر الدعم بعد أن يؤكد المورد الحجز.")}</p>}
    </section>
  );
}

/** Opens a ticket for one of the company's confirmed bookings (API builds). */
export function LiveNewTicketPage() {
  const { t, locale } = useLocale();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const formId = useId();
  const booking = useB2BResource(`ticket-booking:${id}`, (token, signal) => getBooking(id, { token, signal }), classifyBookingError);
  const categories = useB2BResource<string[], SupportFailure>("ticket-categories", (token, signal) => fetchTicketCategories({ token, signal }), classifySupportError);
  const [values, setValues] = useState({ category: "", subject: "", description: "" });
  const [errors, setErrors] = useState<Partial<Record<"category" | "subject" | "description", string>>>({});
  const [failure, setFailure] = useState<SupportFailure | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const submitted = useRef<{ payload: string; key: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const body = { category: values.category, subject: values.subject.trim(), description: values.description.trim() };
    const found: typeof errors = {};
    if (!body.category) found.category = t("Choose a category.", "اختر الفئة.");
    if (!body.subject) found.subject = t("Enter a subject.", "أدخل الموضوع.");
    if (!body.description) found.description = t("Describe the issue.", "صف المشكلة.");
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) { document.getElementById(`${formId}-${Object.keys(found)[0]}`)?.focus(); return; }
    const token = b2bSession.token();
    if (!token) return;
    const payload = JSON.stringify(body);
    const key = submitted.current?.payload === payload ? submitted.current.key : supportIdempotencyKey("ticket");
    submitted.current = { payload, key };
    pending.current = true;
    setBusy(true);
    try {
      const ticket = await createTicket(id, body, key, { token, locale: locale === "ar" ? "ar" : "en" });
      navigate(`/tickets/${encodeURIComponent(ticket.id)}`, { replace: true });
    } catch (error) {
      const kind = classifySupportError(error);
      if (!isRetryableSupportFailure(kind)) submitted.current = null;
      if (kind === "validation" && error instanceof ApiError) {
        const fields = error.fieldErrors;
        setErrors({
          category: fields.category ? t("Choose one of the listed categories.", "اختر إحدى الفئات المعروضة.") : undefined,
          subject: fields.subject ? t(`Use ${SUBJECT_MAX} characters or fewer.`, `استخدم ${SUBJECT_MAX} حرفًا أو أقل.`) : undefined,
          description: fields.description ? t(`Use ${BODY_MAX} characters or fewer.`, `استخدم ${BODY_MAX} حرف أو أقل.`) : undefined,
        });
      }
      setFailure(kind);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const ready = booking.state.status === "done" && categories.state.status === "done";
  const eligible = booking.state.status === "done" && bookingAcceptsTickets(booking.state.data);
  return (
    <Workspace title={t("New support ticket", "تذكرة دعم جديدة")} trail={[{ to: "/bookings", label: t("My bookings", "حجوزاتي") }, { to: `/bookings/${encodeURIComponent(id)}`, label: t("Booking details", "تفاصيل الحجز") }]}>
      <div className={styles.page} data-live-new-ticket>
        <BackLink to={`/bookings/${encodeURIComponent(id)}`}>{t("Back to booking", "العودة إلى الحجز")}</BackLink>
        {(booking.state.status === "loading" || categories.state.status === "loading") && <p className={styles.muted} role="status">{t("Loading…", "جارٍ التحميل…")}</p>}
        {booking.state.status === "error" && <div role="alert"><SystemState title={t("Booking couldn't be loaded", "تعذر تحميل الحجز")} description={t("This booking wasn't found for your company, or it can't be loaded right now.", "لم يُعثر على هذا الحجز لشركتك، أو تعذر تحميله حاليًا.")} onRetry={booking.retry} /></div>}
        {categories.state.status === "error" && <ResourceError failure={categories.state.failure} retry={categories.retry} title={t("Ticket categories couldn't be loaded", "تعذر تحميل فئات التذاكر")} />}
        {ready && !eligible && (
          <div data-ticket-eligible="false"><SystemState title={t("Tickets aren't available for this booking yet", "التذاكر غير متاحة لهذا الحجز بعد")} description={t("Support tickets can be opened once the supplier has confirmed the booking.", "يمكن فتح تذاكر الدعم بعد أن يؤكد المورد الحجز.")} /></div>
        )}
        {ready && eligible && categories.state.status === "done" && booking.state.status === "done" && (
          <form className={styles.card} noValidate onSubmit={submit} aria-busy={busy} data-ticket-form>
            <p className={styles.muted}>{t("Booking", "الحجز")}: <bdi dir="ltr">{booking.state.data.booking_no}</bdi></p>
            <label className={styles.field}>
              <span>{t("Category", "الفئة")}</span>
              <select id={`${formId}-category`} className="input" value={values.category} disabled={busy} aria-invalid={!!errors.category} onChange={(event) => setValues({ ...values, category: event.target.value })}>
                <option value="">{t("Choose a category", "اختر الفئة")}</option>
                {categories.state.data.map((category) => <option key={category} value={category}>{ticketCategoryLabel(category, t)}</option>)}
              </select>
              {errors.category && <span className="field-error" role="alert">{errors.category}</span>}
            </label>
            <label className={styles.field}>
              <span>{t("Subject", "الموضوع")}</span>
              <input id={`${formId}-subject`} className="input" maxLength={SUBJECT_MAX} value={values.subject} disabled={busy} aria-invalid={!!errors.subject} onChange={(event) => setValues({ ...values, subject: event.target.value })} />
              {errors.subject && <span className="field-error" role="alert">{errors.subject}</span>}
            </label>
            <label className={styles.field}>
              <span>{t("Description", "الوصف")}</span>
              <textarea id={`${formId}-description`} className={`input ${support.textarea}`} rows={6} maxLength={BODY_MAX} value={values.description} disabled={busy} aria-invalid={!!errors.description} onChange={(event) => setValues({ ...values, description: event.target.value })} />
              <small className={styles.muted}>{values.description.length}/{BODY_MAX}</small>
              {errors.description && <span className="field-error" role="alert">{errors.description}</span>}
            </label>
            {failure && failure !== "validation" && <p className="field-error" role="alert" data-ticket-failure={failure}>{failure === "conflict" ? t("This booking can't have a ticket, or this exact request was already sent with different details.", "لا يمكن فتح تذكرة لهذا الحجز، أو أُرسل الطلب نفسه سابقًا ببيانات مختلفة.") : t(...failureText[failure])}</p>}
            <div className={styles.actions}>
              <button type="submit" className="button button--primary" disabled={busy}>{busy ? t("Sending…", "جارٍ الإرسال…") : t("Open ticket", "فتح التذكرة")}</button>
            </div>
          </form>
        )}
      </div>
    </Workspace>
  );
}

/** One ticket with its conversation and a reply form (API builds). Messages are plain text. */
export function LiveTicketDetailPage() {
  const { t, locale } = useLocale();
  const { reference = "" } = useParams();
  const formId = useId();
  // null: the first page (to learn how many there are); then the latest page is shown.
  const [messagesPage, setMessagesPage] = useState<number | null>(null);
  const { state, retry } = useB2BResource(`ticket:${reference}:${messagesPage ?? "first"}`, (token, signal) => getTicket(reference, messagesPage, { token, signal }), classifySupportError);
  const [reply, setReply] = useState("");
  const [failure, setFailure] = useState<SupportFailure | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const submitted = useRef<{ payload: string; key: string } | null>(null);

  const lastPage = state.status === "done" ? state.data.messages.lastPage : 1;
  useEffect(() => {
    if (messagesPage === null && state.status === "done" && lastPage > 1) queueMicrotask(() => setMessagesPage(lastPage));
  }, [messagesPage, state.status, lastPage]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = reply.trim();
    if (pending.current || !message) return;
    const token = b2bSession.token();
    if (!token) return;
    const key = submitted.current?.payload === message ? submitted.current.key : supportIdempotencyKey("reply");
    submitted.current = { payload: message, key };
    pending.current = true;
    setBusy(true);
    setFailure(null);
    setSent(false);
    try {
      await replyToTicket(reference, message, key, { token, locale: locale === "ar" ? "ar" : "en" });
      submitted.current = null;
      setReply("");
      setSent(true);
      setMessagesPage(null);
      retry();
    } catch (error) {
      const kind = classifySupportError(error);
      if (!isRetryableSupportFailure(kind)) submitted.current = null;
      setFailure(kind);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <Workspace title={t("Support ticket", "تذكرة الدعم")} trail={[{ to: "/tickets", label: t("My Tickets", "تذاكري") }]}>
      <div className={styles.page} data-live-ticket>
        <BackLink to="/tickets">{t("Back to my tickets", "العودة إلى تذاكري")}</BackLink>
        {state.status === "loading" && <p className={styles.muted} role="status">{t("Loading ticket…", "جارٍ تحميل التذكرة…")}</p>}
        {state.status === "error" && <ResourceError failure={state.failure} retry={retry} title={t("Ticket couldn't be shown", "تعذر عرض التذكرة")} />}
        {state.status === "done" && (() => {
          const { ticket, messages } = state.data;
          const open = ticketAcceptsReplies(ticket.status);
          return (
            <>
              <section className={styles.card} aria-labelledby="ticket-summary">
                <h2 id="ticket-summary"><bdi>{ticket.subject}</bdi></h2>
                <dl className={styles.facts}>
                  <div><dt>{t("Ticket", "التذكرة")}</dt><dd><bdi dir="ltr">{ticket.ticket_no}</bdi></dd></div>
                  <div><dt>{t("Status", "الحالة")}</dt><dd data-ticket-status={ticket.status}>{ticketStatusLabel(ticket.status, t)}</dd></div>
                  <div><dt>{t("Category", "الفئة")}</dt><dd>{ticketCategoryLabel(ticket.category, t)}</dd></div>
                  {ticket.booking_id && <div><dt>{t("Booking", "الحجز")}</dt><dd><Link to={`/bookings/${encodeURIComponent(ticket.booking_id)}`}>{t("View booking", "عرض الحجز")}</Link></dd></div>}
                </dl>
              </section>
              <section className={styles.card} aria-labelledby="ticket-messages">
                <h2 id="ticket-messages">{t("Conversation", "المحادثة")}</h2>
                {messages.items.length === 0 ? <p className={styles.muted}>{t("No messages yet.", "لا توجد رسائل بعد.")}</p> : (
                  <ol className={support.messages} data-ticket-messages>
                    {messages.items.map((message) => (
                      <li key={message.id} className={support.message} data-actor={message.actor_type === "support" ? "support" : "employee"}>
                        <p className={support.meta}>
                          <b>{message.actor_type === "support" ? t("Royal Vacation support", "دعم رويال فاكيشن") : t("You", "أنت")}</b>
                          {message.created_at && <bdi dir="ltr">{message.created_at.slice(0, 16).replace("T", " ")}</bdi>}
                        </p>
                        {/* Plain text: React escapes it; line breaks are kept by CSS. */}
                        <p className={support.body}>{message.body}</p>
                      </li>
                    ))}
                  </ol>
                )}
                <Pager page={messages.page} lastPage={messages.lastPage} label={t("Message pages", "صفحات الرسائل")} onPage={setMessagesPage} />
              </section>
              {open ? (
                <form className={styles.card} noValidate onSubmit={send} aria-busy={busy} data-ticket-reply>
                  <label className={styles.field}>
                    <span>{t("Your reply", "ردك")}</span>
                    <textarea id={`${formId}-reply`} className={`input ${support.textarea}`} rows={4} maxLength={BODY_MAX} value={reply} disabled={busy} onChange={(event) => { setReply(event.target.value); setSent(false); }} />
                    <small className={styles.muted}>{reply.length}/{BODY_MAX}</small>
                  </label>
                  {failure && <p className="field-error" role="alert" data-reply-failure={failure}>{failure === "conflict" ? t("This reply conflicts with one already sent. Refresh the conversation before sending again.", "يتعارض هذا الرد مع رد أُرسل سابقًا. حدّث المحادثة قبل الإرسال مرة أخرى.") : t(...failureText[failure])}</p>}
                  {sent && <p className={styles.muted} role="status">{t("Reply sent.", "تم إرسال الرد.")}</p>}
                  <div className={styles.actions}>
                    <button type="submit" className="button button--primary" disabled={busy || !reply.trim()}>{busy ? t("Sending…", "جارٍ الإرسال…") : t("Send reply", "إرسال الرد")}</button>
                  </div>
                </form>
              ) : (
                <p className={styles.muted} data-ticket-closed>{t("This ticket is closed to replies. Open a new ticket from the booking if you need more help.", "هذه التذكرة مغلقة أمام الردود. افتح تذكرة جديدة من الحجز إذا احتجت إلى مساعدة أخرى.")}</p>
              )}
            </>
          );
        })()}
      </div>
    </Workspace>
  );
}
