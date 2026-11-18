import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import type { B2BHotel, B2BHotelSearchResult } from "../api/b2b-hotel-search";
import { bookingAllowed, breakfastAvailability, hotelImageUrl, mealLabel, roomOptions, verifiedPrice } from "../lib/live-hotels";
import styles from "./live-hotel-card.module.css";

type ResultFlags = Pick<B2BHotelSearchResult, "pricingVerified" | "bookingEnabled" | "currency">;

/**
 * A hotel from the B2B search, showing only what the API returned. Missing fields are left out or
 * labelled as missing; nothing is filled in. There is no details link and no booking action, because
 * no details endpoint, stable hotel ID or booking flow exists yet.
 */
/** The rooms action: a link when the hotel has a real hid, a short note when it doesn't. */
export type RoomsAction = { href: string; state: unknown } | "unavailable";

export function LiveHotelCard({ hotel, result, variant = "full", eager = false, rooms }: {
  /** Shown on the results page only. */
  rooms?: RoomsAction;
  hotel: B2BHotel;
  result: ResultFlags;
  variant?: "full" | "compact";
  eager?: boolean;
}) {
  const { t, locale } = useLocale();
  const titleId = useId();
  const [imageFailed, setImageFailed] = useState(false);
  const image = imageFailed ? null : hotelImageUrl(hotel.image);
  const price = verifiedPrice(hotel, result);
  const options = roomOptions(hotel.rooms);
  const breakfast = breakfastAvailability(hotel.rooms);
  const stars = hotel.stars && hotel.stars > 0 ? hotel.stars : null;
  const visibleRooms = variant === "full" ? 3 : 0;
  const name = hotel.name ?? t("Hotel name not provided", "لم يُذكر اسم الفندق");
  const lang = locale === "ar" ? "ar" : "en";

  return (
    <article className={styles.card} data-variant={variant} aria-labelledby={titleId} data-live-hotel>
      <div className={styles.media}>
        {image ? (
          <img src={image} alt="" loading={eager ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />
        ) : (
          <div className={styles.placeholder} data-image-missing>
            <Icon name="buildingFilled" />
            <span>{t("No photo available", "لا تتوفر صورة")}</span>
          </div>
        )}
      </div>

      <div className={styles.body}>
        {stars !== null && (
          <p className={styles.stars} aria-label={t(`${stars}-star hotel`, `فندق ${stars} نجوم`)}>
            <span aria-hidden="true">{Array.from({ length: Math.round(stars) }, (_, index) => <Icon key={index} name="star" />)}</span>
            <span className={styles.starText} aria-hidden="true">{t(`${stars}-star`, `${stars} نجوم`)}</span>
          </p>
        )}
        <h3 id={titleId} className={styles.name} data-missing={hotel.name ? undefined : true}><bdi>{name}</bdi></h3>
        {hotel.address && (
          <p className={styles.address}><Icon name="pin" /><span><bdi>{hotel.address}</bdi></span></p>
        )}

        <ul className={styles.facts} aria-label={t("Room summary", "ملخص الغرف")}>
          <li><Icon name="bed" />{options.length
            ? t(`${options.length} room ${options.length === 1 ? "option" : "options"}`, `${options.length} ${options.length === 1 ? "خيار غرفة" : "خيارات غرف"}`)
            : t("Room details not provided", "لم تُذكر تفاصيل الغرف")}</li>
          {breakfast === "some" && <li data-tone="positive"><Icon name="food" />{t("Breakfast available", "الإفطار متاح")}</li>}
          {breakfast === "none" && <li><Icon name="food" />{t("No breakfast", "بدون إفطار")}</li>}
        </ul>

        {visibleRooms > 0 && options.length > 0 && (
          <div className={styles.rooms}>
            <ul>
              {options.slice(0, visibleRooms).map((option, index) => <RoomLine key={index} option={option} lang={lang} />)}
            </ul>
            {options.length > visibleRooms && (
              <details>
                <summary>{t(`Show ${options.length - visibleRooms} more`, `عرض ${options.length - visibleRooms} أخرى`)}</summary>
                <ul>{options.slice(visibleRooms).map((option, index) => <RoomLine key={index} option={option} lang={lang} />)}</ul>
              </details>
            )}
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <div className={styles.price}>
          {price ? (
            <>
              <small>{t("From", "من")}</small>
              <strong><bdi>{new Intl.NumberFormat(locale, { style: "currency", currency: price.currency }).format(price.amount)}</bdi></strong>
            </>
          ) : (
            <>
              <strong className={styles.noPrice}>{t("Price unavailable", "السعر غير متاح")}</strong>
              <small>{t("Prices aren't verified yet", "لم يتم التحقق من الأسعار بعد")}</small>
            </>
          )}
        </div>
        <span className={styles.status} data-bookable={bookingAllowed(hotel, result) || undefined}>
          {bookingAllowed(hotel, result)
            ? <><Icon name="check" />{t("Bookable · contact us to book", "قابل للحجز · تواصل معنا للحجز")}</>
            : <><Icon name="clock" />{t("Booking unavailable", "الحجز غير متاح")}</>}
        </span>
      </footer>
      {rooms && (
        <div className={styles.roomsAction}>
          {rooms === "unavailable" ? (
            <p className={styles.roomsUnavailable}>{t("Room rates aren't available for this hotel yet.", "أسعار الغرف غير متاحة لهذا الفندق بعد.")}</p>
          ) : (
            <Link to={rooms.href} state={rooms.state} className="button button--primary" aria-describedby={titleId}>
              {t("View rooms", "عرض الغرف")}<Icon name="arrowRight" />
            </Link>
          )}
        </div>
      )}
    </article>
  );
}

function RoomLine({ option, lang }: { option: ReturnType<typeof roomOptions>[number]; lang: "en" | "ar" }) {
  const { t } = useLocale();
  const meal = option.meal ? mealLabel(option.meal, lang) : option.breakfast === true ? t("Breakfast included", "يشمل الإفطار") : null;
  return (
    <li>
      <span className={styles.roomName}>{option.name ? <bdi>{option.name}</bdi> : t("Room type not provided", "لم يُذكر نوع الغرفة")}</span>
      {(meal || option.bedding) && (
        <span className={styles.roomMeta}>
          {meal && <bdi>{meal}</bdi>}
          {meal && option.bedding && " · "}
          {option.bedding && <bdi>{option.bedding}</bdi>}
        </span>
      )}
    </li>
  );
}

/** Loading placeholders shaped like the cards. */
export function LiveHotelCardSkeleton({ variant = "full" }: { variant?: "full" | "compact" }) {
  return (
    <div className={styles.card} data-variant={variant} data-skeleton aria-hidden="true">
      <div className={`${styles.media} ${styles.shimmer}`} />
      <div className={styles.body}>
        <span className={`${styles.line} ${styles.shimmer}`} style={{ width: "30%" }} />
        <span className={`${styles.line} ${styles.lineLg} ${styles.shimmer}`} style={{ width: "80%" }} />
        <span className={`${styles.line} ${styles.shimmer}`} style={{ width: "60%" }} />
        <span className={`${styles.line} ${styles.shimmer}`} style={{ width: "45%" }} />
      </div>
      <div className={styles.footer}><span className={`${styles.line} ${styles.shimmer}`} style={{ width: "40%" }} /></div>
    </div>
  );
}
