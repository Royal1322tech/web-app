import {
  hotelSearchSchema,
  type HotelSearchCriteria,
} from "@/features/home/schemas/hotel-search.schema";
import type { StayDates } from "./sample-stay";

export function stayQuery(
  criteria: StayDates &
    Partial<Pick<HotelSearchCriteria, "destination" | "rooms">>,
) {
  return new URLSearchParams({
    ...(criteria.destination ? { destination: criteria.destination } : {}),
    checkIn: criteria.checkIn,
    checkOut: criteria.checkOut,
    rooms: JSON.stringify(criteria.rooms ?? [{ adults: 2, childAges: [] }]),
  }).toString();
}
export function readStayQuery(
  query: Pick<URLSearchParams, "get">,
  destination?: string,
): HotelSearchCriteria | undefined {
  try {
    const result = hotelSearchSchema.safeParse({
      destination: destination ?? query.get("destination"),
      checkIn: query.get("checkIn"),
      checkOut: query.get("checkOut"),
      rooms: JSON.parse(query.get("rooms") || "[]"),
    });
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}
