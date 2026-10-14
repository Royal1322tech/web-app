import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { BrandLogo, HomepageBrandLogo } from "@/components/brand-logo";
import { useDemo } from "@/features/demo/demo-provider";
import { TravelPreferences } from "@/features/preferences/travel-preferences";
import { Popover } from "@/components/ui/popover";
import { Icon } from "@/components/ui/icon";
import styles from "./site-header.module.css";

export function SiteHeader({ standalone = false }: { standalone?: boolean }) {
  const { t, locale, setLocale } = useLocale();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { demoSessionActive, signOut } = useDemo();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const close = () => setMenuOpen(false);
  const active = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
  return (
    <header className={`${styles.header} ${standalone ? styles.standalone : ""} ${menuOpen ? styles.expanded : ""}`}>
      <Link to="/" aria-label={t("Royal Vacation home", "رويال فاكيشن الرئيسية")} className={styles.brand}>
        {pathname === "/" ? <HomepageBrandLogo /> : <BrandLogo withName />}
      </Link>
      <button ref={toggle} type="button" className={styles.toggle} aria-label={menuOpen ? t("Close navigation", "إغلاق القائمة") : t("Open navigation", "فتح القائمة")} aria-expanded={menuOpen} aria-controls="home-navigation header-tools" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? "close" : "menu"} /></button>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Escape bubbles from native links to dismiss the mobile navigation. */}
      <nav id="home-navigation" aria-label={t("Main navigation", "التنقل الرئيسي")} className={styles.navigation}
        onKeyDown={event => { if (event.key === "Escape") { close(); toggle.current?.focus(); } }}>
        {[
          ["/", t("Home", "الرئيسية")], ["/search", t("Search", "بحث")],
          ["/car-rental", t("Car Rental", "تأجير السيارات")], ["/bookings", t("Booking", "الحجوزات")],
          ["/wallet", t("Wallet", "المحفظة")], ["/favourites", t("Favourites", "المفضلة")], ["/contact", t("Contact Us", "تواصل معنا")],
        ].map(([href, label]) => <Link key={href} to={href} aria-current={active(href) ? "page" : undefined} onClick={close}>{label}</Link>)}
      </nav>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Escape bubbles from native controls; the wrapper is not itself interactive. */}
      <div id="header-tools" className={styles.tools}
        onKeyDown={event => { if (event.key === "Escape") { close(); toggle.current?.focus(); } }}>
        <label className={styles.language}><span className="sr-only">{t("Language", "اللغة")}</span>
          <select aria-label={t("Language", "اللغة")} value={locale} onChange={event => setLocale(event.target.value === "ar" ? "ar" : "en")}><option value="en">EN</option><option value="ar">AR</option></select>
        </label>
        <TravelPreferences />
        <div className={styles.icons}>
          <Link to="/notifications" onClick={close} aria-label={t("Notifications", "الإشعارات")} title={t("Notifications", "الإشعارات")}><Icon name="bell" /></Link>
          <Link to="/booking/summary" onClick={close} aria-label={t("Booking summary", "ملخص الحجز")} title={t("Booking summary", "ملخص الحجز")}><Icon name="cart" /></Link>
          <Link to={demoSessionActive ? "/agency" : "/welcome"} onClick={close} aria-label={t("Agency account", "حساب الوكالة")} title={t("Agency account", "حساب الوكالة")}><Icon name="personFilled" /></Link>
        </div>
        {demoSessionActive ? <Popover label={t("Account menu", "قائمة الحساب")} trigger={<>{t("Demo account", "حساب تجريبي")}<Icon name="chevron" /></>}>
          <p>{t("Demo access · Frontend only", "دخول تجريبي · واجهة فقط")}</p>
          {[
            ["/profile", t("My Profile", "ملفي الشخصي")], ["/agency", t("My Agency", "وكالتي")],
            ["/bookings", t("My Bookings", "حجوزاتي")], ["/car-rental/bookings", t("My Rentals", "تأجيراتي")],
            ["/wallet", t("Wallet", "المحفظة")], ["/transactions", t("Transactions", "المعاملات")],
            ["/account/settings", t("Account Settings", "إعدادات الحساب")],
          ].map(([href, label]) => <Link key={href} to={href} onClick={close}>{label}</Link>)}
          <button type="button" onClick={() => { signOut(); close(); navigate("/welcome", { replace: true }); }}>{t("Sign Out", "تسجيل الخروج")}</button>
        </Popover> : <div className={styles.guest}>
          <Link to="/register/agency/company" onClick={close}>{t("Register", "تسجيل وكالة")}</Link>
          <Link to="/login" onClick={close}>{t("Sign In", "تسجيل الدخول")}</Link>
        </div>}
      </div>
    </header>
  );
}
