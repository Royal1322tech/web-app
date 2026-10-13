import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/brand-logo";
import { Icon, type IconName } from "@/components/ui/icon";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { Text, useLocale } from "@/features/localization/locale-provider";
import styles from "../home.module.css";

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
        <nav aria-label={t("Footer", "روابط التذييل")}>
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
