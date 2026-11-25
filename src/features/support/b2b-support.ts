import { z } from "zod";
import { ApiError, apiRequest } from "@/lib/api/client";

/*
 * Support tickets (API release 2026-11-25, backend 4fddcfe). Permission bookings.view, 30 a minute.
 * Tickets belong to the employee who opened them (not company-wide). Only Royal support changes a
 * ticket's status.
 * - GET  /b2b/tickets/categories                → ["booking_issue", …] (values sent as-is)
 * - GET  /b2b/tickets?page=                      → Laravel paginator, 20 per page
 * - GET  /b2b/bookings/{booking}/tickets?page=   → Laravel paginator, 20 per page
 * - POST /b2b/bookings/{booking}/tickets          Idempotency-Key required, 5 a minute.
 *        { category, subject ≤150, description ≤5000 } → 201 ticket (200 for an identical replay).
 *        Only for bookings with confirmed_at and status confirmed, completed or cancelled.
 * - GET  /b2b/tickets/{ticket}?page=              → { ticket, messages: paginator (50, oldest first) }
 * - POST /b2b/tickets/{ticket}/messages           Idempotency-Key (sent always), 10 a minute.
 *        { message ≤5000 } → 201 { status: "sent", message_id } (200 for an identical replay).
 * Message bodies are shown as plain text only.
 */
export const ticketStatuses = ["open", "in_progress", "waiting_for_customer", "resolved", "closed"] as const;
export const SUBJECT_MAX = 150;
export const BODY_MAX = 5000;
export const ticketAcceptsReplies = (status: string) => status !== "resolved" && status !== "closed";
/** Bookings that can have a ticket: confirmed by the supplier at some point. */
export const bookingAcceptsTickets = (booking: { status: string; confirmed_at: string | null }) =>
  !!booking.confirmed_at && ["confirmed", "completed", "cancelled"].includes(booking.status);

const text = z.string().nullable().optional().catch(null).transform((value) => (value?.trim() ? value : null));
const ticketSchema = z.object({
  id: z.string().min(1),
  ticket_no: z.string().min(1),
  booking_id: text,
  category: z.string(),
  subject: z.string(),
  status: z.string(),
  created_at: text,
  updated_at: text,
});
export type Ticket = z.infer<typeof ticketSchema>;
const messageSchema = z.object({ id: z.string().min(1), actor_type: z.string(), body: z.string(), created_at: text });
export type TicketMessage = z.infer<typeof messageSchema>;

const paginator = z.object({ data: z.array(z.unknown()), current_page: z.number().int().positive(), last_page: z.number().int().positive(), total: z.number().int().nonnegative().optional() });
export interface Page<T> { items: T[]; page: number; lastPage: number; total: number | null }
function parsePage<T>(value: unknown, schema: z.ZodType<T>): Page<T> {
  const data = paginator.parse(value);
  return { items: data.data.flatMap((item) => { const parsed = schema.safeParse(item); return parsed.success ? [parsed.data] : []; }), page: data.current_page, lastPage: data.last_page, total: data.total ?? null };
}

type Options = { token: string; signal?: AbortSignal; locale?: "en" | "ar" };
const page = (value: number) => String(Math.max(1, Math.min(1000, Math.floor(value))));

export function fetchTicketCategories(options: Options): Promise<string[]> {
  return apiRequest("api/v1/b2b/tickets/categories", { ...options, parse: (value) => z.array(z.string().regex(/^[a-z_]{1,64}$/)).parse(value) });
}

export function listTickets(pageNumber: number, options: Options): Promise<Page<Ticket>> {
  return apiRequest(`api/v1/b2b/tickets?page=${page(pageNumber)}`, { ...options, parse: (value) => parsePage(value, ticketSchema) });
}

export function listBookingTickets(bookingId: string, pageNumber: number, options: Options): Promise<Page<Ticket>> {
  return apiRequest(`api/v1/b2b/bookings/${encodeURIComponent(bookingId)}/tickets?page=${page(pageNumber)}`, { ...options, parse: (value) => parsePage(value, ticketSchema) });
}

export function getTicket(ticketId: string, messagesPage: number | null, options: Options): Promise<{ ticket: Ticket; messages: Page<TicketMessage> }> {
  const query = messagesPage ? `?page=${page(messagesPage)}` : "";
  return apiRequest(`api/v1/b2b/tickets/${encodeURIComponent(ticketId)}${query}`, {
    ...options,
    parse: (value) => {
      const data = z.object({ ticket: z.unknown(), messages: z.unknown() }).parse(value);
      return { ticket: ticketSchema.parse(data.ticket), messages: parsePage(data.messages, messageSchema) };
    },
  });
}

export function createTicket(bookingId: string, body: { category: string; subject: string; description: string }, idempotencyKey: string, options: Options): Promise<Ticket> {
  return apiRequest(`api/v1/b2b/bookings/${encodeURIComponent(bookingId)}/tickets`, {
    method: "POST",
    body,
    headers: { "Idempotency-Key": idempotencyKey },
    ...options,
    parse: (value) => ticketSchema.parse(value),
  });
}

export function replyToTicket(ticketId: string, message: string, idempotencyKey: string, options: Options): Promise<{ message_id: string }> {
  return apiRequest(`api/v1/b2b/tickets/${encodeURIComponent(ticketId)}/messages`, {
    method: "POST",
    body: { message },
    headers: { "Idempotency-Key": idempotencyKey },
    ...options,
    parse: (value) => z.object({ status: z.literal("sent"), message_id: z.string().min(1) }).parse(value),
  });
}

/** A new key for a new submission: a prefix and 32 random hex characters (16–128 allowed). */
export function supportIdempotencyKey(prefix: "ticket" | "reply"): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `${prefix}_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export type SupportFailure = "signed_out" | "forbidden" | "not_found" | "conflict" | "validation" | "rate_limited" | "network" | "unavailable";
export function classifySupportError(error: unknown): SupportFailure {
  if (!(error instanceof ApiError)) return "unavailable";
  if (error.kind === "network" || error.kind === "timeout") return "network";
  switch (error.status) {
    case 401: return "signed_out";
    case 403: return "forbidden";
    case 404: return "not_found";
    case 409: return "conflict";
    case 422: return "validation";
    case 429: return "rate_limited";
    default: return "unavailable";
  }
}
/** Retrying the same, unchanged submission with the same key can't create a duplicate. */
export const isRetryableSupportFailure = (failure: SupportFailure) => failure === "network" || failure === "rate_limited" || failure === "unavailable";

export function ticketCategoryLabel(category: string, t: (en: string, ar: string) => string): string {
  const known: Record<string, [string, string]> = {
    booking_issue: ["Booking issue", "مشكلة في الحجز"], hotel_issue: ["Hotel issue", "مشكلة في الفندق"],
    checkin_issue: ["Check-in issue", "مشكلة في تسجيل الوصول"], room_issue: ["Room issue", "مشكلة في الغرفة"],
    payment_issue: ["Payment issue", "مشكلة في الدفع"], voucher_issue: ["Voucher issue", "مشكلة في القسيمة"],
    cancellation_issue: ["Cancellation issue", "مشكلة في الإلغاء"], refund_issue: ["Refund issue", "مشكلة في الاسترداد"], other: ["Other", "أخرى"],
  };
  const pair = known[category];
  return pair ? t(...pair) : category.replace(/_/g, " ");
}

export function ticketStatusLabel(status: string, t: (en: string, ar: string) => string): string {
  const known: Record<string, [string, string]> = {
    open: ["Open", "مفتوحة"], in_progress: ["In progress", "قيد المعالجة"], waiting_for_customer: ["Waiting for your reply", "بانتظار ردك"],
    resolved: ["Resolved", "تم الحل"], closed: ["Closed", "مغلقة"],
  };
  const pair = known[status];
  return pair ? t(...pair) : status.replace(/_/g, " ");
}
