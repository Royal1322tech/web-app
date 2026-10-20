import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import { useLocale } from "@/features/localization/locale-provider";
import { useDemo } from "@/features/demo/demo-provider";
import type { HotelSummary } from "../types";
import {
  createPriceReductionFormSchema,
  submitPriceReductionRequest,
  type PriceReductionFormValues,
} from "../price-reduction-request";
import { Icon } from "@/components/ui/icon";
import styles from "../hotels.module.css";

type SearchContext = Pick<HotelSearchCriteria, "checkIn" | "checkOut"> &
  Partial<Pick<HotelSearchCriteria, "rooms">>;
type Feedback = { status: "accepted"; reference?: string } | { status: "unavailable" } | { status: "failed" };

function messageForError(message: string | undefined, t: (en: string, ar?: string) => string) {
  if (!message) return "";
  const translations: Record<string, [string, string]> = {
    "Enter your agency name.": ["Enter your agency name.", "أدخل اسم الوكالة."],
    "Enter your name.": ["Enter your name.", "أدخل اسمك."],
    "Enter a valid email address.": ["Enter a valid email address.", "أدخل بريداً إلكترونياً صحيحاً."],
    "Enter the requested price.": ["Enter the requested price.", "أدخل السعر المطلوب."],
    "Enter a valid price.": ["Enter a valid price.", "أدخل سعراً صحيحاً."],
    "Price must be greater than zero.": ["Price must be greater than zero.", "يجب أن يكون السعر أكبر من صفر."],
    "Requested price must be lower than the current nightly price.": ["Requested price must be lower than the current nightly price.", "يجب أن يكون السعر المطلوب أقل من السعر الحالي لليلة."],
  };
  const values = translations[message];
  return values ? t(...values) : message;
}

export function ReducePriceRequest({
  hotel,
  criteria,
}: {
  hotel: HotelSummary;
  criteria?: SearchContext;
}) {
  const { locale, t } = useLocale();
  const { profile } = useDemo();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const hasSelectedStay = Boolean(criteria?.checkIn && criteria?.checkOut);
  const comparablePrice = hasSelectedStay ? hotel.nightlyRate : undefined;
  const schema = createPriceReductionFormSchema(comparablePrice);
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<PriceReductionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { agencyName: profile.name, agentName: profile.contact, agentEmail: profile.email, agentPhone: profile.phone, requestedPrice: "", competitorName: "", notes: "" },
    shouldFocusError: true,
  });

  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      setFocus("agencyName");
    }
    else if (dialog.current?.open) dialog.current.close();
  }, [open, setFocus]);

  const roomCount = criteria?.rooms?.length;
  const adults = criteria?.rooms?.reduce((count, room) => count + room.adults, 0);
  const children = criteria?.rooms?.reduce((count, room) => count + room.childAges.length, 0);
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

  function showForm(button: HTMLButtonElement) {
    trigger.current = button;
    reset({ agencyName: profile.name, agentName: profile.contact, agentEmail: profile.email, agentPhone: profile.phone, requestedPrice: "", competitorName: "", notes: "" });
    setFeedback(null);
    setOpen(true);
  }

  async function submit(values: PriceReductionFormValues) {
    setFeedback(null);
    const requestedPrice = Number(values.requestedPrice);
    try {
      const result = await submitPriceReductionRequest({
        hotelId: hotel.id,
        hotelName: hotel.name.en,
        hotelLocation: hotel.address.en,
        checkIn: criteria?.checkIn,
        checkOut: criteria?.checkOut,
        rooms: roomCount,
        adults,
        children,
        currentPrice: hotel.nightlyRate,
        priceBasis: "per night",
        priceComparisonEligible: hasSelectedStay,
        requestedPrice,
        currency: "USD",
        agencyName: values.agencyName.trim(),
        agentName: values.agentName.trim(),
        agentEmail: values.agentEmail.trim(),
        agentPhone: values.agentPhone.trim() || undefined,
        competitorName: values.competitorName.trim() || undefined,
        notes: values.notes.trim() || undefined,
      });
      setFeedback(result);
    } catch {
      setFeedback({ status: "failed" });
    }
  }

  const fieldError = (key: keyof PriceReductionFormValues) => {
    const errorId = `${id}-${key}-error`;
    return {
      id: errorId,
      message: messageForError(errors[key]?.message, t),
    };
  };

  return <>
    <button type="button" className={styles.reducePriceButton} onClick={event => showForm(event.currentTarget)}>
      <Icon name="priceDown" />{t("Reduce Price", "اطلب سعراً أقل")}
    </button>
    <dialog
      ref={dialog}
      className={styles.reducePriceDialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onClose={() => { setOpen(false); trigger.current?.focus(); }}
    >
      <header className={styles.reducePriceHeader}>
        <div>
          <h2 id={`${id}-title`}>{t("Request a Better Price", "اطلب سعراً أفضل")}</h2>
          <p id={`${id}-description`}>{t("Found a lower price? Send your request to Royal Vacation and our team will review it.", "هل وجدت سعراً أقل؟ أرسل طلبك إلى رويال فاكيشن وسيراجعه فريقنا.")}</p>
        </div>
        <button type="button" className={styles.closeDialog} aria-label={t("Close", "إغلاق")} onClick={() => dialog.current?.close()}>
          <Icon name="close" />
        </button>
      </header>
      {feedback?.status === "accepted" ? (
        <section className={styles.requestFeedback} role="status">
          <h3>{t("Request Submitted", "تم إرسال الطلب")}</h3>
          <p>{t("Your price reduction request has been received by Royal Vacation. Our team will review it.", "استلمت رويال فاكيشن طلب خفض السعر، وسيراجعه فريقنا.")}</p>
          {feedback.reference && <p>{t("Request reference", "رقم الطلب")}: <bdi>{feedback.reference}</bdi></p>}
        </section>
      ) : (
        <form className={styles.reducePriceForm} noValidate onSubmit={handleSubmit(submit)}>
          <section className={styles.requestInfo} aria-labelledby={`${id}-hotel-info`}>
            <h3 id={`${id}-hotel-info`}>{t("Hotel & Stay", "الفندق والإقامة")}</h3>
            <dl>
              <div><dt>{t("Hotel", "الفندق")}</dt><dd>{hotel.name[locale]}</dd></div>
              {hotel.address[locale] && <div><dt>{t("Location", "الموقع")}</dt><dd>{hotel.address[locale]}</dd></div>}
              <div><dt>{t("Room / Board", "الغرفة / الوجبات")}</dt><dd>{t("Not selected", "لم يتم الاختيار")}</dd></div>
              {criteria?.checkIn && <div><dt>{t("Check-in", "تسجيل الوصول")}</dt><dd><bdi>{criteria.checkIn}</bdi></dd></div>}
              {criteria?.checkOut && <div><dt>{t("Check-out", "تسجيل المغادرة")}</dt><dd><bdi>{criteria.checkOut}</bdi></dd></div>}
              {roomCount !== undefined && <div><dt>{t("Rooms", "الغرف")}</dt><dd><bdi>{roomCount}</bdi></dd></div>}
              {adults !== undefined && <div><dt>{t("Guests", "الضيوف")}</dt><dd><bdi>{adults + (children ?? 0)}</bdi></dd></div>}
              <div><dt>{t("Current displayed rate", "السعر الحالي المعروض")}</dt><dd><bdi>{money.format(hotel.nightlyRate)}</bdi> {t("per night", "لليلة الواحدة")}</dd></div>
            </dl>
          </section>
          <fieldset className={styles.requestFields}>
            <legend>{t("Agent Information", "معلومات الوكيل")}</legend>
            <label>{t("Agency name", "اسم الوكالة")} *<input required aria-required="true" autoComplete="organization" maxLength={120} aria-invalid={!!errors.agencyName} aria-describedby={errors.agencyName ? `${id}-agencyName-error` : undefined} {...register("agencyName")} />{errors.agencyName && <small id={`${id}-agencyName-error`} role="alert">{fieldError("agencyName").message}</small>}</label>
            <label>{t("Agent name", "اسم الوكيل")} *<input required aria-required="true" autoComplete="name" maxLength={120} aria-invalid={!!errors.agentName} aria-describedby={errors.agentName ? `${id}-agentName-error` : undefined} {...register("agentName")} />{errors.agentName && <small id={`${id}-agentName-error`} role="alert">{fieldError("agentName").message}</small>}</label>
            <label>{t("Email address", "البريد الإلكتروني")} *<input required aria-required="true" type="email" autoComplete="email" maxLength={254} aria-invalid={!!errors.agentEmail} aria-describedby={errors.agentEmail ? `${id}-agentEmail-error` : undefined} {...register("agentEmail")} />{errors.agentEmail && <small id={`${id}-agentEmail-error`} role="alert">{fieldError("agentEmail").message}</small>}</label>
            <label>{t("Phone number (optional)", "رقم الهاتف (اختياري)")}<input type="tel" autoComplete="tel" maxLength={40} {...register("agentPhone")} /></label>
          </fieldset>
          <fieldset className={styles.requestFields}>
            <legend>{t("Price Request", "طلب السعر")}</legend>
            <label>{t("Requested nightly price (USD)", "السعر المطلوب لليلة (دولار أمريكي)")} *<input required aria-required="true" type="number" inputMode="decimal" min="0.01" step="0.01" aria-invalid={!!errors.requestedPrice} aria-describedby={errors.requestedPrice ? `${id}-requestedPrice-error` : `${id}-price-basis`} {...register("requestedPrice")} /><small id={`${id}-price-basis`}>{hasSelectedStay ? t("Compared with the displayed USD nightly rate for the same stay.", "تتم المقارنة بسعر الليلة المعروض بالدولار للإقامة نفسها.") : t("No stay dates are selected, so the team will review the requested period.", "لم يتم تحديد تواريخ للإقامة، لذا سيراجع الفريق الفترة المطلوبة.")}</small>{errors.requestedPrice && <small id={`${id}-requestedPrice-error`} role="alert">{fieldError("requestedPrice").message}</small>}</label>
            <label>{t("Competitor / supplier name (optional)", "اسم المنافس / المورد (اختياري)")}<input maxLength={120} {...register("competitorName")} /></label>
            <label className={styles.notesField}>{t("Additional notes (optional)", "ملاحظات إضافية (اختياري)")}<textarea rows={3} maxLength={1000} {...register("notes")} /></label>
          </fieldset>
          <p className={styles.requestDisclosure}>{t("Submitting is available only when a secure Royal Vacation service is configured. No price changes are applied by this request.", "يتاح الإرسال عند إعداد خدمة آمنة لرويال فاكيشن. لا يؤدي هذا الطلب إلى تغيير السعر.")}</p>
          {feedback?.status === "unavailable" && <p className={styles.requestUnavailable} role="status">{t("Online submission is not available yet. Your information has not been sent.", "الإرسال عبر الإنترنت غير متاح حالياً. لم يتم إرسال معلوماتك.")}</p>}
          {feedback?.status === "failed" && <p className={styles.requestUnavailable} role="alert">{t("Your request could not be submitted. Please try again.", "تعذر إرسال طلبك. حاول مرة أخرى.")}</p>}
          <footer className={styles.requestActions}>
            <button type="button" className={styles.secondary} disabled={isSubmitting} onClick={() => dialog.current?.close()}>{t("Cancel", "إلغاء")}</button>
            <button type="submit" className={styles.primary} disabled={isSubmitting}>
              {isSubmitting ? t("Submitting…", "جارٍ الإرسال…") : t("Submit Request", "إرسال الطلب")}
            </button>
          </footer>
        </form>
      )}
    </dialog>
  </>;
}
