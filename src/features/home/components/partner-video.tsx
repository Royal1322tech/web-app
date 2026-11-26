import { useLocale } from "@/features/localization/locale-provider";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import styles from "./partner-benefits.module.css";

/**
 * Visual for "Built for Travel Partners": the owner-supplied photograph `partner-travel.png`
 * (docs/partner-section-upgrade.md). The earlier looping clip was an iStock preview carrying the
 * iStock watermark and no verified licence, so it is no longer used or published.
 */
export function PartnerVideo() {
  const { t } = useLocale();
  return (
    <div className={styles.visual} data-partner-video>
      <ResponsiveImage className={styles.photograph} src="/images/home/partner-travel.png" alt={t("Coastal travel scene", "مشهد سفر ساحلي")} width={642} height={611} />
      <div className={styles.badge}>{t("Built for Travel Partners", "مصممة لشركاء السفر")}</div>
    </div>
  );
}
