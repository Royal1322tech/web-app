import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import type { SampleRoomRate } from "@/features/hotels/data/rooms.fixture";
// UI demonstration occupancy policy, not supplier inventory.
export const demoDoubleRoomPolicy = { maxAdults: 2, maxChildren: 0 } as const;
export function demoOfferIsSelectable(rate: SampleRoomRate, hotelId: string, roomId: string) {
  const { availability } = rate;
  return availability.source === "demo-fixture" &&
    availability.hotelId === hotelId &&
    availability.roomId === roomId &&
    availability.rateId === rate.id &&
    availability.status === "available" &&
    (availability.remainingInventory === undefined || availability.remainingInventory > 0);
}
export function fitsDemoRoom(
  criteria: HotelSearchCriteria,
  occupancy: { maxAdults: number; maxChildren: number } = demoDoubleRoomPolicy,
) {
  return criteria.rooms.every(
    (room) =>
      room.adults <= occupancy.maxAdults &&
      room.childAges.length <= occupancy.maxChildren,
  );
}
