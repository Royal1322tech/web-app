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
export function BookingsScreen() {
  const { locale, t } = useLocale();
  const { records: bookings } = useDemo();
  const [draft, setDraft] = useState(defaultBookingFilters);
  const [filters, setFilters] = useState(defaultBookingFilters);
  const [sort, setSort] = useState("newest");
  const [limit, setLimit] = useState(20);
  const [open, setOpen] = useState(false);
  const [dateError, setDateError] = useState(false);
  const result = filterBookings(bookings, hotels, filters, sort);
  return (
    <CatalogShell title={t("Booking", "الحجوزات")}>
      <h1>{t("My Bookings", "حجوزاتي")}</h1>
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
            }}
            onReset={() => {
              setDraft(defaultBookingFilters);
              setFilters(defaultBookingFilters);
              setDateError(false);
            }}
          />

          <div>
            <div className={styles.summaryCards}>
              <button
                className={styles.summaryCard}
                onClick={() => {
                  setDraft({ ...defaultBookingFilters, status: "confirmed" });
                  setFilters({ ...defaultBookingFilters, status: "confirmed" });
                }}
              >
                <span className={styles.summaryContent}>
                  <Icon name="check" />
                  <strong>{t("Confirmed", "مؤكد")}</strong>
                  <span className={styles.summaryView}>{t("View", "عرض")}</span>
                </span>
                <span>
                  {t("Sample records", "سجلات تجريبية")}:{" "}
                  {bookings.filter((b) => b.status === "confirmed").length}
                </span>
              </button>
              <button
                className={styles.summaryCard}
                onClick={() => {
                  setDraft({ ...defaultBookingFilters, fees: true });
                  setFilters({ ...defaultBookingFilters, fees: true });
                }}
              >
                <span className={styles.summaryContent} data-status="fees">
                  <Icon name="close" />
                  <strong>{t("Cancellation fees", "رسوم الإلغاء")}</strong>
                  <span className={styles.summaryView}>{t("View", "عرض")}</span>
                </span>
                <span>
                  {t("Sample records", "سجلات تجريبية")}:{" "}
                  {bookings.filter((b) => b.cancellationFee).length}
                </span>
              </button>
            </div>
            <div className={styles.listHeader}>
              <label>
                {t("Sort by", "ترتيب حسب")}
                <select
                  aria-label={t("Sort by", "ترتيب حسب")}
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
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
                  onChange={(e) => setLimit(Number(e.target.value))}
                >
                  {[2, 10, 20].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            <p role="status">
              {result.length} {t("sample bookings", "حجوزات تجريبية")}
            </p>
            <div className={styles.results}>
              {result.slice(0, limit).map((b) => {
                const h = hotels.find((h) => h.id === b.hotelId);
                return h ? (
                  <HotelResultCard
                    key={b.id}
                    hotel={h}
                    dates={{ checkIn: b.checkIn, checkOut: b.checkOut }}
                    booking={
                      <>
                        <strong>{b.id}</strong>
                        <StatusBadge status={b.status} />
                        <p>
                          <bdi>
                            {b.checkIn} — {b.checkOut}
                          </bdi>
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
                          <p>
                            {t(
                              "Demonstration only. Manage this record to preview changes.",
                              "للعرض فقط. افتح السجل لمعاينة التغييرات.",
                            )}
                          </p>
                        </details>
                        <Link
                          to={`/bookings/${b.id}`}
                          className={styles.secondary}
                        >
                          {t("Manage demo booking", "إدارة الحجز التجريبي")}
                        </Link>
                      </>
                    }
                  />
                ) : null;
              })}
            </div>
            {!result.length && (
              <p className={styles.empty}>
                {t(
                  "No sample bookings match these filters.",
                  "لا توجد حجوزات تجريبية تطابق هذه التصفية.",
                )}
              </p>
            )}
          </div>
        </div>
      </StatePreview>
      <Comparison />
    </CatalogShell>
  );
}
