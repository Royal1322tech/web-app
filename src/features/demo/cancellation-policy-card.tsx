import { useLocale } from '@/features/localization/locale-provider';
import { cancellationPolicyLabels, type CancellationPolicy } from '@/features/hotels/cancellation-policy';
export function CancellationPolicyCard({ policy }: { policy?: CancellationPolicy }) {
  const { locale, t } = useLocale();
  const kind = policy?.kind ?? 'unavailable';
  return <section className="cancellation-policy" aria-labelledby="cancellation-title" data-policy={kind}>
    <p className="workspace-eyebrow">{t('BEFORE YOU CONTINUE', 'قبل المتابعة')}</p>
    <h2 id="cancellation-title">{t('Cancellation Policy', 'سياسة الإلغاء')}</h2>
    <strong>{cancellationPolicyLabels[kind][locale]}</strong>
    {kind === 'unavailable' && <p>{t('The cancellation policy has not been provided for this offer. No free cancellation, refund or fee is guaranteed. You may continue with the demonstration only.', 'لم تُقدّم سياسة إلغاء لهذا العرض. لا يوجد ضمان للإلغاء المجاني أو الاسترداد أو الرسوم. يمكنك متابعة التجربة التوضيحية فقط.')}</p>}
    {policy?.deadline && <p>{t('Cancellation deadline', 'موعد الإلغاء النهائي')}: <bdi>{policy.deadline}</bdi></p>}
    {policy?.timezone && <p>{t('Timezone', 'المنطقة الزمنية')}: <bdi>{policy.timezone}</bdi></p>}
    {policy?.penalty && <p>{t('Penalty / fee', 'الغرامة / الرسوم')}: {policy.penalty[locale]}</p>}
    {policy?.conditions && <p>{policy.conditions[locale]}</p>}
  </section>;
}
