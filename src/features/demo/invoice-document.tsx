import { BrandLogo } from "@/components/brand-logo";
import { boardPlanLabels } from "@/features/hotels/lib/board-plan-definitions";
import { hotelDisplayAddress, hotelDisplayName } from "@/features/hotels/lib/presentation";
import type { HotelListing } from "@/features/hotels/types";
import { useLocale } from "@/features/localization/locale-provider";
import { formatCalendarDate } from "@/lib/format-date";
import { stayNights, type InvoiceView } from "./booking-invoice";
import { StatusBadge } from "./shared";
import type { AgencyProfile, DemoBooking } from "./types";
import "./invoice-document.css";

export function formatInvoiceMoney(minor: number, currency: string, locale: "en" | "ar") {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

/** Printable invoice. Shows only values present in the booking or a supplied invoice record. */
export function InvoiceDocument({ booking, hotel, profile, view }: { booking: DemoBooking; hotel: HotelListing; profile: AgencyProfile; view: InvoiceView }) {
  const { t, locale } = useLocale();
  const money = (minor: number) => formatInvoiceMoney(minor, view.currency, locale);
  const preview = view.source === "demo-preview";
  const criteria = booking.selection.criteria;
  const adults = criteria.rooms.reduce((sum, room) => sum + room.adults, 0);
  const children = criteria.rooms.reduce((sum, room) => sum + room.childAges.length, 0);
  const nights = stayNights(booking.checkIn, booking.checkOut);
  const pending = t("Pending confirmation", "بانتظار التأكيد");
  const notAvailable = t("Not available", "غير متوفر");
  const guests = [booking.guests.leadName, ...booking.guests.additional.map((guest) => guest.name)].filter(Boolean);
  const text = (value: { en: string; ar: string } | string) => (typeof value === "string" ? value : value[locale]);

  return (
    <article className="invoice-document rv-invoice" aria-labelledby="invoice-title">
      {/* Not <header>/<footer>: the workspace print stylesheet hides those page landmarks. */}
      <div className="rv-invoice__header">
        <BrandLogo withName />
        <div className="rv-invoice__title">
          <h2 id="invoice-title">{t("Invoice", "فاتورة")}</h2>
          <StatusBadge status={booking.status} />
        </div>
      </div>

      {preview && (
        <div className="rv-invoice__notice" role="note">
          <strong>{t("DEMO INVOICE PREVIEW", "معاينة فاتورة تجريبية")}</strong>
          <p>{t("Built from a demonstration booking record. This is not an issued invoice or tax document, and no payment or refund has been processed.", "أُعدت من سجل حجز تجريبي. هذه ليست فاتورة صادرة أو مستندًا ضريبيًا، ولم تتم معالجة أي دفع أو استرداد.")}</p>
        </div>
      )}

      <dl className="rv-invoice__meta">
        <div><dt>{preview ? t("Demo preview identifier", "معرّف المعاينة التجريبية") : t("Invoice number", "رقم الفاتورة")}</dt><dd><bdi>{view.reference}</bdi></dd></div>
        <div><dt>{t("Issue date", "تاريخ الإصدار")}</dt><dd>{view.issueDate ? formatCalendarDate(view.issueDate, locale) : preview ? t("Not issued", "لم تصدر") : notAvailable}</dd></div>
        <div><dt>{t("Booking reference", "مرجع الحجز")}</dt><dd><bdi>{booking.id}</bdi></dd></div>
        <div><dt>{t("Currency", "العملة")}</dt><dd><bdi>{view.currency}</bdi></dd></div>
      </dl>

      <div className="rv-invoice__parties">
        <section aria-labelledby="invoice-agency">
          <h3 id="invoice-agency">{t("Billed to", "فاتورة إلى")}</h3>
          <p className="rv-invoice__strong">{profile.name}</p>
          <p>{profile.contact}</p>
          <p><bdi>{profile.email}</bdi></p>
          <p><bdi>{profile.phone}</bdi></p>
          <p>{profile.address}</p>
          <p className="rv-invoice__muted">{t("Agency reference", "مرجع الوكالة")}: <bdi>{booking.agencyReference}</bdi></p>
        </section>
        <section aria-labelledby="invoice-guests">
          <h3 id="invoice-guests">{t("Guests", "الضيوف")}</h3>
          {guests.map((guest, index) => <p key={`${guest}-${index}`} className={index === 0 ? "rv-invoice__strong" : undefined}><bdi>{guest}</bdi></p>)}
          <p className="rv-invoice__muted">{t(`${adults} adults · ${children} children`, `${adults} بالغين · ${children} أطفال`)}</p>
        </section>
      </div>

      <section className="rv-invoice__section" aria-labelledby="invoice-stay">
        <h3 id="invoice-stay">{t("Stay", "الإقامة")}</h3>
        <dl className="rv-invoice__stay">
          <div className="rv-invoice__wide"><dt>{t("Hotel", "الفندق")}</dt><dd>{hotelDisplayName(hotel.name[locale])}<small>{hotelDisplayAddress(hotel.address[locale], locale)}</small></dd></div>
          <div><dt>{t("Check-in", "تسجيل الوصول")}</dt><dd><time dateTime={booking.checkIn}>{formatCalendarDate(booking.checkIn, locale)}</time></dd></div>
          <div><dt>{t("Check-out", "تسجيل المغادرة")}</dt><dd><time dateTime={booking.checkOut}>{formatCalendarDate(booking.checkOut, locale)}</time></dd></div>
          <div><dt>{t("Nights", "الليالي")}</dt><dd>{nights || notAvailable}</dd></div>
          <div><dt>{t("Rooms", "الغرف")}</dt><dd>{criteria.rooms.length}</dd></div>
          <div className="rv-invoice__wide"><dt>{t("Board", "الوجبات")}</dt><dd>{boardPlanLabels[booking.selection.rate.boardPlan][locale]}</dd></div>
        </dl>
      </section>

      <section className="rv-invoice__section" aria-labelledby="invoice-charges">
        <h3 id="invoice-charges">{t("Charges", "الرسوم")}</h3>
        <table className="rv-invoice__table">
          <thead><tr><th scope="col">{t("Description", "الوصف")}</th><th scope="col">{t("Amount", "المبلغ")}</th></tr></thead>
          <tbody>
            {view.lines.map((line, index) => (
              <tr key={index}>
                <td>
                  {text(line.description)}
                  {line.calculation && <small><bdi>{money(line.calculation.nightlyMinor)}</bdi> × {t(`${line.calculation.nights} nights`, `${line.calculation.nights} ليالٍ`)} × {t(`${line.calculation.rooms} room(s)`, `${line.calculation.rooms} غرفة`)}</small>}
                </td>
                <td><bdi>{money(line.amountMinor)}</bdi></td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="rv-invoice__totals">
          <div><dt>{t("Subtotal", "الإجمالي الفرعي")}</dt><dd><bdi>{money(view.subtotalMinor)}</bdi></dd></div>
          <div><dt>{t("Taxes and fees", "الضرائب والرسوم")}</dt><dd>{view.taxAndFeesMinor !== undefined ? <bdi>{money(view.taxAndFeesMinor)}</bdi> : t("Not included", "غير مشمولة")}</dd></div>
          <div className="rv-invoice__grand"><dt>{view.cancellation ? t("Original Booking Amount", "مبلغ الحجز الأصلي") : t("Total", "الإجمالي")}</dt><dd><bdi>{money(view.totalMinor)}</bdi></dd></div>
        </dl>
      </section>

      {view.cancellation && (
        <section className="rv-invoice__section rv-invoice__cancellation" aria-labelledby="invoice-cancellation">
          <h3 id="invoice-cancellation">{t("Cancellation", "الإلغاء")}</h3>
          <dl className="rv-invoice__totals rv-invoice__totals--full">
            <div><dt>{t("Original Booking Amount", "مبلغ الحجز الأصلي")}</dt><dd><bdi>{money(view.cancellation.originalMinor)}</bdi></dd></div>
            <div><dt>{t("Cancellation Charge", "رسوم الإلغاء")}</dt><dd data-pending={view.cancellation.chargeMinor === null || undefined}>{view.cancellation.chargeMinor === null ? pending : <bdi>{money(view.cancellation.chargeMinor)}</bdi>}</dd></div>
            <div><dt>{t("Refund Amount", "مبلغ الاسترداد")}</dt><dd data-pending={view.cancellation.refundMinor === null || undefined}>{view.cancellation.refundMinor === null ? pending : <bdi>{money(view.cancellation.refundMinor)}</bdi>}</dd></div>
          </dl>
          {(view.cancellation.chargeMinor === null || view.cancellation.refundMinor === null) && (
            <p className="rv-invoice__muted">
              {view.cancellation.feeIndicated
                ? t("This booking record indicates a cancellation fee, but no confirmed amount has been supplied. Final amounts are shown only once confirmed.", "يشير سجل هذا الحجز إلى وجود رسوم إلغاء، لكن لم يُقدَّم مبلغ مؤكد. تظهر المبالغ النهائية بعد تأكيدها فقط.")
                : t("Confirmed cancellation amounts have not been supplied. Final amounts are shown only once confirmed.", "لم تُقدَّم مبالغ إلغاء مؤكدة. تظهر المبالغ النهائية بعد تأكيدها فقط.")}
            </p>
          )}
        </section>
      )}

      <div className="rv-invoice__footer">
        <p>{t("Royal Vacation · Travel agency partner platform", "رويال فاكيشن · منصة شركاء وكالات السفر")}</p>
        {preview && <p>{t("Amounts are illustrative demonstration values.", "المبالغ قيم توضيحية تجريبية.")}</p>}
      </div>
    </article>
  );
}
