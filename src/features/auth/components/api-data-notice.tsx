import { useLocation } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { apiHotelSearchEnabled } from "@/features/hotels/hotel-search-config";

/** Pages whose content comes from the signed-in account. Everything else still shows sample data. */
const connected: Record<string, "live" | "partial"> = {
  "/profile": "live",
  "/agency": "partial",
  "/agency/edit": "partial",
  // Hotel search results come from the company hotel search API in builds that enable it.
  ...(apiHotelSearchEnabled ? { "/search": "live" as const } : {}),
};

/** Real sign-in builds only: says plainly which pages aren't connected to the account yet. */
export function ApiDataNotice() {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const state = connected[pathname.replace(/\/$/, "") || "/"];
  if (state === "live") return null;
  return (
    <p className="api-data-notice" role="note">
      {state === "partial"
        ? t("Your company details come from your account. Bookings and other activity on this page are sample data.", "بيانات شركتك مأخوذة من حسابك. الحجوزات والأنشطة الأخرى في هذه الصفحة بيانات تجريبية.")
        : t("Sample data: this page isn't connected to your account yet.", "بيانات تجريبية: هذه الصفحة غير مرتبطة بحسابك بعد.")}
    </p>
  );
}
