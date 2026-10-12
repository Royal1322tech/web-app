import { Link } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { useHotelPreferences } from "@/features/preferences/use-hotel-preferences";
import { savedHotelCatalog } from "@/features/preferences/saved-hotel-catalog";
import { CatalogShell } from "./catalog-shell";
import { HotelResultCard } from "./hotel-result-card";
import { Comparison } from "./comparison";
import styles from "../hotels.module.css";
export function Favourites() {
  const { t } = useLocale();
  const { ids } = useHotelPreferences("favourites");
  const selected = savedHotelCatalog.filter((h) => ids.includes(h.id));
  return (
    <CatalogShell title={t("Favourites", "المفضلة")}>
      <h1 className="sr-only">{t("Favourites", "المفضلة")}</h1>
      <p className={styles.muted}>
        {t("Saved on this browser only.", "محفوظة في هذا المتصفح فقط.")}
      </p>
      <div className={styles.results}>
        {selected.map((h) => (
          <HotelResultCard key={h.id} hotel={h} favourite />
        ))}
      </div>
      {!selected.length && (
        <div className={styles.empty}>
          <h2>{t("No favourites yet", "لا توجد مفضلة بعد")}</h2>
          <p>
            {t(
              "Save a hotel using its heart button.",
              "احفظ فندقاً بالضغط على زر القلب.",
            )}
          </p>
          <Link to="/search" className={styles.primary}>
            {t("Explore hotels", "استكشف الفنادق")}
          </Link>
        </div>
      )}
      <Comparison />
    </CatalogShell>
  );
}
