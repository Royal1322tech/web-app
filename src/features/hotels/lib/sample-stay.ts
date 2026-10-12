export interface StayDates {
  checkIn: string;
  checkOut: string;
}
const day = 86_400_000;
export const referenceStay: StayDates = {
  checkIn: "2026-10-11",
  checkOut: "2026-10-14",
};

export function sampleStay(dates?: StayDates) {
  const input = dates ?? referenceStay;
  const start = Date.parse(`${input.checkIn}T00:00:00Z`);
  const end = Date.parse(`${input.checkOut}T00:00:00Z`);
  const validDate = (value: string, timestamp: number) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value;
  if (!validDate(input.checkIn, start) || !validDate(input.checkOut, end))
    return sampleStay();
  const nights = (end - start) / day;
  if (!Number.isInteger(nights) || nights <= 0) return sampleStay();
  return { start, nights, isReference: !dates };
}
export function samplePriceBreakdown(
  nightlyRate: number,
  dates?: StayDates,
): {
  nights: number;
  total: number;
  isReference: boolean;
  visibleNights: { date: string; amount: number }[];
  remainingNights: number;
} {
  const stay = sampleStay(dates);
  // Keep very long valid date ranges cheap to render, without imposing a stay limit.
  const visibleCount = Math.min(stay.nights, 7);
  return {
    nights: stay.nights,
    total: (Math.round(nightlyRate * 100) * stay.nights) / 100,
    isReference: stay.isReference,
    visibleNights: Array.from({ length: visibleCount }, (_, i) => ({
      date: new Date(stay.start + i * day).toISOString().slice(0, 10),
      amount: nightlyRate,
    })),
    remainingNights: stay.nights - visibleCount,
  };
}
