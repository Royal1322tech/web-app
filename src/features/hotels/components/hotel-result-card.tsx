import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import { ResponsiveImage as Image } from "@/components/ui/responsive-image";
import { Link } from "react-router-dom";
import { useId, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import { useHotelPreferences } from "@/features/preferences/use-hotel-preferences";
import type { HotelSummary } from "../types";
import type { StayDates } from "../lib/sample-stay";
import { amenityLabels } from "../data/hotels.fixture";
import { RoomOptions } from "./room-options";

import styles from "../hotels.module.css";

export function FavouriteButton({
  hotel,
}: {
  hotel: Pick<HotelSummary, "id" | "name">;
}) {
  const { locale, t } = useLocale();
  const { ids, toggle } = useHotelPreferences("favourites");
  const active = ids.includes(hotel.id);
  return (
    <button
      type="button"
      className={styles.heart}
      aria-pressed={active}
      aria-label={`${t("Favourite", "المفضلة")}: ${hotel.name[locale]}`}
      onClick={() => toggle(hotel.id)}
    >
      <Icon name="heart" fill={active ? "currentColor" : "none"} />
    </button>
  );
}
const amenityIcons: Partial<Record<keyof typeof amenityLabels, IconName>> = {
  nonSmoking: "nonSmoking",
  roomService: "bell",
  pool: "pool",
  gym: "gym",
  food: "food",
  spa: "spa",
};
export function HotelResultCard({
  hotel,
  booking,
  favourite = false,
  dates,
}: {
  hotel: HotelSummary;
  booking?: ReactNode;
  favourite?: boolean;
  dates?: StayDates & Partial<Pick<HotelSearchCriteria, "rooms">>;
}) {
  const { locale, t } = useLocale();
  const compare = useHotelPreferences("comparison");
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const href =
    hotel.detailsHref ?? ("city" in hotel ? `/hotels/${hotel.id}` : undefined);
  return (
    <div>
      <article className={styles.resultCard}>
        <div className={styles.cardBody}>
          <div className={styles.cardPhotos}>
            <div className={styles.cover}>
              <Image
                src={hotel.photos[0].src}
                alt={hotel.photos[0].label[locale]}
                width={hotel.photos[0].width}
                height={hotel.photos[0].height}
                sizes="(max-width: 599px) 100px, (max-width: 999px) 160px, 180px"
              />
              <FavouriteButton hotel={hotel} />
            </div>
            {hotel.photos.length > 1 && (
              <div className={styles.thumbnails}>
                {hotel.photos.slice(1, 4).map((photo) => (
                  <Image
                    key={photo.src}
                    src={photo.src}
                    alt=""
                    width={photo.width}
                    height={photo.height}
                    sizes="60px"
                  />
                ))}
              </div>
            )}
          </div>
          <div className={styles.cardInfo}>
            {href ? (
              <Link
                to={
                  dates
                    ? `${href}?${new URLSearchParams({ checkIn: dates.checkIn, checkOut: dates.checkOut, rooms: JSON.stringify(dates.rooms ?? [{ adults: 2, childAges: [] }]) })}`
                    : href
                }
                className={styles.hotelName}
              >
                {hotel.name[locale]}
              </Link>
            ) : (
              <h2 className={styles.hotelName}>{hotel.name[locale]}</h2>
            )}
            <p className={styles.cardAddress}>
              <Icon name="pin" />
              {hotel.address[locale]}
            </p>
            {hotel.stars !== undefined ? (
              <p
                className={styles.stars}
                aria-label={`${hotel.stars} ${t("stars", "نجوم")}`}
              >
                {"★".repeat(hotel.stars)}
                <span>{"★".repeat(5 - hotel.stars)}</span>
              </p>
            ) : (
              <p className={styles.stars}>
                <Icon name="star" /> {hotel.reviewScore} / 5{" "}
                {t("Sample review", "تقييم تجريبي")}
              </p>
            )}
            <ul className={styles.amenities}>
              {hotel.amenities.slice(0, 2).map((a) => (
                <li key={a}>
                  <Icon name={amenityIcons[a] ?? "check"} />
                  {amenityLabels[a][locale]}
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.cardActions}>
            <strong className={styles.rate}>
              <bdi>${hotel.nightlyRate}</bdi>
            </strong>
            <div className={styles.cardActionButtons}>
              {favourite && (
                <Link to={href ?? "/search"} className={styles.primary}>
                  {t("View Rooms", "عرض الغرف")}
                </Link>
              )}
              <button
                type="button"
                className={styles.secondary}
                aria-pressed={compare.ids.includes(hotel.id)}
                onClick={() => compare.toggle(hotel.id)}
              >
                {compare.ids.includes(hotel.id)
                  ? t("Selected", "تم الاختيار")
                  : t("Compare", "قارن")}
              </button>
            </div>
          </div>
        </div>
        {!favourite && (
          <div className={styles.cardFooter}>
            <div>
              {booking || (
                <>
                  <p>
                    {t("Sample room · ", "غرفة تجريبية · ")}
                    {hotel.breakfast
                      ? t("Breakfast included", "تشمل الإفطار")
                      : t("Room only", "غرفة فقط")}
                  </p>
                  <small>
                    {t(
                      "Rates and policies are illustrative",
                      "الأسعار والسياسات للعرض فقط",
                    )}
                  </small>
                </>
              )}
            </div>
            <button
              type="button"
              className={styles.primary}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen(!open)}
            >
              {t("View Rooms", "عرض الغرف")}
              <Icon
                name="chevron"
                style={{ transform: open ? "rotate(180deg)" : undefined }}
              />
            </button>
          </div>
        )}
      </article>
      {!favourite && (
        <div id={panelId} hidden={!open}>
          {open && <RoomOptions hotel={hotel} dates={dates} />}
        </div>
      )}
    </div>
  );
}
