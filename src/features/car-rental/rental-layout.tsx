import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { Workspace, useMoney } from "@/features/demo/shared";
import { Icon } from "@/components/ui/icon";
import { SystemState } from "@/components/ui/system-state";
import { RentalHero, VehiclePhoto, VehicleFacts, vehicleName } from "./rental-presentation";
import { demoVehicles, rentalDays, rentalTotal, type RentalSelection } from "./rental-model";

export function RentalShell({
  title,
  children,
  showHero = true,
  customProgress,
}: {
  title: string;
  children: ReactNode;
  showHero?: boolean;
  customProgress?: ReactNode;
}) {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const steps = [
    ["/car-rental/summary", t("Vehicle Selection", "اختيار السيارة")],
    ["/car-rental/driver", t("Passenger Details", "بيانات الراكب")],
    ["/car-rental/review", t("Review Booking", "مراجعة الحجز")],
    ["/car-rental/payment", t("Confirmation", "التأكيد")],
  ];
  const inFlow = steps.some(([path]) => pathname === path) || pathname.startsWith("/car-rental/bookings/");
  const progress = inFlow ? <ol className="booking-progress rental-progress" aria-label={t("Rental progress", "خطوات التأجير")}>
    {steps.map(([path, label], index) => <li key={path} aria-current={pathname === path || (index === 3 && pathname.startsWith("/car-rental/bookings/")) ? "step" : undefined}><span>{index + 1}</span>{label}</li>)}
  </ol> : null;
  return (
    <Workspace title={title} hideHeading showPreview={false}>
      <div className="rental-reference-shell">
      {showHero && <RentalHero compact title={title.replace(/ · (demo|simulation|تجريبي|محاكاة)/g, "")} primary>{customProgress ?? progress}</RentalHero>}
      <nav
        className="rental-nav"
        aria-label={t("Rental navigation", "التنقل في التأجير")}
      >
        <Link to="/car-rental">{t("Car Rental", "تأجير السيارات")}</Link>
        <Link to="/car-rental/search">
          {t("Vehicle search", "البحث عن سيارة")}
        </Link>
        <Link to="/car-rental/bookings">
          {t("Rental records", "سجلات التأجير")}
        </Link>
      </nav>
      {children}
      </div>
    </Workspace>
  );
}
export function RentalSummary({ selection, action }: { selection: RentalSelection; action?: ReactNode }) {
  const { t, locale } = useLocale();
  const money = useMoney();
  const vehicle = demoVehicles.find((v) => v.id === selection.vehicleId)!;
  return (
    <section className="workspace-card rental-summary">
      <div className="rental-summary-heading"><Icon name="document" /><h3>{t("Your booking summary", "ملخص حجزك")}</h3></div>
      <VehiclePhoto vehicle={vehicle} />
      <h2>{vehicleName(vehicle, locale)}</h2>
      <span className="rental-service-badge">{t("Self-Drive", "قيادة ذاتية")}</span>
      <VehicleFacts vehicle={vehicle} />
      <dl className="summary-dl">
        <div>
          <dt>{t("Pickup", "الاستلام")}</dt>
          <dd>
            {t(selection.criteria.pickup)} · <bdi>{selection.criteria.start}</bdi>
          </dd>
        </div>
        <div>
          <dt>{t("Return", "الإعادة")}</dt>
          <dd>
            {t(selection.criteria.dropoff)} · <bdi>{selection.criteria.end}</bdi>
          </dd>
        </div>
        <div>
          <dt>
            {t("Days × daily rate", "الأيام × السعر اليومي")}
          </dt>
          <dd>
            {rentalDays(selection.criteria)} × <bdi>{money(vehicle.daily)}</bdi>
          </dd>
        </div>
        <div>
          <dt>{t("Rental subtotal", "إجمالي التأجير")}</dt>
          <dd>
            <bdi>{money(rentalTotal(selection))}</bdi>
          </dd>
        </div>
      </dl>
      <details className="rental-summary-policy" open><summary>{t("Cancellation Policy", "سياسة الإلغاء")}</summary><p>{t("Policy not provided. No cancellation or refund guarantee.", "السياسة غير متوفرة. لا يوجد ضمان للإلغاء أو الاسترداد.")}</p></details>
      {action}
      <p>
        {t(
          "Illustrative subtotal; taxes, insurance and supplier terms are not included.",
          "إجمالي توضيحي؛ لا يشمل الضرائب أو التأمين أو شروط المورد.",
        )}
      </p>
    </section>
  );
}
export function MissingSelection() {
  const { t } = useLocale();
  return (
    <SystemState
      title={t("Choose a vehicle first", "اختر سيارة أولًا")}
      description={t(
        "Your selections are kept for this session.",
        "تُحفظ اختياراتك خلال هذه الجلسة.",
      )}
    >
      <Link to="/car-rental/search" className="button button--primary">
        {t("Vehicle search", "البحث عن سيارة")}
      </Link>
    </SystemState>
  );
}
