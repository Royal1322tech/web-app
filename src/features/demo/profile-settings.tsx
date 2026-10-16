import { Link } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { PreferenceFields } from "@/features/preferences/travel-preferences";
import { useDemo } from "./demo-provider";
import { Workspace, DemoNotice } from "./shared";

export function ProfilePage() {
  const { t } = useLocale();
  const { profile } = useDemo();
  const initials = profile.contact.split(/\s+/).slice(0, 2).map(part => part[0]).join("");
  return <Workspace title={t("My Profile", "ملفي الشخصي")}><DemoNotice />
    <section className="workspace-card profile-overview">
      <div className="profile-avatar" aria-hidden="true">{initials}</div>
      <div><p className="workspace-eyebrow">{t("YOUR PARTNER WORKSPACE", "مساحة عملك كشريك")}</p><h2>{profile.contact}</h2><p>{t("Agency contact · sample identity", "مسؤول التواصل بالوكالة · هوية تجريبية")}</p><strong>{profile.name}</strong></div>
      <Link className="button button--primary" to="/agency/edit">{t("Edit demo profile", "تعديل الملف التجريبي")}</Link>
    </section>
    <div className="profile-information">
      <section className="workspace-card"><h2>{t("Personal information", "المعلومات الشخصية")}</h2><dl className="profile-fields">
        {[[t("Full name", "الاسم الكامل"), profile.contact], [t("Email", "البريد الإلكتروني"), profile.email], [t("Phone", "الهاتف"), profile.phone]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd><bdi>{value}</bdi></dd></div>)}
      </dl></section>
      <section className="workspace-card"><h2>{t("Agency information", "معلومات الوكالة")}</h2><dl className="profile-fields">
        {[[t("Agency", "الوكالة"), profile.name], [t("Country", "الدولة"), profile.country], [t("Address", "العنوان"), profile.address]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl><Link to="/agency">{t("View agency details", "عرض تفاصيل الوكالة")}</Link></section>
    </div>
    <section className="workspace-card"><h2>{t("Your workspace at a glance", "مساحة عملك بنظرة سريعة")}</h2><div className="profile-shortcuts">
      {[["/wallet", t("Credit balance", "الرصيد الائتماني"), t("Review demo credit", "راجع الرصيد التجريبي")], ["/transactions", t("Transactions", "المعاملات"), t("Explore financial activity", "استعرض النشاط المالي")], ["/bookings", t("Bookings", "الحجوزات"), t("Manage your sample stays", "أدر إقاماتك التجريبية")], ["/points", t("Points", "النقاط"), t("View points and activity", "عرض النقاط والنشاط")]].map(([path, title, description]) => <Link to={path} key={path}><strong>{title}</strong><span>{description}</span><span aria-hidden="true">↗</span></Link>)}
    </div></section>
  </Workspace>;
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
