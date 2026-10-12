import type { HotelListing } from "@/features/hotels/types";
import type { SampleBooking } from "../data/bookings.fixture";
export const defaultBookingFilters = {
  query: "",
  status: "all",
  dateType: "bookedAt" as "bookedAt" | "checkIn",
  from: "",
  to: "",
  owner: "all",
  traveller: "",
  destination: "",
  reference: "",
  fees: false,
};
export type BookingFiltersValue = typeof defaultBookingFilters;
export function filterBookings(
  bookings: readonly SampleBooking[],
  hotels: readonly HotelListing[],
  filters: BookingFiltersValue,
  sort: string,
) {
  return bookings
    .filter((b) => {
      const hotel = hotels.find((h) => h.id === b.hotelId);
      return (
        b.id.toLowerCase().includes(filters.query.toLowerCase()) &&
        (filters.status === "all" || b.status === filters.status) &&
        (!filters.from || b[filters.dateType] >= filters.from) &&
        (!filters.to || b[filters.dateType] <= filters.to) &&
        (filters.owner === "all" || b.owner === filters.owner) &&
        b.traveller.toLowerCase().includes(filters.traveller.toLowerCase()) &&
        `${hotel?.city.en} ${hotel?.city.ar}`
          .toLowerCase()
          .includes(filters.destination.toLowerCase()) &&
        b.agencyReference
          .toLowerCase()
          .includes(filters.reference.toLowerCase()) &&
        (!filters.fees || b.cancellationFee)
      );
    })
    .sort((a, b) =>
      sort === "newest"
        ? b.bookedAt.localeCompare(a.bookedAt)
        : a.bookedAt.localeCompare(b.bookedAt),
    );
}
