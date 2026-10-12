import { useState } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { BrandLogo } from "@/components/brand-logo";
import { Icon } from "@/components/ui/icon";
import { UnavailableButton } from "./unavailable-button";
import styles from "../home.module.css";

export function SiteHeader({ standalone = false }: { standalone?: boolean }) {
  const { t, locale, setLocale } = useLocale();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header
      className={`${styles.header} ${standalone ? styles.standaloneHeader : ""}`}
    >
      <Link
        to="/"
        aria-label={t("Royal Vacation home", "رويال فاكيشن الرئيسية")}
        className={styles.brand}
      >
        <BrandLogo withName />
      </Link>
      <button
        type="button"
        className={styles.menuToggle}
        aria-label={
          menuOpen
            ? t("Close navigation", "إغلاق القائمة")
            : t("Open navigation", "فتح القائمة")
        }
        aria-expanded={menuOpen}
        aria-controls="home-navigation"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <Icon name={menuOpen ? "close" : "menu"} />
      </button>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Escape bubbles from navigation controls to close the mobile menu. */}
      <nav
        id="home-navigation"
        aria-label={t("Main navigation", "التنقل الرئيسي")}
        className={`${styles.navigation} ${menuOpen ? styles.navigationOpen : ""}`}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setMenuOpen(false);
            document
              .querySelector<HTMLButtonElement>(
                `[aria-controls="home-navigation"]`,
              )
              ?.focus();
          }
        }}
      >
        {[
          ["/", t("Home", "الرئيسية")],
          ["/search", t("Search", "بحث")],
          ["/bookings", t("Booking", "الحجوزات")],
        ].map(([href, label]) => (
          <Link
            key={href}
            to={href}
            aria-current={pathname === href ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            {label}
          </Link>
        ))}
        <UnavailableButton>{t("Quotes", "عروض الأسعار")}</UnavailableButton>
        <Link
          to="/favourites"
          aria-current={pathname === "/favourites" ? "page" : undefined}
          onClick={() => setMenuOpen(false)}
        >
          {t("Favourites", "المفضلة")}
        </Link>
      </nav>
      <div className={styles.headerActions}>
        <label className={styles.currency}>
          <span className="sr-only">{t("Language", "اللغة")}</span>
          <select
            aria-label={t("Language", "اللغة")}
            value={locale}
            onChange={(event) =>
              setLocale(event.target.value === "ar" ? "ar" : "en")
            }
          >
            <option value="en">EN</option>
            <option value="ar">AR</option>
          </select>
        </label>
        <div className={styles.accountActions}>
          <UnavailableButton label={t("Notifications", "الإشعارات")}>
            <Icon name="bell" />
          </UnavailableButton>
          <UnavailableButton label={t("Shopping cart", "سلة التسوق")}>
            <Icon name="cart" />
          </UnavailableButton>
          <Link to="/welcome" aria-label={t("Agency account", "حساب الوكالة")}>
            <Icon name="personFilled" />
          </Link>
        </div>
      </div>
    </header>
  );
}
