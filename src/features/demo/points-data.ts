import type { LocalizedText } from '@/features/hotels/types';
export interface PointsTransaction {
  id: string;
  date: string;
  description: LocalizedText;
  type: 'earned' | 'deducted' | 'adjustment';
  change: number;
  status: 'posted' | 'pending';
}
// Illustrative ledger only. No earning rules, redemption, monetary value or API.
export const demoPoints: readonly PointsTransaction[] = [
  { id: 'PTS-006', date: '2026-03-12', description: { en: 'Pending sample entry', ar: 'قيد تجريبي معلق' }, type: 'earned', change: 150, status: 'pending' },
  { id: 'PTS-005', date: '2026-03-10', description: { en: 'Sample balance correction', ar: 'تصحيح رصيد تجريبي' }, type: 'adjustment', change: -50, status: 'posted' },
  { id: 'PTS-004', date: '2026-03-08', description: { en: 'Sample points addition', ar: 'إضافة نقاط تجريبية' }, type: 'earned', change: 300, status: 'posted' },
  { id: 'PTS-003', date: '2026-03-05', description: { en: 'Sample deduction', ar: 'خصم تجريبي' }, type: 'deducted', change: -200, status: 'posted' },
  { id: 'PTS-002', date: '2026-03-02', description: { en: 'Sample points addition', ar: 'إضافة نقاط تجريبية' }, type: 'earned', change: 500, status: 'posted' },
  { id: 'PTS-001', date: '2026-03-01', description: { en: 'Opening demonstration points', ar: 'نقاط افتتاحية توضيحية' }, type: 'earned', change: 1000, status: 'posted' },
];
export function pointsSummary(entries: readonly PointsTransaction[]) {
  const posted = entries.filter(entry => entry.status === 'posted');
  return {
    balance: posted.reduce((sum, entry) => sum + entry.change, 0),
    earned: posted.filter(entry => entry.type === 'earned').reduce((sum, entry) => sum + entry.change, 0),
    deducted: posted.filter(entry => entry.change < 0).reduce((sum, entry) => sum - entry.change, 0),
  };
}
