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
  enquiry = false,
  customProgress,
}: {
  title: string;
  children: ReactNode;
  showHero?: boolean;
  enquiry?: boolean;
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
      <p className="rental-page-disclosure">{enquiry ? t("Local enquiry preview · Nothing is sent. No vehicle availability, trip price or booking is confirmed. Use fictional details.", "معاينة استفسار محلية · لا يُرسل شيء. لا توافر أو سعر رحلة أو حجز مؤكد. استخدم بيانات وهمية.") : t("Frontend demonstration · Illustrative vehicles and USD rates. No reservation, payment or supplier confirmation. Use fictional details.", "عرض واجهة تجريبي · سيارات وأسعار توضيحية بالدولار. لا حجز أو دفع أو تأكيد مورد. استخدم بيانات وهمية.")}</p>
      <nav
        className="rental-nav"
        aria-label={t("Rental navigation", "التنقل في التأجير")}
      >
        <Link to="/car-rental">{t("Car Rental", "تأجير السيارات")}</Link>
        <Link to="/car-rental/search">
          {t("Vehicle search", "البحث عن سيارة")}
        </Link>
        <Link to="/car-rental/bookings">
          {t("Demo rentals", "التأجيرات التجريبية")}
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
            {t("Days × daily sample rate", "الأيام × السعر اليومي التجريبي")}
          </dt>
          <dd>
            {rentalDays(selection.criteria)} × <bdi>{money(vehicle.daily)}</bdi>
          </dd>
        </div>
        <div>
          <dt>{t("Demo subtotal", "الإجمالي التجريبي")}</dt>
          <dd>
            <bdi>{money(rentalTotal(selection))}</bdi>
          </dd>
        </div>
      </dl>
      <details className="rental-summary-policy" open><summary>{t("Cancellation Policy", "سياسة الإلغاء")}</summary><p>{t("Policy not provided. No cancellation or refund guarantee.", "السياسة غير متوفرة. لا يوجد ضمان للإلغاء أو الاسترداد.")}</p></details>
      {action}
      <p>
        {t(
          "Not a payable quote. Vehicle, price and availability are fictional. No real cancellation or insurance terms are supplied.",
          "ليس عرضًا قابلًا للدفع. السيارة والسعر والتوافر أمثلة وهمية. لا توجد شروط فعلية للإلغاء أو التأمين.",
        )}
      </p>
    </section>
  );
}
export function MissingSelection() {
  const { t } = useLocale();
  return (
    <SystemState
      title={t("Choose a demo vehicle first", "اختر سيارة تجريبية أولًا")}
      description={t(
        "Selections and rental records reset on refresh or Sign Out.",
        "تُمسح الاختيارات وسجلات التأجير عند التحديث أو تسجيل الخروج.",
      )}
    >
      <Link to="/car-rental/search" className="button button--primary">
        {t("Vehicle search", "البحث عن سيارة")}
      </Link>
    </SystemState>
  );
}
