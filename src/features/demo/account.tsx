import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import { StatePreview, SystemState } from "@/components/ui/system-state";
import { useDemo } from "./demo-provider";
import { Workspace } from "./shared";
import type { AgencyProfile } from "./types";
export function AgencyPage() {
  const { t } = useLocale();
  const { profile, records, notifications } = useDemo();
  return (
    <Workspace title={t("Your agency, connected.", "وكالتك، في مكان واحد.")}>

      <StatePreview>
        <div className="workspace-grid">
          <section className="workspace-card">
            <p className="workspace-eyebrow">
              {t("AGENCY PROFILE", "ملف الوكالة")}
            </p>
            <h2>{profile.name}</h2>
            <span className="status-badge">
              {t(
                "Local session",
                "جلسة تجريبية · دون مصادقة فعلية",
              )}
            </span>
            <dl className="summary-dl">
              {[
                [t("Contact person", "مسؤول التواصل"), profile.contact],
                [t("Email", "البريد الإلكتروني"), profile.email],
                [t("Phone", "الهاتف"), profile.phone],
                [t("Address", "العنوان"), profile.address],
                [t("Country", "الدولة"), profile.country],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    <bdi>{value}</bdi>
                  </dd>
                </div>
              ))}
            </dl>
            <div className="workspace-actions">
              <Link className="button button--primary" to="/agency/edit">
                {t("Edit profile", "تعديل الملف الشخصي")}
              </Link>
              <Link className="button button--outline" to="/verify-email">
                {t("Email verification", "التحقق من البريد")}
              </Link>
            </div>
          </section>
          <aside className="workspace-card">
            <h2>{t("At a glance", "نظرة سريعة")}</h2>
            <dl className="summary-dl">
              <div>
                <dt>{t("Booking records", "سجلات الحجز")}</dt>
                <dd>{records.length}</dd>
              </div>
              <div>
                <dt>{t("Unread notifications", "إشعارات غير مقروءة")}</dt>
                <dd>{notifications.filter((n) => !n.read).length}</dd>
              </div>
            </dl>
            <Link to="/wallet">
              {t("Open credit overview", "افتح ملخص الائتمان")}
              <Icon
                name="arrowRight"
                style={{ display: "inline-block", verticalAlign: "middle" }}
              />
            </Link>
            <hr />
            <p className="fine-print">
              {t(
                "Profile updates apply to this session only.",
                "تبقى تعديلات الملف في الذاكرة. التسجيل والدخول الفعلي منفصلان عن هذه التجربة.",
              )}
            </p>
            <div className="workspace-actions">
              <Link to="/login">{t("Sign in", "تسجيل الدخول")}</Link>
              <Link to="/register/agency">
                {t("Register an agency", "تسجيل وكالة")}
              </Link>
            </div>
          </aside>
        </div>
      </StatePreview>
    </Workspace>
  );
}
const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your agency name."),
  contact: z.string().trim().min(2, "Enter a contact name."),
  email: z.email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid contact phone."),
  address: z.string().trim().min(4, "Enter your agency address."),
  country: z.string().trim().min(2, "Enter a country."),
});
export function EditAgencyPage() {
  const { t } = useLocale();
  const { profile, saveProfile } = useDemo();
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AgencyProfile>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile,
  });
  return (
    <Workspace title={t("Edit agency profile", "تعديل ملف الوكالة")}>

      <form
        className="workspace-card workspace-form"
        noValidate
        onChange={() => setSaved(false)}
        onSubmit={handleSubmit((v) => {
          saveProfile(v);
          setSaved(true);
        })}
      >
        <h2>{t("Agency information", "بيانات الوكالة")}</h2>
        <div className="workspace-fields">
          {(
            [
              ["name", "Agency name", "اسم الوكالة"],
              ["contact", "Contact person", "مسؤول التواصل"],
              ["email", "Email", "البريد الإلكتروني"],
              ["phone", "Phone", "الهاتف"],
              ["address", "Address", "العنوان"],
              ["country", "Country", "الدولة"],
            ] as const
          ).map(([key, en, ar]) => (
            <label key={key}>
              {t(en, ar)}
              <input
                type={
                  key === "email" ? "email" : key === "phone" ? "tel" : "text"
                }
                {...register(key)}
                aria-label={t(en, ar)}
                aria-invalid={!!errors[key]}
                aria-describedby={
                  errors[key] ? `profile-${key}-error` : undefined
                }
              />
              {errors[key] && (
                <span
                  role="alert"
                  className="field-error"
                  id={`profile-${key}-error`}
                >
                  {t(errors[key].message!)}
                </span>
              )}
            </label>
          ))}
        </div>
        <div className="workspace-actions">
          <button className="button button--primary">
            {t("Save profile", "حفظ الملف الشخصي")}
          </button>
          <Link className="button button--outline" to="/agency">
            {t("Back to profile", "العودة للملف")}
          </Link>
        </div>
        {saved && (
          <p role="status" className="success-note">
            {t(
              "Profile changes saved for this session.",
              "تم حفظ الملف الشخصي لهذه الجلسة. لم يتغير أي سجل حساب فعلي.",
            )}
          </p>
        )}
      </form>
    </Workspace>
  );
}
export function NotificationsPage() {
  const { t } = useLocale();
  const { notifications, readNotification } = useDemo();
  const [filter, setFilter] = useState("all");
  const list = notifications.filter((n) => filter === "all" || !n.read);
  return (
    <Workspace title={t("Notifications", "الإشعارات")}>

      <div className="table-toolbar">
        <label>
          {t("Show notifications", "عرض الإشعارات")}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">{t("All", "الكل")}</option>
            <option value="unread">{t("Unread", "غير مقروءة")}</option>
          </select>
        </label>
        <button
          className="button button--outline"
          onClick={() => readNotification()}
          disabled={!notifications.some((n) => !n.read)}
        >
          {t("Mark all as read", "تحديد الكل كمقروء")}
        </button>
      </div>
      <StatePreview
        emptyTitle={t("You’re all caught up", "كل الإشعارات مقروءة")}
      >
        {list.length ? (
          <section className="workspace-card">
            {list.map((n) => (
              <article
                className="notification"
                key={n.id}
                data-unread={!n.read}
              >
                <div>
                  <Link to={n.href} onClick={() => readNotification(n.id)}>
                    {t(n.title)}
                  </Link>
                  <p>{t(n.description)}</p>
                  <small>
                    {n.read ? t("Read", "مقروء") : t("Unread", "غير مقروء")}
                  </small>
                </div>
                {!n.read && (
                  <button
                    className="button button--outline"
                    onClick={() => readNotification(n.id)}
                  >
                    {t("Mark as read", "تحديد كمقروء")}
                  </button>
                )}
              </article>
            ))}
          </section>
        ) : (
          <SystemState
            title={t("You’re all caught up", "كل الإشعارات مقروءة")}
            description={t(
              "There are no unread notifications.",
              "لا توجد إشعارات غير مقروءة.",
            )}
          />
        )}
      </StatePreview>
    </Workspace>
  );
}
export function EmailVerificationPage() {
  const { t } = useLocale();
  const { profile } = useDemo();
  const [state, setState] = useState("ready");
  const navigate = useNavigate();
  return (
    <Workspace
      title={t("Email verification", "التحقق من البريد")}
    >

      <section className="workspace-card">
        <h2>{t("Verify your agency contact", "تحقق من جهة اتصال الوكالة")}</h2>
        <p>
          <bdi>{profile.email}</bdi>
        </p>
        <p>
          {t(
            "This page does not send email or verify ownership. Choose a status to view the interface.",
            "هذه المعاينة لا ترسل رسائل أو تتحقق من الملكية. اختر حالة لاستكشاف الواجهة.",
          )}
        </p>
        <label>
          {t("Verification state", "حالة التحقق")}
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="ready">{t("Ready", "جاهز")}</option>
            <option value="expired">{t("Expired link", "رابط منتهي")}</option>
            <option value="verified">
              {t("Verified appearance", "معاينة تم التحقق")}
            </option>
          </select>
        </label>
        {state === "expired" && (
          <p className="error-note" role="alert">
            {t(
              "The link is expired. Reset the status to view another state.",
              "انتهت صلاحية الرابط. أعد تعيين الحالة لعرض حالة أخرى.",
            )}
          </p>
        )}
        {state === "verified" && (
          <p className="success-note" role="status">
            {t(
              "This local status does not verify your email address.",
              "هذه الحالة المحلية لا تتحقق من عنوان بريدك.",
            )}
          </p>
        )}
        <div className="workspace-actions">
          <button
            className="button button--primary"
            onClick={() => setState(state === "expired" ? "ready" : "verified")}
          >
            {state === "expired"
              ? t("Reset link status", "إعادة تعيين حالة الرابط")
              : t("Preview verification", "معاينة التحقق")}
          </button>
          <button
            className="button button--outline"
            onClick={() => navigate("/agency")}
          >
            {t("Return to agency", "العودة للوكالة")}
          </button>
        </div>
      </section>
    </Workspace>
  );
}
