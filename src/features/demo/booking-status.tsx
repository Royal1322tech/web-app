import { useEffect, useRef, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icon, type IconName } from "@/components/ui/icon";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { hotels } from "@/features/hotels/data/hotels.fixture";
import { boardPlanLabels } from "@/features/hotels/lib/board-plan-definitions";
import { hotelDisplayAddress, hotelDisplayName } from "@/features/hotels/lib/presentation";
import { samplePriceBreakdown } from "@/features/hotels/lib/sample-stay";
import { useLocale } from "@/features/localization/locale-provider";
import { formatCalendarDate } from "@/lib/format-date";
import { useMoney } from "./shared";
import { totalFor } from "./demo-provider";
import type { DemoBooking, DemoSelection, DemoStatus } from "./types";
import "./booking-status.css";

/** Real booking statuses, plus "processing" for an in-flight submission once a booking service exists. */
export type BookingUiState = DemoStatus | "processing";

function BookingHotelSummary({ selection, checkIn, checkOut }: { selection: DemoSelection; checkIn: string; checkOut: string }) {
  const { t, locale } = useLocale();
  const money = useMoney();
  const hotel = hotels.find((item) => item.id === selection.hotelId);
  const adults = selection.criteria.rooms.reduce((total, room) => total + room.adults, 0);
  const children = selection.criteria.rooms.reduce((total, room) => total + room.childAges.length, 0);
  const nights = samplePriceBreakdown(selection.rate.nightlyRate, selection.criteria).nights;
  return (
    <section className="booking-summary" aria-label={t("Stay summary", "ملخص الإقامة")}>
      <div className="booking-summary__hotel">
        {hotel?.photos[0] && <ResponsiveImage src={hotel.photos[0].src} alt="" width={hotel.photos[0].width} height={hotel.photos[0].height} sizes="(max-width: 700px) 100vw, 240px" eager />}
        <div>
          <h3>{hotel ? hotelDisplayName(hotel.name[locale]) : "—"}</h3>
          {hotel?.stars ? <p className="booking-summary__stars" role="img" aria-label={t(`${hotel.stars}-star hotel`, `فندق ${hotel.stars} نجوم`)}><span aria-hidden="true">{"★".repeat(hotel.stars)}</span></p> : null}
          {hotel && <p className="booking-summary__address"><Icon name="pin" />{hotelDisplayAddress(hotel.address[locale], locale)}</p>}
          {hotel?.inventoryType === "demo" && <span className="hotel-demo-indicator">{t("Demo inventory", "بيانات تجريبية")}</span>}
        </div>
      </div>
      <dl>
        <div><dt>{t("Check-in", "تسجيل الوصول")}</dt><dd><time dateTime={checkIn}>{formatCalendarDate(checkIn, locale)}</time></dd></div>
        <div><dt>{t("Check-out", "تسجيل المغادرة")}</dt><dd><time dateTime={checkOut}>{formatCalendarDate(checkOut, locale)}</time></dd></div>
        <div><dt>{t("Nights / rooms", "الليالي / الغرف")}</dt><dd>{nights} / {selection.criteria.rooms.length}</dd></div>
        <div><dt>{t("Guests", "الضيوف")}</dt><dd>{adults} {t("adults", "بالغون")}{children > 0 && ` · ${children} ${t("children", "أطفال")}`}</dd></div>
        <div><dt>{t("Room", "الغرفة")}</dt><dd>{hotelDisplayName(selection.room.name[locale])}</dd></div>
        <div><dt>{t("Board", "الوجبات")}</dt><dd>{boardPlanLabels[selection.rate.boardPlan][locale]}</dd></div>
        <div><dt>{t("Stay total", "إجمالي الإقامة")}</dt><dd><bdi>{money(totalFor(selection))}</bdi></dd></div>
      </dl>
    </section>
  );
}

/** Shown while a demo simulation runs, before any record exists, so it needs only the selection. */
export function BookingProcessingPanel({ selection }: { selection: DemoSelection }) {
  const { t } = useLocale();
  return (
    <div className="booking-status" data-state="processing">
      <div className="booking-status__head" role="status">
        <span className="booking-status__icon" aria-hidden="true"><Icon name="hourglass" /></span>
        <p className="booking-status__tag">{t("Demo simulation", "محاكاة تجريبية")}</p>
        <h2>{t("We're processing your booking", "جارٍ معالجة حجزك")}</h2>
        <p>{t("Please wait while your reservation is checked. It is not confirmed yet. Please do not close this page or submit again.", "يرجى الانتظار أثناء التحقق من حجزك. لم يتم تأكيده بعد. يرجى عدم إغلاق هذه الصفحة أو الإرسال مرة أخرى.")}</p>
        <span className="booking-status__dots" aria-hidden="true"><i /><i /><i /></span>
      </div>
      <BookingHotelSummary selection={selection} checkIn={selection.criteria.checkIn} checkOut={selection.criteria.checkOut} />
    </div>
  );
}

/** One layout for every booking outcome. It reports a recorded status and never decides one. */
export function BookingStatusPanel({ booking, state, extraAction }: { booking: DemoBooking; state: BookingUiState; extraAction?: ReactNode }) {
  const { t } = useLocale();
  // Arriving from a simulation replaces the whole page, so move focus to the outcome.
  const arrivedFromSimulation = (useLocation().state as { simulated?: boolean } | null)?.simulated === true;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (arrivedFromSimulation) heading.current?.focus(); }, [arrivedFromSimulation]);
  const content: Record<BookingUiState, { icon: IconName; title: string; body: string }> = {
    processing: {
      icon: "hourglass",
      title: t("We're processing your booking", "جارٍ معالجة حجزك"),
      body: t("Please wait while your reservation is checked. It is not confirmed yet. Please do not close this page or submit again.", "يرجى الانتظار أثناء التحقق من حجزك. لم يتم تأكيده بعد. يرجى عدم إغلاق هذه الصفحة أو الإرسال مرة أخرى."),
    },
    confirmed: {
      icon: "check",
      title: t("Your booking is confirmed — demonstration record", "تم تأكيد حجزك — سجل تجريبي"),
      body: t("This record shows a confirmed status and its voucher is available.", "يعرض هذا السجل حالة مؤكدة والقسيمة الخاصة به متاحة."),
    },
    pending: {
      icon: "clock",
      title: t("Your booking is pending confirmation", "حجزك في انتظار التأكيد"),
      body: t("Confirmation is still outstanding, so this booking is not confirmed. A voucher becomes available only after confirmation.", "ما زال التأكيد معلقًا، لذا فهذا الحجز غير مؤكد. تتوفر القسيمة بعد التأكيد فقط."),
    },
    failed: {
      icon: "close",
      title: t("We couldn't complete this booking", "تعذر إتمام هذا الحجز"),
      body: t("This record's outcome is failed, so no stay is reserved under it. You can search again or contact support.", "نتيجة هذا السجل فاشلة، لذا لا توجد إقامة محجوزة بموجبه. يمكنك البحث مرة أخرى أو التواصل مع الدعم."),
    },
    cancelled: {
      icon: "close",
      title: t("This booking record is cancelled", "أُلغي سجل الحجز هذا"),
      body: t("This stay is no longer active. Its details remain available for reference.", "لم تعد هذه الإقامة نشطة. تظل تفاصيلها متاحة للرجوع إليها."),
    },
  };
  const { icon, title, body } = content[state];
  const details = <Link className="button button--outline" to={`/bookings/${booking.id}`}><Icon name="document" />{t("View Booking Details", "عرض تفاصيل الحجز")}</Link>;
  const myBookings = <Link className="button button--primary" to="/bookings">{t("Go to My Bookings", "الذهاب إلى حجوزاتي")}<Icon name="arrowRight" /></Link>;
  return (
    <div className="booking-status" data-state={state}>
      <div className="booking-status__head" role={state === "failed" ? "alert" : "status"}>
        <span className="booking-status__icon" aria-hidden="true">
          {state === "confirmed" && <span className="booking-status__confetti">{Array.from({ length: 12 }, (_, piece) => <i key={piece} />)}</span>}
          <Icon name={icon} />
        </span>
        <h2 ref={heading} tabIndex={-1}>{title}</h2>
        <p>{body}</p>
        {state === "processing" && <span className="booking-status__dots" aria-hidden="true"><i /><i /><i /></span>}
      </div>
      {state !== "processing" && (
        <dl className="booking-status__reference">
          <div><dt>{t("Booking Reference", "مرجع الحجز")}</dt><dd><bdi>{booking.id}</bdi></dd></div>
        </dl>
      )}
      <BookingHotelSummary selection={booking.selection} checkIn={booking.checkIn} checkOut={booking.checkOut} />
      {state !== "processing" && (
        <>
          <div className="booking-status__actions">
            {details}
            {state === "confirmed" && <Link className="button button--outline" to={`/bookings/${booking.id}/voucher`}><Icon name="printer" />{t("View, Print or Save Voucher", "عرض القسيمة أو طباعتها أو حفظها")}</Link>}
            {state === "failed" && <Link className="button button--outline" to="/search"><Icon name="search" />{t("Search Again", "البحث مرة أخرى")}</Link>}
            {state === "failed" && <Link className="button button--primary" to="/contact"><Icon name="headset" />{t("Contact Support", "تواصل مع الدعم")}</Link>}
            {state !== "failed" && myBookings}
            {extraAction}
          </div>
          <p className="booking-status__note">{t("No real booking or payment occurred. This record is available only in the current browser session.", "لم يحدث حجز أو دفع فعلي. يتوفر هذا السجل في جلسة المتصفح الحالية فقط.")}</p>
        </>
      )}
    </div>
  );
}
