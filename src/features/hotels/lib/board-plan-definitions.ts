export const boardPlans = [
  { value: "room", en: "Room Only", ar: "غرفة فقط" },
  { value: "breakfast", en: "Bed & Breakfast", ar: "مبيت وإفطار" },
  { value: "half-board", en: "Half Board", ar: "نصف إقامة" },
  { value: "full-board", en: "Full Board", ar: "إقامة كاملة" },
  { value: "all-inclusive", en: "All Inclusive", ar: "شامل كليًا" },
  { value: "ultra-all-inclusive", en: "Ultra All Inclusive", ar: "شامل كليًا ألترا" },
] as const;

export type BoardPlan = typeof boardPlans[number]["value"];
export const boardPlanLabels = Object.fromEntries(
  boardPlans.map(({ value, en, ar }) => [value, { en, ar }]),
) as Record<BoardPlan, { en: string; ar: string }>;
