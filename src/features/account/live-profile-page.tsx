import { useId, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { b2bSession, useB2BSession } from "@/features/auth/b2b-session";
import { updateCurrentUser } from "@/features/auth/b2b-auth-api";
import { Workspace } from "@/features/demo/shared";
import { useLocale } from "@/features/localization/locale-provider";
import { ApiError } from "@/lib/api/client";
import styles from "./account.module.css";

/** Limits from PATCH /b2b/me (checked on staging, 2026-11-25): name ≤255, phone ≤30. */
export const PROFILE_NAME_MAX = 255;
export const PROFILE_PHONE_MAX = 30;
const PHONE = /^\+?[0-9][0-9 ()-]*$/;

type Errors = { name?: string; phone?: string };
type Notice = { tone: "success" | "error" | "info"; text: string } | null;

const roleLabel = (role: string, t: (en: string, ar: string) => string) =>
  ({ company_admin: t("Company administrator", "مسؤول الشركة"), company_employee: t("Employee", "موظف") } as Record<string, string>)[role] ?? role.replace(/_/g, " ");
const statusLabel = (status: string, t: (en: string, ar: string) => string) =>
  ({ approved: t("Approved", "معتمدة"), pending: t("Pending approval", "بانتظار الاعتماد"), suspended: t("Suspended", "موقوفة") } as Record<string, string>)[status] ?? status;
const businessLabel = (type: string, t: (en: string, ar: string) => string) =>
  ({ travel_agency: t("Travel agency", "وكالة سفر"), tour_operator: t("Tour operator", "منظم رحلات"), corporate: t("Corporate", "شركة") } as Record<string, string>)[type] ?? type.replace(/_/g, " ");

/**
 * My Profile with real sign-in. The user's name and phone are edited with PATCH /b2b/me (the only
 * fields the API accepts); email and company details are shown read-only. A save is reported only
 * after the API accepts it and GET /me returns the new values, which also updates the header.
 */
export function LiveProfilePage() {
  const { t, locale } = useLocale();
  const session = useB2BSession();
  const identity = session.status === "active" ? session.identity : null;
  const titleId = useId();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);

  if (!identity) {
    return <Workspace title={t("My Profile", "ملفي الشخصي")}><p className={styles.muted} role="status">{t("Loading your profile…", "جارٍ تحميل ملفك الشخصي…")}</p></Workspace>;
  }
  const { user, company, membership } = identity;
  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const country = company.countryCode ? new Intl.DisplayNames([locale], { type: "region" }).of(company.countryCode) ?? company.countryCode : undefined;
  const notProvided = t("Not provided", "غير متوفر");

  function startEdit() {
    setName(user.name);
    setPhone(user.phone ?? "");
    setErrors({});
    setNotice(null);
    setEditing(true);
    queueMicrotask(() => nameInput.current?.focus());
  }
  function cancel() {
    if (busy) return;
    setEditing(false);
    setErrors({});
    setNotice(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const nextName = name.trim();
    const nextPhone = phone.trim();
    const found: Errors = {};
    if (!nextName) found.name = t("Enter your name.", "أدخل اسمك.");
    else if (nextName.length > PROFILE_NAME_MAX) found.name = t(`Use ${PROFILE_NAME_MAX} characters or fewer.`, `استخدم ${PROFILE_NAME_MAX} حرفًا أو أقل.`);
    if (nextPhone && (nextPhone.length > PROFILE_PHONE_MAX || nextPhone.replace(/\D/g, "").length < 6 || !PHONE.test(nextPhone))) found.phone = t("Enter a valid phone number of up to 30 characters, for example +20 100 123 4567.", "أدخل رقم هاتف صحيحًا حتى 30 حرفًا، مثل ‎+20 100 123 4567.");
    setErrors(found);
    setNotice(null);
    if (Object.keys(found).length) return;
    const changes: { name?: string; phone?: string } = {};
    if (nextName !== user.name) changes.name = nextName;
    if (nextPhone && nextPhone !== (user.phone ?? "")) changes.phone = nextPhone;
    if (!Object.keys(changes).length) {
      setNotice({ tone: "info", text: t("There are no changes to save.", "لا توجد تغييرات لحفظها.") });
      return;
    }
    const token = b2bSession.token();
    if (!token) return;
    pending.current = true;
    setBusy(true);
    try {
      await updateCurrentUser(token, changes);
      const reloaded = await b2bSession.reloadIdentity();
      setEditing(false);
      setNotice(reloaded
        ? { tone: "success", text: t("Your details were saved.", "تم حفظ بياناتك.") }
        : { tone: "info", text: t("Your details were saved. Refresh the page to see them everywhere.", "تم حفظ بياناتك. حدّث الصفحة لرؤيتها في كل مكان.") });
    } catch (failure) {
      if (failure instanceof ApiError && failure.kind === "validation") {
        const fields = failure.fieldErrors;
        const next: Errors = {};
        if (fields.name) next.name = t("Check your name (up to 255 characters).", "تحقق من اسمك (حتى 255 حرفًا).");
        if (fields.phone) next.phone = t("Check the phone number (up to 30 characters).", "تحقق من رقم الهاتف (حتى 30 حرفًا).");
        setErrors(next);
        if (!next.name && !next.phone) setNotice({ tone: "error", text: t("These details weren't accepted. Check them and try again.", "لم يتم قبول هذه البيانات. تحقق منها وحاول مرة أخرى.") });
      } else if (failure instanceof ApiError && failure.kind === "rate_limited") {
        setNotice({ tone: "error", text: t("Too many requests. Please wait a few minutes before trying again.", "طلبات كثيرة. يرجى الانتظار بضع دقائق قبل المحاولة مرة أخرى.") });
      } else if (failure instanceof ApiError && failure.kind === "forbidden") {
        setNotice({ tone: "error", text: t("Your account can't change these details.", "لا يمكن لحسابك تغيير هذه البيانات.") });
      } else if (failure instanceof ApiError && (failure.kind === "network" || failure.kind === "timeout")) {
        setNotice({ tone: "error", text: t("We couldn't reach the server, so nothing was saved. Check your connection and try again.", "تعذر الوصول إلى الخادم، لذلك لم يُحفظ شيء. تحقق من اتصالك وحاول مرة أخرى.") });
      } else {
        // 401 ends the session through the shared API client.
        setNotice({ tone: "error", text: t("Your details couldn't be saved. Please try again later.", "تعذر حفظ بياناتك. يرجى المحاولة لاحقًا.") });
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const fact = (label: string, value: string | number | undefined, ltr = false) => (
    <div key={label}><dt>{label}</dt><dd>{value === undefined || value === "" ? <span className={styles.muted}>{notProvided}</span> : <bdi dir={ltr ? "ltr" : undefined}>{value}</bdi>}</dd></div>
  );

  return (
    <Workspace title={t("My Profile", "ملفي الشخصي")}>
      <div className={styles.page} data-live-profile>
        <section className={`workspace-card ${styles.overview}`} aria-label={t("Profile summary", "ملخص الملف الشخصي")}>
          <div className={styles.avatar} aria-hidden="true">{initials}</div>
          <div className={styles.identity}>
            <h2 data-profile-name><bdi>{user.name}</bdi></h2>
            <p><bdi dir="ltr">{user.email}</bdi></p>
            <p className={styles.badges}>
              <span className={styles.badge}>{roleLabel(membership.role, t)}</span>
              <span className={styles.badgeMuted}><bdi>{company.displayName || company.name}</bdi></span>
            </p>
          </div>
        </section>

        <div className={styles.columns}>
          <section className={`workspace-card ${styles.card}`} aria-labelledby={titleId} data-profile-form>
            <div className={styles.cardHead}>
              <h2 id={titleId} className={styles.cardTitle}><Icon name="user" aria-hidden="true" />{t("Personal details", "البيانات الشخصية")}</h2>
              {!editing && <button type="button" className="button button--outline" onClick={startEdit}>{t("Edit", "تعديل")}</button>}
            </div>
            {editing ? (
              <form noValidate onSubmit={save} aria-busy={busy} className={styles.form}>
                <label className={styles.field}>
                  <span>{t("Full name", "الاسم الكامل")} <small className={styles.required}>{t("Required", "مطلوب")}</small></span>
                  <input ref={nameInput} id="profile-name" className="input" name="name" autoComplete="name" maxLength={PROFILE_NAME_MAX} value={name} disabled={busy} required aria-invalid={!!errors.name} aria-describedby={errors.name ? "profile-name-error" : undefined}
                    onChange={(event) => { setName(event.target.value); if (errors.name) setErrors({ ...errors, name: undefined }); }} />
                  {errors.name && <span id="profile-name-error" className="field-error" role="alert">{errors.name}</span>}
                </label>
                <label className={styles.field}>
                  <span>{t("Phone", "الهاتف")}</span>
                  <input id="profile-phone" className="input" name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" maxLength={PROFILE_PHONE_MAX} placeholder="+20 100 123 4567" value={phone} disabled={busy} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "profile-phone-error" : "profile-phone-hint"}
                    onChange={(event) => { setPhone(event.target.value); if (errors.phone) setErrors({ ...errors, phone: undefined }); }} />
                  {errors.phone ? <span id="profile-phone-error" className="field-error" role="alert">{errors.phone}</span> : <small id="profile-phone-hint" className={styles.muted}>{t("Include the country code.", "أضف رمز الدولة.")}</small>}
                </label>
                <div className={styles.actions}>
                  <button type="submit" className="button button--primary" disabled={busy}>{busy ? t("Saving…", "جارٍ الحفظ…") : t("Save changes", "حفظ التغييرات")}</button>
                  <button type="button" className="button button--outline" disabled={busy} onClick={cancel}>{t("Cancel", "إلغاء")}</button>
                </div>
              </form>
            ) : (
              <dl className={styles.facts}>
                {fact(t("Full name", "الاسم الكامل"), user.name)}
                {fact(t("Phone", "الهاتف"), user.phone, true)}
              </dl>
            )}
            <div role={notice?.tone === "error" ? "alert" : "status"}>
              {notice && <p className={notice.tone === "error" ? styles.error : styles.success} data-profile-notice={notice.tone}>{notice.text}</p>}
            </div>
          </section>

          <section className={`workspace-card ${styles.card}`} aria-labelledby={`${titleId}-account`}>
            <div className={styles.cardHead}>
              <h2 id={`${titleId}-account`} className={styles.cardTitle}><Icon name="lock" aria-hidden="true" />{t("Sign-in and access", "تسجيل الدخول والصلاحيات")}</h2>
              <span className={styles.readOnly}>{t("Read only", "للعرض فقط")}</span>
            </div>
            <dl className={styles.facts}>
              {fact(t("Email", "البريد الإلكتروني"), user.email, true)}
              {fact(t("Role", "الدور"), roleLabel(membership.role, t))}
            </dl>
            <p className={styles.muted}>{t("Your email is your sign-in and can't be changed online.", "بريدك الإلكتروني هو بيانات دخولك ولا يمكن تغييره عبر الإنترنت.")} <Link to="/contact">{t("Password help", "المساعدة في كلمة المرور")}</Link></p>
          </section>
        </div>

        <section className={`workspace-card ${styles.card}`} aria-labelledby={`${titleId}-company`} data-profile-company>
          <div className={styles.cardHead}>
            <h2 id={`${titleId}-company`} className={styles.cardTitle}><Icon name="building" aria-hidden="true" />{t("Company", "الشركة")}</h2>
            <span className={styles.readOnly}>{t("Read only", "للعرض فقط")}</span>
          </div>
          <dl className={`${styles.facts} ${styles.factsWide}`}>
            {fact(t("Company name", "اسم الشركة"), company.name)}
            {fact(t("Legal name", "الاسم القانوني"), company.legalName)}
            {fact(t("Display name", "الاسم المعروض"), company.displayName)}
            {fact(t("Status", "الحالة"), statusLabel(company.status, t))}
            {fact(t("Business type", "نوع النشاط"), company.businessType ? businessLabel(company.businessType, t) : undefined)}
            {fact(t("Registration number", "رقم السجل"), company.registrationNo, true)}
            {fact(t("Tax number", "الرقم الضريبي"), company.taxNo, true)}
            {fact(t("Employees", "عدد الموظفين"), company.employeeCount)}
            {fact(t("Country", "الدولة"), country)}
            {fact(t("City", "المدينة"), company.city)}
            {fact(t("Address", "العنوان"), company.address)}
            {fact(t("Account currency", "عملة الحساب"), company.currency, true)}
            {fact(t("Company ID", "معرّف الشركة"), company.id, true)}
          </dl>
          <p className={styles.muted}>{t("Company details are managed by Royal Vacation. Contact us to change them.", "تُدار بيانات الشركة من قِبل رويال فاكيشن. تواصل معنا لتغييرها.")} <Link to="/contact">{t("Contact Royal Vacation", "تواصل مع رويال فاكيشن")}</Link></p>
        </section>
      </div>
    </Workspace>
  );
}
