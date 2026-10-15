import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/brand-logo";
import { Icon, type IconName } from "@/components/ui/icon";
import { ResponsiveImage } from "@/components/ui/responsive-image";
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
              <img className={badges.google} src="/images/app-badges/google-play.png" alt="GET IT ON Google Play — unavailable" width="646" height="250" loading="lazy" />
              <img className={badges.apple} src="/images/app-badges/app-store.svg" alt="Download on the App Store — unavailable" width="135" height="40" loading="lazy" />
            </div>
          </div>
        <nav aria-label={t("Footer", "روابط التذييل")}>
          <h3>{t("Quick links", "روابط سريعة")}</h3>
          {links.map(({ to, icon, en, ar }) => (
            <Link key={to} to={to}>
              <Icon name={icon} />
              <span><Text en={en} ar={ar} /></span>
            </Link>
          ))}
        </nav>
        <p className={styles.footerNotice}>
          <Text en="Frontend demonstration · No live reservations or transactions" ar="عرض توضيحي · لا توجد حجوزات أو معاملات فعلية" />
        </p>
      </div>
      <ResponsiveImage src="/images/home/footer-illustration.png" alt="" aria-hidden="true" width={1440} height={671} sizes="(max-width:1440px) 100vw, 1440px" />
    </footer>
  );
}
