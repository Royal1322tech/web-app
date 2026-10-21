import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { StatePreview, SystemState } from "@/components/ui/system-state";
import { useDemo } from "@/features/demo/demo-provider";
import { Workspace } from "@/features/demo/shared";
import { useLocale } from "@/features/localization/locale-provider";
import { useTicketLabels } from "./ticket-labels";
import { activeTicketStatuses, type SupportTicket, type TicketBookingType } from "./ticket-types";
import { TicketOriginNote, TicketStatusBadge } from "./ticket-ui";
import "./tickets.css";

type StatusFilter = "all" | "active" | "resolved" | "closed";

function matchesSearch(ticket: SupportTicket, query: string) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return [ticket.reference, ticket.bookingReference, ticket.subject, ticket.subjectAr ?? ""].some((value) =>
    value.toLocaleLowerCase().includes(needle),
  );
}

/** Tracking only: tickets are created from a booking, never from this page. */
export function MyTicketsPage() {
  const { t, locale } = useLocale();
  const labels = useTicketLabels();
  const { tickets } = useDemo();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState<"all" | TicketBookingType>("all");
  const filtered = query.trim() !== "" || status !== "all" || type !== "all";
  const visible = tickets
    .filter((ticket) => matchesSearch(ticket, query))
    .filter((ticket) => type === "all" || ticket.bookingType === type)
    .filter((ticket) =>
      status === "all" ? true : status === "active" ? activeTicketStatuses.includes(ticket.status) : ticket.status === status,
    )
    .sort((a, b) => Number(b.status === "waiting_for_customer") - Number(a.status === "waiting_for_customer") || b.updatedAt.localeCompare(a.updatedAt));
  const clear = () => {
    setQuery("");
    setStatus("all");
    setType("all");
  };
  return (
    <Workspace title={t("My Tickets", "تذاكري")}>
      <p className="ticket-intro">
        {t("Track support tickets for your own bookings. To report a new issue, open the booking it relates to.", "تابع تذاكر الدعم الخاصة بحجوزاتك. للإبلاغ عن مشكلة جديدة، افتح الحجز المرتبط بها.")}
      </p>
      {tickets.length === 0 ? (
        <SystemState
          title={t("No tickets yet", "لا توجد تذاكر بعد")}
          description={t("Tickets are created from booking details. Open one of your bookings and choose Report an issue.", "تُنشأ التذاكر من تفاصيل الحجز. افتح أحد حجوزاتك واختر الإبلاغ عن مشكلة.")}
        >
          <div className="ticket-actions">
            <Link className="button button--primary" to="/bookings">{t("Go to My Bookings", "الذهاب إلى حجوزاتي")}</Link>
            <Link className="button button--outline" to="/car-rental/bookings">{t("Go to My Rentals", "الذهاب إلى تأجيراتي")}</Link>
          </div>
        </SystemState>
      ) : (
        <StatePreview emptyTitle={t("No tickets yet", "لا توجد تذاكر بعد")}>
          <form className="ticket-toolbar" role="search" onSubmit={(event) => event.preventDefault()}>
            <label className="ticket-toolbar__search" htmlFor="ticket-search">
              {t("Search tickets", "ابحث في التذاكر")}
              <span className="ticket-search">
                <Icon name="search" />
                <input
                  id="ticket-search"
                  className="input"
                  type="search"
                  value={query}
                  placeholder={t("Ticket or booking reference, or subject", "مرجع التذكرة أو الحجز، أو الموضوع")}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </span>
            </label>
            <label htmlFor="ticket-status-filter">
              {t("Status", "الحالة")}
              <select id="ticket-status-filter" className="input" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
                <option value="all">{t("All statuses", "كل الحالات")}</option>
                <option value="active">{t("Open or in progress", "مفتوحة أو قيد المعالجة")}</option>
                <option value="resolved">{labels.status.resolved}</option>
                <option value="closed">{labels.status.closed}</option>
              </select>
            </label>
            <label htmlFor="ticket-type-filter">
              {t("Booking type", "نوع الحجز")}
              <select id="ticket-type-filter" className="input" value={type} onChange={(event) => setType(event.target.value as "all" | TicketBookingType)}>
                <option value="all">{t("All bookings", "كل الحجوزات")}</option>
                <option value="hotel">{labels.bookingType.hotel}</option>
                <option value="rental">{labels.bookingType.rental}</option>
              </select>
            </label>
          </form>
          <div className="ticket-results-bar">
            <p className="ticket-muted" role="status">{t(`${visible.length} of ${tickets.length} tickets`, `${visible.length} من ${tickets.length} تذاكر`)}</p>
            {filtered && <button type="button" className="text-button" onClick={clear}>{t("Clear filters", "مسح عوامل التصفية")}</button>}
          </div>
          {visible.length === 0 ? (
            <SystemState title={t("No tickets match these filters", "لا توجد تذاكر تطابق عوامل التصفية")} description={t("Try another reference or subject, or change the status and booking type.", "جرّب مرجعًا أو موضوعًا آخر، أو غيّر الحالة ونوع الحجز.")}>
              <button type="button" className="button button--outline" onClick={clear}>{t("Clear filters", "مسح عوامل التصفية")}</button>
            </SystemState>
          ) : (
            <ul className="ticket-cards">
              {visible.map((ticket) => (
                <li key={ticket.reference} className="ticket-card">
                  <div className="ticket-card__badges">
                    <TicketStatusBadge status={ticket.status} />
                    <TicketOriginNote ticket={ticket} />
                  </div>
                  <h2 className="ticket-card__subject">
                    <Link to={`/tickets/${ticket.reference}`}>{locale === "ar" && ticket.subjectAr ? ticket.subjectAr : ticket.subject}</Link>
                  </h2>
                  <dl className="ticket-card__meta">
                    <div><dt>{t("Ticket", "التذكرة")}</dt><dd><bdi>{ticket.reference}</bdi></dd></div>
                    <div><dt>{t("Booking", "الحجز")}</dt><dd><bdi>{ticket.bookingReference}</bdi></dd></div>
                    <div><dt>{t("Type", "النوع")}</dt><dd>{labels.bookingType[ticket.bookingType]}</dd></div>
                    <div><dt>{t("Category", "الفئة")}</dt><dd>{labels.category[ticket.category]}</dd></div>
                  </dl>
                  <div className="ticket-card__footer">
                    <span>{t("Updated", "آخر تحديث")} <time dateTime={ticket.updatedAt}>{labels.dateTime(ticket.updatedAt)}</time></span>
                    <span className="ticket-card__open" aria-hidden="true">{t("View ticket", "عرض التذكرة")}<Icon name="arrowRight" /></span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </StatePreview>
      )}
    </Workspace>
  );
}
