import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Icon, type IconName } from "@/components/ui/icon";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { apiAuthEnabled } from "@/features/auth/auth-config";
import { LanguageSelector } from "@/features/localization/language-selector";
import { useLocale } from "@/features/localization/locale-provider";

const benefits: [IconName, string][] = [
  ["buildingFilled", "Handpicked Hotels"],
  ["car", "Car Rental for Agencies"],
  ["priceDown", "Competitive Prices"],
  ["check", "A Clear Booking Journey"],
];

export function RegistrationShell({ children }: { children: ReactNode }) {
  const { t, locale } = useLocale();
  return (
    <main lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className="registration-page">
      <div className="registration-frame">
        <aside className="registration-aside" aria-labelledby="registration-aside-title">
          <ResponsiveImage className="registration-aside__image" src="/images/welcome/resort-aerial.jpg" alt="" width={1600} height={1067} sizes="(max-width: 1099px) 1px, 1350px" />
          <div className="registration-aside__copy">
            <p className="registration-aside__eyebrow">{t("ROYAL VACATION · PARTNER PROGRAMME")}</p>
            <h2 id="registration-aside-title">{t("Why Partner with us")}</h2>
            <ul>
              {benefits.map(([icon, label]) => <li key={label}><span aria-hidden="true"><Icon name={icon} /></span>{t(label)}</li>)}
            </ul>
          </div>
        </aside>
        <div className="registration-content">
          <header className="registration-header">
            <div className="registration-header__bar">
              <BrandLogo withName variant="auth" />
              <LanguageSelector />
            </div>
            <h1>{t("New Travel Agency Registration")}</h1>
            <p>{t("Tell us about your company to become a partner.")}</p>
            <p className="fine-print">
              {apiAuthEnabled
                ? t("Royal Vacation reviews every registration before sign-in is enabled.")
                : t("Frontend preview only. No agency account is created.")}
            </p>
            <nav className="registration-account-nav" aria-label={t("Registration account navigation")}>
              <Link to="/login">{t("Sign In")}</Link>
              <span aria-hidden="true">·</span>
              <Link to="/welcome">{t("Back to welcome")}</Link>
            </nav>
          </header>
          {children}
        </div>
      </div>
    </main>
  );
}
