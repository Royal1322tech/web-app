import type { B2BHotel, B2BHotelSearchResult, B2BRoom, B2BSearchFilters, b2bAmenityValues, b2bBoardValues } from "../api/b2b-hotel-search";
import type { Amenity } from "../types";
import type { BoardPlan } from "./board-plan-definitions";
import { breakfastAvailability, verifiedPrice } from "./live-hotels";

/**
 * Filters for the hotels on the loaded search page. Each filter is either backed by data the search
 * actually returns (name, area, board, breakfast, stars and, only when verified, price) or is kept
 * as the user's choice without narrowing the list, because the search returns nothing to match it
 * against (top product, customer review, establishment profile, amenities and packaging).
 */
export interface LiveFilters {
  name: string;
  areas: string[];
  luxury: boolean;
  boards: BoardPlan[];
  breakfastOnly: boolean;
  stars: number[];
  minimumReview: number;
  profiles: string[];
  amenities: Amenity[];
  minPrice: string;
  maxPrice: string;
  packaging: "all" | "with" | "without";
}

export const emptyLiveFilters: LiveFilters = {
  name: "", areas: [], luxury: false, boards: [], breakfastOnly: false, stars: [], minimumReview: 0,
  profiles: [], amenities: [], minPrice: "", maxPrice: "", packaging: "all",
};

/** The board plan a supplier meal code belongs to, or null when it is not a recognised plan. */
export function boardPlanOf(room: Pick<B2BRoom, "meal_name" | "has_breakfast">): BoardPlan | null {
  const meal = room.meal_name?.trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (!meal) return room.has_breakfast === true ? "breakfast" : null;
  if (/(ultra|super)-all-inclusive/.test(meal)) return "ultra-all-inclusive";
  if (meal.includes("all-inclusive")) return "all-inclusive";
  if (meal.startsWith("full-board")) return "full-board";
  if (meal.startsWith("half-board")) return "half-board";
  if (meal === "nomeal" || meal === "no-meal" || meal === "room-only") return "room";
  if (meal.includes("breakfast")) return "breakfast";
  return null;
}

export const hotelBoards = (hotel: B2BHotel): Set<BoardPlan> =>
  new Set(hotel.rooms.map(boardPlanOf).filter((plan): plan is BoardPlan => plan !== null));

/**
 * The area of a hotel, read from its own address: the part after the street ("street, district,
 * city" gives the district; "street, city" the city). Postcodes are dropped. Null when not given.
 */
export function hotelArea(hotel: Pick<B2BHotel, "address">): string | null {
  const parts = (hotel.address ?? "").split(",").map((part) => part.replace(/\b\d[\d\s-]*\b/g, "").replace(/\s+/g, " ").trim()).filter((part) => /\p{L}/u.test(part));
  return parts.length >= 2 ? parts[1] : null;
}

/** Areas found on the page, most hotels first. */
export function pageAreas(hotels: readonly B2BHotel[]): { area: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const hotel of hotels) {
    const area = hotelArea(hotel);
    if (area) counts.set(area, (counts.get(area) ?? 0) + 1);
  }
  return [...counts].map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count || a.area.localeCompare(b.area));
}

/** True when at least one hotel on the page has a verified price, so a price range can be applied. */
export const priceFilterSupported = (result: B2BHotelSearchResult) =>
  result.hotels.some((hotel) => verifiedPrice(hotel, result) !== null);

const priceBound = (value: string) => (value.trim() === "" || Number.isNaN(Number(value)) ? null : Number(value));

/** Sidebar amenities the search API filters on, with their API values. Others aren't offered with server filters. */
export const serverAmenities: Partial<Record<Amenity, (typeof b2bAmenityValues)[number]>> = {
  nonSmoking: "non_smoking", roomService: "room_service", airConditioning: "air_conditioning", bathroom: "bathroom", gym: "gym", heating: "heating",
};
const boardParam: Record<BoardPlan, (typeof b2bBoardValues)[number]> = {
  room: "nomeal", breakfast: "breakfast", "half-board": "half-board", "full-board": "full-board", "all-inclusive": "all-inclusive", "ultra-all-inclusive": "ultra-all-inclusive",
};
const packageParam = { with: "with_package", without: "without_package" } as const;

/**
 * The sidebar choices the search request can carry (exact API values), or undefined when none is
 * set. Breakfast, price, review, profile and top product are never sent: the API has no such field.
 */
export function toB2BSearchFilters(filters: LiveFilters): B2BSearchFilters | undefined {
  const out: B2BSearchFilters = {};
  const name = filters.name.trim().slice(0, 120);
  if (name) out.hotel_name = name;
  if (filters.areas.length === 1) out.area = filters.areas[0].slice(0, 120);
  if (filters.stars.length) out.stars = [...new Set(filters.stars)].filter((star) => star >= 1 && star <= 5).sort((a, b) => a - b);
  if (filters.boards.length) out.board = [...new Set(filters.boards.map((plan) => boardParam[plan]))].sort();
  const amenities = filters.amenities.map((amenity) => serverAmenities[amenity]).filter((value): value is (typeof b2bAmenityValues)[number] => !!value);
  if (amenities.length) out.amenities = [...new Set(amenities)].sort();
  if (filters.packaging !== "all") out.package_type = packageParam[filters.packaging];
  return Object.keys(out).length ? out : undefined;
}

/**
 * The hotels to show. With server-side filters, the fields sent to the API are not applied again
 * on the page; breakfast and verified price always narrow the loaded page.
 */
export function filterLiveHotels(result: B2BHotelSearchResult, filters: LiveFilters, server = false): B2BHotel[] {
  const name = filters.name.trim().toLocaleLowerCase();
  const usePrice = priceFilterSupported(result);
  const min = priceBound(filters.minPrice), max = priceBound(filters.maxPrice);
  return result.hotels.filter((hotel) => {
    if (!server && name && !(hotel.name ?? "").toLocaleLowerCase().includes(name) && !(hotel.address ?? "").toLocaleLowerCase().includes(name)) return false;
    if (!server && filters.areas.length) { const area = hotelArea(hotel); if (!area || !filters.areas.includes(area)) return false; }
    if (!server && filters.boards.length) { const boards = hotelBoards(hotel); if (!filters.boards.some((plan) => boards.has(plan))) return false; }
    if (filters.breakfastOnly && breakfastAvailability(hotel.rooms) !== "some") return false;
    if (!server && filters.stars.length && (hotel.stars === null || !filters.stars.includes(Math.round(hotel.stars)))) return false;
    if (usePrice && (min !== null || max !== null)) {
      const price = verifiedPrice(hotel, result);
      if (!price || (min !== null && price.amount < min) || (max !== null && price.amount > max)) return false;
    }
    return true;
  });
}

/** Filters that narrow the list (the count line and "Clear" depend on these). */
export function activeLiveFilterCount(filters: LiveFilters, priceApplies: boolean, server = false): number {
  return Number(Boolean(filters.name.trim())) + Number(filters.areas.length > 0) + Number(filters.boards.length > 0)
    + Number(filters.breakfastOnly) + Number(filters.stars.length > 0)
    + Number(priceApplies && Boolean(filters.minPrice.trim() || filters.maxPrice.trim()))
    + (server ? Number(filters.amenities.length > 0) + Number(filters.packaging !== "all") : 0);
}

/** Filters applied on the loaded page only (the count line describes these). */
export const pageOnlyFilterCount = (filters: LiveFilters, priceApplies: boolean, server: boolean) =>
  server ? Number(filters.breakfastOnly) + Number(priceApplies && Boolean(filters.minPrice.trim() || filters.maxPrice.trim())) : activeLiveFilterCount(filters, priceApplies);

/** Any choice differs from the defaults, including the ones that do not narrow the list. */
export const liveFiltersChanged = (filters: LiveFilters) => JSON.stringify(filters) !== JSON.stringify(emptyLiveFilters);
