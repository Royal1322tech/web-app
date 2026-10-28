import { hotelDisplayName} from "../lib/presentation";
import { stayQuery } from "../lib/stay-query";
import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import { ResponsiveImage as Image } from "@/components/ui/responsive-image";
import { Link } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { hotels } from "../data/hotels.fixture";
import styles from "../hotels.module.css";
import { hotelDisplayRate } from "../lib/display-rate";
export function RecommendedHotels({
  criteria,
}: {
  criteria?: HotelSearchCriteria;
}) {
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
              alt={t("Hotel photograph", "صورة فندق")}
              width={286}
              height={index % 2 ? 190 : 185}
              sizes="(max-width: 599px) min(286px, calc(100vw - 62px)), 286px"
            />
            <h3>
              <Link
                to={`/hotels/${hotel.id}${criteria ? `?${stayQuery({ ...criteria, destination: hotel.city.en })}` : ""}`}
              >
                {hotelDisplayName(hotel.name[locale])}
              </Link>
            </h3>
            <p className={styles.muted}>{hotel.city[locale]}</p>
            <strong className={styles.rate}>
              {hotelDisplayRate(hotel).basis === "offer" && <small className={styles.ratePrefix}>{t("From", "من")}</small>}
              <bdi>${hotelDisplayRate(hotel).amount}</bdi>
            </strong>
            <p className={styles.muted}>
              {hotelDisplayRate(hotel).basis === "offer"
                ? t("Lowest available nightly rate · USD", "أقل سعر متاح لليلة · دولار")
                : t("Listed nightly rate · USD", "السعر المدرج لليلة · دولار")}
            </p>
            <Link
              to={`/hotels/${hotel.id}${criteria ? `?${stayQuery({ ...criteria, destination: hotel.city.en })}` : ""}`}
              className={styles.secondary}
            >
              {t("View hotel", "عرض الفندق")}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
