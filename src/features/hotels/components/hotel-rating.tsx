import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import { normalizeHotelStarClassification } from "../lib/hotel-rating";
import styles from "../hotels.module.css";

export function HotelRating({ stars, reviewScore }: { stars?: number | null; reviewScore?: number | null }) {
  const { t, locale } = useLocale();
  const classification = normalizeHotelStarClassification(stars);
  return (
    <div className={styles.hotelRating}>
      {classification ? (
        <span className={styles.starClassification} role="img" aria-label={t(`${classification}-star hotel classification`, `تصنيف الفندق ${classification} نجوم`)}>
          <span aria-hidden="true">{"★".repeat(classification)}</span>
          <small>{t("Hotel category", "فئة الفندق")}</small>
        </span>
      ) : (
        <span className={styles.unrated}>{t("Star category not supplied", "تصنيف النجوم غير متوفر")}</span>
      )}
      {typeof reviewScore === "number" && Number.isFinite(reviewScore) && reviewScore >= 0 ? (
        <span className={styles.reviewScore} role="img" aria-label={`${t("Guest score", "تقييم النزلاء")} ${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(reviewScore)} / 5`}>
          <Icon name="star" />
          <bdi>{new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(reviewScore)}</bdi>
          <small>{t("Guest score / 5", "تقييم النزلاء / ٥")}</small>
        </span>
      ) : (
        <span className={styles.unrated}>{t("No guest score", "لا يوجد تقييم للنزلاء")}</span>
      )}
    </div>
  );
}
