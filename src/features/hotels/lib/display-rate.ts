import { roomsForHotel } from "../data/rooms.fixture";

/**
 * The nightly rate a hotel card shows.
 * - `offer`: the lowest currently available room offer, shown as "From …".
 * - `listed`: no room offers exist for this hotel in the data, so the hotel's listed rate is shown
 *   and labelled as such; it is never presented as a bookable offer.
 */
export interface DisplayRate {
  amount: number;
  basis: "offer" | "listed";
}

export function lowestAvailableRate(hotelId: string): number | undefined {
  const rates = roomsForHotel(hotelId)
    .flatMap((room) => room.rates)
    .filter((rate) => rate.availability.status === "available" && Number.isFinite(rate.nightlyRate) && rate.nightlyRate > 0)
    .map((rate) => rate.nightlyRate);
  return rates.length ? Math.min(...rates) : undefined;
}

export function hotelDisplayRate(hotel: { id: string; nightlyRate: number }): DisplayRate {
  const offer = lowestAvailableRate(hotel.id);
  return offer === undefined ? { amount: hotel.nightlyRate, basis: "listed" } : { amount: offer, basis: "offer" };
}
