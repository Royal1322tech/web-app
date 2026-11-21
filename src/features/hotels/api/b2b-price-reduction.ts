import { z } from "zod";
import { ApiError, apiRequest } from "@/lib/api/client";

/*
 * Company (B2B) price reduction requests, from the backend contract (2026-11-21). Both endpoints need
 * the company's Bearer token and the hotels.view permission; the company comes from the token, never
 * from the request.
 *
 * POST /api/v1/b2b/price-reduction-requests (multipart/form-data)
 *   required: supplier_hid, hotel_name, room_name, checkin, checkout, adults, currency (USD|EGP|SAR),
 *             requested_price
 *   optional: booking_id, hotel_address, children, displayed_price, notes,
 *             attachment (JPG, JPEG, PNG or PDF, max 5 MB)
 *   201 {success, message, data: {id, request_no, status}}
 * GET /api/v1/b2b/price-reduction-requests?page=N: Laravel pagination, 15 per page.
 */
export interface PriceReductionSubmission {
  supplierHid: number;
  hotelName: string;
  roomName: string;
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
  currency: "USD" | "EGP" | "SAR";
  requestedPrice: string;
  hotelAddress?: string | null;
  notes?: string;
  attachment?: File | null;
}

/** The multipart body, with exactly the documented field names. Empty optional fields are left out. */
export function toPriceReductionFormData(input: PriceReductionSubmission): FormData {
  const body = new FormData();
  body.set("supplier_hid", String(input.supplierHid));
  body.set("hotel_name", input.hotelName.trim());
  body.set("room_name", input.roomName.trim());
  body.set("checkin", input.checkin);
  body.set("checkout", input.checkout);
  body.set("adults", String(input.adults));
  if (input.children > 0) body.set("children", String(input.children));
  body.set("currency", input.currency);
  body.set("requested_price", input.requestedPrice.trim());
  if (input.hotelAddress?.trim()) body.set("hotel_address", input.hotelAddress.trim());
  if (input.notes?.trim()) body.set("notes", input.notes.trim());
  if (input.attachment) body.set("attachment", input.attachment, input.attachment.name);
  return body;
}

const createdSchema = z.object({
  data: z.object({ id: z.string().min(1), request_no: z.string().min(1), status: z.string().min(1) }),
});
export type PriceReductionCreated = z.infer<typeof createdSchema>["data"];

export function submitPriceReductionRequest(input: PriceReductionSubmission, options: { token: string; signal?: AbortSignal }): Promise<PriceReductionCreated> {
  return apiRequest("api/v1/b2b/price-reduction-requests", {
    method: "POST",
    body: toPriceReductionFormData(input),
    timeoutMs: 60000,
    ...options,
    parse: (value) => createdSchema.parse(value).data,
  });
}

const text = z.string().trim().min(1).nullable().optional().catch(null).transform((value) => value ?? null);
const amount = z.union([z.string(), z.number()]).nullable().optional().catch(null).transform((value) => (value === null || value === undefined || value === "" ? null : String(value)));
/** One request as listed. Each field is read on its own; anything missing or odd becomes null. */
const recordSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  request_no: text,
  status: text,
  hotel_name: text,
  room_name: text,
  checkin: text,
  checkout: text,
  currency: text,
  requested_price: amount,
  created_at: text,
});
export type PriceReductionRecord = z.infer<typeof recordSchema>;

const pageSchema = z.object({
  data: z.object({
    data: z.array(z.unknown()),
    current_page: z.number().int().positive(),
    last_page: z.number().int().positive(),
    per_page: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
});
export interface PriceReductionPage {
  items: PriceReductionRecord[];
  page: number;
  lastPage: number;
  perPage: number;
  total: number;
}

export function parsePriceReductionPage(value: unknown): PriceReductionPage {
  const { data } = pageSchema.parse(value);
  return {
    items: data.data.flatMap((item) => { const parsed = recordSchema.safeParse(item); return parsed.success ? [parsed.data] : []; }),
    page: data.current_page,
    lastPage: data.last_page,
    perPage: data.per_page,
    total: data.total,
  };
}

export function listPriceReductionRequests(page: number, options: { token: string; signal?: AbortSignal }): Promise<PriceReductionPage> {
  return apiRequest(`api/v1/b2b/price-reduction-requests?page=${Math.max(1, Math.floor(page))}`, { ...options, parse: parsePriceReductionPage });
}

export type PriceReductionFailure = "signed_out" | "forbidden" | "validation" | "rate_limited" | "network" | "timeout" | "unavailable";
export function classifyPriceReductionError(error: unknown): PriceReductionFailure {
  if (!(error instanceof ApiError)) return "unavailable";
  switch (error.kind) {
    case "unauthorized": return "signed_out";
    case "forbidden": return "forbidden";
    case "validation": return "validation";
    case "rate_limited": return "rate_limited";
    case "network": return "network";
    case "timeout": return "timeout";
    default: return "unavailable";
  }
}

/** Status words for the request states the backend sends; anything else is shown as sent. */
export function requestStatusLabel(status: string | null, t: (en: string, ar: string) => string): string {
  if (!status) return t("Unknown", "غير معروف");
  const known: Record<string, [string, string]> = {
    new: ["New", "جديد"], pending: ["Pending", "قيد الانتظار"], in_review: ["In review", "قيد المراجعة"], under_review: ["In review", "قيد المراجعة"],
    approved: ["Approved", "مقبول"], rejected: ["Declined", "مرفوض"], declined: ["Declined", "مرفوض"], closed: ["Closed", "مغلق"], cancelled: ["Cancelled", "ملغى"],
  };
  const pair = known[status.toLowerCase()];
  if (pair) return t(...pair);
  const words = status.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
