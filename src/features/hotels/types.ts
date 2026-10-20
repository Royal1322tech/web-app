import type { BoardPlan } from "./lib/board-plans";
export interface LocalizedText {
  en: string;
  ar: string;
}
export interface HotelPhoto {
  src: string;
  width: number;
  height: number;
  label: LocalizedText;
}
export type Amenity =
  | "pool"
  | "food"
  | "spa"
  | "roomService"
  | "nonSmoking"
  | "airConditioning"
  | "bathroom"
  | "gym"
  | "heating"
  | "accessible";
export type HotelStarClassification = 1 | 2 | 3 | 4 | 5;
export interface Coordinates {
  latitude: number;
  longitude: number;
  source: string;
}
export interface HotelPolicies {
  checkIn?: { from?: string; until?: string };
  checkOut?: { from?: string; until?: string };
  childPolicy?: LocalizedText;
  extraBedPolicy?: LocalizedText;
  identificationRequirements?: LocalizedText;
  restrictions?: readonly LocalizedText[];
  terms?: readonly LocalizedText[];
}
export interface HotelSummary {
  id: string;
  name: LocalizedText;
  address: LocalizedText;
  phone?: string;
  photos: readonly HotelPhoto[];
  nightlyRate: number;
  reviewScore?: number;
  amenities: readonly Amenity[];
  stars?: HotelStarClassification;
  inventoryType?: "demo";
  breakfast?: boolean;
  detailsHref?: string;
}
export interface HotelListing extends HotelSummary {
  city: LocalizedText;
  description?: LocalizedText;
  boardPlans?: readonly BoardPlan[];
  stars?: HotelStarClassification;
  luxury: boolean;
  business: boolean;
  breakfast: boolean;
  package: boolean;
  coordinates?: Coordinates;
  policies?: HotelPolicies;
}
export interface HotelFilters {
  name: string;
  luxury: boolean;
  board: BoardPlan[];
  cities: string[];
  stars: number[];
  minimumReview: number;
  profiles: string[];
  amenities: Amenity[];
  minPrice: string;
  maxPrice: string;
  packaging: string;
}
export type HotelSort = "recommended" | "priceLow" | "priceHigh" | "rating";
