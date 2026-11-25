import { z } from "zod";
import { ApiError, apiRequest } from "@/lib/api/client";

/*
 * Booking confirmation and status (API release 2026-11-25, backend 4fddcfe). USD only; sandbox only.
 *
 * POST /api/v1/b2b/bookings/{booking}/confirm  { accept_price: true }
 *   Permission bookings.create, 5 a minute. Charges the company wallet the draft's
 *   agency_purchase_price and asks the supplier to finish. HTTP 200 doesn't mean confirmed: read
 *   `status` and `confirmation_state`. Calling it again for a processing or finish_unknown attempt
 *   reconciles that same attempt (it doesn't start another one).
 *   422 errors.wallet: not enough wallet funds. 409: already confirming, or a legacy draft without
 *   the context to confirm. 410: the prebook expired. 403: confirmation disabled (sandbox Finish off)
 *   or no permission.
 * GET /api/v1/b2b/bookings/{booking}/status
 *   Permission bookings.view, 30 a minute. Reads the state only; it doesn't reconcile.
 * Both return { booking_id, status, confirmation_state, confirmed_at }.
 */
export const confirmationStates = ["prepared", "form_ready", "form_unknown", "finish_unknown", "processing", "confirmed", "abandoned"] as const;
export type ConfirmationState = (typeof confirmationStates)[number];

const stateSchema = z.object({
  booking_id: z.string().min(1),
  status: z.string().min(1),
  confirmation_state: z.string().nullable().optional().catch(null).transform((value) => value ?? null),
  confirmed_at: z.string().nullable().optional().catch(null).transform((value) => value ?? null),
});
export type BookingConfirmation = z.infer<typeof stateSchema>;

type Options = { token: string; signal?: AbortSignal; locale?: "en" | "ar" };

export function confirmBooking(bookingId: string, options: Options): Promise<BookingConfirmation> {
  return apiRequest(`api/v1/b2b/bookings/${encodeURIComponent(bookingId)}/confirm`, {
    method: "POST",
    body: { accept_price: true },
    // The supplier may take a while; a timeout leaves the outcome unknown, never "failed".
    timeoutMs: 90000,
    ...options,
    parse: (value) => stateSchema.parse(value),
  });
}

export function getBookingConfirmation(bookingId: string, options: Options): Promise<BookingConfirmation> {
  return apiRequest(`api/v1/b2b/bookings/${encodeURIComponent(bookingId)}/status`, { ...options, parse: (value) => stateSchema.parse(value) });
}

/** What the screen shows for a booking's status and confirmation state. */
export type ConfirmationView =
  | "draft" | "wallet_held" | "preparing" | "manual_review" | "uncertain" | "processing" | "confirmed" | "failed" | "other";

export function confirmationView(status: string, state: string | null, confirmedAt: string | null): ConfirmationView {
  // A booking counts as confirmed only when the backend says so in both fields.
  if (status === "confirmed" && state === "confirmed" && confirmedAt) return "confirmed";
  if (status === "failed") return "failed";
  if (status !== "draft") return "other";
  switch (state) {
    case null: return "draft";
    case "prepared": return "wallet_held";
    case "form_ready": return "preparing";
    case "form_unknown": return "manual_review";
    case "finish_unknown": return "uncertain";
    case "processing": return "processing";
    default: return "other";
  }
}

/** Polling continues only while the supplier is working on it. */
export const isPollingView = (view: ConfirmationView) => view === "processing" || view === "preparing" || view === "wallet_held";
/** Asking the confirm endpoint again reconciles this same attempt (no new draft, no new charge). */
export const canReconcile = (view: ConfirmationView) => view === "processing" || view === "uncertain";

export type ConfirmFailure =
  | "signed_out" | "disabled" | "insufficient_funds" | "conflict"
  | "expired" | "not_found" | "validation" | "rate_limited" | "uncertain" | "unavailable";

/**
 * A failed confirm request. "uncertain" (network error, timeout, 5xx) means the outcome isn't known:
 * the screen checks the status instead of sending the confirmation again.
 */
export function classifyConfirmError(error: unknown): ConfirmFailure {
  if (!(error instanceof ApiError)) return "uncertain";
  if (error.kind === "network" || error.kind === "timeout" || error.kind === "invalid_response") return "uncertain";
  switch (error.status) {
    case 401: return "signed_out";
    case 403: return "disabled";
    case 404: return "not_found";
    // Already confirming, or a legacy draft that can't be confirmed: the contract gives no code to
    // tell them apart, so the screen checks the status and explains both.
    case 409: return "conflict";
    case 410: return "expired";
    case 422: return "wallet" in error.fieldErrors ? "insufficient_funds" : "validation";
    case 429: return "rate_limited";
    default: return (error.status ?? 0) >= 500 ? "uncertain" : "unavailable";
  }
}

/** Tells pages that read the wallet (finance, wallet summary) to load it again. */
export const FINANCE_CHANGED_EVENT = "royal-finance-changed";
export function announceFinanceChange() {
  window.dispatchEvent(new Event(FINANCE_CHANGED_EVENT));
}
