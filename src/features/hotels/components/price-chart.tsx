import { useState } from "react";
import { useLocale } from "@/features/localization/locale-provider";
import { sampleDailyPrices } from "../data/prices.fixture";
import styles from "../hotels.module.css";

export function PriceChart({ compact = false }: { compact?: boolean }) {
  const { t, locale } = useLocale();
  const [selected, setSelected] = useState<string | null>(null);
  const selectedPrice = sampleDailyPrices.find(
    (price) => price.date === selected,
  );
  return (
    <section className={compact ? styles.compactChart : styles.detailSection}>
      <h2>{t("Price by date", "السعر حسب التاريخ")}</h2>
      <p className={styles.muted}>
        {t(
          "Illustrative nightly rates in USD; availability requires supplier confirmation.",
          "أسعار ليلية توضيحية بالدولار؛ التوافر يتطلب تأكيد المورد.",
        )}
      </p>
      <div className={styles.chartFrame}>
        <div className={styles.chartAxis} aria-hidden="true">
          {[3000, 2500, 2000, 1500, 1000, 500, 0].map((value) => (
            <span key={value}>{value.toLocaleString(locale)} $</span>
          ))}
        </div>
        <div
          className={styles.chart}
          role="group"
          aria-label={t(
            "Illustrative nightly rates in USD",
            "أسعار الليالي التجريبية بالدولار",
          )}
        >
          {(compact ? sampleDailyPrices.slice(0, 10) : sampleDailyPrices).map(
            (price) => {
              const date = new Date(`${price.date}T00:00:00Z`);
              const label = date.toLocaleDateString(locale, {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              });
              const available = price.availability === "available";
              return (
                <button
                  key={price.date}
                  aria-label={`${label}: ${price.amount} USD — ${available ? t("Listed", "مدرج") : t("Not listed", "غير مدرج")}`}
                  aria-pressed={selected === price.date}
                  onClick={() => setSelected(price.date)}
                >
                  <span className={styles.plotColumn}>
                    <span
                      className={styles.bar}
                      style={{ height: `${(price.amount / 3000) * 100}%` }}
                    />
                  </span>
                  <span className={styles.chartDate} data-available={available}>
                    <span>{label}</span>
                    <span>
                      {date.toLocaleDateString(locale, {
                        weekday: "short",
                        timeZone: "UTC",
                      })}
                    </span>
                  </span>
                </button>
              );
            },
          )}
        </div>
      </div>
      <div className={styles.chartLegend}>
        <span>
          <i />
          {t("Listed", "مدرج")}
        </span>
        <span>
          <i />
          {t("Not listed", "غير مدرج")}
        </span>
      </div>
      <p className={styles.muted} role="status">
        {selectedPrice
          ? `${t("Nightly rate", "السعر لليلة")}: $${selectedPrice.amount} — ${t("Booking unavailable", "الحجز غير متاح")}`
          : t("No date selected", "لم يتم اختيار تاريخ")}
      </p>
    </section>
  );
}
