import { hotels } from "@/features/hotels/data/hotels.fixture";
import { hotelDisplayName } from "@/features/hotels/lib/presentation";
import type { DemoBooking, Transaction } from "./types";

/**
 * Customer and hotel of a transaction, from the booking its reference points to. Credit top-ups
 * and adjustments reference no booking, and a missing booking yields nothing: names are never guessed.
 */
export function transactionParties(row: Transaction, bookings: readonly Pick<DemoBooking, "id" | "hotelId" | "guests">[], locale: "en" | "ar") {
  if (row.type !== "reservation") return {};
  const booking = bookings.find((item) => item.id === row.reference);
  if (!booking) return {};
  const hotel = hotels.find((item) => item.id === booking.hotelId);
  return {
    customer: booking.guests.leadName || undefined,
    hotel: hotel ? hotelDisplayName(hotel.name[locale]) : undefined,
  };
}
