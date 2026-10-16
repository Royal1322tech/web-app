import { useRef } from "react";
import { Link, useLocation } from 'react-router-dom';
import { useHotelPreferences } from "@/features/preferences/use-hotel-preferences";
import { useLocale } from "@/features/localization/locale-provider";
import { savedHotelCatalog } from "@/features/preferences/saved-hotel-catalog";
import { amenityLabels, hotels } from '../data/hotels.fixture';
import { ResponsiveImage } from '@/components/ui/responsive-image';
import styles from "../hotels.module.css";
export function Comparison() {
  const { ids, clear, toggle } = useHotelPreferences("comparison");
  const { locale, t } = useLocale();
  const { search } = useLocation();
  const dialog = useRef<HTMLDialogElement>(null);
  const selected = savedHotelCatalog.filter((h) => ids.includes(h.id));
  if (!selected.length) return null;
  return <>
    <div className={styles.compareBar}>
      <span>{selected.length} {t("selected for comparison", "فنادق للمقارنة")}</span>
      <button className={styles.primary} disabled={selected.length < 2} onClick={() => dialog.current?.showModal()}>{t("Compare hotels", "مقارنة الفنادق")}</button>
      <button className={styles.secondary} onClick={clear}>{t("Clear", "مسح")}</button>
    </div>
    <dialog ref={dialog} className={`${styles.dialog} ${styles.comparisonDialog}`} aria-labelledby="comparison-title">
      <div className={styles.comparisonHeading}><div><h2 id="comparison-title">{t("Sample hotel comparison", "مقارنة فنادق تجريبية")}</h2><p>{t('Compare your shortlist. Sample prices only — no live availability.', 'قارن قائمتك المختصرة. أسعار تجريبية فقط — لا يوجد توافر مباشر.')}</p></div><button className={styles.secondary} onClick={() => dialog.current?.close()}>{t("Close", "إغلاق")}</button></div>
      <div className={styles.comparisonGrid}>
        {selected.map(h => <article key={h.id} className={styles.comparisonCard} aria-label={h.name[locale]}>
          <ResponsiveImage src={h.photos[0].src} alt={h.name[locale]} width={h.photos[0].width} height={h.photos[0].height} sizes="(max-width: 600px) 90vw, 340px" />
          <div className={styles.comparisonIdentity}><h3>{h.name[locale]}</h3><p>{h.address[locale]}</p></div>
          <dl>
            <div><dt>{t('Nightly price (USD)', 'السعر لليلة (دولار)')}</dt><dd><bdi>{new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(h.nightlyRate)}</bdi></dd></div>
            <div><dt>{t('Stars', 'النجوم')}</dt><dd>{h.stars ?? t('Not specified', 'غير محدد')}</dd></div>
            <div><dt>{t('Review score / 5', 'تقييم النزلاء / ٥')}</dt><dd><bdi>{h.reviewScore} / 5</bdi></dd></div>
            <div><dt>{t('Breakfast', 'الإفطار')}</dt><dd>{h.breakfast === undefined ? t('Not specified', 'غير محدد') : h.breakfast ? t('Included', 'مشمول') : t('Not included', 'غير مشمول')}</dd></div>
            <div><dt>{t('Amenities', 'المرافق')}</dt><dd>{h.amenities.map(a => amenityLabels[a][locale]).join(' · ')}</dd></div>
          </dl>
          <div className={styles.comparisonActions}>
            {hotels.some(hotel => hotel.id === h.id) ? <Link className={styles.primary} to={`/hotels/${h.id}${search}`} onClick={() => dialog.current?.close()}>{t('Choose Hotel', 'اختر الفندق')}</Link> : <button className={styles.primary} disabled>{t('Selection unavailable', 'الاختيار غير متاح')}</button>}
            <button className={styles.secondary} onClick={() => toggle(h.id)} aria-label={`${t('Remove', 'إزالة')} ${h.name[locale]}`}>{t('Remove', 'إزالة')}</button>
          </div>
        </article>)}
      </div>
      <button className={styles.secondary} onClick={clear}>{t('Clear comparison', 'مسح المقارنة')}</button>
    </dialog>
  </>;
}
