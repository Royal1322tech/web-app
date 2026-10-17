import { Link } from "react-router-dom";
import { Icon, type IconName } from "@/components/ui/icon";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { Text, useLocale } from "@/features/localization/locale-provider";
import styles from "./platform-sections.module.css";

const services: { en: string; ar: string; description: string; descriptionAr: string; icon: IconName; image: string; to: string }[] = [
  { en:"Airport Transfers", ar:"انتقالات المطار", description:"Plan arrival and departure transfers for your agency’s travellers. Share the itinerary in an enquiry.", descriptionAr:"خطط لانتقالات الوصول والمغادرة لعملاء وكالتك وشارك مسار الرحلة في استفسار.", icon:"globe", image:"/images/home/cinematic/airport-transfers.png", to:"/contact?subject=airport-transfers" },
  { en:"Hotel Reservations", ar:"حجوزات الفنادق", description:"Explore hotel options and review the booking journey from room choice to voucher.", descriptionAr:"استكشف خيارات الفنادق وتعرّف على رحلة الحجز من اختيار الغرفة إلى القسيمة.", icon:"building", image:"/images/home/cinematic/coastal-resort.png", to:"/search" },
  { en:"Car Rental with Driver", ar:"تأجير سيارات بسائق", description:"Outline your route, dates and driver requirements. Chauffeur bookings are not connected online.", descriptionAr:"حدد المسار والتواريخ ومتطلبات السائق. حجز خدمة السائق غير متصل إلكترونيًا.", icon:"car", image:"/images/home/cinematic/airport-transfers.png", to:"/contact?subject=car-with-driver" },
  { en:"Private Chauffeur", ar:"سائق خاص", description:"Prepare an enquiry for executive travel, meetings or a tailored day itinerary.", descriptionAr:"جهز استفسارًا لرحلات الأعمال والاجتماعات أو برنامج يوم خاص.", icon:"user", image:"/images/home/flight/hero-clean.png", to:"/contact?subject=private-chauffeur" },
  { en:"Group Transportation", ar:"نقل المجموعات", description:"Organize passenger numbers and destinations in a structured group quotation request.", descriptionAr:"نظّم أعداد المسافرين والوجهات في طلب عرض سعر منسق للمجموعة.", icon:"people", image:"/images/home/cinematic/airport-transfers.png", to:"/group-quotation" },
  { en:"Luxury & VIP Transportation", ar:"النقل الفاخر وكبار الشخصيات", description:"Describe your vehicle and itinerary preferences. Service availability requires confirmation.", descriptionAr:"صف تفضيلات المركبة وبرنامج الرحلة. توفر الخدمة يتطلب التأكيد.", icon:"star", image:"/images/home/flight/hero-clean.png", to:"/contact?subject=vip-transport" },
];
const strengths: { en:string; ar:string; description:string; descriptionAr:string; icon:IconName }[] = [
  { en:"Easy & Quick Registration", ar:"تسجيل سهل وسريع", description:"A guided four-step agency form keeps company, contact and document details organized. Real submission is not connected.", descriptionAr:"نموذج إرشادي من أربع خطوات ينظم بيانات الوكالة والتواصل والمستندات. الإرسال الفعلي غير متصل.", icon:"document" },
  { en:"Booking Updates & Reports", ar:"تحديثات وتقارير الحجوزات", description:"Review booking timelines and transaction records. Live updates and reporting require backend integration.", descriptionAr:"راجع الجداول الزمنية للحجوزات وسجلات المعاملات. تتطلب التحديثات والتقارير المباشرة الربط بالخادم.", icon:"calendar" },
  { en:"Clear Booking Journey", ar:"رحلة حجز واضحة", description:"Review booking conditions, status updates and voucher details at each step.", descriptionAr:"راجع شروط الحجز وتحديثات الحالة وتفاصيل القسيمة في كل خطوة.", icon:"shield" },
  { en:"Dedicated Support", ar:"دعم مخصص", description:"Prepare a structured enquiry for your agency. Contact delivery and support hours are not yet configured.", descriptionAr:"جهز استفسارًا منظمًا لوكالتك. إرسال الرسائل ومواعيد الدعم لم تُحدد بعد.", icon:"mail" },
];
export function ProductsServices() {
  const { t } = useLocale();
  return <section className={styles.section} aria-labelledby="services-title">
    
    <h2 id="services-title"><Text en="Our Products & " ar="منتجاتنا و" /><span><Text en="Services" ar="خدماتنا" /></span></h2>
    <p className={styles.intro}><Text en="Plan each journey for your clients. Explore hotel options or prepare an enquiry for transport services." ar="خطط لكل رحلة لعملائك. استكشف خيارات الفنادق أو جهز استفسارًا لخدمات النقل." /></p>
    <div className={styles.services}>
      {services.map(service => <article key={service.en}>
        <ResponsiveImage src={service.image} alt="" width={1672} height={941} sizes="(max-width:599px) 90vw, (max-width:999px) 44vw, 380px" />
        <div className={styles.body}><div className={styles.serviceTitle}><span className={styles.serviceIcon}><Icon name={service.icon} /></span><h3>{t(service.en,service.ar)}</h3></div><p>{t(service.description,service.descriptionAr)}</p>
          <Link to={service.to}>{service.to === "/search" ? t("Explore hotels", "استكشف الفنادق") : t("Prepare an enquiry", "جهز استفسارًا")}<Icon name="arrowRight" /></Link>
        </div>
      </article>)}
    </div>
  </section>;
}
export function PlatformStrengths() {
  const { t } = useLocale();
  return <section className={styles.section} aria-labelledby="strengths-title">
    
    <h2 id="strengths-title"><Text en="Why Choose " ar="لماذا تختار " /><span><Text en="Royal Vacation?" ar="رويال فاكيشن؟" /></span></h2>
    <p className={styles.intro}><Text en="A considered workspace that helps travel agencies organize every step of the journey." ar="مساحة عمل مدروسة تساعد وكالات السفر على تنظيم كل خطوة في الرحلة." /></p>
    <div className={styles.strengths}>{strengths.map(item => <article key={item.en}><span className={styles.strengthIcon}><Icon name={item.icon} /></span><h3>{t(item.en,item.ar)}</h3><p>{t(item.description,item.descriptionAr)}</p></article>)}</div>
  </section>;
}
