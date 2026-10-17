import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import { defaultBookingFilters, type BookingFiltersValue } from "../lib/filter-bookings";
import styles from "@/features/hotels/hotels.module.css";
export function BookingFilters({
  value,
  onChange,
  onApply,
  onReset,
  open,
  error,
}: {
  value: BookingFiltersValue;
  onChange: (next: BookingFiltersValue) => void;
  onApply: () => void;
  onReset: () => void;
  open: boolean;
  error: boolean;
}) {
  const { t } = useLocale();
  const selectedCount = Object.entries(value).filter(([key, selected]) => key !== "dateType" && selected !== defaultBookingFilters[key as keyof BookingFiltersValue]).length;
  const statusLabel = (status: string) =>
    status === "confirmed"
      ? t("Confirmed", "مؤكد")
      : status === "cancelled"
        ? t("Cancelled", "ملغى")
        : status === "failed"
          ? t("Failed", "فشل")
          : t("Pending", "معلق");
  return (
    <form
      id="booking-filters"
      className={`${styles.sidebar} ${styles.filterContainer} ${open ? styles.filtersOpen : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
    >
      <h2>{t("Booking Filters", "تصفية الحجوزات")}</h2>
      <p className={styles.filterFeedback} role="status">{t(`${selectedCount} selected filters · Apply to update results`, `${selectedCount} مرشحات محددة · طبّق لتحديث النتائج`)}</p>
      <div className={styles.filterSearch}>
        <label>
          {t("Search by booking or itinerary ID", "بحث برقم الحجز أو الرحلة")}
          <input
            type="search"
            placeholder={t("Booking Number", "رقم الحجز")}
            value={value.query}
            onChange={(e) => onChange({ ...value, query: e.target.value })}
          />
        </label>
        <button
          type="submit"
          className={styles.primary}
          aria-label={t("Search bookings", "بحث الحجوزات")}
        >
          <Icon name="search" />
        </button>
      </div>
      <details open>
        <summary>{t("Search by date", "البحث حسب التاريخ")}</summary>
        <fieldset className={styles.filterChoices}>
          <legend className="sr-only">
            {t("Search by date", "البحث حسب التاريخ")}
          </legend>
          {(["bookedAt", "checkIn"] as const).map((type) => (
            <label className={styles.check} key={type}>
              <input
                type="radio"
                name="booking-date-type"
                checked={value.dateType === type}
                onChange={() => onChange({ ...value, dateType: type })}
              />
              {type === "bookedAt"
                ? t("Booking Date", "تاريخ الحجز")
                : t("Check In Date", "تاريخ الوصول")}
            </label>
          ))}
        </fieldset>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={value.fees}
            onChange={(e) => onChange({ ...value, fees: e.target.checked })}
          />
          {t("Cancellation fees", "رسوم الإلغاء")}
        </label>
      </details>
      <label>
        {t("Select Date From", "التاريخ من")}
        <input
          type="date"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
      </label>
      <label>
        {t("Select Date To", "التاريخ إلى")}
        <input
          type="date"
          value={value.to}
          aria-invalid={error}
          aria-describedby={error ? "booking-date-error" : undefined}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </label>
      {error && (
        <p id="booking-date-error" role="alert">
          {t(
            "End date must not precede start date.",
            "يجب ألا يسبق تاريخ النهاية تاريخ البداية.",
          )}
        </p>
      )}
      <details open>
        <summary>{t("Booking status", "حالة الحجز")}</summary>
        <fieldset className={styles.filterChoices}>
          <legend className="sr-only">
            {t("Booking status", "حالة الحجز")}
          </legend>
          {["all", "confirmed", "cancelled", "pending", "failed"].map(
            (status) => (
              <label key={status} className={styles.check}>
                <input
                  type="radio"
                  name="booking-status"
                  checked={value.status === status}
                  onChange={() => onChange({ ...value, status })}
                />
                {status === "all" ? t("All", "الكل") : statusLabel(status)}
              </label>
            ),
          )}
        </fieldset>
      </details>
      <details open>
        <summary>{t("Booking Owner", "صاحب الحجز")}</summary>
        <fieldset className={styles.filterChoices}>
          <legend className="sr-only">
            {t("Booking Owner", "صاحب الحجز")}
          </legend>
          {["all", "mine"].map((owner) => (
            <label key={owner} className={styles.check}>
              <input
                type="radio"
                name="booking-owner"
                checked={value.owner === owner}
                onChange={() => onChange({ ...value, owner })}
              />
              {owner === "all"
                ? t("All", "الكل")
                : t("My Booking", "حجوزاتي")}
            </label>
          ))}
        </fieldset>
      </details>
      {(
        [
          ["traveller", t("Traveller", "المسافر")],
          ["destination", t("Destination", "الوجهة")],
          ["reference", t("Agency Reference", "مرجع الوكالة")],
        ] as const
      ).map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          />
        </label>
      ))}
      <button className={styles.primary}>{t("Apply", "تطبيق")}</button>
      <button type="button" className={styles.secondary} onClick={onReset}>
        {t("Reset filters", "إعادة ضبط التصفية")}
      </button>
    </form>
  );
}
