import { useState } from 'react';
import { useLocale } from '@/features/localization/locale-provider';
import { Workspace } from './shared';
import { demoPoints, pointsSummary } from './points-data';

export function PointsPage() {
  const { locale, t } = useLocale();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const summary = pointsSummary(demoPoints);
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const types = { earned: t('Earned', 'مكتسبة'), deducted: t('Deducted', 'مخصومة'), adjustment: t('Adjustment', 'تعديل') };
  const filtered = demoPoints.filter(entry => (filter === 'all' || entry.type === filter) && `${entry.id} ${entry.description[locale]}`.toLowerCase().includes(query.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 4));
  return <Workspace title={t('Points', 'النقاط')}>
    <p className="demo-notice">{t('DEMO POINTS · Illustrative entries only, with no cash value. Earning and redemption are not available. Pending entries do not affect the balance.', 'نقاط تجريبية · قيود توضيحية فقط دون قيمة نقدية. الكسب والاستبدال غير متاحين. القيود المعلقة لا تؤثر على الرصيد.')}</p>
    <div className="points-metrics">
      {[[t('Current points balance', 'رصيد النقاط الحالي'), summary.balance], [t('Total points earned', 'إجمالي النقاط المكتسبة'), summary.earned], [t('Total deductions & adjustments', 'إجمالي الخصومات والتعديلات'), summary.deducted]].map(([label, value]) => <section className="workspace-card" key={label}><h2>{label}</h2><strong><bdi>{number(Number(value))}</bdi></strong><p>{t('Demonstration points', 'نقاط توضيحية')}</p></section>)}
    </div>
    <section className="workspace-card points-history">
      <p className="workspace-eyebrow">{t('RECENT ACTIVITY', 'النشاط الأخير')}</p>
      <h2>{t('Points transaction history', 'سجل معاملات النقاط')}</h2>
      <div className="points-filters">
        <label>{t('Search points activity', 'بحث في نشاط النقاط')}<input className="input" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} /></label>
        <div className="points-filter-field"><label htmlFor="points-type">{t('Transaction type', 'نوع المعاملة')}</label><select id="points-type" className="input" value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }}><option value="all">{t('All types', 'كل الأنواع')}</option>{Object.entries(types).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      </div>
      {!filtered.length ? <p role="status">{t('No points activity matches your filters.', 'لا يوجد نشاط نقاط يطابق عوامل التصفية.')}</p> : <ul className="points-list">{filtered.slice(page * 4, page * 4 + 4).map(entry => <li key={entry.id}>
        <div><h3>{entry.description[locale]}</h3><p><time dateTime={entry.date}>{entry.date}</time> · <bdi>{entry.id}</bdi></p></div>
        <div><span>{types[entry.type]}</span><p>{entry.status === 'pending' ? t('Pending', 'معلق') : t('Posted', 'مسجل')}</p></div>
        <strong className={entry.change > 0 ? 'points-positive' : ''}><bdi>{entry.change > 0 ? '+' : ''}{number(entry.change)}</bdi> <small>{t('pts', 'نقطة')}</small></strong>
      </li>)}</ul>}
      <nav className="workspace-actions" aria-label={t('Points pagination', 'صفحات النقاط')}><button className="button button--outline" disabled={page === 0} onClick={() => setPage(page - 1)}>{t('Previous', 'السابق')}</button><span>{t('Page', 'صفحة')} {number(page + 1)} / {number(pages)}</span><button className="button button--outline" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>{t('Next', 'التالي')}</button></nav>
    </section>
  </Workspace>;
}
