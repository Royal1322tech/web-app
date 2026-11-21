import { useLocale } from "@/features/localization/locale-provider";
import type { GroupRequest, GroupRequestService, GroupRequestStatus } from "./group-request-types";
import "./group-requests.css";

export function GroupStatusBadge({ status }: { status: GroupRequestStatus }) {
  const { t } = useLocale();
  const labels: Record<GroupRequestStatus, string> = {
    saved_locally: t("Saved locally", "محفوظ محليًا"),
    under_review: t("Under Review", "قيد المراجعة"),
    quotation_sent: t("Quotation Sent", "تم إرسال العرض"),
    in_discussion: t("In Discussion", "قيد المناقشة"),
    closed: t("Closed", "مغلق"),
  };
  return <span className="group-status" data-status={status}>{labels[status]}</span>;
}

export function GroupOrigin({ origin }: { origin: GroupRequest["origin"] }) {
  const { t } = useLocale();
  return <span className="group-origin">{origin === "sample" ? t("Example request", "طلب مثال") : t("This session only", "هذه الجلسة فقط")}</span>;
}

export function useServiceLabel() {
  const { t } = useLocale();
  const labels: Record<GroupRequestService, string> = {
    both: t("Hotels and transportation", "فنادق ونقل"),
    hotels: t("Hotels", "فنادق"),
    transport: t("Transportation", "نقل"),
  };
  return (service: GroupRequestService) => labels[service];
}
