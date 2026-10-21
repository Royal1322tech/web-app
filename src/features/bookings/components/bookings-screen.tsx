import { Icon } from "@/components/ui/icon";
import { useState } from "react";
import { useLocale } from "@/features/localization/locale-provider";
import { hotels } from "@/features/hotels/data/hotels.fixture";
import { CatalogShell } from "@/features/hotels/components/catalog-shell";
import { HotelResultCard } from "@/features/hotels/components/hotel-result-card";
import { Comparison } from "@/features/hotels/components/comparison";
import { Link } from "react-router-dom";
import { useDemo } from "@/features/demo/demo-provider";
import { StatusBadge } from "@/features/demo/shared";
import { StatePreview } from "@/components/ui/system-state";
import { defaultBookingFilters, filterBookings } from "../lib/filter-bookings";
import { BookingFilters } from "./booking-filters";
import styles from "@/features/hotels/hotels.module.css";
function formatBookingDate(value: string, locale: "en" | "ar") {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
  }).format(date);
}
export function BookingsScreen() {
  const { locale, t } = useLocale();
  const { records: bookings } = useDemo();
  const [draft, setDraft] = useState(defaultBookingFilters);
  const [filters, setFilters] = useState(defaultBookingFilters);
  const [sort, setSort] = useState("newest");
  const [limit, setLimit] = useState(20);
  const [pageIndex, setPageIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [dateError, setDateError] = useState(false);
  const result = filterBookings(bookings, hotels, filters, sort);
  const activeSummary = filters.status === "confirmed" ? "confirmed" : filters.fees ? "fees" : null;
  const updateSummaryFilter = (next: "confirmed" | "fees") => {
    const filtersWithoutQuickCard = { ...filters, status: "all", fees: false };
    const updated = activeSummary === next
      ? filtersWithoutQuickCard
      : { ...filtersWithoutQuickCard, ...(next === "confirmed" ? { status: "confirmed" as const } : { fees: true }) };
    setDraft(updated);
    setFilters(updated);
    setPageIndex(0);
  };
  const visibleBookings = result.slice(pageIndex * limit, (pageIndex + 1) * limit);
  return (
    <CatalogShell title={t("My Bookings", "حجوزاتي")} workspace={false}>
      <h1>{t("My Bookings", "حجوزاتي")}</h1>
      <p className={styles.sampleNote}>{t("Booking records and changes stay in this browser session; supplier reservations are not updated.", "تظل سجلات الحجوزات والتغييرات في جلسة المتصفح؛ ولا تُحدّث حجوزات الموردين.")}</p>
      <button
        className={`${styles.secondary} ${styles.mobileFilters}`}
        aria-expanded={open}
        aria-controls="booking-filters"
        onClick={() => setOpen(!open)}
      >
        {t("Filters", "التصفية")}
      </button>
      <StatePreview emptyTitle={t("No bookings yet", "لا توجد حجوزات بعد")}>
        <div className={styles.resultsLayout}>
          <BookingFilters
            value={draft}
            onChange={setDraft}
            open={open}
            error={dateError}
            onApply={() => {
              if (draft.from && draft.to && draft.from > draft.to) {
                setDateError(true);
                return;
              }
              setDateError(false);
              setFilters(draft);
              setPageIndex(0);
            }}
            onReset={() => {
              setDraft(defaultBookingFilters);
              setFilters(defaultBookingFilters);
              setDateError(false);
              setPageIndex(0);
            }}
          />

          <div>
            <div className={styles.summaryCards}>
              <button
                type="button"
                className={styles.summaryCard}
                aria-pressed={activeSummary === "confirmed"}
                onClick={() => updateSummaryFilter("confirmed")}
              >
                <span className={styles.summaryContent}>
                  <Icon name="check" />
                  <strong>{t("Confirmed", "مؤكد")}</strong>
                  {activeSummary === "confirmed" && <Icon name="check" aria-hidden="true" />}
                </span>
                <span>
                  {t("Records", "السجلات")}:{" "}
                  {bookings.filter((b) => b.status === "confirmed").length}
                </span>
              </button>
              <button
                type="button"
                className={styles.summaryCard}
                aria-pressed={activeSummary === "fees"}
                onClick={() => updateSummaryFilter("fees")}
              >
                <span className={styles.summaryContent} data-status="fees">
                  <Icon name="close" />
                  <strong>{t("Cancellation fees", "رسوم الإلغاء")}</strong>
                  {activeSummary === "fees" && <Icon name="check" aria-hidden="true" />}
                </span>
                <span>
                  {t("Records", "السجلات")}:{" "}
                  {bookings.filter((b) => b.cancellationFee).length}
                </span>
              </button>
            </div>
            {activeSummary && <button className={styles.clearSummaryFilter} type="button" onClick={() => updateSummaryFilter(activeSummary)}>{t("Clear status card filter", "مسح تصفية بطاقة الحالة")}</button>}
            <div className={styles.listHeader}>
              <label>
                {t("Sort by", "ترتيب حسب")}
                <select
                  aria-label={t("Sort by", "ترتيب حسب")}
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setPageIndex(0); }}
                >
                  <option value="newest">
                    {t(
                      "Booking date: newest first",
                      "تاريخ الحجز: الأحدث أولاً",
                    )}
                  </option>
                  <option value="oldest">
                    {t(
                      "Booking date: oldest first",
                      "تاريخ الحجز: الأقدم أولاً",
                    )}
                  </option>
                </select>
              </label>
              <label>
                {t("Results", "النتائج")}
                <select
                  aria-label={t("Results", "النتائج")}
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPageIndex(0); }}
                >
                  {[2, 10, 20].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            <p role="status">
              {result.length} {t("booking records", "سجلات الحجوزات")}
            </p>
            <div className={styles.results}>
              {visibleBookings.map((b, index) => {
                const h = hotels.find((h) => h.id === b.hotelId);
                return h ? (
                  <HotelResultCard
                    key={b.id}
                    hotel={h}
                    eager={index === 0}
                    dates={{ checkIn: b.checkIn, checkOut: b.checkOut }}
                    booking={
                      <div className={styles.bookingMetadata}>
                        <div className={styles.bookingMetaTop}>
                          <div><small>{t("Booking reference", "مرجع الحجز")}</small><strong><bdi>{b.id}</bdi></strong></div>
                          <div className={styles.bookingStatus}><span className={styles.localStatus}>{t("Local preview", "معاينة محلية")}</span><StatusBadge status={b.status} /></div>
                        </div>
                        <p className={styles.bookingDates}>
                          <span>{t("Stay", "الإقامة")}</span>
                          <time dateTime={b.checkIn}><bdi>{formatBookingDate(b.checkIn, locale)}</bdi></time>
                          <span aria-hidden="true">—</span>
                          <time dateTime={b.checkOut}><bdi>{formatBookingDate(b.checkOut, locale)}</bdi></time>
                        </p>
                        <details>
                          <summary>
                            {t("View booking details", "عرض تفاصيل الحجز")}
                          </summary>
                          <p>
                            {t("Traveller", "المسافر")}:{" "}
                            {locale === "ar"
                              ? `مسافر تجريبي ${b.id}`
                              : b.traveller}
                          </p>
                          <p>
                            {t("Agency Reference", "مرجع الوكالة")}:{" "}
                            {b.agencyReference}
                          </p>
                        </details>
                        <Link
                          to={`/bookings/${b.id}`}
                          className={styles.primary}
                        >
                          {t("Manage booking", "إدارة الحجز")}
                        </Link>
                      </div>
                    }
                  />
                ) : null;
              })}
            </div>
            {!result.length && (
              <p className={styles.empty}>
                {t(
                  "No bookings match these filters.",
                  "لا توجد حجوزات تطابق هذه التصفية.",
                )}
              </p>
            )}
            {result.length > limit && <nav className={styles.bookingPagination} aria-label={t("Booking result pages", "صفحات نتائج الحجوزات")}>
              <button type="button" className={styles.secondary} disabled={pageIndex === 0} onClick={() => setPageIndex(index => Math.max(0, index - 1))}>{t("Previous", "السابق")}</button>
              <span>{t(`Page ${pageIndex + 1} of ${Math.ceil(result.length / limit)}`, `الصفحة ${pageIndex + 1} من ${Math.ceil(result.length / limit)}`)}</span>
              <button type="button" className={styles.secondary} disabled={(pageIndex + 1) * limit >= result.length} onClick={() => setPageIndex(index => index + 1)}>{t("Next", "التالي")}</button>
            </nav>}
          </div>
        </div>
      </StatePreview>
      <Comparison />
    </CatalogShell>
  );
}
