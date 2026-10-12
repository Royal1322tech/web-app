import { useState, type ReactNode } from "react";
import { useLocale } from "@/features/localization/locale-provider";
import styles from "../home.module.css";

export function UnavailableButton({
  children,
  label,
  className,
  message = "This feature is not available yet.",
}: {
  children: ReactNode;
  label?: string;
  className?: string;
  message?: string;
}) {
  const { t } = useLocale();
  const [notice, setNotice] = useState(false);
  return (
    <span className={styles.actionNotice}>
      <button
        type="button"
        className={className}
        aria-label={label}
        onClick={() => setNotice(!notice)}
      >
        {children}
      </button>
      <span role="status">
        {notice && (
          <span className={styles.noticeBubble}>
            {t(message, "هذه الخدمة غير متاحة حالياً.")}
          </span>
        )}
      </span>
    </span>
  );
}
