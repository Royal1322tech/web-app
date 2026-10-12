import type { HotelFilters, HotelListing, HotelSort } from "../types";
export const defaultFilters: HotelFilters = {
  name: "",
  luxury: false,
  board: [],
  stars: [],
  minimumReview: 0,
  profiles: [],
  amenities: [],
  minPrice: "",
  maxPrice: "",
  packaging: "all",
};
export function filterHotels(
  hotels: readonly HotelListing[],
  filters: HotelFilters,
  destination: string,
  sort: HotelSort,
) {
  const name = filters.name.trim().toLocaleLowerCase();
  return hotels
    .filter(
      (h) =>
        (!destination || h.city.en === destination) &&
        (!name ||
          `${h.name.en} ${h.name.ar}`.toLocaleLowerCase().includes(name)) &&
        (!filters.luxury || h.luxury) &&
        (!filters.board.length ||
          filters.board.includes(h.breakfast ? "breakfast" : "room")) &&
        (!filters.stars.length || filters.stars.includes(h.stars)) &&
        h.reviewScore >= filters.minimumReview &&
        (!filters.profiles.length ||
          filters.profiles.some((p) =>
            p === "business" ? h.business : h.luxury,
          )) &&
        filters.amenities.every((a) => h.amenities.includes(a)) &&
        (!filters.minPrice || h.nightlyRate >= Number(filters.minPrice)) &&
        (!filters.maxPrice || h.nightlyRate <= Number(filters.maxPrice)) &&
        (filters.packaging === "all" ||
          h.package === (filters.packaging === "with")),
    )
    .sort((a, b) =>
      sort === "priceLow"
        ? a.nightlyRate - b.nightlyRate
        : sort === "priceHigh"
          ? b.nightlyRate - a.nightlyRate
          : sort === "rating"
            ? b.reviewScore - a.reviewScore
            : 0,
    );
}
