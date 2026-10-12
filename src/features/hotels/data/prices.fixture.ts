export interface SampleDailyPrice {
  date: string;
  amount: number;
  availability: "available" | "unavailable";
}

// Illustrative USD chart data, not a rate quote or live room availability.
export const sampleDailyPrices: readonly SampleDailyPrice[] = [
  2000, 1250, 2000, 1300, 750, 250, 550, 900, 1150, 1700, 700, 1950, 1200, 1650,
  1650, 1100, 1600, 1450, 1650, 1050,
].map((amount, index) => ({
  date: `2026-11-${String(index + 1).padStart(2, "0")}`,
  amount,
  availability: index === 2 ? "unavailable" : "available",
}));
