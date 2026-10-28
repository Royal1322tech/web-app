import { Link } from "react-router-dom";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { useLocale } from "@/features/localization/locale-provider";
import { StatusBadge, useMoney } from "@/features/demo/shared";
import type { DemoBooking } from "@/features/demo/types";
import { normalizeHotelStarClassification } from "@/features/hotels/lib/hotel-rating";
import { hotelDisplayAddress, hotelDisplayName } from "@/features/hotels/lib/presentation";
import type { HotelListing } from "@/features/hotels/types";
import { formatCalendarDate } from "@/lib/format-date";
import styles from "./booking-record-card.module.css";

function nights(checkIn: string, checkOut: string) {
  const days = Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000);
  return Number.isFinite(days) && days > 0 ? days : undefined;
}

/** A booking record in My Bookings: reference and status first, then the stay, then booking actions. */
export function BookingRecordCard({ booking, hotel, eager }: { booking: DemoBooking; hotel: HotelListing; eager?: boolean }) {
  const { t, locale } = useLocale();
  const money = useMoney();
  const photo = hotel.photos[0];
  const stayNights = nights(booking.checkIn, booking.checkOut);
  const stars = normalizeHotelStarClassification(hotel.stars);
  const traveller = locale === "ar" ? `مسافر تجريبي ${booking.id}` : booking.traveller;

  return (
    <article className={styles.bookingCard} aria-labelledby={`booking-${booking.id}`}>
      <div className={styles.cover}>
        <ResponsiveImage
          src={photo.src}
          alt={photo.label[locale]}
          width={photo.width}
          height={photo.height}
          sizes="(max-width: 599px) 96px, 160px"
          eager={eager}
        />
      </div>
      <div className={styles.body}>
        <div className={styles.header}>
          <div>
            <small className={styles.label}>{t("Booking reference", "مرجع الحجز")}</small>
            <h2 id={`booking-${booking.id}`} className={styles.reference}><bdi>{booking.id}</bdi></h2>
          </div>
          <div className={styles.status}>
            <StatusBadge status={booking.status} />
            <span className={styles.localStatus}>{t("Local preview", "معاينة محلية")}</span>
          </div>
        </div>
        <div className={styles.hotel}>
          <p className={styles.hotelName}>{hotelDisplayName(hotel.name[locale])}</p>
          <p className={styles.muted}>{hotelDisplayAddress(hotel.address[locale], locale)}</p>
          {stars && (
            <span className={styles.stars} role="img" aria-label={t(`${stars}-star hotel classification`, `تصنيف الفندق ${stars} نجوم`)}>
              <span aria-hidden="true">{"★".repeat(stars)}</span>
            </span>
          )}
        </div>
        <dl className={styles.facts}>
          <div>
            <dt>{t("Stay", "الإقامة")}</dt>
            <dd>
              <time dateTime={booking.checkIn}><bdi>{formatCalendarDate(booking.checkIn, locale)}</bdi></time>
              <span aria-hidden="true"> – </span>
              <time dateTime={booking.checkOut}><bdi>{formatCalendarDate(booking.checkOut, locale)}</bdi></time>
              {stayNights && <span className={styles.muted}> · {t(`${stayNights} nights`, `${stayNights} ليالٍ`)}</span>}
            </dd>
          </div>
          <div>
            <dt>{t("Traveller", "المسافر")}</dt>
            <dd>{traveller}</dd>
          </div>
          <div>
            <dt>{t("Agency Reference", "مرجع الوكالة")}</dt>
            <dd><bdi>{booking.agencyReference}</bdi></dd>
          </div>
          <div>
            <dt>{t("Booking total", "إجمالي الحجز")}</dt>
            <dd className={styles.total}><bdi>{money(booking.total)}</bdi></dd>
          </div>
        </dl>
        <div className={styles.actions}>
          <Link to={`/bookings/${booking.id}`} className="button button--primary">
            {t("Manage booking", "إدارة الحجز")}
          </Link>
          {booking.status === "confirmed" && (
            <Link to={`/bookings/${booking.id}/voucher`} className="button button--outline">
              {t("View voucher", "عرض القسيمة")}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
