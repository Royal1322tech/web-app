import { localToday } from "@/features/home/schemas/hotel-search.schema";
import { hotels } from "@/features/hotels/data/hotels.fixture";
import { hotelDisplayName } from "@/features/hotels/lib/presentation";
import { demoVehicles, type RentalRecord } from "@/features/car-rental/rental-model";
import { vehicleImages, vehicleName } from "@/features/car-rental/rental-presentation";
import type { DemoBooking, DemoStatus } from "@/features/demo/types";
import type {
  BookingStage,
  SupportTicket,
  TicketBookingContext,
  TicketBookingType,
  TicketCategory,
} from "./ticket-types";

/*
 * Frontend demo access rules. Only the booking owner may create, list, open or reply to its
 * tickets. These checks shape the interface; real enforcement belongs to backend authorization.
 */

export function bookingStage(status: DemoStatus, start: string, end: string, today = localToday()): BookingStage {
  if (status !== "confirmed") return status;
  if (end < today) return "completed";
  if (start <= today) return "in_progress";
  return "upcoming";
}

export function hotelBookingContext(booking: DemoBooking, today?: string): TicketBookingContext {
  const hotel = hotels.find((item) => item.id === booking.hotelId);
  return {
    bookingType: "hotel",
    bookingId: booking.id,
    bookingReference: booking.id,
    ownerId: booking.ownerId,
    status: booking.status,
    stage: bookingStage(booking.status, booking.checkIn, booking.checkOut, today),
    title: hotel ? { en: hotelDisplayName(hotel.name.en), ar: hotelDisplayName(hotel.name.ar) } : { en: booking.hotelId, ar: booking.hotelId },
    startDate: booking.checkIn,
    endDate: booking.checkOut,
    agencyReference: booking.agencyReference,
    detailsHref: `/bookings/${booking.id}`,
    image: hotel?.photos[0] ? { src: hotel.photos[0].src, width: hotel.photos[0].width, height: hotel.photos[0].height } : undefined,
  };
}

export function rentalBookingContext(rental: RentalRecord, today?: string): TicketBookingContext {
  const vehicle = demoVehicles.find((item) => item.id === rental.vehicleId);
  return {
    bookingType: "rental",
    bookingId: rental.id,
    bookingReference: rental.id,
    ownerId: rental.ownerId,
    status: rental.status,
    stage: bookingStage(rental.status, rental.criteria.start, rental.criteria.end, today),
    title: vehicle ? { en: vehicleName(vehicle, "en"), ar: vehicleName(vehicle, "ar") } : { en: rental.vehicleId, ar: rental.vehicleId },
    startDate: rental.criteria.start,
    endDate: rental.criteria.end,
    detailsHref: `/car-rental/bookings/${rental.id}`,
    image: vehicleImages[rental.vehicleId] ? { src: vehicleImages[rental.vehicleId], width: 1200, height: 800 } : undefined,
  };
}

export type BookingAccess =
  | { state: "ok"; booking: TicketBookingContext; categories: readonly TicketCategory[] }
  | { state: "signed-out" | "not-found" | "not-owner" };

/** Resolves a recorded booking for support. No record, no ticket; another user's record, no access. */
export function resolveBookingAccess(
  type: TicketBookingType,
  bookingId: string | undefined,
  sources: { records: readonly DemoBooking[]; rentals: readonly RentalRecord[] },
  userId: string | null,
): BookingAccess {
  if (!userId) return { state: "signed-out" };
  const context =
    type === "hotel"
      ? sources.records.filter((b) => b.id === bookingId).map((b) => hotelBookingContext(b))[0]
      : sources.rentals.filter((r) => r.id === bookingId).map((r) => rentalBookingContext(r))[0];
  if (!context) return { state: "not-found" };
  if (context.ownerId !== userId) return { state: "not-owner" };
  return { state: "ok", booking: context, categories: ticketCategories(context.bookingType, context.stage) };
}

/**
 * Categories suited to each booking type and stage. Every recorded status is eligible and
 * "Other" is always available, so owners can report any legitimate issue.
 */
export function ticketCategories(type: TicketBookingType, stage: BookingStage): readonly TicketCategory[] {
  const service: TicketCategory = type === "hotel" ? "stay_issue" : "vehicle_issue";
  const billing: TicketCategory[] = type === "hotel" ? ["payment", "invoice"] : ["payment"];
  const byStage: Record<BookingStage, TicketCategory[]> = {
    pending: ["booking_status", "booking_change", ...billing],
    upcoming: ["booking_change", "booking_status", ...billing],
    in_progress: [service, "booking_change", ...billing],
    completed: [service, ...billing],
    cancelled: ["cancellation_refund", ...billing],
    failed: ["booking_status", ...billing],
  };
  return [...byStage[stage], "other"];
}

/** Only the owner's tickets ever leave the demo state. */
export function ownedTickets(tickets: readonly SupportTicket[], userId: string | null): SupportTicket[] {
  return userId ? tickets.filter((ticket) => ticket.ownerId === userId) : [];
}

export function findOwnedTicket(
  tickets: readonly SupportTicket[],
  reference: string | undefined,
  userId: string | null,
): SupportTicket | undefined {
  return ownedTickets(tickets, userId).find((ticket) => ticket.reference === reference);
}
