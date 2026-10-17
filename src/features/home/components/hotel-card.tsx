import { hotelDisplayName } from "@/features/hotels/lib/presentation";
import { PointsIndicator } from "./points-indicator";
import { ResponsiveImage as Image } from "@/components/ui/responsive-image";
import { Icon } from "@/components/ui/icon";
import { useHotelPreferences } from "@/features/preferences/use-hotel-preferences";
import type { IconName } from "@/components/ui/icon";
import type { Hotel } from "../types";
import { Link } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import styles from "../home.module.css";

export function HotelCard({
  hotel,
  compact = false,
  duplicate = false,
}: {
  hotel: Hotel;
  compact?: boolean;
  duplicate?: boolean;
}) {
  const { t, locale } = useLocale();
  const favourites = useHotelPreferences("favourites");
  const amenityIcons: Record<string, IconName> = {
    Pool: "pool",
    Gym: "gym",
    Food: "food",
    Spa: "spa",
  };
  return (
    <article
      className={`${styles.hotelCard} ${compact ? styles.compactCard : ""}`}
    >
      <div className={styles.cardImage}>
        <Image
          src={hotel.image}
          alt={`${hotelDisplayName(t(hotel.name))} — ${t("Hotel photograph", "صورة فندق")}`}
          width={compact ? 286 : 386}
          height={compact ? (hotel.image.includes("lobby") ? 185 : 190) : 258}
          sizes={
            compact
              ? "(max-width: 600px) 90vw, (max-width: 1000px) 44vw, 300px"
              : "(max-width: 700px) 85vw, (max-width: 1000px) 44vw, 400px"
          }
        />
        {!compact && (
          <button
            type="button"
            className={styles.favouriteButton}
            tabIndex={duplicate ? -1 : undefined}
            aria-label={t(
              `Favourite: ${hotelDisplayName(t(hotel.name))} — ${t(hotel.city)}`,
              `المفضلة: ${hotelDisplayName(hotel.nameAr ?? t(hotel.name))} — ${t(hotel.city)}`,
            )}
            aria-pressed={favourites.ids.includes(hotel.id)}
            onClick={() => favourites.toggle(hotel.id)}
          >
            <Icon
              name="heart"
              fill={favourites.ids.includes(hotel.id) ? "currentColor" : "none"}
            />
          </button>
        )}
      </div>
      <div className={styles.hotelTitle}>
        <h3>{hotelDisplayName(t(hotel.name, hotel.nameAr))}</h3>
        {!compact && (
          <span
            aria-label={t(
              `Rating ${hotel.rating} out of 5`,
              `التقييم ${hotel.rating} من ٥`,
            )}
          >
            <Icon name="star" />
            {hotel.rating}
          </span>
        )}
      </div>
      <p className={styles.address}>
        <Icon name="pin" />
        {locale === "ar" ? `${t(hotel.city)}، مصر` : hotel.address}
      </p>
      {compact ? (
        <>
          <span className={styles.offer}>{t("Nightly rate", "السعر لليلة")}</span>
          <p className={styles.rate}>
            <strong>${hotel.nightlyRate}</strong>{" "}
            {t("USD / night", "دولار / ليلة")}
          </p>
          <p className={styles.smallCopy}>
            {t("Dates and availability pending")}
          </p>
        </>
      ) : (
        <>
          <p className={styles.hotelDescription}>{t(hotel.description)}</p>
          {hotel.duration && (
            <p className={styles.duration}>
              <Icon name="calendar" />
              {t(
                `${hotel.duration.nights} Nights, ${hotel.duration.days} Days`,
                `${hotel.duration.nights} ليالٍ، ${hotel.duration.days} أيام`,
              )}
            </p>
          )}
          <p className={styles.featuresLabel}>{t("Features:")}</p>
          <ul className={styles.amenities}>
            {hotel.amenities.map((amenity) => (
              <li key={amenity}>
                <Icon name={amenityIcons[amenity] ?? "check"} />
                {t(amenity)}
              </li>
            ))}
          </ul>
        </>
      )}
      <div className={styles.cardBottom}>
        <Link
          tabIndex={duplicate ? -1 : undefined}
          to={hotel.detailsHref ?? (
            `/search?destination=${encodeURIComponent(hotel.city)}`
          )}
          className={compact ? styles.arrowButton : styles.primaryButton}
          aria-label={
            compact
              ? t(
                  `View ${hotelDisplayName(t(hotel.name))} offer`,
                  `عرض ${hotelDisplayName(hotel.nameAr ?? t(hotel.name))}`,
                )
              : undefined
          }
        >
          {compact ? (
            <span aria-hidden="true">›</span>
          ) : (
            t("Explore hotels", "استكشف الفنادق")
          )}
        </Link>
        {!compact && (
          <p className={styles.rate}>
            <strong>${hotel.nightlyRate}</strong> {t("/ night", "/ ليلة")}
          </p>
        )}
      </div>
      {!compact && <PointsIndicator />}
    </article>
  );
}
