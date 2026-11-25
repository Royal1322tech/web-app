import { z } from "zod";
import { ApiError, apiRequest } from "@/lib/api/client";
import type { RoomsRequest } from "./b2b-hotel-rooms";

/*
 * POST /api/v1/b2b/bookings/draft: saves a booking DRAFT from a price review. A draft is not a confirmed
 * reservation and takes no payment.
 *
 * Contract (API release 2026-11-25, backend 4fddcfe). Permission hotels.view, 20 a minute.
 * - Header Idempotency-Key, 16–128 of [A-Za-z0-9_-]. Same key + same body replays; same key + a
 *   different body is 409.
 * - Body: review_token (48 hex), exactly one of customer_id or customer { first_name, last_name,
 *   email?, phone? }, contact_email (≤254), contact_phone (5–35), guests (1–64):
 *   { first_name, last_name (1–50, the supplier's name format), guest_type adult|child,
 *   room_index 0–7 (zero-based), age (children, 0–17), gender? male|female|unknown, is_lead
 *   (exactly one), date_of_birth?, nationality_code? }. Occupancy must match the prebook per room.
 * - 201 { customer_id, order_id, order_no, booking_id, booking_no, status: "draft", currency,
 *   customer_total (the agency's selling price), agency_purchase_price (the company wallet charge),
 *   next_step: "confirm", payment_collected: false, supplier_booking_created: false }.
 * - 410 when the prebook (10 minutes) expired; 404 when customer_id isn't the company's.
 */
export type GuestType = "adult" | "child";
export type Gender = "male" | "female" | "unknown";
export interface DraftGuest {
  first_name: string;
  last_name: string;
  guest_type: GuestType;
  room_index: number;
  is_lead: boolean;
  age?: number;
  gender?: Gender;
  nationality_code?: string;
}
/** One guest to name, in the order of the stay's rooms: adults first, then children, per room. */
export interface GuestSlot { key: string; type: GuestType; room: number; number: number; age?: number }

export function guestSlots(guests: RoomsRequest["guests"]): GuestSlot[] {
  return guests.flatMap((room, index) => [
    ...Array.from({ length: room.adults }, (_, n) => ({ key: `r${index}-a${n}`, type: "adult" as const, room: index + 1, number: n + 1 })),
    ...room.children.map((age, n) => ({ key: `r${index}-c${n}`, type: "child" as const, room: index + 1, number: n + 1, age })),
  ]);
}

/** Guest names the supplier accepts: 1–50 characters. Letters (any script), spaces, and . ' - , */
export const GUEST_NAME_MAX = 50;
export const isGuestName = (value: string) => value.length >= 1 && value.length <= GUEST_NAME_MAX && /^[\p{L}][\p{L}\p{M} .,'-]*$/u.test(value);
export const isContactPhone = (value: string) => value.length >= 5 && value.length <= 35 && /^\+?[0-9 ()-]+$/.test(value);
export const isEmail = (value: string) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const isReviewToken = (value: string) => /^[a-f0-9]{48}$/i.test(value);

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{16,128}$/;
export const isIdempotencyKey = (value: string) => IDEMPOTENCY_KEY.test(value);

/** A new key for a new or changed submission: "draft_" and 32 random hex characters. */
export function newIdempotencyKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `draft_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

/** The beneficiary of the booking: an existing company customer, or a new one created with the draft. */
export type DraftCustomer = { customer_id: string } | { customer: { first_name: string; last_name: string; email?: string; phone?: string } };

const decimal = z.union([z.string(), z.number()]).nullable().optional().catch(null)
  .transform((value) => (value === null || value === undefined || !/^\d+(\.\d{1,2})?$/.test(String(value)) ? null : String(value)));
const draftSchema = z.object({
  booking_id: z.string().min(1),
  booking_no: z.string().min(1),
  status: z.string().catch("draft"),
  customer_id: z.string().nullable().optional().catch(null),
  order_no: z.string().nullable().optional().catch(null).transform((value) => value ?? null),
  customer_total: decimal,
  agency_purchase_price: decimal,
  currency: z.string().nullable().optional().catch(null).transform((value) => value ?? null),
  next_step: z.string().nullable().optional().catch(null).transform((value) => value ?? null),
});
export type DraftCreated = z.infer<typeof draftSchema>;

export interface DraftContact { contact_email: string; contact_phone: string }

export function createBookingDraft(
  reviewToken: string,
  guests: DraftGuest[],
  customer: DraftCustomer,
  contact: DraftContact,
  idempotencyKey: string,
  options: { token: string; signal?: AbortSignal; locale?: "en" | "ar" },
): Promise<DraftCreated> {
  if (!isIdempotencyKey(idempotencyKey) || !isReviewToken(reviewToken)) return Promise.reject(new ApiError("validation"));
  return apiRequest("api/v1/b2b/bookings/draft", {
    method: "POST",
    body: { review_token: reviewToken, ...customer, ...contact, guests },
    headers: { "Idempotency-Key": idempotencyKey },
    timeoutMs: 60000,
    ...options,
    parse: (value) => draftSchema.parse(value),
  });
}

export type DraftFailure = "signed_out" | "forbidden" | "customer_missing" | "conflict" | "expired" | "validation" | "rate_limited" | "network" | "timeout" | "unavailable" | "unexpected";

export function classifyDraftError(error: unknown): DraftFailure {
  if (!(error instanceof ApiError)) return "unexpected";
  if (error.kind === "network") return "network";
  if (error.kind === "timeout") return "timeout";
  switch (error.status) {
    case 401: return "signed_out";
    case 403: return "forbidden";
    case 404: return "customer_missing";
    case 409: return "conflict";
    case 410: return "expired";
    case 422: return "validation";
    case 429: return "rate_limited";
    default: return (error.status ?? 0) >= 500 ? "unavailable" : "unexpected";
  }
}

/** Retrying these with the same, unchanged submission is safe and reuses the same Idempotency-Key. */
export const isRetryableDraftFailure = (failure: DraftFailure) => ["network", "timeout", "rate_limited", "unavailable"].includes(failure);
