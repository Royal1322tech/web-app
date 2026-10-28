import { hotelBoardPlans } from "./board-plans";
import type { HotelFilters, HotelListing, HotelSort } from "../types";
import { hotelDisplayRate } from "./display-rate";
export const defaultFilters: HotelFilters = {
  name: "",
  luxury: false,
  board: [],
  cities: [],
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
  if ((filters.minPrice && Number(filters.minPrice) < 0) || (filters.maxPrice && Number(filters.maxPrice) < 0) || (filters.minPrice && filters.maxPrice && Number(filters.minPrice) > Number(filters.maxPrice))) return [];
  return hotels
    .filter(
      (h) =>
        (!destination || h.city.en === destination) &&
        (!filters.cities.length || filters.cities.includes(h.city.en)) &&
        (!name ||
          `${h.name.en} ${h.name.ar} ${h.city.en} ${h.city.ar} ${h.address.en} ${h.address.ar}`.toLocaleLowerCase().includes(name)) &&
        (!filters.luxury || h.luxury) &&
        (!filters.board.length ||
          hotelBoardPlans(h).some(plan => filters.board.includes(plan))) &&
        (!filters.stars.length || (h.stars !== undefined && filters.stars.includes(h.stars))) &&
        (h.reviewScore ?? 0) >= filters.minimumReview &&
        (!filters.profiles.length ||
          filters.profiles.some((p) =>
            p === "business" ? h.business : h.luxury,
          )) &&
        filters.amenities.every((a) => h.amenities.includes(a)) &&
        (!filters.minPrice || hotelDisplayRate(h).amount >= Number(filters.minPrice)) &&
        (!filters.maxPrice || hotelDisplayRate(h).amount <= Number(filters.maxPrice)) &&
        (filters.packaging === "all" ||
          h.package === (filters.packaging === "with")),
    )
    .sort((a, b) =>
      sort === "priceLow"
        ? hotelDisplayRate(a).amount - hotelDisplayRate(b).amount
        : sort === "priceHigh"
          ? hotelDisplayRate(b).amount - hotelDisplayRate(a).amount
          : sort === "rating"
            ? (b.reviewScore ?? 0) - (a.reviewScore ?? 0)
            : 0,
    );
}
