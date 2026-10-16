import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import "./points-indicator.css";

/** No hotel-specific earning rules exist in phase one. Never promise a reward. */
export function PointsIndicator() {
  const { t } = useLocale();
  return <span className="hotel-points" title={t("Points information only. This stay does not earn points; automatic earning and redemption are unavailable.", "معلومات النقاط فقط. هذه الإقامة لا تكسب نقاطًا؛ الكسب التلقائي والاستبدال غير متاحين.")}>
    <Icon name="star" />{t("Points · information only", "النقاط · معلومات فقط")}
  </span>;
}
