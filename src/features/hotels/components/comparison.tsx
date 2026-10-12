import { useRef } from "react";
import { useHotelPreferences } from "@/features/preferences/use-hotel-preferences";
import { useLocale } from "@/features/localization/locale-provider";
import { savedHotelCatalog } from "@/features/preferences/saved-hotel-catalog";
import styles from "../hotels.module.css";
export function Comparison() {
  const { ids, clear } = useHotelPreferences("comparison");
  const { locale, t } = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const selected = savedHotelCatalog.filter((h) => ids.includes(h.id));
  if (!selected.length) return null;
  return (
    <>
      <div className={styles.compareBar}>
        <span>
          {selected.length} {t("selected for comparison", "فنادق للمقارنة")}
        </span>
        <button
          className={styles.primary}
          disabled={selected.length < 2}
          onClick={() => dialog.current?.showModal()}
        >
          {t("Compare hotels", "مقارنة الفنادق")}
        </button>
        <button className={styles.secondary} onClick={clear}>
          {t("Clear", "مسح")}
        </button>
      </div>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="comparison-title"
      >
        <h2 id="comparison-title">
          {t("Sample hotel comparison", "مقارنة فنادق تجريبية")}
        </h2>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>{t("Hotel", "الفندق")}</th>
                {selected.map((h) => (
                  <th key={h.id}>{h.name[locale]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  t("Nightly price (USD)", "السعر لليلة (دولار)"),
                  ...selected.map((h) => h.nightlyRate),
                ],
                [t("Stars", "النجوم"), ...selected.map((h) => h.stars ?? "—")],
                [
                  t("Review score / 5", "تقييم النزلاء / ٥"),
                  ...selected.map((h) => h.reviewScore),
                ],
                [
                  t("Breakfast", "الإفطار"),
                  ...selected.map((h) =>
                    h.breakfast === undefined
                      ? t("Not specified", "غير محدد")
                      : h.breakfast
                        ? t("Included", "مشمول")
                        : t("Not included", "غير مشمول"),
                  ),
                ],
              ].map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th key={i} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={i}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          className={styles.primary}
          onClick={() => dialog.current?.close()}
        >
          {t("Close", "إغلاق")}
        </button>
      </dialog>
    </>
  );
}
