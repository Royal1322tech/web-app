import type { HotelListing } from "../types";
import { roomsForHotel } from "../data/rooms.fixture";
export { boardPlans, boardPlanLabels } from "./board-plan-definitions";
export type { BoardPlan } from "./board-plan-definitions";
import type { BoardPlan } from "./board-plan-definitions";

/** Availability comes only from the room-rate offers currently attached to a hotel. */
export function hotelBoardPlans(hotel: HotelListing): readonly BoardPlan[] {
  return [...new Set(roomsForHotel(hotel.id).flatMap(room => room.rates.map(rate => rate.boardPlan)))];
}
