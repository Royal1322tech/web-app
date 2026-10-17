import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/brand-logo";
import { Icon, type IconName } from "@/components/ui/icon";
import { Text, useLocale } from "@/features/localization/locale-provider";
import styles from "../home.module.css";
import badges from "./app-store-badges.module.css";

const links: { to: string; icon: IconName; en: string; ar: string }[] = [
  { to: "/car-rental", icon: "car", en: "Car Rental", ar: "تأجير السيارات" },
  { to: "/search", icon: "building", en: "Discover hotels", ar: "اكتشف الفنادق" },
  { to: "/agency", icon: "building", en: "Agency workspace", ar: "مساحة الوكالة" },
  { to: "/welcome", icon: "user", en: "Partner access", ar: "دخول الشركاء" },
];

export function SiteFooter() {
  const { t } = useLocale();
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerBrand}>
          <Link to="/" className={styles.footerLogo} aria-label={t("Royal Vacation home", "الرئيسية — رويال فاكيشن")}>
            <BrandLogo withName variant="footer" />
          </Link>
          <p><Text en="Thoughtful travel. Lasting partnerships." ar="سفر مدروس. شراكات دائمة." /></p>
          <p><Text en="A shared workspace for travel agencies to explore stays and plan their clients’ journeys." ar="مساحة مشتركة لوكالات السفر لاستكشاف الإقامات والتخطيط لرحلات عملائها." /></p>
        </div>
        <section className={styles.footerContacts}>
          <h3>{t("Contact us", "تواصل معنا")}</h3>

            <a href="https://wa.me/201070724143" target="_blank" rel="noopener noreferrer" aria-label={t("WhatsApp: +20 01070724143", "واتساب: +20 01070724143")}><Icon name="whatsapp" /><bdi>+20 01070724143</bdi></a>
            <a href="mailto:royal.travel@royalvacation.online"><Icon name="mail" /><bdi>royal.travel@royalvacation.online</bdi></a>
        </section>
          <div className={badges.apps}>
            <h3>{t("Our mobile apps", "تطبيقاتنا للهواتف")}</h3>
            <p>{t("Coming Soon — downloads unavailable.", "قريبًا — التنزيل غير متاح.")}</p>
            <div className={badges.row} aria-label={t("App store previews — downloads unavailable", "معاينة متاجر التطبيقات — التنزيل غير متاح")}>
              <img className={badges.google} src="/images/app-badges/google-play.png" alt={t("Google Play — coming soon", "جوجل بلاي — قريبًا")} width="646" height="250" loading="lazy" />
              <img className={badges.apple} src="/images/app-badges/app-store.svg" alt={t("App Store — coming soon", "آب ستور — قريبًا")} width="135" height="40" loading="lazy" />
            </div>
          </div>
        <nav aria-label={t("Footer", "روابط التذييل")}>
          <h3>{t("Quick links", "روابط سريعة")}</h3>
          {links.map(({ to, icon, en, ar }) => (
            <Link key={to} to={to}>
              <Icon name={icon} />
              <span><Text en={en} ar={ar} /></span>
              <Icon name="arrowRight" />
            </Link>
          ))}
        </nav>
      </div>
      <svg className={styles.footerWave} viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 75 Q360 0 720 75 T1440 75 V120 H0Z" fill="#087e8b" fillOpacity=".16" /><path d="M0 100 Q400 35 800 90 T1440 60" fill="none" stroke="#e4b86a" strokeOpacity=".28" /></svg>
    </footer>
  );
}
