import { z } from "zod";
import { ApiError, apiRequest } from "@/lib/api/client";
import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import { isB2BSearchCurrency, type B2BSearchCurrency } from "./b2b-hotel-search";

/*
 * B2B hotel rooms, room selection and prebook (price recheck), from the backend handoff contract
 * (2026-11-17). All three need the company's Bearer token; the backend takes the company from the
 * token, so no company_id is ever sent. Responses carry opaque tokens that are kept in memory only.
 *
 * Status on staging (2026-11-17): the three routes answer 404 "route could not be found", so these
 * calls are written to the handoff contract and checked against mocked replies only.
 */

export interface RoomsRequest {
  checkin: string;
  checkout: string;
  residency: string;
  language: "en" | "ar";
  currency: B2BSearchCurrency;
  guests: { adults: number; children: number[] }[];
}

/** A hotel ID the rooms endpoint accepts: a positive integer, never a list position. */
export const isHotelHid = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value > 0;

/**
 * Builds the rooms body from the search criteria. Returns null rather than guessing: 1–8 rooms,
 * 1–8 adults each, up to 8 children aged 0–17, check-out after check-in.
 */
export function toRoomsRequest(criteria: HotelSearchCriteria, options: { language: "en" | "ar"; currency: B2BSearchCurrency }): RoomsRequest | null {
  const residency = criteria.nationality?.trim().toLowerCase();
  if (!residency || !/^[a-z]{2}$/.test(residency)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(criteria.checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(criteria.checkOut) || !(criteria.checkOut > criteria.checkIn)) return null;
  if (!["en", "ar"].includes(options.language) || !isB2BSearchCurrency(options.currency)) return null;
  const rooms = criteria.rooms;
  if (rooms.length < 1 || rooms.length > 8) return null;
  const valid = rooms.every((room) =>
    Number.isInteger(room.adults) && room.adults >= 1 && room.adults <= 8 && room.childAges.length <= 8 &&
    room.childAges.every((age) => age !== null && Number.isInteger(age) && age >= 0 && age <= 17));
  if (!valid) return null;
  return {
    checkin: criteria.checkIn,
    checkout: criteria.checkOut,
    residency,
    language: options.language,
    currency: options.currency,
    guests: rooms.map((room) => ({ adults: room.adults, children: room.childAges.map(Number) })),
  };
}

/* ---------- Replies ---------- */

const token = z.string().min(1);
const lifetime = z.number().int().positive();
/** A decimal amount as sent: kept as the exact string, never recalculated. */
const amount = z.string().regex(/^\d+(\.\d+)?$/).nullable().catch(null);
const priceSchema = z.object({
  verified: z.boolean().catch(false),
  selling_price: amount.optional().transform((value) => value ?? null),
  agency_purchase_price: amount.optional().transform((value) => value ?? null),
  currency: z.string().regex(/^[A-Z]{3}$/).nullable().catch(null),
  price_on_request: z.boolean().catch(false),
});
export type RatePrice = z.infer<typeof priceSchema>;

const optionalText = z.string().trim().min(1).nullable().optional().catch(null).transform((value) => value ?? null);
const rateSchema = z.object({
  rate_index: z.number().int().nonnegative(),
  room_name: optionalText,
  bedding_type: optionalText,
  meal_name: optionalText,
  has_breakfast: z.boolean().nullable().optional().catch(null).transform((value) => value ?? null),
  price: priceSchema,
  selectable: z.boolean().catch(false),
  booking_enabled: z.boolean().catch(false),
});
export type RoomRate = z.infer<typeof rateSchema>;

const roomsSchema = z.object({
  hotel_hid: z.number().int().positive(),
  rooms_token: token,
  expires_in_seconds: lifetime,
  total: z.number().int().nonnegative(),
  rooms: z.array(z.unknown()).transform((rooms) => rooms.flatMap((room) => {
    const parsed = rateSchema.safeParse(room);
    return parsed.success ? [parsed.data] : [];
  })),
});
export type RoomsResult = z.infer<typeof roomsSchema>;

const selectSchema = z.object({
  selection_token: token,
  expires_in_seconds: lifetime,
  room_name: optionalText,
  price: priceSchema,
  next_step: z.string().optional(),
});
export type SelectResult = z.infer<typeof selectSchema>;

const prebookSchema = z.object({
  status: z.string(),
  review_token: token,
  expires_in_seconds: lifetime,
  price_changed: z.boolean(),
  review_required: z.boolean().catch(true),
  room_name: optionalText,
  price: priceSchema,
  booking_enabled: z.boolean().catch(false),
});
export type PrebookResult = z.infer<typeof prebookSchema>;

/**
 * The price that may be shown as a confirmed amount, or null: verified, not on request, a currency
 * and a numeric selling price. The amount string is returned exactly as sent.
 */
export function confirmedPrice(price: RatePrice): { amount: string; currency: string; agencyAmount: string | null } | null {
  if (!price.verified || price.price_on_request || !price.selling_price || !price.currency) return null;
  return { amount: price.selling_price, currency: price.currency, agencyAmount: price.agency_purchase_price };
}

/** Selectable only when the backend says so and the price is a confirmed amount. booking_enabled is not checked: it governs final booking, not selection. */
export const rateIsSelectable = (rate: RoomRate) => rate.selectable && confirmedPrice(rate.price) !== null;

/* ---------- Calls ---------- */

interface CallOptions { token: string; signal?: AbortSignal; locale?: "en" | "ar" }

export function fetchHotelRooms(hid: number, request: RoomsRequest, options: CallOptions): Promise<RoomsResult> {
  if (!isHotelHid(hid)) return Promise.reject(new ApiError("validation"));
  return apiRequest(`api/v1/b2b/hotels/${hid}/rooms`, { method: "POST", body: request, timeoutMs: 60000, ...options, parse: (value) => roomsSchema.parse(value) });
}

export function selectHotelRoom(roomsToken: string, rateIndex: number, options: CallOptions): Promise<SelectResult> {
  return apiRequest("api/v1/b2b/hotels/rooms/select", { method: "POST", body: { rooms_token: roomsToken, rate_index: rateIndex }, timeoutMs: 30000, ...options, parse: (value) => selectSchema.parse(value) });
}

export function prebookHotelRoom(selectionToken: string, options: CallOptions): Promise<PrebookResult> {
  return apiRequest("api/v1/b2b/hotels/rooms/prebook", { method: "POST", body: { selection_token: selectionToken }, timeoutMs: 60000, ...options, parse: (value) => prebookSchema.parse(value) });
}

/* ---------- Failures ---------- */

export type RoomsFailure =
  | "signed_out"
  | "forbidden"
  | "token_invalid"
  | "unbookable"
  | "expired"
  | "validation"
  | "supplier_unavailable"
  | "network"
  | "timeout"
  | "unexpected";

/** One category per screen message, chosen by HTTP status as the contract defines. */
export function classifyRoomsError(error: unknown): RoomsFailure {
  if (!(error instanceof ApiError)) return "unexpected";
  if (error.kind === "network") return "network";
  if (error.kind === "timeout") return "timeout";
  switch (error.status) {
    case 401: return "signed_out";
    case 403: return "forbidden";
    case 404: return "token_invalid";
    case 409: return "unbookable";
    case 410: return "expired";
    case 422: return "validation";
    case 503: return "supplier_unavailable";
    default: return "unexpected";
  }
}
