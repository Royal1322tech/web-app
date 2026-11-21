import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { useLocale } from "@/features/localization/locale-provider";
import { useDemo } from "@/features/demo/demo-provider";
import { activeTicketStatuses, type SupportTicket, type TicketBookingContext, type TicketStatus } from "./ticket-types";
import { useTicketLabels } from "./ticket-labels";
import "./tickets.css";

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const labels = useTicketLabels();
  return <span className={`ticket-status ticket-status--${status}`}>{labels.status[status]}</span>;
}

export function TicketOriginNote({ ticket }: { ticket: SupportTicket }) {
  const { t } = useLocale();
  return ticket.origin === "sample" ? (
    <span className="ticket-origin">{t("Example", "مثال")}</span>
  ) : (
    <span className="ticket-origin ticket-origin--local">
      {t("Saved in this browser — not sent to Royal Vacation support", "محفوظة في هذا المتصفح — لم تُرسل إلى دعم رويال فاكيشن")}
    </span>
  );
}

/** Read-only booking details taken from the recorded booking, never from user input. */
export function TicketBookingSummary({ booking, heading }: { booking: TicketBookingContext; heading?: string }) {
  const { t, locale } = useLocale();
  const labels = useTicketLabels();
  const headingId = `booking-${booking.bookingId}`;
  return (
    <section className="workspace-card ticket-booking" aria-labelledby={headingId}>
      {booking.image && (
        <ResponsiveImage className="ticket-booking__image" src={booking.image.src} alt="" width={booking.image.width} height={booking.image.height} sizes="(max-width: 1100px) 720px, 340px" />
      )}
      <div className="ticket-booking__body">
        <p className="ticket-booking__type">
          <Icon name={booking.bookingType === "hotel" ? "building" : "car"} />
          {labels.bookingType[booking.bookingType]}
        </p>
        <h2 id={headingId}>{heading ?? t("Related booking", "الحجز المرتبط")}</h2>
        <p className="ticket-booking__title">{booking.title[locale]}</p>
        <dl className="ticket-booking__facts">
          <div><dt>{t("Booking reference", "مرجع الحجز")}</dt><dd><bdi>{booking.bookingReference}</bdi></dd></div>
          <div><dt>{t("Booking type", "نوع الحجز")}</dt><dd>{labels.bookingType[booking.bookingType]}</dd></div>
          <div>
            <dt>{booking.bookingType === "hotel" ? t("Stay", "الإقامة") : t("Rental dates", "تواريخ التأجير")}</dt>
            <dd><time dateTime={booking.startDate}>{labels.date(booking.startDate)}</time> – <time dateTime={booking.endDate}>{labels.date(booking.endDate)}</time></dd>
          </div>
          <div><dt>{t("Booking status", "حالة الحجز")}</dt><dd><span className={`ticket-stage ticket-stage--${booking.stage}`}>{labels.stage[booking.stage]}</span></dd></div>
          {booking.agencyReference && <div><dt>{t("Agency reference", "مرجع الوكالة")}</dt><dd><bdi>{booking.agencyReference}</bdi></dd></div>}
        </dl>
        <Link className="button button--outline ticket-booking__link" to={booking.detailsHref}>{t("View booking details", "عرض تفاصيل الحجز")}</Link>
      </div>
    </section>
  );
}

export function ticketsForBooking(tickets: readonly SupportTicket[], booking: TicketBookingContext) {
  return tickets
    .filter((ticket) => ticket.bookingType === booking.bookingType && ticket.bookingId === booking.bookingId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function newTicketHref(booking: TicketBookingContext) {
  return `${booking.detailsHref}/tickets/new`;
}

/** Report an Issue action for the booking owner only. */
export function ReportIssueAction({ booking }: { booking: TicketBookingContext }) {
  const { t } = useLocale();
  const { currentUserId } = useDemo();
  if (booking.ownerId !== currentUserId) return null;
  return <Link className="button button--outline" to={newTicketHref(booking)}>{t("Report an issue", "الإبلاغ عن مشكلة")}</Link>;
}

/** Support section on booking details: the owner's tickets for this booking, nothing for anyone else. */
export function BookingSupportSection({ booking }: { booking: TicketBookingContext }) {
  const { t, locale } = useLocale();
  const labels = useTicketLabels();
  const { tickets, currentUserId } = useDemo();
  const owner = booking.ownerId === currentUserId;
  const related = owner ? ticketsForBooking(tickets, booking) : [];
  const active = related.find((ticket) => activeTicketStatuses.includes(ticket.status));
  return (
    <section className="workspace-card ticket-support" aria-labelledby="booking-support-title">
      <h2 id="booking-support-title">{t("Support", "الدعم")}</h2>
      {!owner ? (
        <p className="ticket-muted">
          {t("Support tickets for this booking are available only to the user who made it.", "تذاكر الدعم لهذا الحجز متاحة فقط للمستخدم الذي أنشأه.")}
        </p>
      ) : related.length === 0 ? (
        <p className="ticket-muted">
          {t("No tickets for this booking. Use Report an issue if something needs attention.", "لا توجد تذاكر لهذا الحجز. استخدم الإبلاغ عن مشكلة إذا احتاج أمر ما إلى متابعة.")}
        </p>
      ) : (
        <>
          {active && (
            <p className="ticket-callout" role="note">
              {t("This booking has an open ticket. Review it before reporting another issue.", "لهذا الحجز تذكرة مفتوحة. راجعها قبل الإبلاغ عن مشكلة أخرى.")}
            </p>
          )}
          <ul className="ticket-list ticket-list--compact">
            {related.map((ticket) => (
              <li key={ticket.reference} className={ticket === active ? "is-active" : undefined}>
                <div className="ticket-list__main">
                  <Link to={`/tickets/${ticket.reference}`} className="ticket-list__subject">
                    {locale === "ar" && ticket.subjectAr ? ticket.subjectAr : ticket.subject}
                  </Link>
                  <span className="ticket-list__meta">
                    <bdi>{ticket.reference}</bdi> · {t("Updated", "آخر تحديث")} <time dateTime={ticket.updatedAt}>{labels.dateTime(ticket.updatedAt)}</time>
                  </span>
                </div>
                <TicketStatusBadge status={ticket.status} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
