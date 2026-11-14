import { useId, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import { findDestination } from "../data/destinations";
import styles from "../hotels.module.css";

/**
 * Below tablet width the stay form folds into a one-line summary so results come first. The form
 * stays mounted while folded, so its values survive; at desktop widths this renders as the plain form.
 */
export function CollapsibleSearch({ criteria, showDestination = true, children }: {
  criteria?: { destination?: string; checkIn?: string; checkOut?: string; rooms?: readonly { adults: number; childAges: readonly unknown[] }[] } | null;
  showDestination?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const panel = useId();
  const date = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
  const rooms = criteria?.rooms ?? [];
  const guests = rooms.reduce((total, room) => total + room.adults + room.childAges.length, 0);
  const destination = criteria?.destination;
  const place = findDestination(destination);
  return (
    <div className={styles.collapsibleSearch} data-open={open}>
      <div className={styles.searchSummary}>
        <p>
          {showDestination && <strong><Icon name="pin" />{place ? t(place.name.en, place.name.ar) : destination ? t(destination) : t("All destinations", "كل الوجهات")}</strong>}
          <span><bdi>{criteria?.checkIn && criteria.checkOut ? `${date(criteria.checkIn)} – ${date(criteria.checkOut)}` : t("Dates not set", "لم تُحدد التواريخ")}</bdi></span>
          {guests > 0 && <span>{t(`${guests} guests, ${rooms.length} ${rooms.length === 1 ? "room" : "rooms"}`, `${guests} نزلاء، ${rooms.length} غرف`)}</span>}
        </p>
        <button type="button" className={styles.secondary} aria-expanded={open} aria-controls={panel} onClick={() => setOpen(current => !current)}>
          <Icon name={open ? "close" : "search"} />{open ? t("Close search", "إغلاق البحث") : t("Edit search", "تعديل البحث")}
        </button>
      </div>
      <div id={panel} className={styles.searchPanel}>{children(() => setOpen(false))}</div>
    </div>
  );
}
