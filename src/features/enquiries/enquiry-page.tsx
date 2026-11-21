import { ChauffeurEnquiryPage, chauffeurSubjects } from "@/features/car-rental/chauffeur-enquiry";
import { useAppSessionActive } from "@/features/auth/app-session";
import { useEffect, useRef, useState } from "react";
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
import { PageHero } from "@/components/ui/page-hero";
import {  } from "react";
import { SiteFooter } from "@/features/home/components/site-footer";
import { getCountryCallingCode } from "libphonenumber-js/max";
import { contactPhone, phoneCountries, validPhoneCountry } from "@/features/agency-registration/lib/phone";
import { statePreviewEnabled } from "@/components/ui/system-state";
import { useDemo } from "@/features/demo/demo-provider";
import { GroupQuotationWizard } from "@/features/group-requests/group-quotation-wizard";
import { GroupRequestFailed, GroupRequestSaved, GroupRequestSaving } from "@/features/group-requests/group-request-status";
import type { NewGroupRequest } from "@/features/group-requests/group-request-types";

const whatsappUrl = "https://wa.me/201070724143";
const contactEmail = "royal.travel@royalvacation.online";

/* The complaint form (./complaint-page) is kept for the planned Ticket page and is
 * intentionally not routed until its eligibility rules and route are approved. */
export function EnquiryPage({ group = false }: { group?: boolean }) {
  const demoSessionActive = useAppSessionActive();
  const [params] = useSearchParams();
  if (!group && chauffeurSubjects.includes(params.get("subject") ?? "")) return <ChauffeurEnquiryPage />;
  if (group) return <GroupEnquiryPage />;
  return <GeneralEnquiryPage group={false} publicVisitor={!demoSessionActive} />;
}
/* Group quotation sits behind the session gate, so the demo store is always available here. */
function GroupEnquiryPage() {
  const { createGroupRequest } = useDemo();
  return <GeneralEnquiryPage group publicVisitor={false} saveGroupRequest={createGroupRequest} />;
}
/** Long enough to read the saving panel instead of a flash. The outcome never depends on it. */
const SAVING_DISPLAY_MS = 700;
function GeneralEnquiryPage({ group, publicVisitor, saveGroupRequest }: { group: boolean; publicVisitor: boolean; saveGroupRequest?: (input: NewGroupRequest) => string | null }) {
  const { t, locale } = useLocale();
  const [params] = useSearchParams();
  const [preview, setPreview] = useState(false);
  // Developer state preview only: the failed panel has no way to occur for a signed-in demo session.
  const [saveState, setSaveState] = useState<"form" | "saving" | "saved" | "failed">(() => statePreviewEnabled && params.get("preview") === "failed" ? "failed" : "form");
  const [savedReference, setSavedReference] = useState("");
  const saveTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(saveTimer.current), []);
  const schema = z.object({
    name: z.string().trim().min(2, t("Enter your name.", "أدخل اسمك.")).max(100),
    email: z.email(t("Enter a valid email.", "أدخل بريدًا إلكترونيًا صحيحًا.")),
    phone: z.string(),
    phoneCountry: z.string(),
    agency: z.string().trim().min(group ? 2 : 0, t("Enter your agency name.", "أدخل اسم الوكالة.")).max(160, t("Use 160 characters or fewer.", "اكتب ١٦٠ حرفًا أو أقل.")),
    subject: z.string().trim().min(3, t("Enter a subject.", "أدخل موضوع الاستفسار.")).max(160, t("Use 160 characters or fewer.", "اكتب ١٦٠ حرفًا أو أقل.")),
    message: z.string().trim().min(10, t("Use at least 10 characters.", "اكتب ١٠ أحرف على الأقل.")).max(2000, t("Use 2000 characters or fewer.", "اكتب ٢٠٠٠ حرف أو أقل.")),
    destination: z.string(),
    start: z.string(),
    end: z.string(),
    passengers: z.string(),
    rooms: z.string(),
    service: z.enum(["hotels", "transport", "both"]),
  }).superRefine((data, context) => {
    if (!group && !validPhoneCountry(data.phoneCountry)) {
      context.addIssue({ code: "custom", path: ["phoneCountry"], message: t("Choose a country calling code.", "اختر رمز اتصال الدولة.") });
    } else if (!group && validPhoneCountry(data.phoneCountry) && !contactPhone({ phone: data.phone, phoneCountry: data.phoneCountry, callingCode: `+${getCountryCallingCode(data.phoneCountry)}` })) {
      context.addIssue({ code: "custom", path: ["phone"], message: t("Enter a valid phone number for the selected country.", "أدخل رقم هاتف صحيحًا للدولة المحددة.") });
    }
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
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name:"", email:"", phone:"", phoneCountry:"EG", agency:"", subject:group ? t("Group quotation request", "طلب عرض سعر للمجموعات") : subjects[params.get("subject") ?? ""] ?? "", message:"", destination:"", start:"", end:"", passengers:"", rooms:"", service:"both" },
  });
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = form;
  const countryNames = new Intl.DisplayNames([locale], { type: "region" });
  const title = group ? t("Group quotation", "عرض سعر للمجموعات") : t("Contact Us", "تواصل معنا");
  const fields: { key: keyof Values; label: string; type?: string; required?: boolean; autoComplete?: string }[] = [
    { key:"name", label:t("Full Name", "الاسم الكامل"), required:true, autoComplete:"name" }, { key:"email", label:t("Email Address", "البريد الإلكتروني"), type:"email", required:true, autoComplete:"email" },
    { key:"agency", label:t("Agency / Company Name (optional)", "اسم الوكالة / الشركة (اختياري)"), autoComplete:"organization" }, { key:"subject", label:t("Subject", "الموضوع"), required:true },
  ];
  const saveRequest = () => {
    if (!saveGroupRequest || saveState === "saving") return;
    setSaveState("saving");
    window.scrollTo(0, 0);
    saveTimer.current = window.setTimeout(() => {
      const values = getValues();
      const reference = saveGroupRequest({
        name: values.name.trim(), email: values.email, agency: values.agency.trim(), subject: values.subject.trim(), destination: values.destination.trim(),
        start: values.start, end: values.end, passengers: Number(values.passengers), rooms: values.rooms ? Number(values.rooms) : undefined,
        service: values.service, message: values.message.trim(),
      });
      setSavedReference(reference ?? "");
      setSaveState(reference ? "saved" : "failed");
    }, SAVING_DISPLAY_MS);
  };
  /** The prepared enquiry as plain text, for the visitor to send from their own app. */
  const enquiryText = () => {
    const values = getValues();
    return [
      `${t("Name", "الاسم")}: ${values.name}`,
      `${t("Email", "البريد الإلكتروني")}: ${values.email}`,
      ...(values.agency.trim() ? [`${t("Agency / Company", "الوكالة / الشركة")}: ${values.agency.trim()}`] : []),
      `${t("Phone", "الهاتف")}: +${validPhoneCountry(values.phoneCountry) ? getCountryCallingCode(values.phoneCountry) : ""} ${values.phone}`,
      `${t("Subject", "الموضوع")}: ${values.subject}`,
      "",
      values.message,
    ].join("\n");
  };
  return <><CatalogShell title={title} publicHeader={publicVisitor}><title>{`${title} | Royal Vacation`}</title>
    <section className={`${styles.page} ${!group ? contact.page : ""}`}>
      {!group && <>
        <PageHero eyebrow={t("ROYAL VACATION · TRAVEL PARTNERS", "رويال فاكيشن · شركاء السفر")} title={t("Contact Us", "تواصل معنا")} image={{ src: "/images/home/cinematic/coastal-resort.png", width: 1672, height: 941 }} position="center 60%">
          {t("We're here to help you connect with Royal Vacation.", "نحن هنا لمساعدتك على التواصل مع رويال فاكيشن.")}
        </PageHero>
        <nav className={contact.quickActions} aria-label={t("Contact directly", "تواصل مباشرة")}>
          <a className="button button--outline" href={whatsappUrl} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" />{t("WhatsApp", "واتساب")}</a>
          <a className="button button--outline" href={`mailto:${contactEmail}`}><Icon name="mail" />{t("Email", "البريد الإلكتروني")}</a>
        </nav>
      </>}
      {group && <p className={styles.eyebrow}>{t("ROYAL VACATION · AGENCY ENQUIRIES", "رويال فاكيشن · استفسارات الوكالات")}</p>}
      {group && <><h1>{title}</h1><p className={styles.intro}>{t("Bring your group’s travel requirements together in one clear request.", "اجمع متطلبات سفر مجموعتك في طلب واحد واضح.")}</p></>}
      {saveState === "saving" && <GroupRequestSaving />}
      {saveState === "saved" && <GroupRequestSaved reference={savedReference} />}
      {saveState === "failed" && <GroupRequestFailed onRetry={() => { setSaveState("form"); setPreview(true); }} />}
      {/* The form stays mounted while saving, so nothing typed is lost. */}
      <div hidden={saveState !== "form"}>
      {group ? <GroupQuotationWizard form={form} preview={preview} onPreviewChange={setPreview} onSave={saveRequest} /> : (
      <div className={styles.grid}>
        <aside className={contact.information}>
          <h2>{t("Contact Information", "معلومات التواصل")}</h2>
          <p>{t("Connect with Royal Vacation for your agency’s next journey.", "تواصل مع رويال فاكيشن من أجل رحلة وكالتك القادمة.")}</p>
          <ul className={contact.actions}>
            <li><a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><span className={contact.icon}><Icon name="whatsapp" /></span><span className={contact.actionText}><strong>{t("WhatsApp", "واتساب")}</strong><bdi>+20 01070724143</bdi></span><Icon name="arrowRight" /></a></li>
            <li><a href={`mailto:${contactEmail}`}><span className={contact.icon}><Icon name="mail" /></span><span className={contact.actionText}><strong>{t("Email Address", "البريد الإلكتروني")}</strong><bdi>{contactEmail}</bdi></span><Icon name="arrowRight" /></a></li>
          </ul>
          {!publicVisitor && <div className={contact.links}>
            <Link to="/group-quotation">{t("Planning a group journey?", "تخطط لرحلة جماعية؟")} <Icon name="arrowRight" /></Link>
            <Link to="/tickets">{t("My Tickets", "تذاكري")} <Icon name="arrowRight" /></Link>
          </div>}
        </aside>

        <form noValidate className={styles.form} onChange={() => setPreview(false)} onSubmit={handleSubmit(async () => { await Promise.resolve(); setPreview(true); }, () => setPreview(false))}>
          <h2 className={contact.formTitle}>{t("Prepare your enquiry", "جهّز استفسارك")}</h2>
          <p className={styles.notice}>{t("Online sending isn't available yet. Review your details here, then send them to us on WhatsApp or by email.", "الإرسال عبر الإنترنت غير متاح حاليًا. راجع بياناتك هنا ثم أرسلها إلينا عبر واتساب أو البريد الإلكتروني.")}</p>
          <div className={styles.fields}>{fields.map(field => <FormField key={field.key} id={"enquiry-" + field.key} label={field.label} required={field.required} error={errors[field.key]?.message}>
            <div className={contact.inputWrap}>
            <Icon name={field.key === "email" ? "mail" : field.key === "name" ? "user" : field.key === "agency" ? "building" : "document"} />
            <input placeholder={field.key === "name" ? t("Enter your full name", "أدخل اسمك الكامل") : field.key === "email" ? t("Enter your email address", "أدخل بريدك الإلكتروني") : field.key === "agency" ? t("Your agency or company", "اسم الوكالة أو الشركة") : t("What can we help with?", "كيف يمكننا مساعدتك؟")} id={"enquiry-" + field.key} className="input" type={field.type ?? "text"} autoComplete={field.autoComplete} required={field.required} dir={field.type === "email" ? "ltr" : undefined} aria-invalid={!!errors[field.key]} aria-describedby={errors[field.key] ? "enquiry-" + field.key + "-error" : undefined} {...register(field.key)} />
            </div>
          </FormField>)}</div>
          <FormField id="enquiry-phone" label={t("Phone Number", "رقم الهاتف")} required error={errors.phone?.message}>
            <div className={contact.phoneEntry} dir="ltr">
              <select id="enquiry-phone-country" className="input" aria-label={t("Country dialing code", "رمز اتصال الدولة")} aria-invalid={!!errors.phoneCountry} {...register("phoneCountry")}>
                {phoneCountries.map(country => <option key={country} value={country}>{countryNames.of(country)} (+{getCountryCallingCode(country)})</option>)}
              </select>
              <input id="enquiry-phone" className="input" type="tel" autoComplete="tel-national" required placeholder={t("Phone number", "رقم الهاتف")} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "enquiry-phone-error" : undefined} {...register("phone")} />
            </div>
          </FormField>
          <FormField id="enquiry-message" label={t("Message", "الرسالة")} required error={errors.message?.message}>
            <textarea placeholder={t("Write your message here…", "اكتب رسالتك هنا…")} id="enquiry-message" className="input" rows={5} required maxLength={2000} aria-invalid={!!errors.message} aria-describedby={errors.message ? "enquiry-message-error" : undefined} {...register("message")} />
          </FormField>
          <button className={`button button--primary ${contact.send}`} disabled={isSubmitting} type="submit">{isSubmitting ? t("Preparing…", "جارٍ التجهيز…") : t("Prepare enquiry", "تجهيز الاستفسار")}<Icon name="arrowRight" /></button>
          {preview && <section className={styles.preview} role="status"><h2>{t("Request ready — not sent yet", "الطلب جاهز — لم يُرسل بعد")}</h2><p>{getValues("subject")}</p><p>{getValues("message")}</p><>
            <div className={contact.sendActions}>
              <a className="button button--outline" href={`${whatsappUrl}?text=${encodeURIComponent(enquiryText())}`} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" />{t("Send via WhatsApp", "إرسال عبر واتساب")}</a>
              <a className="button button--outline" href={`mailto:${contactEmail}?subject=${encodeURIComponent(getValues("subject"))}&body=${encodeURIComponent(enquiryText())}`}><Icon name="mail" />{t("Send via Email", "إرسال عبر البريد الإلكتروني")}</a>
            </div>
            <p>{t("Each option opens your own app with this enquiry filled in. You must complete sending there. This website does not send or store your enquiry and cannot confirm delivery. No response time or price is promised.", "يفتح كل خيار تطبيقك الخاص وبه هذا الاستفسار جاهزًا، وعليك إكمال الإرسال من هناك. لا يرسل هذا الموقع استفسارك ولا يخزنه ولا يمكنه تأكيد وصوله. لا يوجد وعد بمدة رد أو سعر.")}</p>
          </></section>}
        </form>
      </div>
      )}
      </div>
    </section>
    </CatalogShell>{!group && <SiteFooter />}</>;
}
