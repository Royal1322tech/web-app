import { z } from "zod";
import { ApiError, apiRequest } from "@/lib/api/client";

/*
 * The company's customer directory (backend 888cb8c, ROYAL_TRAVEL_B2B_API_HANDOFF.md §3.7).
 * Permission hotels.view; the company comes from the token, never from the request.
 * - GET  /api/v1/b2b/customers?q=&page=  → Laravel paginator, 20 per page, ordered by last name.
 * - GET  /api/v1/b2b/customers/{id}      → { data: customer } (another company's customer: 404).
 * - POST /api/v1/b2b/customers           → 201 { data: customer }; first_name, last_name (≤100),
 *   email (≤254) and/or phone (≤35), at least one of them.
 * There is no update or delete endpoint.
 */
const text = z.string().nullable().optional().transform((value) => (value?.trim() ? value.trim() : null));
const customerSchema = z.object({
  id: z.string().min(1),
  first_name: z.string(),
  last_name: z.string(),
  email: text,
  phone: text,
  created_at: text,
});
export type Customer = z.infer<typeof customerSchema>;

const pageSchema = z.object({
  data: z.array(z.unknown()),
  current_page: z.number().int().positive(),
  last_page: z.number().int().positive(),
  per_page: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export interface CustomerPage { items: Customer[]; page: number; lastPage: number; total: number }

const parseItems = (items: unknown[]) => items.flatMap((item) => { const parsed = customerSchema.safeParse(item); return parsed.success ? [parsed.data] : []; });

type Options = { token: string; signal?: AbortSignal };

export function listCustomers(query: string, page: number, options: Options): Promise<CustomerPage> {
  const params = new URLSearchParams({ page: String(Math.max(1, Math.floor(page))) });
  const q = query.trim().slice(0, 100);
  if (q) params.set("q", q);
  return apiRequest(`api/v1/b2b/customers?${params}`, {
    ...options,
    parse: (value) => { const data = pageSchema.parse(value); return { items: parseItems(data.data), page: data.current_page, lastPage: data.last_page, total: data.total }; },
  });
}

export function getCustomer(id: string, options: Options): Promise<Customer> {
  return apiRequest(`api/v1/b2b/customers/${encodeURIComponent(id)}`, { ...options, parse: (value) => customerSchema.parse(z.object({ data: z.unknown() }).parse(value).data) });
}

export interface NewCustomer { first_name: string; last_name: string; email?: string; phone?: string }

/** Only fields with a value are sent. */
export function newCustomerBody(input: NewCustomer): NewCustomer {
  return {
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    ...(input.email?.trim() ? { email: input.email.trim() } : {}),
    ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
  };
}

export function createCustomer(input: NewCustomer, options: Options): Promise<Customer> {
  return apiRequest("api/v1/b2b/customers", {
    method: "POST",
    body: newCustomerBody(input),
    ...options,
    parse: (value) => customerSchema.parse(z.object({ data: z.unknown() }).parse(value).data),
  });
}

export type CustomerFailure = "signed_out" | "forbidden" | "not_found" | "validation" | "rate_limited" | "network" | "unavailable";
export function classifyCustomerError(error: unknown): CustomerFailure {
  if (!(error instanceof ApiError)) return "unavailable";
  if (error.kind === "unauthorized") return "signed_out";
  if (error.kind === "forbidden") return "forbidden";
  if (error.status === 404) return "not_found";
  if (error.kind === "validation") return "validation";
  if (error.kind === "rate_limited") return "rate_limited";
  if (error.kind === "network" || error.kind === "timeout") return "network";
  return "unavailable";
}

export const customerName = (customer: Pick<Customer, "first_name" | "last_name">) => `${customer.first_name} ${customer.last_name}`.trim();
