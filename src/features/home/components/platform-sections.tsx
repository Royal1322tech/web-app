import { Link } from "react-router-dom";
import { apiAuthEnabled } from "@/features/auth/auth-config";
import { Icon, type IconName } from "@/components/ui/icon";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { Text, useLocale } from "@/features/localization/locale-provider";
import styles from "./platform-sections.module.css";

interface ServiceCard { en: string; ar: string; description: string; descriptionAr: string; icon: IconName; image: string; to?: string; comingSoon?: boolean }
const services: ServiceCard[] = [
  { en:"Airport Transfers", ar:"انتقالات المطار", description:"Plan arrival and departure transfers for your agency’s travellers. Share the itinerary in an enquiry.", descriptionAr:"خطط لانتقالات الوصول والمغادرة لعملاء وكالتك وشارك مسار الرحلة في استفسار.", icon:"globe", image:"/images/home/cinematic/airport-transfers.png", to:"/contact?subject=airport-transfers" },
  { en:"Hotel Reservations", ar:"حجوزات الفنادق", description:"Explore hotel options and review the booking journey from room choice to voucher.", descriptionAr:"استكشف خيارات الفنادق وتعرّف على رحلة الحجز من اختيار الغرفة إلى القسيمة.", icon:"building", image:"/images/home/cinematic/coastal-resort.png", to:"/search" },
  { en:"Private Chauffeur", ar:"سائق خاص", description:"Prepare an enquiry for executive travel, meetings or a tailored day itinerary.", descriptionAr:"جهز استفسارًا لرحلات الأعمال والاجتماعات أو برنامج يوم خاص.", icon:"user", image:"/images/services/private-chauffeur.jpg", to:"/contact?subject=private-chauffeur" },
  { en:"Group Transportation", ar:"نقل المجموعات", description:"Organize passenger numbers and destinations in a structured group quotation request.", descriptionAr:"نظّم أعداد المسافرين والوجهات في طلب عرض سعر منسق للمجموعة.", icon:"people", image:"/images/services/group-transportation.jpg", to:"/group-quotation" },
  { en:"Luxury & VIP Transportation", ar:"النقل الفاخر وكبار الشخصيات", description:"Describe your vehicle and itinerary preferences. Service availability requires confirmation.", descriptionAr:"صف تفضيلات المركبة وبرنامج الرحلة. توفر الخدمة يتطلب التأكيد.", icon:"star", image:"/images/rental/luxury-arrival.webp", to:"/contact?subject=vip-transport" },
  { en:"Flights", ar:"الطيران", description:"Flight booking for your clients is planned for a future release.", descriptionAr:"حجز الطيران لعملائك مخطط له في إصدار قادم.", icon:"globe", image:"/images/services/flights.jpg", comingSoon:true },
  { en:"Apartment Rentals", ar:"تأجير الشقق", description:"Serviced apartment stays for longer trips are planned for a future release.", descriptionAr:"الإقامة في الشقق المخدومة للرحلات الطويلة مخطط لها في إصدار قادم.", icon:"building", image:"/images/services/apartment-rentals.jpg", comingSoon:true },
];
const publicServices: ServiceCard[] = [
  { en:"Hotels", ar:"الفنادق", description:"Explore hotel options and review the room and booking journey for your clients.", descriptionAr:"استكشف خيارات الفنادق وراجع الغرف وخطوات الحجز لعملائك.", icon:"building", image:"/images/home/cinematic/coastal-resort.png", to:"/search" },
  { en:"Self-Drive Car Rental", ar:"تأجير سيارات بدون سائق", description:"Explore vehicle categories and review daily rental pricing for your clients.", descriptionAr:"استكشف فئات المركبات وراجع أسعار التأجير اليومية لعملائك.", icon:"car", image:"/images/home/car-rental.png", to:"/car-rental" },
  { en:"Airport Transfers", ar:"انتقالات المطار", description:"Share arrival or departure details in a structured service enquiry.", descriptionAr:"شارك تفاصيل الوصول أو المغادرة في استفسار منظم عن الخدمة.", icon:"globe", image:"/images/home/cinematic/airport-transfers.png", to:"/contact?subject=airport-transfers" },
  { en:"Private Chauffeur", ar:"سائق خاص", description:"Prepare an itinerary enquiry for private chauffeur services.", descriptionAr:"جهز استفسار برنامج رحلة لخدمة السائق الخاص.", icon:"user", image:"/images/services/private-chauffeur.jpg", to:"/contact?subject=private-chauffeur" },
];
const strengths: { en:string; ar:string; description:string; descriptionAr:string; icon:IconName }[] = [
  { en:"Easy & Quick Registration", ar:"تسجيل سهل وسريع", description: apiAuthEnabled ? "A guided four-step agency form keeps company, contact and document details organized. Royal Vacation reviews every registration before sign-in is enabled." : "A guided four-step agency form keeps company, contact and document details organized. Real submission is not connected.", descriptionAr: apiAuthEnabled ? "نموذج إرشادي من أربع خطوات ينظم بيانات الوكالة والتواصل والمستندات. تراجع رويال فاكيشن كل تسجيل قبل تفعيل تسجيل الدخول." : "نموذج إرشادي من أربع خطوات ينظم بيانات الوكالة والتواصل والمستندات. الإرسال الفعلي غير متصل.", icon:"document" },
  { en:"Booking Updates & Reports", ar:"تحديثات وتقارير الحجوزات", description:"Review booking timelines and transaction records. Live updates and reporting require backend integration.", descriptionAr:"راجع الجداول الزمنية للحجوزات وسجلات المعاملات. تتطلب التحديثات والتقارير المباشرة الربط بالخادم.", icon:"calendar" },
  { en:"Clear Booking Journey", ar:"رحلة حجز واضحة", description:"Review booking conditions, status updates and voucher details at each step.", descriptionAr:"راجع شروط الحجز وتحديثات الحالة وتفاصيل القسيمة في كل خطوة.", icon:"shield" },
  { en:"Dedicated Support", ar:"دعم مخصص", description:"Prepare a structured enquiry for your agency. Contact delivery and support hours are not yet configured.", descriptionAr:"جهز استفسارًا منظمًا لوكالتك. إرسال الرسائل ومواعيد الدعم لم تُحدد بعد.", icon:"mail" },
];
export function ProductsServices({ publicLanding = false }: { publicLanding?: boolean }) {
  const { t } = useLocale();
  const visibleServices = publicLanding ? publicServices : services;
  return <section id={publicLanding ? "products" : undefined} className={styles.section} aria-labelledby="services-title">
    
    <h2 id="services-title"><Text en="Our Products & " ar="منتجاتنا و" /><span><Text en="Services" ar="خدماتنا" /></span></h2>
    <p className={styles.intro}><Text en="Plan each journey for your clients. Explore hotel options or prepare an enquiry for transport services." ar="خطط لكل رحلة لعملائك. استكشف خيارات الفنادق أو جهز استفسارًا لخدمات النقل." /></p>
    <div className={`${styles.services} ${publicLanding ? styles.servicesFour : ""}`}>
      {visibleServices.map(service => <article key={service.en} data-coming-soon={service.comingSoon || undefined}>
        <div className={styles.serviceImage}>
          <ResponsiveImage src={service.image} alt="" width={1400} height={850} sizes="(max-width:599px) 90vw, (max-width:999px) 44vw, 300px" />
          {service.comingSoon && <span className={styles.comingSoon}>{t("Coming Soon", "قريبًا")}</span>}
        </div>
        <div className={styles.body}><div className={styles.serviceTitle}><span className={styles.serviceIcon}><Icon name={service.icon} /></span><h3>{t(service.en,service.ar)}</h3></div><p>{t(service.description,service.descriptionAr)}</p>
          {service.to && <Link to={service.to}>{service.to === "/search" ? t("Explore hotels", "استكشف الفنادق") : service.to === "/car-rental" ? t("Explore car rentals", "استكشف تأجير السيارات") : t("Prepare an enquiry", "جهز استفسارًا")}<Icon name="arrowRight" /></Link>}
        </div>
      </article>)}
    </div>
  </section>;
}
export function PlatformStrengths() {
  const { t } = useLocale();
  return <section id="why-royal-vacation" className={styles.section} aria-labelledby="strengths-title">
    
    <h2 id="strengths-title"><Text en="Why Choose " ar="لماذا تختار " /><span><Text en="Royal Vacation?" ar="رويال فاكيشن؟" /></span></h2>
    <p className={styles.intro}><Text en="A considered workspace that helps travel agencies organize every step of the journey." ar="مساحة عمل مدروسة تساعد وكالات السفر على تنظيم كل خطوة في الرحلة." /></p>
    <div className={styles.strengths}>{strengths.map(item => <article key={item.en}><span className={styles.strengthIcon}><Icon name={item.icon} /></span><h3>{t(item.en,item.ar)}</h3><p>{t(item.description,item.descriptionAr)}</p></article>)}</div>
  </section>;
}
