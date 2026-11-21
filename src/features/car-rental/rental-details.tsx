import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { SystemState } from "@/components/ui/system-state";
import { useLocale } from "@/features/localization/locale-provider";
import { useDemo } from "@/features/demo/demo-provider";
import { RentalShell, RentalSummary, MissingSelection } from "./rental-layout";
import { VehicleFacts, vehicleImages, vehicleName } from "./rental-presentation";
import { demoVehicles, readRentalQuery, rentalQuery } from "./rental-model";

export function VehicleDetailsPage() {
  const { id } = useParams();
  const { search } = useLocation();
  const { locale, t } = useLocale();
  const navigate = useNavigate();
  const { selectRental } = useDemo();
  const vehicle = demoVehicles.find(v => v.id === id);
  const parsed = readRentalQuery(search);
  const ready = vehicle && parsed.success;
  return <RentalShell title={t("Vehicle details", "تفاصيل السيارة")} showHero={!ready}>
    {!vehicle ? <SystemState title={t("Vehicle not found", "السيارة غير موجودة")} description={t("Return to vehicle search.", "ارجع للبحث عن سيارة.")} /> : !parsed.success ? <MissingSelection /> : (
      <div className="rental-reference-details">
        <div className="rental-detail-main">
          <section className="rental-cinematic-vehicle">
            <img src={vehicleImages[vehicle.id]} alt={t("Vehicle photo for reference", "صورة السيارة للاسترشاد")} width="1200" height="800" />
            <div className="rental-cinematic-copy">
              <Link to={`/car-rental/search?${rentalQuery(parsed.data)}`}><Icon name="back" />{t("Back to Search Results", "العودة لنتائج البحث")}</Link>
              <p className="rental-kicker">{t("YOUR JOURNEY · YOUR PACE", "رحلتك · بإيقاعك")}</p>
              <h1>{vehicleName(vehicle, locale)}</h1>
              <p>{t("Space to travel comfortably. Freedom to explore.", "مساحة للسفر براحة. وحرية للاستكشاف.")}</p>
              <span className="rental-service-badge">{t("Self-Drive", "قيادة ذاتية")}</span>
            </div>
            <div className="rental-hero-facts"><VehicleFacts vehicle={vehicle} /></div>
          </section>
          <div className="rental-thumbnails"><button type="button" aria-pressed="true" aria-label={t("Vehicle illustration", "صورة السيارة")}><img src={vehicleImages[vehicle.id]} alt="" /></button><p>{t("Vehicle illustration · model subject to confirmation", "صورة توضيحية · الطراز يتطلب التأكيد")}</p></div>
          <section className="rental-panel rental-specification">
            <h2><Icon name="car" />{t("Vehicle Information", "معلومات السيارة")}</h2>
            <dl className="rental-spec-tiles">
              <div><dt>{t("Vehicle type", "نوع السيارة")}</dt><dd>{t(vehicle.category, vehicle.category === "suv" ? "عائلية" : vehicle.category === "van" ? "فان" : "اقتصادية")}</dd></div>
              <div><dt>{t("Transmission", "ناقل الحركة")}</dt><dd>{vehicle.transmission === "automatic" ? t("Automatic", "أوتوماتيك") : t("Manual", "يدوي")}</dd></div>
              <div><dt>{t("Seats", "المقاعد")}</dt><dd>{vehicle.seats}</dd></div><div><dt>{t("Bags", "الحقائب")}</dt><dd>{vehicle.bags}</dd></div>
            </dl>
            <h2><Icon name="shield" />{t("Features & Amenities", "المزايا والمرافق")}</h2>
            <VehicleFacts vehicle={vehicle} />
            <p className="fine-print">{t("Further equipment and model specifications have not been supplied.", "لم تُقدّم مواصفات إضافية للتجهيزات أو الطراز.")}</p>
            <div className="rental-terms-grid">
              <section><h3><Icon name="check" />{t("What’s Included", "ما يشمله السعر")}</h3><p>{t("Supplier inclusions have not been provided. Review the daily vehicle subtotal only.", "لم تُقدّم خدمات مشمولة من المورد. راجع إجمالي سعر السيارة اليومي فقط.")}</p></section>
              <section><h3><Icon name="info" />{t("What’s Not Included", "ما لا يشمله السعر")}</h3><p>{t("Taxes, insurance, fuel, deposits and extras are not quoted. No additional charges or coverage can be confirmed.", "الضرائب والتأمين والوقود والودائع والإضافات غير مسعرة. لا يمكن تأكيد رسوم إضافية أو تغطية.")}</p></section>
            </div>
          </section>
        </div>
        <RentalSummary selection={{ vehicleId: vehicle.id, criteria: parsed.data }} action={
          <button className="rental-primary-button" disabled={!vehicle.available} onClick={() => {
            selectRental({ vehicleId: vehicle.id, criteria: parsed.data });
            navigate("/car-rental/summary");
          }}>{vehicle.available ? t("Select vehicle", "اختر السيارة") : t("Unavailable", "غير متاحة")}<Icon name="arrowRight" /></button>
        } />
      </div>
    )}
  </RentalShell>;
}
