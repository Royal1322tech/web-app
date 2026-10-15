import type { HotelListing } from "../types";
export const boardPlans = [
  { value: "room", en: "Room Only", ar: "غرفة فقط" },
  { value: "breakfast", en: "Breakfast / Bed & Breakfast", ar: "إفطار / مبيت وإفطار" },
  { value: "half-board", en: "Half Board", ar: "نصف إقامة" },
  { value: "full-board", en: "Full Board", ar: "إقامة كاملة" },
  { value: "all-inclusive", en: "All Inclusive", ar: "شامل كليًا" },
  { value: "ultra-all-inclusive", en: "Ultra All Inclusive", ar: "شامل كليًا ألترا" },
] as const;
export type BoardPlan = typeof boardPlans[number]["value"];
/** Legacy fixtures explicitly describe a breakfast-included or room-only sample rate.
 * Future adapters must supply verified categories; never infer supplier wording. */
export function hotelBoardPlans(hotel: HotelListing): readonly BoardPlan[] {
  return hotel.boardPlans ?? [hotel.breakfast ? "breakfast" : "room"];
}
