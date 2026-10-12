import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import styles from "../hotels.module.css";

export function CartPreviewButton() {
  const { t } = useLocale();
  const [notice, setNotice] = useState(false);
  return (
    <div className={styles.cartAction}>
      <button
        type="button"
        className={styles.primary}
        onClick={() => setNotice(true)}
      >
        <Icon name="cart" />
        {t("Add To Cart", "أضف إلى السلة")}
      </button>
      <span role="status" className={styles.muted}>
        {notice &&
          t(
            "Cart is not connected yet. Nothing has been added.",
            "السلة غير متصلة بعد. لم تتم إضافة أي شيء.",
          )}
      </span>
    </div>
  );
}
