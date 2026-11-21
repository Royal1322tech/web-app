import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { Icon } from "@/components/ui/icon";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { RentalHeroCarousel } from "./rental-hero-carousel";
import { RentalCriteriaForm } from "./rental-flow";
import { rentalQuery } from "./rental-model";
// Private Chauffeur is no longer listed here: it opened the same enquiry as Airport Transfers. Its
// enquiry route still works for existing links.
const services = [
  { to: "/car-rental/search", image: "/images/rental/suv.webp", en: "Self-Drive Rental", ar: "تأجير قيادة ذاتية", description: "Compare vehicle categories at indicative daily rates.", descriptionAr: "قارن فئات السيارات بأسعار يومية استرشادية.", action: "Browse vehicles", actionAr: "تصفح السيارات" },
  { to: "/contact?subject=airport-transfers", image: "/images/home/cinematic/airport-transfers.png", en: "Airport Transfers", ar: "انتقالات المطار", description: "Share arrival or departure details in a structured enquiry.", descriptionAr: "شارك تفاصيل الوصول أو المغادرة في استفسار منظم.", action: "Prepare an enquiry", actionAr: "جهز استفسارًا" },
];
export function RentalLanding() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // The old Chauffeur / Transfers tab link now goes straight to the existing enquiry.
  if (params.get("service") === "chauffeur") return <Navigate to="/contact?subject=private-chauffeur" replace />;
  return <div className="rental-landing rental-reference-shell">
    <RentalHeroCarousel title={t("Car Rental for your clients", "تأجير السيارات لعملائك")} />
    <section className="rental-integrated-search" aria-label={t("Search rental vehicles", "البحث عن سيارات للتأجير")}>
      <RentalCriteriaForm onSubmit={criteria => navigate(`/car-rental/search?${rentalQuery(criteria)}`)} />
    </section>
    <section className="rental-services" aria-labelledby="rental-services-title">
      <div className="rental-intro"><p className="rental-kicker">{t("ROYAL VACATION · FOR TRAVEL PROFESSIONALS", "رويال فاكيشن · لمحترفي السفر")}</p><h2 id="rental-services-title">{t("Ground transport for every itinerary", "نقل بري لكل برنامج رحلة")}</h2><p>{t("Browse self-drive vehicles at indicative daily rates, or prepare an enquiry for airport transfers.", "تصفح سيارات القيادة الذاتية بأسعار يومية استرشادية، أو جهز استفسارًا لانتقالات المطار.")}</p></div>
      <div className="rental-service-cards rental-service-cards--two">
        {services.map((service) => <Link key={service.to} to={service.to} className="rental-service-card">
          <ResponsiveImage src={service.image} alt="" width={640} height={400} sizes="(max-width: 800px) min(92vw, 520px), 420px" />
          <span className="rental-service-card__body"><strong>{t(service.en, service.ar)}</strong><small>{t(service.description, service.descriptionAr)}</small><span className="rental-service-card__action">{t(service.action, service.actionAr)}<Icon name="arrowRight" /></span></span>
        </Link>)}
      </div>
    </section>
  </div>;
}
