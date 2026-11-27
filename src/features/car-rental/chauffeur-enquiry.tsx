import { useState } from "react";
import { useAppSessionActive } from "@/features/auth/app-session";
import { Link, useSearchParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale } from "@/features/localization/locale-provider";
import { localToday } from "@/features/home/schemas/hotel-search.schema";
import { Icon } from "@/components/ui/icon";
import { RentalShell } from "./rental-layout";
import { DatePicker } from "@/components/ui/date-picker";
import { useLocalToday } from "@/lib/stay-dates";
import "./chauffeur-enquiry.css";
import { NumberedHeading } from "./rental-passenger";

export const chauffeurSubjects = ["airport-transfers", "car-with-driver", "private-chauffeur", "vip-transport"];
const schema = z.object({
  name: z.string().trim().min(2).max(100), email: z.email(), phone: z.string().refine(value => !value || /^\+?[\d\s()-]{7,20}$/.test(value)), agency: z.string().max(160),
  pickup: z.string().trim().min(2), destination: z.string().trim().min(2),
  date: z.string().refine(value => /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= localToday() && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  passengers: z.string().refine(value => /^\d+$/.test(value) && +value >= 1 && +value <= 5000),
  bags: z.string().refine(value => /^\d+$/.test(value) && +value >= 0 && +value <= 5000),
  flight: z.string().max(30), instructions: z.string().max(500), message: z.string().trim().min(10).max(2000),
});
type Values = z.infer<typeof schema>;
export function ChauffeurEnquiryPage() {
  const { t, locale } = useLocale();
  const today = useLocalToday();
  const demoSessionActive = useAppSessionActive();
  const [params] = useSearchParams();
  const [stage, setStage] = useState<"details" | "review" | "preview">("details");
  const airport = params.get("subject") === "airport-transfers";
  const service = airport ? t("Airport Transfers", "انتقالات المطار") : params.get("subject") === "vip-transport" ? t("VIP Transportation", "نقل كبار الشخصيات") : t("Private Chauffeur", "سائق خاص");
  const { register, handleSubmit, getValues, setValue, control, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", phone: "", agency: "", pickup: "", destination: "", date: "", time: "", passengers: "2", bags: "2", flight: "", instructions: "", message: "" } });
  const values = getValues();
  const draft = useWatch({ control });
  const error = (key: keyof Values) => errors[key] && <span role="alert" id={`chauffeur-${key}-error`} className="field-error">{t("Enter a valid value for this field.", "أدخل قيمة صحيحة لهذا الحقل.")}</span>;
  const caption = (en: string, ar: string, optional: boolean) => <span className="chauffeur-field__label">{t(en, ar)}{!optional && <span className="chauffeur-required" aria-hidden="true"> *</span>}</span>;
  const field = (key: keyof Values, en: string, ar: string, type = "text", optional = false, placeholder?: [string, string], wide = false) => <label key={key} className={wide ? "chauffeur-field chauffeur-field--wide" : "chauffeur-field"}>{caption(en, ar, optional)}<input aria-label={t(en, ar)} type={type} required={!optional} placeholder={placeholder ? t(...placeholder) : undefined} {...register(key)} min={type === "number" ? key === "bags" ? 0 : 1 : undefined} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `chauffeur-${key}-error` : undefined} />{error(key)}</label>;
  // Passengers and bags: the same text fields and limits as before, with − / + buttons beside them.
  const counter = (key: "passengers" | "bags", en: string, ar: string, minimum: number) => {
    const current = Number.parseInt(String(draft[key] ?? ""), 10);
    const set = (next: number) => setValue(key, String(Math.min(5000, Math.max(minimum, next))), { shouldValidate: !!errors[key], shouldDirty: true });
    return <div key={key} className="chauffeur-field">{caption(en, ar, false)}<div className="chauffeur-counter">
      <button type="button" aria-label={t(`Fewer ${en.toLowerCase()}`, `تقليل ${ar}`)} disabled={!Number.isFinite(current) || current <= minimum} onClick={() => set((Number.isFinite(current) ? current : minimum) - 1)}><Icon name="minus" /></button>
      <input aria-label={t(en, ar)} type="number" inputMode="numeric" required min={minimum} max={5000} {...register(key)} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `chauffeur-${key}-error` : undefined} />
      <button type="button" aria-label={t(`More ${en.toLowerCase()}`, `زيادة ${ar}`)} disabled={Number.isFinite(current) && current >= 5000} onClick={() => set((Number.isFinite(current) ? current : minimum - 1) + 1)}><Icon name="plus" /></button>
    </div>{error(key)}</div>;
  };
  const progress = <ol className="booking-progress rental-progress" aria-label={t("Enquiry progress", "خطوات الاستفسار")}>{[["Service Selection", "اختيار الخدمة"], ["Passenger Details", "بيانات الراكب"], ["Review Enquiry", "مراجعة الاستفسار"], ["Ready to Send", "جاهز للإرسال"]].map(([en, ar], index) => <li key={en} aria-current={index === (stage === "details" ? 1 : stage === "review" ? 2 : 3) ? "step" : undefined}><span>{index + 1}</span>{t(en, ar)}</li>)}</ol>;
  return <div className="chauffeur-enquiry"><RentalShell publicHeader={!demoSessionActive} customProgress={progress} title={stage === "details" ? t("Passenger & Trip Enquiry", "استفسار الراكب والرحلة") : stage === "review" ? t("Review Your Enquiry", "راجع استفسارك") : t("Enquiry Ready", "الاستفسار جاهز")}>
    <div className="rental-service-context"><span className="rental-service-badge">{service}</span><p>{t("This is an enquiry. Our team will reply with vehicle availability and a price for your trip.", "هذا استفسار. سيرد فريقنا بتوفر السيارات وسعر رحلتك.")}</p></div>
    <div className="rental-booking-layout">
      <div className="rental-panel rental-passenger-form">
        <form hidden={stage !== "details"} noValidate onSubmit={handleSubmit(() => setStage("review"))}>
          <section className="rental-form-section"><NumberedHeading number={1} icon="people" title={t("Passenger Information", "معلومات الراكب")} description={t("After you review the details, send them to us on WhatsApp or by email. Online sending isn't available yet.", "بعد مراجعة البيانات، أرسلها إلينا عبر واتساب أو البريد الإلكتروني. الإرسال عبر الإنترنت غير متاح بعد.")} /><div className="rental-form-fields">{field("name", "Full Name", "الاسم الكامل", "text", false, ["Lead passenger's full name", "الاسم الكامل للراكب الرئيسي"])}{field("email", "Email Address", "البريد الإلكتروني", "email", false, ["name@example.com", "name@example.com"])}{field("phone", "Phone number (optional)", "رقم الهاتف (اختياري)", "tel", true, ["+20 100 123 4567", "+20 100 123 4567"])}{field("agency", "Agency / Company Name (optional)", "اسم الوكالة / الشركة (اختياري)", "text", true, ["Your agency or company", "اسم وكالتك أو شركتك"])}</div></section>
          <section className="rental-form-section"><NumberedHeading number={2} icon="pin" title={t("Flight & Pickup Details", "تفاصيل الرحلة والاستقبال")} /><div className="rental-form-fields">{field("pickup", "Pickup location", "مكان الاستلام", "text", false, airport ? ["Airport and terminal", "المطار والصالة"] : ["Hotel, address or landmark", "فندق أو عنوان أو معلم"], true)}
            <div className="chauffeur-field"><label htmlFor="chauffeur-date" id="chauffeur-date-label">{caption("Travel date", "تاريخ الرحلة", false)}</label>
              {/* The shared calendar: days before today aren't shown; the same date value and validation. */}
              <input type="hidden" {...register("date")} />
              <DatePicker id="chauffeur-date" value={draft.date ?? ""} min={today} locale={locale === "ar" ? "ar" : "en"} placeholder={t("Select date", "اختر التاريخ")} invalid={!!errors.date} describedBy={errors.date ? "chauffeur-date-error" : undefined} labelledBy="chauffeur-date-label"
                onChange={(next) => setValue("date", next, { shouldValidate: !!errors.date, shouldDirty: true })} />
              {error("date")}
            </div>
            {field("time", "Pickup time", "وقت الاستلام", "time")}{airport && field("flight", "Flight number (optional)", "رقم الرحلة (اختياري)", "text", true, ["e.g. MS 985", "مثال: MS 985"])}{field("instructions", "Pickup instructions (optional)", "تعليمات الاستلام (اختياري)", "text", true, ["Meeting point, sign name or other details", "نقطة اللقاء أو الاسم على اللافتة أو تفاصيل أخرى"], true)}</div></section>
          <section className="rental-form-section"><NumberedHeading number={3} icon="pin" title={t("Drop-off Details", "تفاصيل التوصيل")} /><div className="rental-form-fields">{field("destination", "Destination", "الوجهة", "text", false, ["Hotel, address or airport", "فندق أو عنوان أو مطار"], true)}{counter("passengers", "Passengers", "المسافرون", 1)}{counter("bags", "Bags", "الحقائب", 0)}</div></section>
          <section className="rental-form-section"><NumberedHeading number={4} icon="document" title={t("Additional Requests", "طلبات إضافية")} /><label className="chauffeur-field chauffeur-field--wide">{caption("Message", "الرسالة", false)}<textarea aria-label={t("Message", "الرسالة")} {...register("message")} rows={4} maxLength={2000} placeholder={t("Vehicle preferences, child seats, accessibility needs or anything else we should know (at least 10 characters).", "تفضيلات السيارة أو مقاعد الأطفال أو احتياجات الوصول أو أي شيء آخر يجب أن نعرفه (10 أحرف على الأقل).")} aria-invalid={!!errors.message} />{errors.message && <span role="alert" className="field-error">{t("Use at least 10 characters.", "اكتب ١٠ أحرف على الأقل.")}</span>}</label></section>
          <div className="rental-form-actions"><Link className="button button--outline" to="/car-rental">{t("Back to Services", "العودة للخدمات")}</Link><button className="button button--primary chauffeur-primary">{t("Review enquiry", "مراجعة الاستفسار")}<Icon name="arrowRight" /></button></div>
        </form>
        {stage !== "details" && <div className="rental-enquiry-review">
          <section className="rental-form-section"><NumberedHeading number={1} icon="car" title={t("Service Summary", "ملخص الخدمة")} /><h3>{service}</h3><p>{t("Our team will confirm the vehicle and the price when they reply.", "سيؤكد فريقنا السيارة والسعر عند الرد.")}</p></section>
          <section className="rental-form-section"><NumberedHeading number={2} icon="pin" title={t("Trip Details", "تفاصيل الرحلة")} /><dl className="summary-dl"><div><dt>{t("Pickup", "الاستلام")}</dt><dd>{values.pickup}</dd></div><div><dt>{t("Destination", "الوجهة")}</dt><dd>{values.destination}</dd></div><div><dt>{t("Date / time", "التاريخ / الوقت")}</dt><dd><bdi>{values.date} · {values.time}</bdi></dd></div><div><dt>{t("Passengers / bags", "المسافرون / الحقائب")}</dt><dd>{values.passengers} / {values.bags}</dd></div>{values.flight && <div><dt>{t("Flight", "الرحلة")}</dt><dd><bdi>{values.flight}</bdi></dd></div>}</dl></section>
          <section className="rental-form-section"><NumberedHeading number={3} icon="people" title={t("Passenger Information", "معلومات الراكب")} /><p>{values.name}</p><p><bdi>{values.email}</bdi></p>{values.phone && <p><bdi>{values.phone}</bdi></p>}<p>{values.agency}</p></section>
          <section className="rental-form-section"><NumberedHeading number={4} icon="document" title={t("Special Requests", "طلبات خاصة")} /><p>{values.message}</p><p>{values.instructions}</p></section>
          {stage === "preview" && <section role="status" className="rental-form-section chauffeur-ready"><h2>{t("Request ready — not sent yet", "الطلب جاهز — لم يُرسل بعد")}</h2><p>{t("Send these details to us on WhatsApp or by email and our team will reply. Nothing has been sent, booked or charged.", "أرسل هذه البيانات إلينا عبر واتساب أو البريد الإلكتروني وسيرد فريقنا. لم يُرسل أو يُحجز أو يُخصم أي شيء.")}</p></section>}
          <div className="rental-form-actions"><button type="button" className="button button--outline" onClick={() => setStage("details")}>{t("Edit enquiry", "تعديل الاستفسار")}</button></div>
        </div>}
      </div>
      <aside className="rental-trip-sidebar"><section className="rental-panel rental-enquiry-summary"><img src="/images/rental/luxury-arrival.webp" alt="" width="1536" height="1024" /><span className="rental-service-badge">{t("Chauffeur / Transfers", "سائق خاص / انتقالات")}</span><h2>{service}</h2><p>{t("A considered arrival for your clients.", "وصول مدروس لعملائك.")}</p><hr />{(draft.pickup || draft.destination) && <div className="rental-route"><div><Icon name="pin" /><div><small>{t("Pickup", "الاستلام")}</small><strong>{draft.pickup || "—"}</strong></div></div><div><Icon name="pin" /><div><small>{t("Destination", "الوجهة")}</small><strong>{draft.destination || "—"}</strong></div></div><p><bdi>{draft.date} · {draft.time}</bdi></p><p>{t("Passengers / bags", "المسافرون / الحقائب")}: {draft.passengers} / {draft.bags}</p></div>}<h3>{t("Price on enquiry", "السعر عند الاستفسار")}</h3><p>{t("We'll send the price and vehicle details in our reply.", "سنرسل السعر وتفاصيل السيارة في ردنا.")}</p>{stage === "review" && <button className="rental-primary-button" onClick={() => setStage("preview")}>{t("Review enquiry", "مراجعة الاستفسار")}</button>}<Link to="/car-rental">{t("Explore Self-Drive Rental", "استكشف تأجير القيادة الذاتية")}</Link></section><section className="rental-assistance chauffeur-contact"><h3>{t("Official contact", "التواصل الرسمي")}</h3><p>{t("Send your enquiry on WhatsApp and our team will reply.", "أرسل استفسارك عبر واتساب وسيرد فريقنا.")}</p><a href="https://wa.me/201070724143" target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" /><span>{t("WhatsApp", "واتساب")}</span><bdi dir="ltr">+20 107 072 4143</bdi></a></section></aside>
    </div>
  </RentalShell></div>;
}
