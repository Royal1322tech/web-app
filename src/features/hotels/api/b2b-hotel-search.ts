import { z } from "zod";
import { ApiError, apiRequest } from "@/lib/api/client";
import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import type { GeoPoint } from "../lib/geo";

/*
 * POST /api/v1/b2b/hotels/search, the company (B2B) hotel search.
 *
 * Confirmed on staging (2026-11-14, without credentials):
 * - POST only (GET answers 405).
 * - Requires a Sanctum Bearer token: without one, or with an invalid one, it answers
 *   401 {"message":"Unauthenticated."} before any validation runs.
 * - CORS allows the staging site with Authorization, Content-Type and X-Locale.
 *
 * Request fields: the Geo Search payload named by the B2B hotel search specification (checkin,
 * checkout, latitude, longitude, radius, residency, language, currency, guests). Value formats follow
 * the specification's example payload (residency "eg", radius 10000, language "en", currency "USD",
 * guests [{adults, children: [ages]}]). Staging can't confirm the B2B validation rules without a
 * signed-in company account, so the ranges below mirror the documented Geo Search limits and a 422
 * is shown as "search details weren't accepted".
 */
export const B2B_SEARCH_RADIUS_METRES = 10000;
export const b2bSearchCurrencies = ["USD", "EGP", "SAR"] as const;
export type B2BSearchCurrency = (typeof b2bSearchCurrencies)[number];
export const isB2BSearchCurrency = (value: string): value is B2BSearchCurrency => (b2bSearchCurrencies as readonly string[]).includes(value);

export interface B2BHotelSearchRequest {
  checkin: string;
  checkout: string;
  latitude: number;
  longitude: number;
  radius: number;
  residency: string;
  language: "en" | "ar";
  currency: B2BSearchCurrency;
  guests: { adults: number; children: number[] }[];
}

const validPoint = ({ latitude, longitude }: GeoPoint) =>
  Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
const validRoom = (room: HotelSearchCriteria["rooms"][number]) =>
  Number.isInteger(room.adults) && room.adults >= 1 && room.adults <= 6 && room.childAges.length <= 4 &&
  room.childAges.every((age) => age !== null && Number.isInteger(age) && age >= 0 && age <= 17);

/**
 * Maps the validated form to the Geo Search body: the destination's coordinates (never its name),
 * the nationality as residency (independent of the destination), and one guests entry per room.
 * Returns null instead of guessing when a value is missing or out of range.
 */
export function toB2BHotelSearchRequest(
  criteria: HotelSearchCriteria,
  point: GeoPoint,
  options: { language: "en" | "ar"; currency: B2BSearchCurrency },
): B2BHotelSearchRequest | null {
  const residency = criteria.nationality?.trim().toLowerCase();
  if (!residency || !/^[a-z]{2}$/.test(residency) || !validPoint(point)) return null;
  if (!["en", "ar"].includes(options.language) || !isB2BSearchCurrency(options.currency)) return null;
  if (criteria.rooms.length < 1 || criteria.rooms.length > 9 || !criteria.rooms.every(validRoom)) return null;
  if (!(criteria.checkOut > criteria.checkIn)) return null;
  return {
    checkin: criteria.checkIn,
    checkout: criteria.checkOut,
    latitude: point.latitude,
    longitude: point.longitude,
    radius: B2B_SEARCH_RADIUS_METRES,
    residency,
    language: options.language,
    currency: options.currency,
    guests: criteria.rooms.map((room) => ({ adults: room.adults, children: room.childAges.map(Number) })),
  };
}

/*
 * Success reply: its field layout is not confirmed for B2B. The specification names supplier
 * entitlement, `pricing_verified` and `booking_enabled` restrictions, but not where they sit in the
 * reply. Only an envelope of the family the hotel search API already uses
 * ({success: true, data: {hotels: [...], total}}) is accepted, and the hotel records stay unparsed, so
 * no hotel name, price, availability or booking action is read or shown. That respects the pricing
 * and booking flags by construction: nothing priced or bookable is displayed until the reply format,
 * including where those flags live, is confirmed.
 */
const searchEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({
    hotels: z.array(z.record(z.string(), z.unknown())),
    total: z.number().int().nonnegative(),
  }),
});

export interface B2BHotelSearchResult {
  total: number;
  /** Hotel records as supplied, unparsed until their format is confirmed. */
  hotels: Record<string, unknown>[];
}

export const parseB2BHotelSearch = (value: unknown): B2BHotelSearchResult => searchEnvelopeSchema.parse(value).data;

/** Sends the search with the company session's token. A 401 ends the session through the API client. */
export function searchB2BHotels(request: B2BHotelSearchRequest, options: { token: string; signal?: AbortSignal; locale?: "en" | "ar" }): Promise<B2BHotelSearchResult> {
  return apiRequest("api/v1/b2b/hotels/search", { method: "POST", body: request, timeoutMs: 60000, ...options, parse: parseB2BHotelSearch });
}

export type B2BSearchFailure =
  | "signed_out"
  | "forbidden"
  | "validation"
  | "rate_limited"
  | "supplier_unavailable"
  | "not_ready"
  | "network"
  | "timeout"
  | "unavailable"
  | "unexpected";

/** One category per screen message. Server wording is never shown. */
export function classifyB2BSearchError(error: unknown): B2BSearchFailure {
  if (!(error instanceof ApiError)) return "unexpected";
  if (error.code === "HOTEL_SUPPLIER_UNAVAILABLE") return "supplier_unavailable";
  if (error.code === "HOTEL_SEARCH_NOT_READY") return "not_ready";
  switch (error.kind) {
    case "unauthorized": return "signed_out";
    case "forbidden": return "forbidden";
    case "validation": return "validation";
    case "rate_limited": return "rate_limited";
    case "network": return "network";
    case "timeout": return "timeout";
    case "unavailable":
    case "server": return "unavailable";
    default: return "unexpected";
  }
}
