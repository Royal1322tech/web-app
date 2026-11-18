/** Hotel details carried to the rooms page from the search results, for display only. */
export interface RoomsHotelSummary {
  hid: number;
  name: string | null;
  address: string | null;
  stars: number | null;
  image: string | null;
}

export const roomsPath = (hid: number, stayQuery: string) => `/hotels/rooms/${hid}?${stayQuery}`;

/** Reads the summary from router state, only if it belongs to this hid and has the expected shape. */
export function readHotelSummary(state: unknown, hid: number): RoomsHotelSummary | null {
  if (!state || typeof state !== "object" || !("hotel" in state)) return null;
  const hotel = (state as { hotel: unknown }).hotel;
  if (!hotel || typeof hotel !== "object") return null;
  const value = hotel as Record<string, unknown>;
  if (value.hid !== hid) return null;
  const text = (field: unknown) => (typeof field === "string" && field.trim() ? field : null);
  return {
    hid,
    name: text(value.name),
    address: text(value.address),
    stars: typeof value.stars === "number" && value.stars > 0 && value.stars <= 5 ? value.stars : null,
    image: text(value.image),
  };
}
