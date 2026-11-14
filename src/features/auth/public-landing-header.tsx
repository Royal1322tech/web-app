import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BrandLogo } from "@/components/brand-logo";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import { LanguageSelector } from "@/features/localization/language-selector";
import styles from "./public-landing-page.module.css";

export function PublicLandingHeader() {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const onLanding = pathname === "/login";
  // The sign-in code step shares the landing layout: the bar floats over its hero.
  const overHero = onLanding || pathname === "/login/verify-otp";
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  // The phone menu is a panel over the page: Escape or a tap outside the header closes it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButton.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  return (
    <header ref={header} className={`${styles.header} ${overHero ? "" : styles.headerCompact}`}>
      <Link to="/login" aria-label={t("Royal Vacation home", "الرئيسية — رويال فاكيشن")} onClick={closeMenu}>
        <BrandLogo withName />
      </Link>
      <button ref={menuButton} className={styles.menuButton} type="button" aria-expanded={menuOpen} aria-controls="public-navigation" aria-label={menuOpen ? t("Close navigation", "إغلاق القائمة") : t("Open navigation", "فتح القائمة")} onClick={() => setMenuOpen(!menuOpen)}>
        <Icon name={menuOpen ? "close" : "menu"} />
      </button>
      <nav id="public-navigation" className={`${styles.navigation} ${menuOpen ? styles.navigationOpen : ""}`} aria-label={t("Main navigation", "التنقل الرئيسي")}>
        <Link to={onLanding ? "#products" : "/login#products"} onClick={closeMenu}>{t("Our Products", "منتجاتنا")}</Link>
        <Link to={onLanding ? "#why-royal-vacation" : "/login#why-royal-vacation"} onClick={closeMenu}>{t("Why Royal Vacation", "لماذا رويال فاكيشن")}</Link>
        <Link to="/contact" aria-current={pathname === "/contact" ? "page" : undefined} onClick={closeMenu}>{t("Contact Us", "تواصل معنا")}</Link>
        <LanguageSelector />
      </nav>
    </header>
  );
}
