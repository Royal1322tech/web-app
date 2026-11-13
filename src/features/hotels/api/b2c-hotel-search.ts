import { z } from "zod";
import { apiRequest } from "@/lib/api/client";
import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import type { GeoPoint } from "../lib/geo";

/*
 * Request body for POST /api/v1/b2c/hotels/search, from the staging validation rules (2026-11-11):
 * - checkin, checkout: required, format Y-m-d, checkout after checkin
 * - latitude (-90..90), longitude (-180..180): required numbers
 * - residency: required, 2 characters
 * - guests: required array, one entry per room: { adults: integer (required), children: array (present) }
 *
 * Not yet confirmed: the type of each `children` entry (ages are assumed), what the search point and
 * radius mean, and the fields of each hotel in a successful reply. This app has no public (B2C)
 * search page, so no screen sends this request yet.
 */
export interface B2CHotelSearchRequest {
  checkin: string;
  checkout: string;
  latitude: number;
  longitude: number;
  residency: string;
  guests: { adults: number; children: number[] }[];
}

const validPoint = ({ latitude, longitude }: GeoPoint) =>
  Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;

/**
 * Maps validated search criteria and a search point to the request body. Returns null instead of
 * guessing when a required value is missing: no two-letter residency or no valid search point.
 */
export function toB2CHotelSearchRequest(criteria: HotelSearchCriteria, point: GeoPoint): B2CHotelSearchRequest | null {
  const residency = criteria.nationality?.trim().toUpperCase();
  if (!residency || !/^[A-Z]{2}$/.test(residency) || !validPoint(point)) return null;
  return {
    checkin: criteria.checkIn,
    checkout: criteria.checkOut,
    latitude: point.latitude,
    longitude: point.longitude,
    residency,
    // The search schema has already rejected unselected child ages.
    guests: criteria.rooms.map((room) => ({ adults: room.adults, children: [...room.childAges] })),
  };
}

/*
 * Response envelope observed on staging (2026-11-13), from the supplier-unavailable reply:
 * 503 {"success":false,"code":"HOTEL_SUPPLIER_UNAVAILABLE","message":"…","data":{"hotels":[],"total":0}}.
 * No search has returned hotels yet, so the fields of each hotel are unknown and are not interpreted.
 */
const searchEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({
    hotels: z.array(z.record(z.string(), z.unknown())),
    total: z.number().int().nonnegative(),
  }),
});

export interface B2CHotelSearchResult {
  total: number;
  /** Supplier hotel records, unparsed until their format is confirmed. */
  hotels: Record<string, unknown>[];
}

export const parseB2CHotelSearch = (value: unknown): B2CHotelSearchResult => searchEnvelopeSchema.parse(value).data;

/**
 * POST /api/v1/b2c/hotels/search. Errors arrive as ApiError: 422 with field errors, 429 when the
 * search limit (10 per window on staging) is reached, and 503 with code HOTEL_SUPPLIER_UNAVAILABLE.
 */
export function searchB2CHotels(request: B2CHotelSearchRequest, options: { signal?: AbortSignal; locale?: "en" | "ar" } = {}): Promise<B2CHotelSearchResult> {
  return apiRequest("api/v1/b2c/hotels/search", { method: "POST", body: request, timeoutMs: 60000, ...options, parse: parseB2CHotelSearch });
}
