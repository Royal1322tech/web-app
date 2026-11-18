import { useLocation } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";

/** Pages that mix account data with sample data, so they say which part is which. */
const partial = new Set(["/agency", "/agency/edit"]);

/**
 * Real sign-in builds only: on the agency pages, says that the company details are real and the rest is
 * sample data. Other pages show no banner (the general "Sample data" banner was removed at the owner's
 * request).
 */
export function ApiDataNotice() {
  const { t } = useLocale();
  const { pathname } = useLocation();
  if (!partial.has(pathname.replace(/\/$/, "") || "/")) return null;
  return (
    <p className="api-data-notice" role="note">
      {t("Your company details come from your account. Bookings and other activity on this page are sample data.", "بيانات شركتك مأخوذة من حسابك. الحجوزات والأنشطة الأخرى في هذه الصفحة بيانات تجريبية.")}
    </p>
  );
}
