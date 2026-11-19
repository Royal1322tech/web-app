import type { B2BHotel, B2BHotelSearchResult, B2BRoom } from "../api/b2b-hotel-search";

/**
 * Hotel image URL, or null. Only https images are used. Supplier content URLs can carry a `{size}`
 * placeholder for the image size; it is filled with a card-sized variant. Nothing else is rewritten.
 */
export function hotelImageUrl(image: string | null): string | null {
  if (!image) return null;
  const sized = image.replace("{size}", "640x400");
  try {
    const url = new URL(sized);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * The lowest verified selling price on the hotel, or null. A price is shown only when the search is
 * marked pricing_verified, the hotel's pricing_status is "verified", a selling currency is given and
 * at least one room carries a numeric selling_price. Supplier amounts are never read.
 */
export function verifiedPrice(hotel: B2BHotel, result: Pick<B2BHotelSearchResult, "pricingVerified" | "currency">): { amount: number; currency: string } | null {
  if (!result.pricingVerified || hotel.pricing_status !== "verified" || !result.currency) return null;
  const amounts = hotel.rooms.map((room) => room.selling_price).filter((value): value is number => value !== null);
  return amounts.length ? { amount: Math.min(...amounts), currency: result.currency } : null;
}

/** True only when both the search and the hotel allow booking. No booking flow exists yet either way. */
export const bookingAllowed = (hotel: B2BHotel, result: Pick<B2BHotelSearchResult, "bookingEnabled">) =>
  result.bookingEnabled && hotel.booking_enabled === true;

export interface RoomOption {
  name: string | null;
  meal: string | null;
  breakfast: boolean | null;
  bedding: string | null;
}

/** Distinct room offers (same name, meal and bedding count once), in the order received. */
export function roomOptions(rooms: readonly B2BRoom[]): RoomOption[] {
  const seen = new Set<string>();
  const options: RoomOption[] = [];
  for (const room of rooms) {
    const option = { name: room.room_name, meal: room.meal_name, breakfast: room.has_breakfast, bedding: room.bedding_type };
    const key = JSON.stringify(option);
    if (!option.name && !option.meal && option.breakfast === null && !option.bedding) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(option);
  }
  return options;
}

/** Breakfast across the hotel's rooms: "some" when at least one room includes it. */
export function breakfastAvailability(rooms: readonly B2BRoom[]): "some" | "none" | "unknown" {
  if (rooms.some((room) => room.has_breakfast === true)) return "some";
  if (rooms.length && rooms.every((room) => room.has_breakfast === false)) return "none";
  return "unknown";
}

const mealLabels: Record<string, [en: string, ar: string]> = {
  nomeal: ["Room only", "غرفة فقط"],
  "room-only": ["Room only", "غرفة فقط"],
  breakfast: ["Breakfast", "إفطار"],
  "half-board": ["Half board", "نصف إقامة"],
  "full-board": ["Full board", "إقامة كاملة"],
  "all-inclusive": ["All inclusive", "شامل كليًا"],
};

/** A readable meal label. Known supplier meal codes are translated; anything else is shown as sent. */
export function mealLabel(meal: string, locale: "en" | "ar"): string {
  const known = mealLabels[meal.toLowerCase()];
  if (known) return locale === "ar" ? known[1] : known[0];
  const spaced = meal.replace(/[-_]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
