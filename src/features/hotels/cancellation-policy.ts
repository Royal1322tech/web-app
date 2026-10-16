import type { LocalizedText } from './types';
/** Supplier fields are optional: absent terms must never imply free cancellation. */
export interface CancellationPolicy {
  kind: 'free' | 'non-refundable' | 'conditional' | 'unavailable';
  deadline?: string;
  timezone?: string;
  penalty?: LocalizedText;
  conditions?: LocalizedText;
}

export const cancellationPolicyLabels: Record<CancellationPolicy['kind'], LocalizedText> = {
  free: { en: 'Free cancellation', ar: 'إلغاء مجاني' },
  'non-refundable': { en: 'Non-refundable', ar: 'غير قابل للاسترداد' },
  conditional: { en: 'Conditional cancellation', ar: 'إلغاء بشروط' },
  unavailable: { en: 'Policy unavailable', ar: 'السياسة غير متاحة' },
};
