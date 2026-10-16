import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { Icon } from "@/components/ui/icon";
import { RentalHero } from "./rental-presentation";
import { RentalCriteriaForm } from "./rental-flow";
import { rentalQuery } from "./rental-model";
export function RentalLanding() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const chauffeur = params.get("service") === "chauffeur";
  return <div className="rental-landing rental-reference-shell">
    <RentalHero primary title={t("Car Rental for your clients", "تأجير السيارات لعملائك")} />
    <section className="rental-integrated-search">
      <div className="rental-service-switch" role="group" aria-label={t("Vehicle service", "خدمة السيارات")}>
        <button type="button" aria-pressed={!chauffeur} onClick={() => setParams({})}><Icon name="car" />{t("Self-Drive Rental", "تأجير قيادة ذاتية")}</button>
        <button type="button" aria-pressed={chauffeur} onClick={() => setParams({ service: "chauffeur" })}><Icon name="people" />{t("Chauffeur / Transfers", "سائق خاص / انتقالات")}</button>
      </div>
      <div hidden={chauffeur}><RentalCriteriaForm onSubmit={criteria => navigate(`/car-rental/search?${rentalQuery(criteria)}`)} /></div>
      {chauffeur && <div className="rental-chauffeur-choices"><div><p className="rental-kicker">{t("TRAVEL WITH A DRIVER", "سفر مع سائق")}</p><h2>{t("A thoughtful arrival. A clear enquiry.", "وصول مدروس. واستفسار واضح.")}</h2><p>{t("Choose an existing service to prepare your itinerary. Trip prices and availability require confirmation.", "اختر خدمة لتجهيز مسار رحلتك. الأسعار والتوافر يحتاجان إلى التأكيد.")}</p></div><nav aria-label={t("Chauffeur services", "خدمات السائق")}>
        {[["airport-transfers", "Airport Transfers", "انتقالات المطار"], ["car-with-driver", "Car Rental with Driver", "تأجير سيارات بسائق"], ["private-chauffeur", "Private Chauffeur", "سائق خاص"]].map(([subject,en,ar]) => <Link key={subject} to={`/contact?subject=${subject}`}><Icon name="car" /><span><strong>{t(en,ar)}</strong><small>{t("Prepare an enquiry", "جهز استفسارًا")}</small></span><Icon name="arrowRight" /></Link>)}
      </nav></div>}
    </section>
    <section className="rental-intro"><p className="rental-kicker">{t("ROYAL VACATION · FOR TRAVEL PROFESSIONALS", "رويال فاكيشن · لمحترفي السفر")}</p><h2>{t("Explore the car rental demo", "استكشف تأجير السيارات التجريبي")}</h2><p>{t("Frontend demonstration · Self-drive daily rates are illustrative. Chauffeur and transfer services use enquiry previews. No rental request or payment can be submitted from this preview.", "عرض واجهة تجريبي · أسعار القيادة الذاتية اليومية توضيحية. خدمات السائق والانتقالات تستخدم معاينة الاستفسارات. لا يمكن إرسال طلب تأجير أو دفع من هذه المعاينة.")}</p><p>{t("No rental request or payment can be submitted from this preview.", "لا يمكن إرسال طلب تأجير أو دفع من هذه المعاينة.")}</p></section>
  </div>;
}
