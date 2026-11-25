import { z } from "zod";
import { ApiError, apiRequest } from "@/lib/api/client";

/*
 * Bookings, read-only. Permission bookings.view; the company comes from the token.
 * - GET /api/v1/b2b/bookings?status=&page=               company-wide (backend 888cb8c).
 * - GET /api/v1/b2b/bookings/my-bookings?status=&page=&per_page=   the signed-in employee's bookings
 * - GET /api/v1/b2b/bookings/my-incomplete?status=&page=&per_page= (API release 2026-11-25), 30 a minute.
 *   Laravel paginators, 20 per page; items add confirmation_state, confirmed_at and can_resume_draft.
 * - GET /api/v1/b2b/bookings/{id} → { data: booking + guests } (another company's: 404).
 * No cancel, payment, voucher or invoice endpoints exist.
 */
export const bookingStatuses = ["draft", "pending", "pending_supplier", "confirmed", "failed", "cancelled", "completed"] as const;
export type BookingStatus = (typeof bookingStatuses)[number];
export const incompleteStatuses = ["draft", "pending", "pending_supplier"] as const satisfies readonly BookingStatus[];
export type BookingScope = "mine" | "incomplete" | "company";
const scopePath: Record<BookingScope, string> = { mine: "api/v1/b2b/bookings/my-bookings", incomplete: "api/v1/b2b/bookings/my-incomplete", company: "api/v1/b2b/bookings" };
export const statusesFor = (scope: BookingScope): readonly BookingStatus[] => (scope === "incomplete" ? incompleteStatuses : bookingStatuses);

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
  confirmation_state: text,
  confirmed_at: text,
  can_resume_draft: z.boolean().nullable().optional().catch(null).transform((value) => value ?? null),
  /** The company wallet charge; read only when the backend includes it. */
  agency_purchase_price: text,
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

export function listBookings(scope: BookingScope, status: BookingStatus | "", page: number, options: Options): Promise<BookingPage> {
  const params = new URLSearchParams({ page: String(Math.max(1, Math.min(1000, Math.floor(page)))) });
  if (status && statusesFor(scope).includes(status)) params.set("status", status);
  return apiRequest(`${scopePath[scope]}?${params}`, {
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
    draft: ["Draft", "مسودة"], pending: ["Pending", "قيد الانتظار"], pending_supplier: ["Waiting for supplier", "بانتظار المورد"], confirmed: ["Confirmed", "مؤكد"],
    failed: ["Failed", "فشل"], cancelled: ["Cancelled", "ملغى"], completed: ["Completed", "مكتمل"],
  };
  const pair = known[status];
  return pair ? t(...pair) : status;
}
