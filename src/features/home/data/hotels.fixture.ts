import type { Hotel } from "../types";

// Design-preview fixtures only. These are not live rates, ratings, or availability.
export const featuredHotels: readonly Hotel[] = Array.from(
  { length: 4 },
  (_, index) => ({
    id: `featured-${index + 1}`,
    name: "Eastern Al Montazah Hotel",
    city: "Alexandria",
    address: "Alexandria, Egypt",
    image:
      index % 2
        ? "/images/home/hotel-pool.png"
        : "/images/home/hotel-lobby.png",
    nightlyRate: 116,
    currency: "USD",
    rating: 4.5,
    description: "A comfortable stay by the Mediterranean.",
    amenities: ["Pool", "Gym", "Food", "Spa"],
  }),
);

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
  image: "/images/home/hotel-resort.png",
  nightlyRate: 116,
  currency: "USD",
  rating: 4.5,
  description:
    "Enjoy a comfortable stay with premium amenities and exceptional service for a memorable experience.",
  amenities: ["Pool", "Gym", "Food", "Spa"],
}));

export const sampleDestinations = ["Alexandria", "Cairo", "Hurghada"] as const;
