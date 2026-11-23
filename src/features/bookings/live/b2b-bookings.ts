import { z } from "zod";
import { ApiError, apiRequest } from "@/lib/api/client";

/*
 * The company's bookings, read-only (backend 888cb8c, ROYAL_TRAVEL_B2B_API_HANDOFF.md §3.6).
 * Permission bookings.view; the company comes from the token.
 * - GET /api/v1/b2b/bookings?status=&page=  → Laravel paginator, 20 per page, newest first.
 * - GET /api/v1/b2b/bookings/{id}          → { data: booking + guests } (another company's: 404).
 * Only the customer total is returned: no supplier cost, markups or supplier references.
 * There are no cancel, confirm, payment or voucher endpoints.
 */
export const bookingStatuses = ["draft", "pending", "confirmed", "failed", "cancelled", "completed"] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

const text = z.string().nullable().optional().catch(null).transform((value) => (value?.trim() ? value : null));
const bookingSchema = z.object({
  booking_id: z.string().min(1),
  booking_no: z.string().min(1),
  order_no: text,
  service_type: text,
  status: z.string(),
  currency: text,
  customer_total: text,
  check_in: text,
  check_out: text,
  rooms_count: z.number().int().nullable().optional().catch(null).transform((value) => value ?? null),
  customer: z.object({ id: z.string(), first_name: z.string(), last_name: z.string() }).nullable().optional().catch(null).transform((value) => value ?? null),
  created_at: text,
});
export type LiveBooking = z.infer<typeof bookingSchema>;

const guestSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  guest_type: z.string(),
  is_lead: z.boolean().catch(false),
  room_index: z.number().int().nullable().optional().catch(null).transform((value) => value ?? null),
  age: z.number().int().nullable().optional().catch(null).transform((value) => value ?? null),
  nationality_code: text,
});
export type LiveGuest = z.infer<typeof guestSchema>;

const pageSchema = z.object({ data: z.array(z.unknown()), current_page: z.number().int().positive(), last_page: z.number().int().positive(), total: z.number().int().nonnegative() });
export interface BookingPage { items: LiveBooking[]; page: number; lastPage: number; total: number }

type Options = { token: string; signal?: AbortSignal };

export function listBookings(status: BookingStatus | "", page: number, options: Options): Promise<BookingPage> {
  const params = new URLSearchParams({ page: String(Math.max(1, Math.min(1000, Math.floor(page)))) });
  if (status) params.set("status", status);
  return apiRequest(`api/v1/b2b/bookings?${params}`, {
    ...options,
    parse: (value) => {
      const data = pageSchema.parse(value);
      return { items: data.data.flatMap((item) => { const parsed = bookingSchema.safeParse(item); return parsed.success ? [parsed.data] : []; }), page: data.current_page, lastPage: data.last_page, total: data.total };
    },
  });
}

export function getBooking(id: string, options: Options): Promise<LiveBooking & { guests: LiveGuest[] }> {
  return apiRequest(`api/v1/b2b/bookings/${encodeURIComponent(id)}`, {
    ...options,
    parse: (value) => {
      const data = z.object({ data: z.record(z.string(), z.unknown()) }).parse(value).data;
      const guests = Array.isArray(data.guests) ? data.guests.flatMap((guest) => { const parsed = guestSchema.safeParse(guest); return parsed.success ? [parsed.data] : []; }) : [];
      return { ...bookingSchema.parse(data), guests };
    },
  });
}

export type BookingFailure = "signed_out" | "forbidden" | "not_found" | "rate_limited" | "network" | "unavailable";
export function classifyBookingError(error: unknown): BookingFailure {
  if (!(error instanceof ApiError)) return "unavailable";
  if (error.kind === "unauthorized") return "signed_out";
  if (error.kind === "forbidden") return "forbidden";
  if (error.status === 404) return "not_found";
  if (error.kind === "rate_limited") return "rate_limited";
  if (error.kind === "network" || error.kind === "timeout") return "network";
  return "unavailable";
}

export function bookingStatusLabel(status: string, t: (en: string, ar: string) => string): string {
  const known: Record<string, [string, string]> = {
    draft: ["Draft", "مسودة"], pending: ["Pending", "قيد الانتظار"], confirmed: ["Confirmed", "مؤكد"],
    failed: ["Failed", "فشل"], cancelled: ["Cancelled", "ملغى"], completed: ["Completed", "مكتمل"],
  };
  const pair = known[status];
  return pair ? t(...pair) : status;
}
