import type { HotelListing } from "../types";
import { haversineKm, type GeoPoint } from "./geo";
import { mapLinks } from "./map-location";

/** A hotel's position only when its data holds valid coordinates; never estimated. */
export function verifiedHotelPoint(hotel: Pick<HotelListing, "coordinates">): GeoPoint | undefined {
  return mapLinks(hotel.coordinates) ? hotel.coordinates : undefined;
}

export function eventDistanceKm(hotel: Pick<HotelListing, "coordinates">, event: GeoPoint | null | undefined): number | undefined {
  const point = verifiedHotelPoint(hotel);
  return point && event ? haversineKm(event, point) : undefined;
}

/**
 * Nearest first. Hotels without verified coordinates keep their existing relative order after
 * the located ones, so they stay visible and are never given a guessed position.
 */
export function sortByEventDistance<T extends Pick<HotelListing, "coordinates">>(hotels: readonly T[], event: GeoPoint): T[] {
  return hotels
    .map((hotel, index) => ({ hotel, index, distance: eventDistanceKm(hotel, event) }))
    .sort((a, b) => {
      if (a.distance === undefined && b.distance === undefined) return a.index - b.index;
      if (a.distance === undefined) return 1;
      if (b.distance === undefined) return -1;
      return a.distance - b.distance || a.index - b.index;
    })
    .map(({ hotel }) => hotel);
}

export function formatDistanceKm(distance: number, locale: "en" | "ar") {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: distance < 100 ? 1 : 0 }).format(distance);
}
