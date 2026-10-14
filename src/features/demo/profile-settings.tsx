import { Link } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { PreferenceFields } from "@/features/preferences/travel-preferences";
import { useDemo } from "./demo-provider";
import { Workspace, DemoNotice } from "./shared";

export function ProfilePage() {
  const { t } = useLocale();
  const { profile } = useDemo();
  return <Workspace title={t("My Profile", "ملفي الشخصي")}><DemoNotice />
    <section className="workspace-card"><h2>{profile.contact}</h2><p>{t("Agency contact · sample identity", "مسؤول التواصل بالوكالة · هوية تجريبية")}</p>
      <dl className="summary-dl"><div><dt>{t("Email", "البريد الإلكتروني")}</dt><dd><bdi>{profile.email}</bdi></dd></div><div><dt>{t("Agency", "الوكالة")}</dt><dd>{profile.name}</dd></div></dl>
      <Link className="button button--outline" to="/agency/edit">{t("Edit demo profile", "تعديل الملف التجريبي")}</Link>
    </section></Workspace>;
}
export function AccountSettingsPage() {
  const { t, locale, setLocale } = useLocale();
  return <Workspace title={t("Account Settings", "إعدادات الحساب")}><DemoNotice />
    <section className="workspace-card settings-preferences"><h2>{t("Display preferences", "تفضيلات العرض")}</h2>
      <label htmlFor="settings-language">{t("Language", "اللغة")}</label><select id="settings-language" className="input" value={locale} onChange={event => setLocale(event.target.value === "ar" ? "ar" : "en")}><option value="en">English</option><option value="ar">العربية</option></select>
      <PreferenceFields />
      <p>{t("These non-sensitive display preferences are saved on this device. Security settings and real account changes require backend integration.", "تُحفظ تفضيلات العرض غير الحساسة على هذا الجهاز. إعدادات الأمان وتغييرات الحساب الفعلية تتطلب الربط بالخادم.")}</p>
      <Link to="/forgot-password">{t("Password recovery preview", "معاينة استعادة كلمة المرور")}</Link>
    </section></Workspace>;
}
