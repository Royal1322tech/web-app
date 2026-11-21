import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/ui/form-field";
import { FileField } from "@/components/ui/file-field";
import { Icon } from "@/components/ui/icon";
import { SystemState } from "@/components/ui/system-state";
import { useDemo } from "@/features/demo/demo-provider";
import { Workspace } from "@/features/demo/shared";
import { supportAttachmentAccept } from "@/features/enquiries/complaint-submission";
import { useLocale } from "@/features/localization/locale-provider";
import { resolveBookingAccess } from "./ticket-access";
import { useTicketLabels } from "./ticket-labels";
import { createTicketSchema, type TicketFormInput, type TicketFormValues } from "./ticket-schema";
import { activeTicketStatuses, type TicketBookingContext, type TicketBookingType, type TicketCategory } from "./ticket-types";
import { TicketBookingSummary, TicketStatusBadge, ticketsForBooking } from "./ticket-ui";
import "./tickets.css";

export function CreateTicketPage({ bookingType }: { bookingType: TicketBookingType }) {
  const { id } = useParams();
  const { t } = useLocale();
  const { records, rentals, currentUserId } = useDemo();
  const access = resolveBookingAccess(bookingType, id, { records, rentals }, currentUserId);
  const listHref = bookingType === "hotel" ? "/bookings" : "/car-rental/bookings";
  const listLabel = bookingType === "hotel" ? t("Go to My Bookings", "الذهاب إلى حجوزاتي") : t("Go to My Rentals", "الذهاب إلى تأجيراتي");
  const trail = [
    { to: listHref, label: bookingType === "hotel" ? t("My Bookings", "حجوزاتي") : t("My Rentals", "تأجيراتي") },
    ...(access.state === "ok" ? [{ to: access.booking.detailsHref, label: access.booking.bookingReference }] : []),
  ];
  return (
    <Workspace accountNavigation={false} title={t("Report an issue", "الإبلاغ عن مشكلة")} trail={trail}>
      {access.state === "ok" ? (
        <TicketForm booking={access.booking} categories={access.categories} />
      ) : (
        <SystemState
          title={
            access.state === "not-owner"
              ? t("Only the booking owner can report an issue", "يمكن لصاحب الحجز فقط الإبلاغ عن مشكلة")
              : access.state === "signed-out"
                ? t("Sign in to report an issue", "سجّل الدخول للإبلاغ عن مشكلة")
                : t("Booking not found", "الحجز غير موجود")
          }
          description={
            access.state === "not-owner"
              ? t("Tickets can be created and viewed only by the user who made this booking.", "لا يمكن إنشاء التذاكر وعرضها إلا للمستخدم الذي أنشأ هذا الحجز.")
              : t("Tickets need a booking recorded in this session. Choose one of your bookings to report an issue.", "تتطلب التذاكر حجزًا مسجلًا في هذه الجلسة. اختر أحد حجوزاتك للإبلاغ عن مشكلة.")
          }
        >
          <Link className="button button--primary" to={listHref}>{listLabel}</Link>
        </SystemState>
      )}
    </Workspace>
  );
}

function TicketForm({ booking, categories }: { booking: TicketBookingContext; categories: readonly TicketCategory[] }) {
  const { t, locale } = useLocale();
  const labels = useTicketLabels();
  const navigate = useNavigate();
  const { tickets, createTicket } = useDemo();
  const [failed, setFailed] = useState(false);
  const active = ticketsForBooking(tickets, booking).filter((ticket) => activeTicketStatuses.includes(ticket.status));
  const schema = createTicketSchema(categories, {
    category: t("Choose an issue category.", "اختر فئة المشكلة."),
    subjectRequired: t("Enter a subject.", "أدخل موضوعًا."),
    subjectLength: t("Use 4 to 160 characters.", "استخدم من ٤ إلى ١٦٠ حرفًا."),
    descriptionRequired: t("Describe the issue.", "يرجى وصف المشكلة."),
    descriptionLength: t("Use 10 to 5000 characters.", "استخدم من ١٠ إلى ٥٠٠٠ حرف."),
    attachmentType: t("Attach a JPG, PNG, or PDF file.", "أرفق ملف JPG أو PNG أو PDF."),
    attachmentSize: t("The file must be 5 MB or smaller.", "يجب ألا يتجاوز حجم الملف ٥ ميغابايت."),
  });
  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<TicketFormInput, unknown, TicketFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: "", subject: "", description: "" },
  });
  const attachmentField = register("attachment");
  const selectedFile = useWatch({ control, name: "attachment" })?.item(0);
  const submit = handleSubmit((values) => {
    const file = values.attachment?.item(0);
    const reference = createTicket({
      bookingType: booking.bookingType,
      bookingId: booking.bookingId,
      category: values.category,
      subject: values.subject,
      description: values.description,
      ...(file ? { attachment: { name: file.name, type: file.type, size: file.size } } : {}),
    });
    if (reference) navigate(`/tickets/${reference}`, { state: { created: true } });
    else setFailed(true);
  });
  const described = (name: keyof TicketFormValues) => (errors[name] ? `ticket-${name}-error` : undefined);
  return (
    <div className="ticket-layout">
      <div className="ticket-layout__main">
        {active.length > 0 && (
          <section className="ticket-callout" aria-labelledby="existing-tickets-title">
            <h2 id="existing-tickets-title">{t("Review your open ticket first", "راجع تذكرتك المفتوحة أولًا")}</h2>
            <p>{t("This booking already has an open ticket. You can follow up there, or create another ticket for a separate issue.", "لهذا الحجز تذكرة مفتوحة بالفعل. يمكنك المتابعة فيها، أو إنشاء تذكرة أخرى لمشكلة مختلفة.")}</p>
            <ul>
              {active.map((ticket) => (
                <li key={ticket.reference}>
                  <Link to={`/tickets/${ticket.reference}`}>{locale === "ar" && ticket.subjectAr ? ticket.subjectAr : ticket.subject}</Link>
                  <TicketStatusBadge status={ticket.status} />
                </li>
              ))}
            </ul>
          </section>
        )}
        <form className="workspace-card ticket-form" noValidate aria-busy={isSubmitting} onSubmit={submit}>
          <div className="ticket-form__header">
            <h2>{t("Describe the issue", "صف المشكلة")}</h2>
            <p>
              {t("This ticket is linked automatically to booking", "تُربط هذه التذكرة تلقائيًا بالحجز")} <bdi>{booking.bookingReference}</bdi>.{" "}
              <span className="ticket-required-note">{t("Fields marked * are required.", "الحقول المميزة بـ * مطلوبة.")}</span>
            </p>
          </div>
          <p className="ticket-notice">
            <Icon name="info" />
            {t("Online support tickets aren't available yet. This ticket stays in this browser and isn't sent to Royal Vacation support.", "تذاكر الدعم عبر الإنترنت غير متاحة حاليًا. تبقى هذه التذكرة في هذا المتصفح ولا تُرسل إلى دعم رويال فاكيشن.")}
          </p>
          <FormField id="ticket-category" label={t("Issue category", "فئة المشكلة")} required error={errors.category?.message}>
            <select id="ticket-category" className="input" aria-invalid={!!errors.category} aria-describedby={described("category")} {...register("category")}>
              <option value="" disabled>{t("Select a category", "اختر الفئة")}</option>
              {categories.map((category) => <option key={category} value={category}>{labels.category[category]}</option>)}
            </select>
          </FormField>
          <FormField id="ticket-subject" label={t("Subject", "الموضوع")} required error={errors.subject?.message}>
            <input id="ticket-subject" className="input" maxLength={160} aria-invalid={!!errors.subject} aria-describedby={described("subject")} {...register("subject")} />
          </FormField>
          <FormField id="ticket-description" label={t("Description", "الوصف")} required error={errors.description?.message}>
            <textarea id="ticket-description" className="input" rows={7} maxLength={5000} aria-invalid={!!errors.description} aria-describedby={described("description")} {...register("description")} />
          </FormField>
          <FileField
            id="ticket-attachment"
            label={t("Supporting file (optional)", "ملف داعم (اختياري)")}
            help={t("JPG, PNG or PDF · up to 5 MB · only the file name is kept", "JPG أو PNG أو PDF · حتى ٥ ميغابايت · يُحفظ اسم الملف فقط")}
            error={errors.attachment?.message}
            accept={supportAttachmentAccept}
            chooseLabel={t("Choose a file", "اختر ملفًا")}
            removeLabel={t("Remove selected file", "إزالة الملف المحدد")}
            registration={attachmentField}
            selectedFile={selectedFile}
            onRemove={() => setValue("attachment", undefined, { shouldValidate: true })}
          />
          {failed && <p className="field-error" role="alert">{t("This booking is no longer available for a ticket. Return to the booking and try again.", "لم يعد هذا الحجز متاحًا لإنشاء تذكرة. عد إلى الحجز وحاول مرة أخرى.")}</p>}
          <div className="ticket-form__actions ticket-form__actions--footer">
            <button className="button button--primary" type="submit" disabled={isSubmitting}>{t("Create ticket", "إنشاء التذكرة")}</button>
            <Link className="button button--outline" to={booking.detailsHref}>{t("Back to booking", "العودة إلى الحجز")}</Link>
          </div>
        </form>
      </div>
      <TicketBookingSummary booking={booking} heading={t("Booking for this ticket", "الحجز الخاص بهذه التذكرة")} />
    </div>
  );
}
