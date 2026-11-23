import { z } from "zod";
import { ApiError, apiRequest } from "@/lib/api/client";
import type { RoomsRequest } from "./b2b-hotel-rooms";

/*
 * POST /api/v1/b2b/bookings/draft: saves a booking DRAFT from a price review. A draft is not a confirmed
 * reservation and takes no payment.
 *
 * Contract (backend 888cb8c, ROYAL_TRAVEL_B2B_API_HANDOFF.md §3.5):
 * - Body: { review_token, guests: [{ first_name, last_name, guest_type: "adult" | "child", is_lead }],
 *   and exactly one of customer_id (one of the company's customers) or customer { first_name,
 *   last_name, email?, phone? } (email or phone required) }.
 * - Header: Idempotency-Key, 16–128 characters of letters, digits, "_" or "-"; otherwise 422.
 * - 201 { customer_id, order_id, order_no, booking_id, booking_no, status: "draft", currency,
 *   customer_total, next_step, payment_collected: false, supplier_booking_created: false }.
 * - 410 when the review expired; 404 when customer_id isn't one of the company's customers.
 */
export type GuestType = "adult" | "child";
export interface DraftGuest { first_name: string; last_name: string; guest_type: GuestType; is_lead: boolean }
/** One guest to name, in the order of the stay's rooms: adults first, then children, per room. */
export interface GuestSlot { key: string; type: GuestType; room: number; number: number }

export function guestSlots(guests: RoomsRequest["guests"]): GuestSlot[] {
  return guests.flatMap((room, index) => [
    ...Array.from({ length: room.adults }, (_, n) => ({ key: `r${index}-a${n}`, type: "adult" as const, room: index + 1, number: n + 1 })),
    ...room.children.map((_, n) => ({ key: `r${index}-c${n}`, type: "child" as const, room: index + 1, number: n + 1 })),
  ]);
}

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{16,128}$/;
export const isIdempotencyKey = (value: string) => IDEMPOTENCY_KEY.test(value);

/** A new key for a new or changed submission: "draft_" and 32 random hex characters. */
export function newIdempotencyKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `draft_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

/** The beneficiary of the booking: an existing company customer, or a new one created with the draft. */
export type DraftCustomer = { customer_id: string } | { customer: { first_name: string; last_name: string; email?: string; phone?: string } };

const draftSchema = z.object({
  booking_id: z.string().min(1),
  booking_no: z.string().min(1),
  status: z.string().catch("draft"),
  customer_id: z.string().nullable().optional().catch(null),
  customer_total: z.union([z.string(), z.number()]).nullable().optional().catch(null).transform((value) => (value === null || value === undefined ? null : String(value))),
  currency: z.string().nullable().optional().catch(null),
});
export type DraftCreated = z.infer<typeof draftSchema>;

export function createBookingDraft(
  reviewToken: string,
  guests: DraftGuest[],
  customer: DraftCustomer,
  idempotencyKey: string,
  options: { token: string; signal?: AbortSignal; locale?: "en" | "ar" },
): Promise<DraftCreated> {
  if (!isIdempotencyKey(idempotencyKey)) return Promise.reject(new ApiError("validation"));
  return apiRequest("api/v1/b2b/bookings/draft", {
    method: "POST",
    body: { review_token: reviewToken, guests, ...customer },
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
