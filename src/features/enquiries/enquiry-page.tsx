import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CatalogShell } from "@/features/hotels/components/catalog-shell";
import { useLocale } from "@/features/localization/locale-provider";
import { FormField } from "@/components/ui/form-field";
import styles from "./enquiry.module.css";
import contact from "./contact-page.module.css";
import { Icon } from "@/components/ui/icon";
import { ResponsiveImage } from "@/components/ui/responsive-image";

export function EnquiryPage({ group = false }: { group?: boolean }) {
  const { t, locale } = useLocale();
  const [params] = useSearchParams();
  const [preview, setPreview] = useState(false);
  const schema = z.object({
    name: z.string().trim().min(2, t("Enter your name.", "أدخل اسمك.")).max(100),
    email: z.email(t("Enter a valid email.", "أدخل بريدًا إلكترونيًا صحيحًا.")),
    agency: z.string().trim().min(group ? 2 : 0, t("Enter your agency name.", "أدخل اسم الوكالة.")).max(160, t("Use 160 characters or fewer.", "اكتب ١٦٠ حرفًا أو أقل.")),
    subject: z.string().trim().min(group ? 3 : 0, t("Enter a subject.", "أدخل موضوع الاستفسار.")).max(160, t("Use 160 characters or fewer.", "اكتب ١٦٠ حرفًا أو أقل.")),
    message: z.string().trim().min(10, t("Use at least 10 characters.", "اكتب ١٠ أحرف على الأقل.")).max(2000, t("Use 2000 characters or fewer.", "اكتب ٢٠٠٠ حرف أو أقل.")),
    destination: z.string(),
    start: z.string(),
    end: z.string(),
    passengers: z.string(),
    rooms: z.string(),
    service: z.enum(["hotels", "transport", "both"]),
  }).superRefine((data, context) => {
    if (!group) return;
    const issue = (path: string, message: string) => context.addIssue({ code: "custom", path: [path], message });
    if (data.destination.trim().length < 2) issue("destination", t("Enter a destination or route.", "أدخل الوجهة أو المسار."));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(data.start + "T00:00:00");
    const end = new Date(data.end + "T00:00:00");
    if (!data.start || !Number.isFinite(+start) || start < today) issue("start", t("Choose today or a future date.", "اختر اليوم أو تاريخًا لاحقًا."));
    if (!data.end || !Number.isFinite(+end) || end < start) issue("end", t("Choose an end date on or after departure.", "اختر نهاية لا تسبق تاريخ المغادرة."));
    if (!/^\d+$/.test(data.passengers) || +data.passengers < 1 || +data.passengers > 5000) issue("passengers", t("Enter a whole number from 1 to 5000.", "أدخل عددًا صحيحًا من ١ إلى ٥٠٠٠."));
    if (data.rooms && (!/^\d+$/.test(data.rooms) || +data.rooms < 1 || +data.rooms > 1000)) issue("rooms", t("Enter a whole number from 1 to 1000.", "أدخل عددًا صحيحًا من ١ إلى ١٠٠٠."));
  });
  type Values = z.infer<typeof schema>;
  const subjects: Record<string, string> = {
    "airport-transfers": t("Airport transfers enquiry", "استفسار انتقالات المطار"),
    "car-with-driver": t("Car with driver enquiry", "استفسار سيارة بسائق"),
    "private-chauffeur": t("Private chauffeur enquiry", "استفسار سائق خاص"),
    "vip-transport": t("VIP transportation enquiry", "استفسار نقل كبار الشخصيات"),
  };
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name:"", email:"", agency:"", subject:group ? t("Group quotation request", "طلب عرض سعر للمجموعات") : subjects[params.get("subject") ?? ""] ?? "", message:"", destination:"", start:"", end:"", passengers:"", rooms:"", service:"both" },
  });
  const title = group ? t("Group quotation", "عرض سعر للمجموعات") : t("Contact Us", "تواصل معنا");
  const fields: { key: keyof Values; label: string; type?: string; required?: boolean }[] = [
    { key:"name", label:group ? t("Name", "الاسم") : t("Full Name", "الاسم الكامل"), required:true }, { key:"email", label:group ? t("Email", "البريد الإلكتروني") : t("Email Address", "البريد الإلكتروني"), type:"email", required:true },
    { key:"agency", label:group ? t("Agency / company", "الوكالة / الشركة") : t("Agency / Company Name (optional)", "اسم الوكالة / الشركة (اختياري)"), required:group }, { key:"subject", label:group ? t("Subject", "الموضوع") : t("Subject (optional)", "الموضوع (اختياري)"), required:group },
    ...(group ? [
      { key:"destination" as const, label:t("Destination / route", "الوجهة / المسار"), required:true },
      { key:"passengers" as const, label:t("Passengers", "المسافرون"), type:"number", required:true },
      { key:"start" as const, label:t("Departure date", "تاريخ المغادرة"), type:"date", required:true },
      { key:"end" as const, label:t("End date", "تاريخ النهاية"), type:"date", required:true },
      { key:"rooms" as const, label:t("Rooms needed (optional)", "الغرف المطلوبة (اختياري)"), type:"number" },
    ] : []),
  ];
  return <CatalogShell title={title}><title>{`${title} | Royal Vacation`}</title>
    <section className={`${styles.page} ${!group ? contact.page : ""}`}>
      {!group && <ResponsiveImage className={contact.background} src="/images/home/cinematic/coastal-resort.png" alt="" width={1672} height={941} sizes="100vw" eager />}
      {group && <p className={styles.eyebrow}>{t("ROYAL VACATION · AGENCY ENQUIRIES", "رويال فاكيشن · استفسارات الوكالات")}</p>}
      <h1>{group ? title : <span className={contact.headingText}>{t("Get in Touch ", "تواصل ")}<span>{t("With Us", "معنا")}</span></span>}</h1>
      <p className={styles.intro}>{group ? t("Bring your group’s travel requirements together in one clear request preview.", "اجمع متطلبات سفر مجموعتك في معاينة طلب واحدة واضحة.") : t("Have questions or need assistance? Our team is here to help with your travel needs.", "لديك أسئلة أو تحتاج إلى مساعدة؟ فريقنا هنا لمساعدتك في احتياجات سفرك.")}</p>
      <div className={styles.grid}>
        {!group && <aside className={contact.information}>
          <ResponsiveImage className={contact.photo} src="/images/home/cinematic/coastal-resort.png" alt="" width={1672} height={941} sizes="(max-width:799px) 90vw, 480px" />
          <h2>{t("Contact Information", "معلومات التواصل")}</h2>
          <p>{t("Connect with Royal Vacation for your agency’s next journey.", "تواصل مع رويال فاكيشن من أجل رحلة وكالتك القادمة.")}</p>
          <dl>
            <div><dt><span className={contact.icon}><Icon name="whatsapp" /></span>{t("WhatsApp", "واتساب")}</dt><dd><a href="https://wa.me/201070724143" target="_blank" rel="noopener noreferrer"><bdi>+20 01070724143</bdi></a></dd></div>
            <div><dt><span className={contact.icon}><Icon name="mail" /></span>{t("Email Address", "البريد الإلكتروني")}</dt><dd><a href="mailto:royal.travel@royalvacation.online"><bdi>royal.travel@royalvacation.online</bdi></a></dd></div>
          </dl>
          <Link to="/group-quotation">{t("Planning a group journey?", "تخطط لرحلة جماعية؟")} <Icon name="arrowRight" /></Link>
        </aside>}

        <form noValidate className={styles.form} onChange={() => setPreview(false)} onSubmit={handleSubmit(async () => { await Promise.resolve(); setPreview(true); }, () => setPreview(false))}>
          <p className={styles.notice}>{t("Frontend preview only. Use fictional details. Nothing is sent, and no enquiry or quotation is submitted. Values clear when you leave this page.", "معاينة واجهة فقط. استخدم بيانات وهمية. لا يُرسل أي استفسار أو طلب سعر. تُمسح البيانات عند مغادرة الصفحة.")}</p>
          <div className={styles.fields}>{fields.map(field => <FormField key={field.key} id={"enquiry-" + field.key} label={field.label} required={field.required} error={errors[field.key]?.message}>
            <div className={!group ? contact.inputWrap : undefined}>
            {!group && <Icon name={field.key === "email" ? "mail" : field.key === "name" ? "user" : field.key === "agency" ? "building" : "document"} />}
            <input placeholder={group ? undefined : field.key === "name" ? t("Enter your full name", "أدخل اسمك الكامل") : field.key === "email" ? t("Enter your email address", "أدخل بريدك الإلكتروني") : field.key === "agency" ? t("Your agency or company", "اسم الوكالة أو الشركة") : t("What can we help with?", "كيف يمكننا مساعدتك؟")} id={"enquiry-" + field.key} className="input" type={field.type ?? "text"} required={field.required} min={field.type === "number" ? 1 : undefined} step={field.type === "number" ? 1 : undefined} dir={field.type === "email" ? "ltr" : undefined} aria-invalid={!!errors[field.key]} aria-describedby={errors[field.key] ? "enquiry-" + field.key + "-error" : undefined} {...register(field.key)} />
            </div>
          </FormField>)}</div>
          {group && <FormField id="enquiry-service" label={t("Requested services", "الخدمات المطلوبة")}><select id="enquiry-service" className="input" {...register("service")}><option value="both">{t("Hotels and transportation", "فنادق ونقل")}</option><option value="hotels">{t("Hotels", "فنادق")}</option><option value="transport">{t("Transportation", "نقل")}</option></select></FormField>}
          <FormField id="enquiry-message" label={group ? t("Message / requirements", "الرسالة / المتطلبات") : t("Message", "الرسالة")} required error={errors.message?.message}>
            <textarea placeholder={group ? undefined : t("Write your message here…", "اكتب رسالتك هنا…")} id="enquiry-message" className="input" rows={5} required maxLength={2000} aria-invalid={!!errors.message} aria-describedby={errors.message ? "enquiry-message-error" : undefined} {...register("message")} />
          </FormField>
          <button className={`button button--primary ${!group ? contact.send : ""}`} disabled={isSubmitting} type="submit">{isSubmitting ? t("Preparing preview…", "تجهيز المعاينة…") : group ? t("Preview request", "معاينة الطلب") : t("Send Message", "إرسال الرسالة")}{!group && <Icon name="arrowRight" />}</button>
          {preview && <section className={styles.preview} role="status"><h2>{t("Local preview ready — not sent", "المعاينة المحلية جاهزة — لم تُرسل")}</h2><p>{getValues("subject")}</p><p>{getValues("message")}</p><p>{t("Delivery is unavailable until an approved contact service is connected. No response time or price is promised.", "الإرسال غير متاح حتى ربط خدمة تواصل معتمدة. لا يوجد وعد بمدة رد أو سعر.")}</p></section>}
        </form>
        {group && <aside className={styles.aside}>
          <h2>{t("For travel professionals", "لمحترفي السفر")}</h2>
          <p>{t("Include your destination, travel dates and service requirements. Please do not enter payment details or identity documents.", "اذكر الوجهة وتواريخ السفر والخدمات المطلوبة. لا تدخل بيانات دفع أو مستندات هوية.")}</p>
          <p>{t("Official contact channels and delivery are not configured in this preview.", "قنوات التواصل الرسمية والإرسال غير مُعدة في هذه المعاينة.")}</p>
          <Link to={group ? "/contact" : "/group-quotation"}>{group ? t("General agency enquiry", "استفسار عام للوكالة") : t("Plan a group quotation", "جهز طلب عرض سعر لمجموعة")}</Link>
          <Link to="/search">{t("Explore hotel samples", "استكشف نماذج الفنادق")}</Link>
          <Link to="/car-rental">{t("Explore car rental demo", "استكشف تجربة تأجير السيارات")}</Link>
          <p lang={locale}>{t("No real reservation or transaction is created.", "لا يتم إنشاء حجز أو معاملة فعلية.")}</p>
        </aside>}
      </div>
    </section>
  </CatalogShell>;
}
