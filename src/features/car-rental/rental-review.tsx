import { Link, Navigate } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { useDemo } from "@/features/demo/demo-provider";
import { Icon } from "@/components/ui/icon";
import { RentalShell, RentalSummary, MissingSelection } from "./rental-layout";
import { NumberedHeading } from "./rental-passenger";
import { VehiclePhoto, VehicleFacts, vehicleName } from "./rental-presentation";
import { demoVehicles, rentalQuery } from "./rental-model";

export function RentalReviewPage() {
  const { t, locale } = useLocale();
  const { rentalSelection, rentalDriver, rentalPolicyAcknowledged, acknowledgeRentalPolicy } = useDemo();
  if (rentalSelection && !rentalDriver) return <Navigate to="/car-rental/driver" replace />;
  const vehicle = demoVehicles.find(v => v.id === rentalSelection?.vehicleId);
  const continueAction = rentalPolicyAcknowledged ? <Link className="rental-primary-button" to="/car-rental/payment">{t("Continue to rental payment preview", "المتابعة لمعاينة دفع التأجير")}<Icon name="arrowRight" /></Link> : <button className="rental-primary-button" disabled>{t("Continue to rental payment preview", "المتابعة لمعاينة دفع التأجير")}<Icon name="arrowRight" /></button>;
  return <RentalShell title={t("Almost There!", "اقتربنا من الانتهاء!")}>
    {!rentalSelection || !rentalDriver || !vehicle ? <MissingSelection /> : <div className="rental-booking-layout">
      <div className="rental-panel rental-review-sections">
        <section className="rental-form-section">
          <NumberedHeading number={1} icon="car" title={t("Vehicle Summary", "ملخص السيارة")} />
          <div className="rental-review-vehicle"><VehiclePhoto vehicle={vehicle} /><div><h3>{vehicleName(vehicle, locale)}</h3><span className="rental-service-badge">{t("Self-Drive", "قيادة ذاتية")}</span><VehicleFacts vehicle={vehicle} /></div></div>
        </section>
        <section className="rental-form-section">
          <div className="rental-review-section-top"><NumberedHeading number={2} icon="pin" title={t("Trip Details", "تفاصيل الرحلة")} /><Link className="rental-edit" to={`/car-rental/search?${rentalQuery(rentalSelection.criteria)}`}>{t("Edit trip", "تعديل الرحلة")}<Icon name="document" /></Link></div>
          <div className="rental-review-route"><div><Icon name="pin" /><span><small>{t("Pickup location", "مكان الاستلام")}</small><strong>{t(rentalSelection.criteria.pickup)}</strong><bdi>{rentalSelection.criteria.start}</bdi></span></div><div><Icon name="pin" /><span><small>{t("Return location", "مكان الإعادة")}</small><strong>{t(rentalSelection.criteria.dropoff)}</strong><bdi>{rentalSelection.criteria.end}</bdi></span></div></div>
        </section>
        <section className="rental-form-section">
          <div className="rental-review-section-top"><NumberedHeading number={3} icon="people" title={t("Passenger Information", "معلومات الراكب")} /><Link className="rental-edit" to="/car-rental/driver">{t("Edit contact details", "تعديل بيانات التواصل")}<Icon name="document" /></Link></div>
          <dl className="rental-contact-review"><div><dt>{t("Full name", "الاسم الكامل")}</dt><dd>{rentalDriver.name}</dd></div><div><dt>{t("Email", "البريد الإلكتروني")}</dt><dd><bdi>{rentalDriver.email}</bdi></dd></div><div><dt>{t("Phone", "الهاتف")}</dt><dd><bdi>{rentalDriver.phone}</bdi></dd></div></dl>
        </section>
        <section className="rental-form-section">
          <div className="rental-review-section-top"><NumberedHeading number={4} icon="document" title={t("Special Requests", "طلبات خاصة")} /><Link className="rental-edit" to="/car-rental/driver">{t("Edit requests", "تعديل الطلبات")}</Link></div>
          <p className="rental-request-copy">{rentalDriver.requests || t("None provided", "لا توجد طلبات")}</p>
        </section>
        <section className="rental-form-section">
          <NumberedHeading number={5} icon="shield" title={t("Cancellation Policy & Terms", "سياسة الإلغاء والشروط")} />
          <details className="rental-review-policy" open><summary>{t("Policy not provided", "السياسة غير متوفرة")}</summary><p>{t("Cancellation policy not provided. No free cancellation, refund or cancellation fee is guaranteed for this fictional rental. Supplier terms are not available.", "لم تُقدّم سياسة إلغاء. لا يوجد ضمان للإلغاء المجاني أو الاسترداد أو رسوم الإلغاء لهذا التأجير الوهمي. شروط المورد غير متوفرة.")}</p></details>
          <label className="rental-check"><input type="checkbox" checked={rentalPolicyAcknowledged} onChange={e => acknowledgeRentalPolicy(e.target.checked)} />{t("I have reviewed the cancellation policy information.", "راجعت معلومات سياسة الإلغاء.")}</label>
        </section>
        <div className="rental-form-actions"><Link className="button button--outline" to="/car-rental/driver"><Icon name="back" />{t("Back to passenger details", "العودة لبيانات الراكب")}</Link></div>
      </div>
      <RentalSummary selection={rentalSelection} action={continueAction} />
    </div>}
  </RentalShell>;
}
