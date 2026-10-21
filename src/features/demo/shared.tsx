import { hotelDisplayName, hotelDisplayAddress } from "@/features/hotels/lib/presentation";
import { cancellationPolicyLabels } from "@/features/hotels/cancellation-policy";
import type { ReactNode } from "react";
import { CatalogShell } from "@/features/hotels/components/catalog-shell";
import { useLocale } from "@/features/localization/locale-provider";
import { hotels } from "@/features/hotels/data/hotels.fixture";
import { boardPlanLabels } from "@/features/hotels/lib/board-plan-definitions";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { samplePriceBreakdown } from "@/features/hotels/lib/sample-stay";
import { totalFor } from "./demo-provider";
import type { DemoSelection, DemoStatus } from "./types";
import "./workspace.css";
export function useMoney() {
  const { locale } = useLocale();
  return (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
    }).format(amount);
}
export function Workspace({
  title,
  eyebrow,
  hideHeading = false,
  showPreview = false,
  publicHeader = false,
  accountNavigation = true,
  breadcrumb,
  trail,
  children,
}: {
  title: string;
  eyebrow?: string;
  hideHeading?: boolean;
  showPreview?: boolean;
  publicHeader?: boolean;
  /** Transactional flows hide the account navigation to keep focus on the task. */
  accountNavigation?: boolean;
  /** Short navigation label when the page title is a longer headline. */
  breadcrumb?: string;
  trail?: readonly { to: string; label: string }[];
  children: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <CatalogShell title={breadcrumb ?? title} trail={trail} workspace={!publicHeader && accountNavigation} showPreview={showPreview} publicHeader={publicHeader}>
      <div className="workspace">
        {!hideHeading && <><p className="workspace-eyebrow">
          {eyebrow ??
            t(
              "ROYAL VACATION · PARTNER WORKSPACE",
              "رويال فاكيشن · مساحة الشركاء",
            )}
        </p>
        <h1>{title}</h1></>}
        {children}
      </div>
    </CatalogShell>
  );
}
export function StatusBadge({ status }: { status: DemoStatus | "completed" }) {
  const { t } = useLocale();
  const labels = {
    confirmed: t("Confirmed", "مؤكد"),
    pending: t("Pending", "معلق"),
    failed: t("Failed", "فشل"),
    cancelled: t("Cancelled", "ملغى"),
    completed: t("Completed", "مكتمل"),
  };
  return (
    <span className={`status-badge status-badge--${status}`}>
      {labels[status]}
    </span>
  );
}
export function SelectionSummary({ selection }: { selection: DemoSelection }) {
  const { locale, t } = useLocale();
  const money = useMoney();
  const hotel = hotels.find((h) => h.id === selection.hotelId);
  if (!hotel) return null;
  const nights = samplePriceBreakdown(
    selection.rate.nightlyRate,
    selection.criteria,
  ).nights;
  return (
    <aside className="workspace-card selection-summary">
      <ResponsiveImage
        src={hotel.photos[0].src}
        alt={hotelDisplayName(hotel.name[locale])}
        width={hotel.photos[0].width}
        height={hotel.photos[0].height}
        sizes="(max-width: 800px) 100vw, 340px"
        eager
      />
      <p className="workspace-eyebrow">
        {t("YOUR SELECTED STAY", "إقامتك المختارة")}
      </p>
      {hotel.inventoryType === "demo" && <span className="hotel-demo-indicator">{t("Demo inventory", "بيانات تجريبية")}</span>}
      <h2>{hotelDisplayName(hotel.name[locale])}</h2>
      <p>{hotelDisplayAddress(hotel.address[locale], locale)}</p>
      <hr />
      <h3>{hotelDisplayName(selection.room.name[locale])}</h3>
      <p>{boardPlanLabels[selection.rate.boardPlan][locale]}</p>
      <dl className="summary-dl">
        <div>
          <dt>{t("Check in", "الوصول")}</dt>
          <dd>
            <bdi>{selection.criteria.checkIn}</bdi>
          </dd>
        </div>
        <div>
          <dt>{t("Check out", "المغادرة")}</dt>
          <dd>
            <bdi>{selection.criteria.checkOut}</bdi>
          </dd>
        </div>
        <div>
          <dt>{t("Rooms / nights", "الغرف / الليالي")}</dt>
          <dd>
            {selection.criteria.rooms.length} / {nights}
          </dd>
        </div>
        <div>
          <dt>{t("Adults / children", "البالغون / الأطفال")}</dt>
          <dd>
            {selection.criteria.rooms.reduce((n, r) => n + r.adults, 0)} /{" "}
            {selection.criteria.rooms.reduce(
              (n, r) => n + r.childAges.length,
              0,
            )}
          </dd>
        </div>
        <div>
          <dt>{t("Per room / night", "لكل غرفة / ليلة")}</dt>
          <dd>
            <bdi>{money(selection.rate.nightlyRate)}</bdi>
          </dd>
        </div>
        <div className="summary-total">
          <dt>{t("Stay total", "إجمالي الإقامة")}</dt>
          <dd>
            <bdi>{money(totalFor(selection))}</bdi>
          </dd>
        </div>
      </dl>
      <section className="summary-policy"><h3>{t("Cancellation terms", "شروط الإلغاء")}</h3><p>{cancellationPolicyLabels[selection.rate.cancellationPolicy?.kind ?? "unavailable"][locale]}</p></section>
      <p className="fine-print">
        {t(
          "Illustrative subtotal; taxes and fees are not included.",
          "إجمالي توضيحي؛ لا يشمل الضرائب والرسوم.",
        )}
      </p>
    </aside>
  );
}
