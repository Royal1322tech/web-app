import { z } from "zod";
import { ApiError, apiRequest } from "@/lib/api/client";
import type { RoomsRequest } from "./b2b-hotel-rooms";

/*
 * POST /api/v1/b2b/bookings/draft: saves a booking DRAFT from a price review. A draft is not a confirmed
 * reservation and takes no payment.
 *
 * Contract as validated by the deployed API (staging, 2026-11-19):
 * - Body: { review_token: string (the review_token from prebook), guests: [{ first_name, last_name,
 *   guest_type: "adult" | "child", is_lead: boolean }] }. Other guest fields (room, age) are not part
 *   of it.
 * - Header: Idempotency-Key, 16–128 characters of letters, digits, "_" or "-"; otherwise 422.
 * - 410 "Review expired. Please prebook again." when the review token is no longer valid.
 * The success body isn't documented: any JSON object is treated as success and nothing from it is shown.
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

const draftSchema = z.record(z.string(), z.unknown());

export function createBookingDraft(
  reviewToken: string,
  guests: DraftGuest[],
  idempotencyKey: string,
  options: { token: string; signal?: AbortSignal; locale?: "en" | "ar" },
): Promise<void> {
  if (!isIdempotencyKey(idempotencyKey)) return Promise.reject(new ApiError("validation"));
  return apiRequest("api/v1/b2b/bookings/draft", {
    method: "POST",
    body: { review_token: reviewToken, guests },
    headers: { "Idempotency-Key": idempotencyKey },
    timeoutMs: 60000,
    ...options,
    parse: (value) => { draftSchema.parse(value); },
  });
}

export type DraftFailure = "signed_out" | "forbidden" | "conflict" | "expired" | "validation" | "rate_limited" | "network" | "timeout" | "unavailable" | "unexpected";

export function classifyDraftError(error: unknown): DraftFailure {
  if (!(error instanceof ApiError)) return "unexpected";
  if (error.kind === "network") return "network";
  if (error.kind === "timeout") return "timeout";
  switch (error.status) {
    case 401: return "signed_out";
    case 403: return "forbidden";
    case 409: return "conflict";
    case 410: return "expired";
    case 422: return "validation";
    case 429: return "rate_limited";
    default: return (error.status ?? 0) >= 500 ? "unavailable" : "unexpected";
  }
}

/** Retrying these with the same, unchanged submission is safe and reuses the same Idempotency-Key. */
export const isRetryableDraftFailure = (failure: DraftFailure) => ["network", "timeout", "rate_limited", "unavailable"].includes(failure);
