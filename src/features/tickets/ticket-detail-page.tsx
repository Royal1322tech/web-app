import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/ui/form-field";
import { StatePreview, SystemState } from "@/components/ui/system-state";
import { useDemo } from "@/features/demo/demo-provider";
import { Workspace } from "@/features/demo/shared";
import { useLocale } from "@/features/localization/locale-provider";
import { resolveBookingAccess } from "./ticket-access";
import { useTicketLabels } from "./ticket-labels";
import { createReplySchema } from "./ticket-schema";
import type { SupportTicket, TicketMessage } from "./ticket-types";
import { TicketBookingSummary, TicketOriginNote, TicketStatusBadge } from "./ticket-ui";
import "./tickets.css";

export function TicketDetailPage() {
  const { reference } = useParams();
  const { t } = useLocale();
  const { tickets } = useDemo();
  // `tickets` holds only the signed-in user's tickets, so another user's reference resolves to "not found".
  const ticket = tickets.find((item) => item.reference === reference);
  return (
    <Workspace
      title={t("Ticket details", "تفاصيل التذكرة")}
      breadcrumb={ticket?.reference}
      trail={[{ to: "/tickets", label: t("My Tickets", "تذاكري") }]}
    >
      {!ticket ? (
        <SystemState
          title={t("Ticket not found", "التذكرة غير موجودة")}
          description={t(
            "This ticket is not available to your account. Demo tickets also reset when the page is refreshed or you sign out.",
            "هذه التذكرة غير متاحة لحسابك. كما تُعاد تذاكر العرض التجريبي عند تحديث الصفحة أو تسجيل الخروج.",
          )}
        >
          <Link className="button button--primary" to="/tickets">{t("Go to My Tickets", "الذهاب إلى تذاكري")}</Link>
        </SystemState>
      ) : (
        <StatePreview emptyTitle={t("No messages yet", "لا توجد رسائل بعد")}>
          <TicketDetail ticket={ticket} />
        </StatePreview>
      )}
    </Workspace>
  );
}

function MessageItem({ message, initial }: { message: TicketMessage; initial: boolean }) {
  const { t, locale } = useLocale();
  const labels = useTicketLabels();
  const author =
    message.author === "owner"
      ? initial ? t("You · initial report", "أنت · البلاغ الأول") : t("You", "أنت")
      : message.author === "support" ? t("Support · sample reply", "الدعم · رد تجريبي") : t("System", "النظام");
  return (
    <li className={`ticket-message ticket-message--${message.author}`}>
      <span className="ticket-message__avatar" aria-hidden="true">
        {message.author === "owner" ? t("You", "أنت") : message.author === "support" ? "RV" : "i"}
      </span>
      <div className="ticket-message__bubble">
        <p className="ticket-message__author">
          <strong>{author}</strong>
          <time dateTime={message.at}>{labels.dateTime(message.at)}</time>
        </p>
        <p className="ticket-message__body">{locale === "ar" && message.bodyAr ? message.bodyAr : message.body}</p>
        {message.attachment && (
          <p className="ticket-message__file">
            <bdi>{message.attachment.name}</bdi> · {Math.max(1, Math.round(message.attachment.size / 1024))} KB · {t("file name only", "اسم الملف فقط")}
          </p>
        )}
      </div>
    </li>
  );
}

function TicketDetail({ ticket }: { ticket: SupportTicket }) {
  const { t, locale } = useLocale();
  const labels = useTicketLabels();
  const { state } = useLocation();
  const { records, rentals, currentUserId, addTicketMessage } = useDemo();
  const access = resolveBookingAccess(ticket.bookingType, ticket.bookingId, { records, rentals }, currentUserId);
  const [sent, setSent] = useState(false);
  const schema = createReplySchema({
    required: t("Write a message.", "اكتب رسالة."),
    length: t("Use 2000 characters or fewer.", "استخدم ٢٠٠٠ حرف أو أقل."),
  });
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { message: "" } });
  const reply = handleSubmit(({ message }) => {
    if (addTicketMessage(ticket.reference, message)) {
      reset();
      setSent(true);
    }
  });
  const created = (state as { created?: boolean } | null)?.created;
  return (
    <div className="ticket-layout">
      <div className="ticket-layout__main">
        {created && (
          <p className="ticket-callout ticket-callout--local" role="status">
            {t("Ticket created as a local preview. It has not been sent to Royal Vacation support, and no response is expected.", "أُنشئت التذكرة كمعاينة محلية. لم تُرسل إلى دعم رويال فاكيشن، ولا يُتوقع رد.")}
          </p>
        )}
        <section className="workspace-card ticket-header" aria-labelledby="ticket-subject">
          <div className="ticket-header__badges">
            <TicketStatusBadge status={ticket.status} />
            <TicketOriginNote ticket={ticket} />
          </div>
          <h2 id="ticket-subject">{locale === "ar" && ticket.subjectAr ? ticket.subjectAr : ticket.subject}</h2>
          <dl className="ticket-facts">
            <div><dt>{t("Ticket reference", "مرجع التذكرة")}</dt><dd><bdi>{ticket.reference}</bdi></dd></div>
            <div><dt>{t("Booking reference", "مرجع الحجز")}</dt><dd><bdi>{ticket.bookingReference}</bdi></dd></div>
            <div><dt>{t("Booking type", "نوع الحجز")}</dt><dd>{labels.bookingType[ticket.bookingType]}</dd></div>
            <div><dt>{t("Category", "الفئة")}</dt><dd>{labels.category[ticket.category]}</dd></div>
            <div><dt>{t("Created", "تاريخ الإنشاء")}</dt><dd><time dateTime={ticket.createdAt}>{labels.dateTime(ticket.createdAt)}</time></dd></div>
            <div><dt>{t("Last update", "آخر تحديث")}</dt><dd><time dateTime={ticket.updatedAt}>{labels.dateTime(ticket.updatedAt)}</time></dd></div>
          </dl>
        </section>
        <section className="workspace-card ticket-conversation" aria-labelledby="ticket-messages-title">
          <div className="ticket-section-heading">
            <h2 id="ticket-messages-title">{t("Messages", "الرسائل")}</h2>
            <span className="ticket-muted">{t(`${ticket.messages.length} messages`, `${ticket.messages.length} رسائل`)}</span>
          </div>
          <ol className="ticket-messages">
            {ticket.messages.map((message, index) => <MessageItem key={message.id} message={message} initial={index === 0} />)}
          </ol>
          {ticket.status === "closed" ? (
            <p className="ticket-muted">{t("This ticket is closed. Report a new issue from the booking if you need more help.", "هذه التذكرة مغلقة. أبلغ عن مشكلة جديدة من الحجز إذا احتجت إلى مساعدة أخرى.")}</p>
          ) : (
            <form className="ticket-reply" noValidate onSubmit={reply} onChange={() => setSent(false)}>
              <FormField id="ticket-reply" label={t("Add a message", "أضف رسالة")} error={errors.message?.message}>
                <textarea id="ticket-reply" className="input" rows={4} maxLength={2000} aria-invalid={!!errors.message} aria-describedby={errors.message ? "ticket-reply-error" : "ticket-reply-hint"} {...register("message")} />
              </FormField>
              <div className="ticket-reply__footer">
                <p className="ticket-muted" id="ticket-reply-hint">{t("Messages stay in this browser session and are not sent.", "تبقى الرسائل في جلسة المتصفح هذه ولا تُرسل.")}</p>
                <button className="button button--primary" type="submit">{t("Add message", "إضافة الرسالة")}</button>
              </div>
              <div role="status" aria-live="polite">
                {sent && <p className="ticket-muted">{t("Message added to this local preview. It was not sent.", "أُضيفت الرسالة إلى هذه المعاينة المحلية ولم تُرسل.")}</p>}
              </div>
            </form>
          )}
        </section>
      </div>
      {access.state === "ok" && <TicketBookingSummary booking={access.booking} />}
    </div>
  );
}
