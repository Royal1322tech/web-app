import { Link } from "react-router-dom";
import { useAppSessionActive } from "@/features/auth/app-session";
import {  } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Icon, type IconName } from "@/components/ui/icon";
import { Text, useLocale } from "@/features/localization/locale-provider";
import styles from "../home.module.css";

const links: { route: "/car-rental" | "/search" | "/agency" | "/login"; icon: IconName; en: string; ar: string }[] = [
  { route: "/search", icon: "building", en: "Discover Hotels", ar: "اكتشف الفنادق" },
  { route: "/car-rental", icon: "car", en: "Car Rental", ar: "تأجير السيارات" },
  { route: "/agency", icon: "building", en: "Agency Workspace", ar: "مساحة الوكالة" },
  { route: "/login", icon: "user", en: "Partner Access", ar: "دخول الشركاء" },
];

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
            return (
              <Link key={route} to={to}>
                <Icon name={icon} />
                <span><Text en={en} ar={ar} /></span>
                <Icon name="arrowRight" />
              </Link>
            );
          })}
        </nav>

        <section className={styles.footerContacts}>
          <h3>{t("Get in touch", "تواصل معنا")}</h3>
          <a href="https://wa.me/201070724143" target="_blank" rel="noopener noreferrer" aria-label={t("WhatsApp: +20 01070724143", "واتساب: +20 01070724143")}><Icon name="whatsapp" /><bdi>+20 01070724143</bdi></a>
          <a href="mailto:royal.travel@royalvacation.online" aria-label={t("Email Royal Vacation", "راسل رويال فاكيشن")}><Icon name="mail" /><bdi>royal.travel@royalvacation.online</bdi></a>
        </section>

        <section className={styles.footerApps} aria-labelledby="footer-apps-title">
          <h3 id="footer-apps-title">{t("Mobile Experience", "تجربة الهاتف المحمول")}</h3>
          <span className={styles.comingSoon}>{t("Coming Soon", "قريبًا")}</span>
          <p><Text en="Our iOS and Android apps are in development." ar="تطبيقاتنا لنظامي iOS وAndroid قيد التطوير." /></p>
          <span className={styles.platforms} aria-label={t("iOS and Android", "iOS وAndroid")}>iOS <span aria-hidden="true">·</span> Android</span>
        </section>
      </div>

      <div className={styles.footerBottom}>
        <small>{t(`© ${year} Royal Vacation. All rights reserved.`, `© ${year} رويال فاكيشن. جميع الحقوق محفوظة.`)}</small>
      </div>
      <svg className={styles.footerWave} viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 75 Q360 0 720 75 T1440 75 V120 H0Z" fill="#087e8b" fillOpacity=".16" /><path d="M0 100 Q400 35 800 90 T1440 60" fill="none" stroke="#e4b86a" strokeOpacity=".28" /></svg>
    </footer>
  );
}
