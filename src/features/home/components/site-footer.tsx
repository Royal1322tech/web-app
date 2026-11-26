import { agencyProfileVisible } from "@/app/hidden-features";
import { Link } from "react-router-dom";
import { useAppSessionActive } from "@/features/auth/app-session";
import {  } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Icon, type IconName } from "@/components/ui/icon";
import { Text, useLocale } from "@/features/localization/locale-provider";
import styles from "../home.module.css";

const links: { route: "/car-rental" | "/search" | "/agency" | "/profile" | "/login"; icon: IconName; en: string; ar: string }[] = [
  { route: "/search", icon: "building", en: "Discover Hotels", ar: "اكتشف الفنادق" },
  { route: "/car-rental", icon: "car", en: "Car Rental", ar: "تأجير السيارات" },
  // Agency Profile is hidden for now: the workspace entry opens My Profile.
  { route: agencyProfileVisible ? "/agency" : "/profile", icon: "building", en: "Agency Workspace", ar: "مساحة الوكالة" },
  { route: "/login", icon: "user", en: "Partner Access", ar: "دخول الشركاء" },
];

/* Store names only, never the stores' logos: those are licensed for apps that are already listed. */
const stores = [
  { name: "App Store", en: "Coming to the", ar: "سيتوفر على" },
  { name: "Google Play", en: "Coming to", ar: "سيتوفر على" },
] as const;

export function SiteFooter() {
  const { t } = useLocale();
  const signedIn = useAppSessionActive();
  const hotelRoute = signedIn ? "/search" : "/login";
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <section className={styles.footerCta} aria-labelledby="footer-cta-title">
        <div>
          <p className={styles.footerEyebrow}><Text en="ROYAL VACATION · B2B TRAVEL" ar="رويال فاكيشن · سفر الأعمال" /></p>
          <h2 id="footer-cta-title"><Text en="Your next journey starts here." ar="رحلتك القادمة تبدأ من هنا." /></h2>
          <p><Text en="Everything your agency needs, in one workspace." ar="كل ما تحتاجه وكالتك، في مساحة عمل واحدة." /></p>
        </div>
        <Link className={styles.footerCtaButton} to={hotelRoute}>
          <Text en="Explore Hotels" ar="استكشف الفنادق" />
          <Icon name="arrowRight" />
        </Link>
      </section>

      <div className={styles.footerContent}>
        <div className={styles.footerBrand}>
          <Link to="/" className={styles.footerLogo} aria-label={t("Royal Vacation home", "الرئيسية — رويال فاكيشن")}>
            <BrandLogo withName variant="footer" />
          </Link>
          <p><Text en="Thoughtful travel. Lasting partnerships." ar="سفر مدروس. شراكات دائمة." /></p>
          <p><Text en="A smarter workspace for travel professionals to discover and manage journeys." ar="مساحة أذكى لمتخصصي السفر لاكتشاف الرحلات وإدارتها." /></p>
        </div>

        <nav aria-label={t("Explore", "استكشف")}>
          <h3>{t("Explore", "استكشف")}</h3>
          {links.map(({ route, icon, en, ar }) => {
            const to = signedIn || route === "/login" ? route : "/login";
            // Guests sign in first, then continue to the page they chose.
            return (
              <Link key={route} to={to} state={!signedIn && route !== "/login" ? { from: route } : undefined}>
                <Icon name={icon} />
                <span><Text en={en} ar={ar} /></span>
                <Icon name="arrowRight" />
              </Link>
            );
          })}
        </nav>

        <section className={styles.footerContacts}>
          <h3>{t("Get in touch", "تواصل معنا")}</h3>
          <a href="https://wa.me/201070724143" target="_blank" rel="noopener noreferrer" aria-label={t("WhatsApp: +20 107 072 4143", "واتساب: +20 107 072 4143")}><Icon name="whatsapp" /><bdi>+20 107 072 4143</bdi></a>
          <a href="mailto:royal.travel@royalvacation.online" aria-label={t("Email Royal Vacation", "راسل رويال فاكيشن")}><Icon name="mail" /><bdi>royal.travel@royalvacation.online</bdi></a>
        </section>

        <section className={styles.footerApps} aria-labelledby="footer-apps-title">
          <div className={styles.appsHeading}>
            <h3 id="footer-apps-title">{t("Get the Royal Vacation App", "احصل على تطبيق رويال فاكيشن")}</h3>
          </div>
          <p><Text en="Plan, book and follow every client journey from your phone. Our iOS and Android apps are on the way." ar="خطط واحجز وتابع كل رحلة لعملائك من هاتفك. تطبيقاتنا على iOS و Android في الطريق." /></p>
          {/* Not links: there are no store listings yet. Official store badges replace these once the apps are published. */}
          <ul className={styles.storeBadges} aria-label={t("App stores, not available yet", "متاجر التطبيقات، غير متاحة بعد")}>
            {stores.map(({ name, en, ar }) => (
              <li key={name} className={styles.storeBadge}>
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
                  <path d="M10.5 5.5h3M12 9.5v6m-2.5-2.5L12 15.5l2.5-2.5" />
                </svg>
                <span>
                  <small>{t(en, ar)}</small>
                  <strong><bdi>{name}</bdi></strong>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className={styles.footerBottom}>
        <small>{t(`© ${year} Royal Vacation. All rights reserved.`, `© ${year} رويال فاكيشن. جميع الحقوق محفوظة.`)}</small>
      </div>
      <svg className={styles.footerWave} viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 75 Q360 0 720 75 T1440 75 V120 H0Z" fill="#087e8b" fillOpacity=".16" /><path d="M0 100 Q400 35 800 90 T1440 60" fill="none" stroke="#e4b86a" strokeOpacity=".28" /></svg>
    </footer>
  );
}
