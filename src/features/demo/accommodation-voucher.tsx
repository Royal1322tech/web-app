import { BrandLogo } from "@/components/brand-logo";
import { Icon } from "@/components/ui/icon";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { boardPlanLabels } from "@/features/hotels/lib/board-plan-definitions";
import { hotelDisplayAddress, hotelDisplayName, hotelTelephoneHref } from "@/features/hotels/lib/presentation";
import type { HotelListing, LocalizedText } from "@/features/hotels/types";
import { useLocale } from "@/features/localization/locale-provider";
import type { DemoBooking } from "./types";
import { VoucherCancellationPolicy } from "./voucher-cancellation-policy";
import "./accommodation-voucher.css";

function nights(checkIn: string, checkOut: string) {
  return Math.max(0, Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000));
}

/**
 * Printable accommodation voucher for a recorded demo booking. Shows only data present in the
 * booking and hotel records; it is not a supplier confirmation, hotel confirmation or receipt.
 */
export function AccommodationVoucher({ booking, hotel }: { booking: DemoBooking; hotel: HotelListing }) {
  const { t, locale } = useLocale();
  const text = (value?: LocalizedText) => value?.[locale];
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  const notProvided = t("Not provided", "غير متوفر");
  const phoneHref = hotelTelephoneHref(hotel.phone);
  const room = booking.selection.room;
  const rate = booking.selection.rate;
  const rooms = booking.selection.criteria.rooms;
  const policy = booking.cancellationPolicySnapshot;
  const travellers = [booking.guests.leadName, ...booking.guests.additional.map((guest) => guest.name)].filter(Boolean);
  const checkInTime = hotel.policies?.checkIn?.from;
  const checkOutTime = hotel.policies?.checkOut?.until;
  const conditions = [
    ...(rate.terms ?? []),
    ...(hotel.policies?.terms ?? []),
    ...(hotel.policies?.restrictions ?? []),
    ...(policy?.rateRestrictions ?? []),
  ]
    .map(text)
    .filter((item): item is string => !!item);
  const adults = rooms.reduce((total, occupancy) => total + occupancy.adults, 0);
  const children = rooms.reduce((total, occupancy) => total + occupancy.childAges.length, 0);
  const hotelPhoto = hotel.photos[0];
  const roomPhoto = room.photos[0];
  const description = text(hotel.description);
  const generated = new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date());

  return (
    <article className="voucher" aria-labelledby="voucher-title">
      {/* Not <header>/<footer>: the workspace print stylesheet hides those page landmarks. */}
      <div className="voucher__header">
        <BrandLogo withName />
        <div className="voucher__heading">
          <h2 id="voucher-title">{t("Accommodation Voucher", "قسيمة الإقامة")}</h2>
          <p>{t("Royal Vacation · Partner booking record", "رويال فاكيشن · سجل حجز الشريك")}</p>
        </div>
        <dl className="voucher__reference">
          <div><dt>{t("Booking reference", "مرجع الحجز")}</dt><dd><bdi>{booking.id}</bdi></dd></div>
          <div><dt>{t("Booking status", "حالة الحجز")}</dt><dd>{t("Confirmed — demonstration record", "مؤكد — سجل تجريبي")}</dd></div>
        </dl>
      </div>

      <div className="voucher__warning" role="note">
        <p className="watermark">{t("NOT VALID FOR TRAVEL", "غير صالح للسفر")}</p>
        <p>
          {t(
            "Demonstration voucher for review only. It is not a supplier confirmation, hotel confirmation, check-in document or payment receipt.",
            "قسيمة تجريبية للمراجعة فقط، وليست تأكيدًا من المورد أو تأكيدًا من الفندق أو مستند تسجيل وصول أو إيصال دفع.",
          )}
        </p>
      </div>

      <section className="voucher__section" aria-labelledby="voucher-hotel">
        <h3 id="voucher-hotel">{t("Hotel", "الفندق")}</h3>
        <div className="voucher__hotel">
          <div>
            <p className="voucher__hotel-name">{hotelDisplayName(hotel.name[locale])}</p>
            {hotel.stars ? (
              <p className="voucher__stars" role="img" aria-label={t(`${hotel.stars}-star hotel`, `فندق ${hotel.stars} نجوم`)}>
                <span aria-hidden="true">{"★".repeat(hotel.stars)}</span>
              </p>
            ) : (
              <p className="voucher__muted">{t("Star rating not provided", "تصنيف النجوم غير متوفر")}</p>
            )}
            <p className="voucher__location"><Icon name="pin" />{hotelDisplayAddress(hotel.address[locale], locale)}</p>
            {description && <p className="voucher__description">{description}</p>}
          </div>
          {hotelPhoto && <ResponsiveImage className="voucher__hotel-photo" src={hotelPhoto.src} alt="" width={hotelPhoto.width} height={hotelPhoto.height} sizes="(max-width: 720px) 100vw, 320px" eager />}
        </div>
        <dl className="voucher__facts voucher__facts--two">
            <div><dt>{t("Address", "العنوان")}</dt><dd>{hotelDisplayAddress(hotel.address[locale], locale)}</dd></div>
            <div>
              <dt>{t("Hotel telephone", "هاتف الفندق")}</dt>
              <dd>{phoneHref ? <a href={phoneHref}><bdi>{hotel.phone}</bdi></a> : notProvided}</dd>
            </div>
        </dl>
      </section>

      <section className="voucher__section" aria-labelledby="voucher-booking">
        <h3 id="voucher-booking">{t("Booking details", "تفاصيل الحجز")}</h3>
        <dl className="voucher__facts voucher__facts--four">
          <div><dt>{t("Booking reference", "مرجع الحجز")}</dt><dd><bdi>{booking.id}</bdi></dd></div>
          <div><dt>{t("Booking status", "حالة الحجز")}</dt><dd className="voucher__status">{t("Confirmed", "مؤكد")}</dd></div>
          <div><dt>{t("Booking date", "تاريخ الحجز")}</dt><dd><time dateTime={booking.bookedAt}>{date(booking.bookedAt)}</time></dd></div>
          <div><dt>{t("Supplier reference", "مرجع المورد")}</dt><dd>{t("Not available — demonstration record", "غير متاح — سجل تجريبي")}</dd></div>
          <div><dt>{t("Hotel confirmation reference", "مرجع تأكيد الفندق")}</dt><dd>{t("Not available — demonstration record", "غير متاح — سجل تجريبي")}</dd></div>
          <div><dt>{t("Agency reference", "مرجع الوكالة")}</dt><dd><bdi>{booking.agencyReference}</bdi></dd></div>
        </dl>
      </section>

      <section className="voucher__section" aria-labelledby="voucher-stay">
        <h3 id="voucher-stay">{t("Stay", "الإقامة")}</h3>
        <dl className="voucher__facts voucher__facts--stay">
          <div><dt><Icon name="user" />{t("Lead traveller", "المسافر الرئيسي")}</dt><dd>{booking.guests.leadName}</dd></div>
          <div><dt><Icon name="calendar" />{t("Check-in", "تسجيل الوصول")}</dt><dd><time dateTime={booking.checkIn}>{date(booking.checkIn)}</time>{checkInTime && <small> · {t("from", "من")} <bdi>{checkInTime}</bdi></small>}</dd></div>
          <div><dt><Icon name="calendar" />{t("Check-out", "تسجيل المغادرة")}</dt><dd><time dateTime={booking.checkOut}>{date(booking.checkOut)}</time>{checkOutTime && <small> · {t("until", "حتى")} <bdi>{checkOutTime}</bdi></small>}</dd></div>
          <div><dt><Icon name="moon" />{t("Nights", "الليالي")}</dt><dd>{nights(booking.checkIn, booking.checkOut)}</dd></div>
          <div><dt><Icon name="users" />{t("Guests", "الضيوف")}</dt><dd>{adults} {t("adults", "بالغون")}{children > 0 && ` · ${children} ${t("children", "أطفال")}`}</dd></div>
          <div><dt><Icon name="bed" />{t("Rooms", "الغرف")}</dt><dd>{rooms.length}</dd></div>
          <div><dt><Icon name="document" />{t("Board", "الوجبات")}</dt><dd>{boardPlanLabels[rate.boardPlan][locale]}</dd></div>
        </dl>
      </section>

      <section className="voucher__section" aria-labelledby="voucher-rooms">
        <h3 id="voucher-rooms">{t("Room details", "تفاصيل الغرف")}</h3>
        <div className="voucher__room">
          {roomPhoto && <ResponsiveImage src={roomPhoto.src} alt="" width={roomPhoto.width} height={roomPhoto.height} sizes="(max-width: 720px) 100vw, 220px" eager />}
          <div>
            <p className="voucher__room-name">{hotelDisplayName(room.name[locale])}</p>
            <ul className="voucher__chips">
              <li>{room.bed[locale]}</li>
              {room.size > 0 && <li><bdi>{room.size} m²</bdi></li>}
              <li>{boardPlanLabels[rate.boardPlan][locale]}</li>
              {room.included.map((item) => <li key={item.en}>{text(item)}</li>)}
            </ul>
          </div>
        </div>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard. */}
        <div className="voucher__table-wrap" role="region" tabIndex={0} aria-labelledby="voucher-rooms">
          <table className="voucher__table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">{t("Room type", "نوع الغرفة")}</th>
                <th scope="col">{t("Board", "الوجبات")}</th>
                <th scope="col">{t("Adults", "البالغون")}</th>
                <th scope="col">{t("Children", "الأطفال")}</th>
                <th scope="col">{t("Bed", "السرير")}</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((occupancy, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{hotelDisplayName(room.name[locale])}</td>
                  <td>{boardPlanLabels[rate.boardPlan][locale]}</td>
                  <td>{occupancy.adults}</td>
                  <td>
                    {occupancy.childAges.length}
                    {occupancy.childAges.length > 0 && (
                      <small> ({t("ages", "الأعمار")} <bdi>{occupancy.childAges.join(", ")}</bdi>)</small>
                    )}
                  </td>
                  <td>{room.bed[locale]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="voucher__section" aria-labelledby="voucher-travellers">
        <h3 id="voucher-travellers">{t("Travellers", "المسافرون")}</h3>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard. */}
        <div className="voucher__table-wrap" role="region" tabIndex={0} aria-labelledby="voucher-travellers">
          <table className="voucher__table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">{t("Name", "الاسم")}</th>
                <th scope="col">{t("Role", "الصفة")}</th>
              </tr>
            </thead>
            <tbody>
              {travellers.map((name, index) => (
                <tr key={`${name}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{name}</td>
                  <td>{index === 0 ? t("Lead traveller", "المسافر الرئيسي") : t("Additional traveller", "مسافر إضافي")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <VoucherCancellationPolicy policy={policy} />

      <div className="voucher__columns">
        <section className="voucher__section" aria-labelledby="voucher-conditions">
          <h3 id="voucher-conditions">{t("Hotel remarks and booking conditions", "ملاحظات الفندق وشروط الحجز")}</h3>
          {(hotel.policies?.identificationRequirements || hotel.policies?.childPolicy) && (
            <dl className="voucher__facts">
              {hotel.policies?.identificationRequirements && (
                <div><dt>{t("Identification", "إثبات الهوية")}</dt><dd>{text(hotel.policies.identificationRequirements)}</dd></div>
              )}
              {hotel.policies?.childPolicy && (
                <div><dt>{t("Children", "الأطفال")}</dt><dd>{text(hotel.policies.childPolicy)}</dd></div>
              )}
            </dl>
          )}
          {conditions.length > 0 ? (
            <ul className="voucher__list">{conditions.map((item) => <li key={item}>{item}</li>)}</ul>
          ) : (
            <p className="voucher__muted">{t("No additional hotel remarks were supplied.", "لم تُقدَّم ملاحظات إضافية من الفندق.")}</p>
          )}
        </section>
        <section className="voucher__section" aria-labelledby="voucher-remarks">
          <h3 id="voucher-remarks">{t("Customer remarks", "ملاحظات العميل")}</h3>
          <p className="voucher__remarks">{booking.guests.requests || t("No special requests.", "لا توجد طلبات خاصة.")}</p>
          <dl className="voucher__facts">
            <div><dt>{t("Lead traveller contact", "بيانات تواصل المسافر الرئيسي")}</dt><dd><bdi>{booking.guests.email}</bdi><br /><bdi>{booking.guests.phone}</bdi></dd></div>
          </dl>
        </section>
      </div>

      <div className="voucher__footer">
        <p>{t("Generated on", "تاريخ الإنشاء")} <bdi>{generated}</bdi> · {t("Royal Vacation partner workspace (demonstration)", "مساحة شركاء رويال فاكيشن (تجريبية)")}</p>
        <p>{t("Room allocation, check-in times and amenities are subject to the property.", "تخصيص الغرف ومواعيد تسجيل الوصول والمرافق تخضع لسياسة الفندق.")}</p>
      </div>
    </article>
  );
}
