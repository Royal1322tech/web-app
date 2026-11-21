import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { BrandLogo, HomepageBrandLogo } from "@/components/brand-logo";
import { useDemo } from "@/features/demo/demo-provider";
import { TravelPreferences } from "@/features/preferences/travel-preferences";
import { Popover } from "@/components/ui/popover";
import { LanguageSelector } from "@/features/localization/language-selector";
import { Icon } from "@/components/ui/icon";
import { useB2BSession } from "@/features/auth/b2b-session";
import styles from "./site-header.module.css";

export function SiteHeader({ standalone = false }: { standalone?: boolean }) {
  const { t } = useLocale();
  const { pathname, key: navigationKey } = useLocation();
  const navigate = useNavigate();
  const { demoSessionActive, signOut } = useDemo();
  const b2b = useB2BSession();
  const identity = b2b.status === "active" ? b2b.identity : null;
  const endSession = () => {
    const pending = signOut();
    close();
    void pending.then((result) => navigate(result === "confirmed" ? "/welcome" : "/login", { replace: true, state: result === "confirmed" ? undefined : { notice: "logout-unconfirmed" } }));
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const close = () => setMenuOpen(false);

  // The phone and tablet menu: the page behind it doesn't scroll; Escape, a tap outside the header
  // or growing to the desktop layout closes it. Escape inside an open menu panel closes that first.
  useEffect(() => {
    if (!menuOpen) return;
    const compact = window.matchMedia("(max-width: 1199px)");
    const root = document.documentElement;
    const previous = root.style.overflow;
    // The floating panel may use the screen below the bar, and scrolls within it on short screens.
    const lock = () => {
      root.style.overflow = compact.matches ? "hidden" : previous;
      const bottom = header.current?.getBoundingClientRect().bottom ?? 80;
      header.current?.style.setProperty("--menu-top", `${Math.max(0, Math.round(bottom)) + 16}px`);
    };
    lock();
    window.addEventListener("resize", lock);
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); toggle.current?.focus(); } };
    // The open menu floats over the page, so closing it moves nothing under the tap.
    const onPointer = (event: PointerEvent) => { if (!header.current?.contains(event.target as Node) && compact.matches) setMenuOpen(false); };
    const onWide = lock;
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    compact.addEventListener("change", onWide);
    return () => {
      root.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      compact.removeEventListener("change", onWide);
      window.removeEventListener("resize", lock);
    };
  }, [menuOpen]);
  const active = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
  return (
    <header ref={header} className={`${styles.header} ${standalone ? styles.standalone : ""} ${menuOpen ? styles.expanded : ""}`}>
      <Link to="/" aria-label={t("Royal Vacation home", "رويال فاكيشن الرئيسية")} className={styles.brand}>
        {pathname === "/" ? <HomepageBrandLogo /> : <BrandLogo withName />}
      </Link>
      <button ref={toggle} type="button" className={styles.toggle} aria-label={menuOpen ? t("Close navigation", "إغلاق القائمة") : t("Open navigation", "فتح القائمة")} aria-expanded={menuOpen} aria-controls="home-navigation header-tools" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? "close" : "menu"} /></button>
      {/* One panel on phones and tablets (floating under the bar); layout-neutral on desktop. */}
      <div className={styles.menuPanel}>
      <nav id="home-navigation" aria-label={t("Main navigation", "التنقل الرئيسي")} className={styles.navigation}>
        {[
          ["/", t("Home", "الرئيسية")], ["/search", t("Search", "بحث")],
          ["/car-rental", t("Car Rental", "تأجير السيارات")], ["/bookings", t("My Bookings", "حجوزاتي")],
          ["/group-quotation", t("Group Quotation", "عرض سعر للمجموعات")],
          ["/wallet", t("Wallet", "المحفظة")], ["/favourites", t("Favourites", "المفضلة")], ["/contact", t("Contact Us", "تواصل معنا")],
        ].map(([href, label]) => <Link key={href} to={href} aria-current={active(href) ? "page" : undefined} onClick={close}>{label}</Link>)}
      </nav>
      <div id="header-tools" className={styles.tools}>
        <div className={styles.preferences} role="group" aria-label={t("Language and preferences", "اللغة والتفضيلات")}>
          <LanguageSelector />
          <TravelPreferences />
        </div>
        <div className={styles.icons}>
          <Link to="/notifications" onClick={close} aria-label={t("Notifications", "الإشعارات")} title={t("Notifications", "الإشعارات")}><Icon name="bell" /></Link>
          <Link to="/booking/summary" onClick={close} aria-label={t("Booking summary", "ملخص الحجز")} title={t("Booking summary", "ملخص الحجز")}><Icon name="cart" /></Link>
          {demoSessionActive ? <Popover key={navigationKey} triggerClassName={styles.profileTrigger} panelClassName={styles.accountPanel} label={t("Account menu", "قائمة الحساب")} trigger={<Icon name="personFilled" />}>
          {identity && <p className={styles.accountIdentity}><strong>{identity.user.name}</strong><span>{identity.company.name}</span></p>}
          {[
            ["/profile", t("My Profile", "ملفي الشخصي")],
            ["/bookings", t("My Bookings", "حجوزاتي")], ["/car-rental/bookings", t("My Rentals", "تأجيراتي")], ["/tickets", t("My Tickets", "تذاكري")],
            ["/invoices", t("Invoices", "الفواتير")], ["/accounting-review", t("Accounting Review", "مراجعة الحسابات")],
            ["/wallet", t("Wallet", "المحفظة")], ["/transactions", t("Transactions", "المعاملات")],
            ["/account/settings", t("Account Settings", "إعدادات الحساب")],
          ].map(([href, label]) => <Link key={href} to={href} onClick={close}>{label}</Link>)}
          <button type="button" onClick={endSession}>{t("Sign Out", "تسجيل الخروج")}</button>
        </Popover> : <Link to="/welcome" onClick={close} aria-label={t("Agency account", "حساب الوكالة")}><Icon name="personFilled" /></Link>}
        </div>
        {!demoSessionActive && <div className={styles.guest}>
          <Link to="/register/agency/company" onClick={close}>{t("Register", "تسجيل وكالة")}</Link>
          <Link to="/login" onClick={close}>{t("Sign In", "تسجيل الدخول")}</Link>
        </div>}
      </div>
      </div>
    </header>
  );
}
