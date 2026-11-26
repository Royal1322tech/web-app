import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "@/components/ui/icon";
import { FormField } from "@/components/ui/form-field";
import { FileField } from "@/components/ui/file-field";
import { CatalogShell } from "@/features/hotels/components/catalog-shell";
import { SiteFooter } from "@/features/home/components/site-footer";
import { useLocale } from "@/features/localization/locale-provider";
import {
  ComplaintSubmissionError,
  createComplaintSchema,
  complaintServices,
  submitComplaint,
  supportAttachmentAccept,
  type ComplaintFormValues,
  type ComplaintFormInput,
  type ComplaintService,
} from "./complaint-submission";
import styles from "./complaint-page.module.css";

const serviceLabels: Record<ComplaintService, [string, string]> = {
  hotel_booking: ["Hotel Booking", "حجز فندقي"],
  car_rental: ["Car Rental", "تأجير السيارات"],
  payment: ["Payment", "الدفع"],
  invoice: ["Invoice", "الفاتورة"],
  technical_issue: ["Technical Issue", "مشكلة تقنية"],
  other: ["Other", "أخرى"],
};

export function ComplaintContactPage({ publicVisitor }: { publicVisitor: boolean }) {
  const { t } = useLocale();
  const [result, setResult] = useState<
    | { status: "idle" }
    | { status: "accepted"; reference?: string }
    | { status: "unavailable" }
    | { status: "error" }
  >({ status: "idle" });
  const schema = createComplaintSchema({
    service: t("Select a service type.", "اختر نوع الخدمة."),
    titleRequired: t("Enter a complaint title.", "أدخل عنوان الشكوى."),
    titleLength: t("Use 4 to 160 characters.", "استخدم من ٤ إلى ١٦٠ حرفًا."),
    detailsRequired: t("Describe your complaint.", "يرجى وصف الشكوى."),
    detailsLength: t("Use 10 to 5000 characters.", "استخدم من ١٠ إلى ٥٠٠٠ حرف."),
    bookingIdLength: t("Use 100 characters or fewer.", "استخدم ١٠٠ حرف أو أقل."),
    attachmentType: t("Attach a JPG, PNG, or PDF file.", "أرفق ملف JPG أو PNG أو PDF."),
    attachmentSize: t("The file must be 5 MB or smaller.", "يجب ألا يتجاوز حجم الملف ٥ ميغابايت."),
  });
  const {
    register,
    handleSubmit,
    control,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ComplaintFormInput, unknown, ComplaintFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { service: "", bookingId: "", title: "", details: "" },
  });
  const selectedFile = useWatch({ control, name: "attachment" })?.item(0);
  const serviceField = register("service");
  const bookingField = register("bookingId");
  const titleField = register("title");
  const detailsField = register("details");
  const attachmentField = register("attachment");

  const submit = handleSubmit(async values => {
    setResult({ status: "idle" });
    try {
      const attachment = values.attachment?.item(0) ?? undefined;
      const response = await submitComplaint({
        service_type: values.service,
        ...(values.bookingId ? { booking_id: values.bookingId } : {}),
        title: values.title,
        description: values.details,
        ...(attachment ? { attachment } : {}),
      });
      setResult(response);
    } catch (error) {
      if (error instanceof ComplaintSubmissionError && error.status === 422) {
        const fieldMap: Record<string, keyof ComplaintFormValues> = {
          service_type: "service",
          booking_id: "bookingId",
          title: "title",
          description: "details",
          attachment: "attachment",
        };
        let mapped = false;
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          const name = fieldMap[field];
          if (name) {
            setError(name, { type: "server", message });
            mapped = true;
          }
        }
        if (!mapped) setResult({ status: "error" });
      } else {
        setResult({ status: "error" });
      }
    }
  });

  const fieldError = (name: keyof ComplaintFormValues) => errors[name]?.message;
  const resetResult = () => setResult({ status: "idle" });

  return (
    <>
      <CatalogShell title={t("Contact Us", "تواصل معنا")} publicHeader={publicVisitor}>
        <title>{`${t("Contact Us", "تواصل معنا")} | Royal Vacation`}</title>
        <section className={styles.page}>
          <header className={styles.hero}>
            <p>{t("ROYAL VACATION · CUSTOMER CARE", "رويال فاكيشن · خدمة العملاء")}</p>
            <h1>{t("Contact Us", "تواصل معنا")}</h1>
            <span>{t("We're here to help. Get in touch with our team or submit a complaint.", "نحن هنا لمساعدتك. تواصل مع فريقنا أو أرسل شكوى.")}</span>
          </header>

          <div className={styles.columns}>
            <aside className={styles.support} aria-labelledby="support-title">
              <div className={styles.supportHeading}>
                <span className={styles.supportIcon}><Icon name="people" /></span>
                <div>
                  <p>{t("HERE TO HELP", "نحن هنا للمساعدة")}</p>
                  <h2 id="support-title">{t("Customer Support", "دعم العملاء")}</h2>
                </div>
              </div>
              <p className={styles.supportIntro}>{t("Our team is here to assist you.", "فريقنا موجود لمساعدتك.")}</p>
              <a className={styles.contactMethod} href="https://wa.me/201070724143" target="_blank" rel="noopener noreferrer">
                <span><Icon name="whatsapp" /></span>
                <span><small>{t("WhatsApp", "واتساب")}</small><bdi>+20 107 072 4143</bdi></span>
                <Icon name="arrowRight" />
              </a>
              <a className={styles.contactMethod} href="mailto:royal.travel@royalvacation.online">
                <span><Icon name="mail" /></span>
                <span><small>{t("Email", "البريد الإلكتروني")}</small><bdi>royal.travel@royalvacation.online</bdi></span>
                <Icon name="arrowRight" />
              </a>
              <p className={styles.supportNote}>
                <Icon name="info" />
                {t("For urgent assistance, contact us directly using one of the options above.", "للمساعدة، تواصل معنا مباشرة عبر إحدى الوسائل أعلاه.")}
              </p>
            </aside>

            <form className={styles.form} noValidate aria-busy={isSubmitting} onSubmit={submit} onChange={resetResult}>
              <div className={styles.formHeading}>
                <p>{t("WE VALUE YOUR FEEDBACK", "نقدّر ملاحظاتك")}</p>
                <h2>{t("Submit a Complaint", "تقديم شكوى")}</h2>
                <span>{t("Tell us about your issue, and our support team will review your request.", "أخبرنا عن المشكلة وسيراجع فريق الدعم طلبك.")}</span>
              </div>
              <div className={styles.formGrid}>
                <FormField id="complaint-service" label={t("Service Type", "نوع الخدمة")} required error={fieldError("service")}>
                  <select id="complaint-service" className="input" defaultValue="" aria-invalid={!!errors.service} aria-describedby={errors.service ? "complaint-service-error" : undefined} {...serviceField}>
                    <option value="" disabled>{t("Select a service", "اختر الخدمة")}</option>
                    {complaintServices.map(service => <option key={service} value={service}>{t(...serviceLabels[service])}</option>)}
                  </select>
                </FormField>
                <FormField id="complaint-booking-id" label={t("Booking ID (Optional)", "رقم الحجز (اختياري)")} error={fieldError("bookingId")}>
                  <input id="complaint-booking-id" className="input" maxLength={100} placeholder={t("Enter your booking reference", "أدخل مرجع الحجز")} dir="auto" aria-invalid={!!errors.bookingId} aria-describedby={errors.bookingId ? "complaint-booking-id-error" : undefined} {...bookingField} />
                </FormField>
                <div className={styles.fullWidth}>
                  <FormField id="complaint-title" label={t("Complaint Title", "عنوان الشكوى")} required error={fieldError("title")}>
                    <input id="complaint-title" className="input" maxLength={160} placeholder={t("e.g. Room not as described", "مثال: الغرفة لا تطابق الوصف")} aria-invalid={!!errors.title} aria-describedby={errors.title ? "complaint-title-error" : undefined} {...titleField} />
                  </FormField>
                </div>
                <div className={styles.fullWidth}>
                  <FormField id="complaint-details" label={t("Details of Your Complaint", "تفاصيل الشكوى")} required error={fieldError("details")}>
                    <textarea id="complaint-details" className="input" rows={6} maxLength={5000} placeholder={t("Please describe the issue in as much detail as possible.", "يرجى وصف المشكلة بأكبر قدر ممكن من التفاصيل.")} aria-invalid={!!errors.details} aria-describedby={errors.details ? "complaint-details-error" : undefined} {...detailsField} />
                  </FormField>
                </div>
                <div className={styles.fullWidth}>
                  <FileField
                    id="complaint-attachment"
                    label={t("Attach File (Optional)", "إرفاق ملف (اختياري)")}
                    help={t("JPG, PNG or PDF · up to 5 MB", "JPG أو PNG أو PDF · حتى ٥ ميغابايت")}
                    error={fieldError("attachment")}
                    accept={supportAttachmentAccept}
                    chooseLabel={t("Choose a file", "اختر ملفًا")}
                    removeLabel={t("Remove selected file", "إزالة الملف المحدد")}
                    registration={attachmentField}
                    selectedFile={selectedFile}
                    onRemove={() => { setValue("attachment", undefined, { shouldValidate: true }); resetResult(); }}
                  />
                </div>
              </div>

              {result.status === "accepted" && <div className={styles.success} role="status" aria-live="polite">
                <Icon name="check" />
                <div><b>{t("Complaint Submitted", "تم إرسال الشكوى")}</b><p>{t("Your complaint has been accepted by the configured service.", "تم قبول شكواك من خلال خدمة الإرسال المتصلة.")}</p>{result.reference && <p>{t("Reference", "المرجع")}: <bdi>{result.reference}</bdi></p>}</div>
              </div>}
              {result.status === "unavailable" && <div className={styles.notice} role="status" aria-live="polite">{t("Online complaint submission is not available yet. Please contact our team using the support options.", "إرسال الشكاوى عبر الإنترنت غير متاح حاليًا. يُرجى التواصل مع فريقنا عبر وسائل الدعم.")}</div>}
              {result.status === "error" && <div className={styles.errorNotice} role="alert">{t("Your complaint could not be submitted. Please try again or contact our team directly.", "تعذر إرسال الشكوى. حاول مرة أخرى أو تواصل مع فريقنا مباشرة.")}</div>}

              <button className={`button button--primary ${styles.submit}`} type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><span className={styles.spinner} aria-hidden="true" />{t("Submitting…", "جارٍ الإرسال…")}</> : <>{t("Submit Complaint", "إرسال الشكوى")}<Icon name="arrowRight" /></>}
              </button>
            </form>
          </div>
        </section>
      </CatalogShell>
      <SiteFooter />
    </>
  );
}
