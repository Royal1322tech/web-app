import type { HotelStarClassification } from "../types";

function isHotelStarClassification(stars: number | null | undefined): stars is HotelStarClassification {
  return stars === 1 || stars === 2 || stars === 3 || stars === 4 || stars === 5;
}

export function normalizeHotelStarClassification(stars: number | null | undefined): HotelStarClassification | undefined {
  return isHotelStarClassification(stars) ? stars : undefined;
}
