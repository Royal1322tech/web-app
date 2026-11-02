import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { useMoney } from "@/features/demo/shared";
import { Icon } from "@/components/ui/icon";
import { SystemState } from "@/components/ui/system-state";
import { RentalShell } from "./rental-layout";
import { RentalCriteriaForm } from "./rental-flow";
import { VehiclePhoto, VehicleFacts, vehicleName } from "./rental-presentation";
import { demoVehicles, readRentalQuery, rentalQuery, rentalDays, type RentalCriteria } from "./rental-model";

export function TripPanel({ criteria }: { criteria: RentalCriteria }) {
  const { t } = useLocale();
  return <aside className="rental-trip-sidebar">
    <section className="rental-panel">
      <h2><Icon name="car" />{t("Your rental", "تفاصيل تأجيرك")}</h2>
      <div className="rental-route">
        <div><Icon name="pin" /><div><small>{t("Pickup", "الاستلام")}</small><strong>{t(criteria.pickup)}</strong><bdi>{criteria.start}</bdi></div></div>
        <div><Icon name="pin" /><div><small>{t("Return", "الإعادة")}</small><strong>{t(criteria.dropoff)}</strong><bdi>{criteria.end}</bdi></div></div>
      </div>
      <p className="rental-duration"><Icon name="calendar" />{rentalDays(criteria)} {t("rental days", "أيام تأجير")}</p>
      <p className="fine-print">{t("Daily vehicle rates. Taxes, insurance and extra services are not supplied.", "أسعار يومية للسيارة. الضرائب والتأمين والخدمات الإضافية غير متوفرة.")}</p>
    </section>
    <section className="rental-assistance"><Icon name="whatsapp" /><h3>{t("Need help planning?", "تحتاج مساعدة في التخطيط؟")}</h3>
      <p>{t("Discuss your agency’s requirements with Royal Vacation.", "ناقش متطلبات وكالتك مع رويال فاكيشن.")}</p>
      <a href="https://wa.me/201070724143" target="_blank" rel="noopener noreferrer"><bdi>+20 01070724143</bdi><Icon name="arrowRight" /></a>
      <Link to="/contact?subject=private-chauffeur">{t("Chauffeur enquiry", "استفسار سائق خاص")}</Link>
    </section>
  </aside>;
}

export function RentalSearchPage() {
  const { t, locale } = useLocale();
  const { search } = useLocation();
  const navigate = useNavigate();
  const money = useMoney();
  const parsed = readRentalQuery(search);
  const criteria = parsed.success ? parsed.data : null;
  const [editing, setEditing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState("all");
  const [transmission, setTransmission] = useState("all");
  const [seats, setSeats] = useState(0);
  const [bags, setBags] = useState(0);
  const [maximum, setMaximum] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState("low");
  const count = Number(category !== "all") + Number(transmission !== "all") + Number(seats > 0) + Number(bags > 0) + Number(!!maximum) + Number(availableOnly);
  const vehicles = demoVehicles.filter(v =>
    (category === "all" || v.category === category) &&
    (transmission === "all" || v.transmission === transmission) &&
    v.seats >= seats && v.bags >= bags && (!maximum || v.daily <= Number(maximum)) &&
    (!availableOnly || v.available),
  ).sort((a, b) => sort === "low" ? a.daily - b.daily : b.daily - a.daily);
  function reset() { setCategory("all"); setTransmission("all"); setSeats(0); setBags(0); setMaximum(""); setAvailableOnly(false); }
  return <RentalShell title={t("Find your perfect drive", "اعثر على سيارتك المثالية")}>
    {search && !criteria && <p role="alert">{t("Invalid or expired search dates. Choose a new rental period.", "تواريخ البحث غير صالحة أو منتهية. اختر فترة تأجير جديدة.")}</p>}
    {criteria && <section className="rental-trip-strip" aria-label={t("Rental search summary", "ملخص بحث التأجير")}>
      <div><Icon name="pin" /><span><small>{t("Pickup", "الاستلام")}</small><strong>{t(criteria.pickup)}</strong></span></div>
      <div><Icon name="pin" /><span><small>{t("Return", "الإعادة")}</small><strong>{t(criteria.dropoff)}</strong></span></div>
      <div><Icon name="calendar" /><span><small>{t("Rental dates", "تواريخ التأجير")}</small><bdi>{criteria.start} — {criteria.end}</bdi></span></div>
      <button className="rental-edit" aria-expanded={editing} onClick={() => setEditing(!editing)}><Icon name="document" />{t("Edit Search", "تعديل البحث")}</button>
    </section>}
    {(!criteria || editing) && <RentalCriteriaForm key={search} initial={criteria ?? undefined} onSubmit={value => { navigate(`/car-rental/search?${rentalQuery(value)}`); setEditing(false); }} />}
    {criteria && <>
      <button className="button button--outline rental-mobile-filter" aria-controls="rental-filter-panel" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>{t("Filters", "التصفية")} {count > 0 && `(${count})`}<Icon name="chevron" /></button>
      <div className="rental-reference-results">
        <aside id="rental-filter-panel" className={`rental-panel rental-reference-filters ${filtersOpen ? "is-open" : ""}`} aria-label={t("Vehicle filters", "تصفية السيارات")}>
          <div className="rental-filter-heading"><h2>{t("Filters", "التصفية")}</h2><button type="button" onClick={reset}>{t("Clear", "مسح")}</button></div>
          <details open><summary>{t("Vehicle type", "نوع السيارة")}</summary><label>{t("Vehicle category", "فئة السيارة")}<select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="all">{t("All", "الكل")}</option><option value="economy">{t("Economy", "اقتصادية")}</option><option value="suv">{t("SUV", "عائلية")}</option><option value="van">{t("Van", "فان")}</option>
          </select></label></details>
          <details open><summary>{t("Transmission", "ناقل الحركة")}</summary><label className="sr-only" htmlFor="rental-transmission">{t("Transmission", "ناقل الحركة")}</label><select id="rental-transmission" value={transmission} onChange={e => setTransmission(e.target.value)}><option value="all">{t("All", "الكل")}</option><option value="automatic">{t("Automatic", "أوتوماتيك")}</option><option value="manual">{t("Manual", "يدوي")}</option></select></details>
          <details open><summary>{t("Capacity", "السعة")}</summary>
            <label>{t("Minimum seats", "الحد الأدنى للمقاعد")}<select value={seats} onChange={e => setSeats(Number(e.target.value))}>{[0, 4, 5, 7].map(n => <option key={n} value={n}>{n || t("Any", "أي عدد")}</option>)}</select></label>
            <label>{t("Minimum bags", "الحد الأدنى للحقائب")}<select value={bags} onChange={e => setBags(Number(e.target.value))}>{[0, 2, 3, 4].map(n => <option key={n} value={n}>{n || t("Any", "أي عدد")}</option>)}</select></label>
          </details>
          <details open><summary>{t("Daily price · USD", "السعر اليومي · دولار")}</summary><label>{t("Maximum daily price", "أقصى سعر يومي")}<input type="number" min="0" value={maximum} onChange={e => setMaximum(e.target.value)} /></label></details>
          <label className="rental-check"><input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)} />{t("Available vehicles only", "السيارات المتاحة فقط")}</label>
        </aside>
        <section className="rental-result-list" aria-label={t("Vehicle results", "نتائج السيارات")}>
          <div className="rental-list-heading"><div><p role="status"><strong>{vehicles.length}</strong> {t("vehicle options", "خيارات سيارات")}</p><small>{t("Illustrative daily rates · availability requires supplier confirmation.", "أسعار يومية توضيحية · التوافر يتطلب تأكيد المورد.")}</small></div><label>{t("Sort price", "ترتيب السعر")}<select value={sort} onChange={e => setSort(e.target.value)}><option value="low">{t("Lowest first", "الأقل أولًا")}</option><option value="high">{t("Highest first", "الأعلى أولًا")}</option></select></label></div>
          {vehicles.map(vehicle => <article className="rental-horizontal-card rental-card" key={vehicle.id}>
            <VehiclePhoto vehicle={vehicle} />
            <div className="rental-vehicle-copy"><span className="rental-service-badge"><Icon name="car" />{t("Self-Drive", "قيادة ذاتية")}</span><h2>{vehicleName(vehicle, locale)}</h2><VehicleFacts vehicle={vehicle} /><p>{t("Choose the space that suits your journey.", "اختر المساحة التي تناسب رحلتك.")}</p></div>
            <div className="rental-card-price"><small>{t("Daily rate", "السعر اليومي")}</small><strong><bdi>{money(vehicle.daily)}</bdi></strong><span>{t("per day · USD", "لكل يوم · دولار")}</span><Link className="rental-primary-button" to={`/car-rental/vehicles/${vehicle.id}?${rentalQuery(criteria)}`}>{t("View vehicle", "عرض السيارة")}<Icon name="arrowRight" /></Link>{!vehicle.available && <small>{t("Unavailable", "غير متاحة")}</small>}</div>
          </article>)}
          {!vehicles.length && <SystemState title={t("No matching vehicles", "لا توجد سيارات مطابقة")} description={t("Try another category or transmission.", "جرّب فئة أو ناقل حركة آخر.")}><button className="button button--outline" onClick={reset}>{t("Clear filters", "مسح التصفية")}</button></SystemState>}
        </section>
        <TripPanel criteria={criteria} />
      </div>
    </>}
  </RentalShell>;
}
