import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import { useDemo } from "@/features/demo/demo-provider";
import { RentalShell, RentalSummary, MissingSelection } from "./rental-layout";
import { driverSchema, type RentalDriver } from "./rental-model";

export function NumberedHeading({ number, icon, title, description }: { number: number; icon: "people" | "pin" | "document" | "car" | "shield"; title: string; description?: string }) {
  return <div className="rental-numbered-heading"><span className="rental-section-number">{number}</span><Icon name={icon} /><div><h2>{title}</h2>{description && <p>{description}</p>}</div></div>;
}
export function RentalDriverPage() {
  const { t } = useLocale();
  const { rentalSelection, rentalDriver, saveRentalDriver } = useDemo();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<RentalDriver>({
    resolver: zodResolver(driverSchema),
    defaultValues: rentalDriver ?? { name: "", email: "", phone: "", requests: "", acknowledged: false },
  });
  return <RentalShell title={t("Passenger & Trip Details", "بيانات الراكب والرحلة")}>
    {!rentalSelection ? <MissingSelection /> : <div className="rental-booking-layout">
      <form className="rental-panel rental-passenger-form" noValidate onSubmit={handleSubmit(value => { saveRentalDriver(value); navigate("/car-rental/review"); })}>
        <section className="rental-form-section">
          <NumberedHeading number={1} icon="people" title={t("Passenger Information", "معلومات الراكب")} description={t("Enter fictional contact information for this booking preview.", "أدخل بيانات تواصل وهمية لمعاينة الحجز.")} />
          <div className="rental-form-fields">{([
            ["name", "Driver name", "اسم السائق", "text"],
            ["email", "Driver email", "بريد السائق", "email"],
            ["phone", "Driver phone", "هاتف السائق", "tel"],
          ] as const).map(([name, en, ar, type]) => <label key={name}>{t(en, ar)}<input {...register(name)} type={type} aria-label={t(en, ar)} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `driver-${name}-error` : undefined} />{errors[name] && <span id={`driver-${name}-error`} role="alert" className="field-error">{t(errors[name].message!, "أدخل بيانات تجريبية صالحة لهذا الحقل.")}</span>}</label>)}</div>
        </section>
        <section className="rental-form-section">
          <NumberedHeading number={2} icon="pin" title={t("Pickup Details", "تفاصيل الاستلام")} description={t("Your selected self-drive rental pickup.", "مكان استلام سيارة القيادة الذاتية المحدد.")} />
          <div className="rental-readonly-fields"><div><small>{t("Pickup location", "مكان الاستلام")}</small><strong>{t(rentalSelection.criteria.pickup)}</strong></div><div><small>{t("Pickup date", "تاريخ الاستلام")}</small><bdi>{rentalSelection.criteria.start}</bdi></div><Link to={`/car-rental/search?${new URLSearchParams(rentalSelection.criteria)}`}>{t("Edit trip", "تعديل الرحلة")}<Icon name="arrowRight" /></Link></div>
        </section>
        <section className="rental-form-section">
          <NumberedHeading number={3} icon="pin" title={t("Return Details", "تفاصيل الإعادة")} />
          <div className="rental-readonly-fields"><div><small>{t("Return location", "مكان الإعادة")}</small><strong>{t(rentalSelection.criteria.dropoff)}</strong></div><div><small>{t("Return date", "تاريخ الإعادة")}</small><bdi>{rentalSelection.criteria.end}</bdi></div></div>
        </section>
        <section className="rental-form-section">
          <NumberedHeading number={4} icon="document" title={t("Additional Requests", "طلبات إضافية")} description={t("Requests are subject to confirmation; no extras are priced here.", "الطلبات تخضع للتأكيد؛ لا تُسعر إضافات هنا.")} />
          <label>{t("Special requests (optional)", "طلبات خاصة (اختياري)")}<textarea maxLength={500} rows={3} {...register("requests")} /><small>{t("Up to 500 characters", "حتى ٥٠٠ حرف")}</small></label>
          <label className="rental-check"><input type="checkbox" {...register("acknowledged")} />{t("These are fictional driver details", "هذه بيانات سائق وهمية")}</label>
          {errors.acknowledged && <p role="alert" className="field-error">{t(errors.acknowledged.message!, "أكد أن البيانات وهمية.")}</p>}
        </section>
        <div className="rental-form-actions"><Link className="button button--outline" to="/car-rental/summary"><Icon name="back" />{t("Back to Vehicle Details", "العودة لتفاصيل السيارة")}</Link><button className="rental-primary-button">{t("Continue to review booking", "المتابعة لمراجعة الحجز")}<Icon name="arrowRight" /></button></div>
      </form>
      <RentalSummary selection={rentalSelection} />
    </div>}
  </RentalShell>;
}
