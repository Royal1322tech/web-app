import type { LocalizedText } from './types';

export interface CancellationRule {
  cancelledOnOrAfter?: string;
  cancelledOnOrBefore?: string;
  timezone?: string;
  charge?:
    | { kind: 'amount'; amount: number; currency: string }
    | { kind: 'percentage'; percentage: number }
    | { kind: 'non-refundable' };
  refundConditions?: LocalizedText;
  restriction?: LocalizedText;
}

export interface CancellationPolicy {
  kind: 'free' | 'non-refundable' | 'conditional' | 'unavailable';
  deadline?: string;
  timezone?: string;
  penalty?: LocalizedText;
  conditions?: LocalizedText;
  rules?: readonly CancellationRule[];
  noShow?: LocalizedText;
  earlyDeparture?: LocalizedText;
  rateRestrictions?: readonly LocalizedText[];
}

export const cancellationPolicyLabels: Record<CancellationPolicy['kind'], LocalizedText> = {
  free: { en: 'Free cancellation', ar: 'إلغاء مجاني' },
  'non-refundable': { en: 'Non-refundable', ar: 'غير قابل للاسترداد' },
  conditional: { en: 'Conditional cancellation', ar: 'إلغاء بشروط' },
  unavailable: { en: 'Not supplied', ar: 'غير مقدمة' },
};
