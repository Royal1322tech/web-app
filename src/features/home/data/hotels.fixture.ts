import { hotels } from "@/features/hotels/data/hotels.fixture";
import type { Hotel } from "../types";

// Design-preview fixtures only. These are not live rates, ratings, or availability.
// Each sample uses a different existing home photograph so the collection does not repeat one image.
const collectionImages = ["/images/home/hotel-resort.png", "/images/home/hotel-lobby.png", "/images/home/hotel-pool.png"] as const;
export const collectionHotels: readonly Hotel[] = [
  "Alexandria",
  "Cairo",
  "Hurghada",
].map((city, index) => ({
  id: `collection-${index + 1}`,
  duration: { nights: 9, days: 10 },
  name: "Golden Rose Hotel",
  city,
  address: `${city}, Egypt`,
  image: collectionImages[index],
  nightlyRate: 116,
  currency: "USD",
  rating: 4.5,
  description:
    "Enjoy a comfortable stay with premium amenities and exceptional service for a memorable experience.",
  amenities: ["Pool", "Gym", "Food", "Spa"],
}));



// Reuse existing distinct catalogue fixtures, plus one existing collection sample.
export const featuredHotels: readonly Hotel[] = [
  ...hotels.filter(hotel => typeof hotel.reviewScore === "number" && hotel.reviewScore > 0).map((hotel, index) => ({
    id: hotel.id, name: hotel.name.en, nameAr: hotel.name.ar,
    city: hotel.city.en, address: hotel.address.en,
    image: hotel.photos[[0, 4, 3, 6][index] ?? 0]?.src ?? hotel.photos[0].src,
    nightlyRate: hotel.nightlyRate, currency: "USD" as const,
    rating: hotel.reviewScore ?? 0, description: "Sample property — no live availability.",
    amenities: ["Pool", "Food"], detailsHref: `/hotels/${hotel.id}`,
  })),
  collectionHotels[0],
];
