import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
// UI demonstration policy for the supplied double-room fixtures, not supplier inventory.
export const demoDoubleRoomPolicy = { maxAdults: 2, maxChildren: 0 } as const;
export function roomIsUnavailable(roomId: string) {
  return roomId === "double-3";
}
export function fitsDemoRoom(criteria: HotelSearchCriteria) {
  return criteria.rooms.every(
    (room) =>
      room.adults <= demoDoubleRoomPolicy.maxAdults &&
      room.childAges.length <= demoDoubleRoomPolicy.maxChildren,
  );
}
