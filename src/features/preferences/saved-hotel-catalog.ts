import { collectionHotels } from "@/features/home/data/hotels.fixture";
import { hotels } from "@/features/hotels/data/hotels.fixture";
import type { HotelSummary } from "@/features/hotels/types";

// Adapt existing homepage fixtures for saved cards without inventing star ratings,
// breakfast policies, inventory, or hotel detail routes for those properties.
const cities: Record<string, string> = {
  Alexandria: "الإسكندرية",
  Cairo: "القاهرة",
  Hurghada: "الغردقة",
};
export const savedHotelCatalog: readonly HotelSummary[] = [
  ...hotels.map((hotel) => ({ ...hotel, detailsHref: `/hotels/${hotel.id}` })),
  ...collectionHotels.map((hotel): HotelSummary => ({
    id: hotel.id,
    name: { en: hotel.name, ar: "فندق جولدن روز" },
    address: { en: hotel.address, ar: `${cities[hotel.city]}، مصر` },
    photos: [
      {
        src: hotel.image,
        width: 386,
        height: 258,
        label: { en: hotel.name, ar: "فندق جولدن روز" },
      },
    ],
    nightlyRate: hotel.nightlyRate,
    reviewScore: hotel.rating,
    amenities: ["pool", "gym", "food", "spa"],
  })),
];
