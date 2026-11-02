import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";

/** The pause and play control for an auto-rotating hero. Reduced motion never rotates, so it has nothing to control. */
export function RotationToggle({ paused, reduced, onToggle, className = "" }: { paused: boolean; reduced: boolean; onToggle: () => void; className?: string }) {
  const { t } = useLocale();
  if (reduced) return null;
  return (
    <button type="button" className={`hero-rotation-toggle ${className}`} onClick={onToggle}>
      <Icon name={paused ? "playFilled" : "pauseFilled"} />
      <span className="sr-only">{paused ? t("Play image rotation", "تشغيل تبديل الصور") : t("Pause image rotation", "إيقاف تبديل الصور مؤقتًا")}</span>
    </button>
  );
}
