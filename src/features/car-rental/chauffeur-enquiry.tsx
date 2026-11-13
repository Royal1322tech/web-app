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
  const { t } = useLocale();
  const demoSessionActive = useAppSessionActive();
  const [params] = useSearchParams();
  const [stage, setStage] = useState<"details" | "review" | "preview">("details");
  const airport = params.get("subject") === "airport-transfers";
  const service = airport ? t("Airport Transfers", "انتقالات المطار") : params.get("subject") === "vip-transport" ? t("VIP Transportation", "نقل كبار الشخصيات") : t("Private Chauffeur", "سائق خاص");
  const { register, handleSubmit, getValues, control, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", phone: "", agency: "", pickup: "", destination: "", date: "", time: "", passengers: "2", bags: "2", flight: "", instructions: "", message: "" } });
  const values = getValues();
  const draft = useWatch({ control });
  const field = (key: keyof Values, en: string, ar: string, type = "text", optional = false) => <label key={key}>{t(en, ar)}<input aria-label={t(en, ar)} type={type} required={!optional} {...register(key)} min={type === "date" ? localToday() : type === "number" ? key === "bags" ? 0 : 1 : undefined} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `chauffeur-${key}-error` : undefined} />{errors[key] && <span role="alert" id={`chauffeur-${key}-error`} className="field-error">{t("Enter a valid value for this field.", "أدخل قيمة صحيحة لهذا الحقل.")}</span>}</label>;
  const progress = <ol className="booking-progress rental-progress" aria-label={t("Enquiry progress", "خطوات الاستفسار")}>{[["Service Selection", "اختيار الخدمة"], ["Passenger Details", "بيانات الراكب"], ["Review Enquiry", "مراجعة الاستفسار"], ["Local Preview", "المعاينة المحلية"]].map(([en, ar], index) => <li key={en} aria-current={index === (stage === "details" ? 1 : stage === "review" ? 2 : 3) ? "step" : undefined}><span>{index + 1}</span>{t(en, ar)}</li>)}</ol>;
  return <RentalShell publicHeader={!demoSessionActive} customProgress={progress} title={stage === "details" ? t("Passenger & Trip Enquiry", "استفسار الراكب والرحلة") : stage === "review" ? t("Review Your Enquiry", "راجع استفسارك") : t("Enquiry Preview Ready", "معاينة الاستفسار جاهزة")}>
    <div className="rental-service-context"><span className="rental-service-badge">{service}</span><p>{t("Enquiry only · trip prices and vehicle availability require confirmation.", "استفسار فقط · أسعار الرحلات وتوفر السيارات يحتاجان إلى التأكيد.")}</p></div>
    <div className="rental-booking-layout">
      <div className="rental-panel rental-passenger-form">
        <form hidden={stage !== "details"} noValidate onSubmit={handleSubmit(() => setStage("review"))}>
          <section className="rental-form-section"><NumberedHeading number={1} icon="people" title={t("Passenger Information", "معلومات الراكب")} description={t("Use fictional details for this local enquiry preview.", "استخدم بيانات وهمية لمعاينة الاستفسار المحلية.")} /><div className="rental-form-fields">{field("name", "Full Name", "الاسم الكامل")}{field("email", "Email Address", "البريد الإلكتروني", "email")}{field("phone", "Phone number (optional)", "رقم الهاتف (اختياري)", "tel", true)}{field("agency", "Agency / Company Name (optional)", "اسم الوكالة / الشركة (اختياري)", "text", true)}</div></section>
          <section className="rental-form-section"><NumberedHeading number={2} icon="pin" title={t("Flight & Pickup Details", "تفاصيل الرحلة والاستقبال")} /><div className="rental-form-fields">{field("pickup", "Pickup location", "مكان الاستلام")}{field("date", "Travel date", "تاريخ الرحلة", "date")}{field("time", "Pickup time", "وقت الاستلام", "time")}{airport && field("flight", "Flight number (optional)", "رقم الرحلة (اختياري)", "text", true)}{field("instructions", "Pickup instructions (optional)", "تعليمات الاستلام (اختياري)", "text", true)}</div></section>
          <section className="rental-form-section"><NumberedHeading number={3} icon="pin" title={t("Drop-off Details", "تفاصيل التوصيل")} /><div className="rental-form-fields">{field("destination", "Destination", "الوجهة")}{field("passengers", "Passengers", "المسافرون", "number")}{field("bags", "Bags", "الحقائب", "number")}</div></section>
          <section className="rental-form-section"><NumberedHeading number={4} icon="document" title={t("Additional Requests", "طلبات إضافية")} /><label>{t("Message", "الرسالة")}<textarea aria-label={t("Message", "الرسالة")} {...register("message")} rows={3} maxLength={2000} aria-invalid={!!errors.message} />{errors.message && <span role="alert" className="field-error">{t("Use at least 10 characters.", "اكتب ١٠ أحرف على الأقل.")}</span>}</label></section>
          <div className="rental-form-actions"><Link className="button button--outline" to="/car-rental">{t("Back to Services", "العودة للخدمات")}</Link><button className="rental-primary-button">{t("Review enquiry", "مراجعة الاستفسار")}<Icon name="arrowRight" /></button></div>
        </form>
        {stage !== "details" && <div className="rental-enquiry-review">
          <section className="rental-form-section"><NumberedHeading number={1} icon="car" title={t("Service Summary", "ملخص الخدمة")} /><h3>{service}</h3><p>{t("Vehicle selection and pricing are subject to a future supplier response.", "اختيار السيارة والتسعير يخضعان لرد مستقبلي من المورد.")}</p></section>
          <section className="rental-form-section"><NumberedHeading number={2} icon="pin" title={t("Trip Details", "تفاصيل الرحلة")} /><dl className="summary-dl"><div><dt>{t("Pickup", "الاستلام")}</dt><dd>{values.pickup}</dd></div><div><dt>{t("Destination", "الوجهة")}</dt><dd>{values.destination}</dd></div><div><dt>{t("Date / time", "التاريخ / الوقت")}</dt><dd><bdi>{values.date} · {values.time}</bdi></dd></div><div><dt>{t("Passengers / bags", "المسافرون / الحقائب")}</dt><dd>{values.passengers} / {values.bags}</dd></div>{values.flight && <div><dt>{t("Flight", "الرحلة")}</dt><dd><bdi>{values.flight}</bdi></dd></div>}</dl></section>
          <section className="rental-form-section"><NumberedHeading number={3} icon="people" title={t("Passenger Information", "معلومات الراكب")} /><p>{values.name}</p><p><bdi>{values.email}</bdi></p>{values.phone && <p><bdi>{values.phone}</bdi></p>}<p>{values.agency}</p></section>
          <section className="rental-form-section"><NumberedHeading number={4} icon="document" title={t("Special Requests", "طلبات خاصة")} /><p>{values.message}</p><p>{values.instructions}</p></section>
          {stage === "preview" && <section role="status" className="rental-form-section"><h2>{t("Local preview ready — not sent", "المعاينة المحلية جاهزة — لم تُرسل")}</h2><p>{t("No enquiry was delivered, payment processed or supplier booking created.", "لم يُرسل استفسار أو تُعالج دفعة أو يُنشأ حجز لدى المورد.")}</p></section>}
          <div className="rental-form-actions"><button type="button" className="button button--outline" onClick={() => setStage("details")}>{t("Edit enquiry", "تعديل الاستفسار")}</button></div>
        </div>}
      </div>
      <aside className="rental-trip-sidebar"><section className="rental-panel rental-enquiry-summary"><img src="/images/rental/luxury-arrival.webp" alt="" width="1536" height="1024" /><span className="rental-service-badge">{t("Chauffeur / Transfers", "سائق خاص / انتقالات")}</span><h2>{service}</h2><p>{t("A considered arrival for your clients.", "وصول مدروس لعملائك.")}</p><hr />{(draft.pickup || draft.destination) && <div className="rental-route"><div><Icon name="pin" /><div><small>{t("Pickup", "الاستلام")}</small><strong>{draft.pickup || "—"}</strong></div></div><div><Icon name="pin" /><div><small>{t("Destination", "الوجهة")}</small><strong>{draft.destination || "—"}</strong></div></div><p><bdi>{draft.date} · {draft.time}</bdi></p><p>{t("Passengers / bags", "المسافرون / الحقائب")}: {draft.passengers} / {draft.bags}</p></div>}<h3>{t("Price on enquiry", "السعر عند الاستفسار")}</h3><p>{t("Trip rates and vehicle allocation are not supplied.", "أسعار الرحلة وتخصيص السيارة غير متوفرين.")}</p>{stage === "review" && <button className="rental-primary-button" onClick={() => setStage("preview")}>{t("Prepare enquiry preview", "تجهيز معاينة الاستفسار")}</button>}<Link to="/car-rental">{t("Explore Self-Drive Rental", "استكشف تأجير القيادة الذاتية")}</Link></section><section className="rental-assistance"><h3>{t("Official contact", "التواصل الرسمي")}</h3><a href="https://wa.me/201070724143" target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" /><bdi>+20 01070724143</bdi></a></section></aside>
    </div>
  </RentalShell>;
}
