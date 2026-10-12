import { ResponsiveImage as Image } from "@/components/ui/responsive-image";
import { Link } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { hotels } from "../data/hotels.fixture";
import styles from "../hotels.module.css";
export function RecommendedHotels() {
  const { locale, t } = useLocale();
  return (
    <section className={styles.detailSection}>
      <h2>{t("Hotels You May Like", "فنادق قد تعجبك")}</h2>
      <div className={styles.recommended}>
        {hotels.map((hotel, index) => (
          <article key={hotel.id} className={styles.recommendation}>
            <Image
              src={
                index % 2
                  ? "/images/home/hotel-pool.png"
                  : "/images/home/hotel-lobby.png"
              }
              alt={t("Sample hotel photograph", "صورة فندق تجريبية")}
              width={286}
              height={index % 2 ? 190 : 185}
              sizes="(max-width: 599px) min(286px, calc(100vw - 62px)), 286px"
            />
            <h3>
              <Link to={`/hotels/${hotel.id}`}>{hotel.name[locale]}</Link>
            </h3>
            <p className={styles.muted}>{hotel.city[locale]}</p>
            <strong className={styles.rate}>${hotel.nightlyRate}</strong>
            <p className={styles.muted}>
              {t(
                "Sample nightly rate · availability pending",
                "سعر تجريبي لليلة · التوافر غير متاح",
              )}
            </p>
            <Link to={`/hotels/${hotel.id}`} className={styles.secondary}>
              {t("View hotel", "عرض الفندق")}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
