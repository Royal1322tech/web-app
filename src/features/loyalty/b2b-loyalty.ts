import { z } from "zod";
import { ApiError, apiRequest } from "@/lib/api/client";

/*
 * GET /api/v1/b2b/loyalty: the company's loyalty points (Bearer token, dashboard.view permission).
 * Contract (backend, ROYAL_TRAVEL_B2B_API_HANDOFF.md §3.10): {company_id, balances: {pending,
 * available}, transactions: [{id, booking_id, entry_type (booking_earn | booking_release |
 * booking_void | manual_credit | manual_debit), points (signed), balance_bucket (pending | available),
 * note, created_at}], redemption_enabled}. Each field is read on its own and anything missing becomes
 * null: nothing is calculated, awarded or invented here.
 */
const number = z.number().finite().catch(0);
const text = z.string().trim().min(1).nullable().optional().catch(null).transform((value) => value ?? null);
const points = z.union([z.number(), z.string()]).nullable().optional().catch(null)
  .transform((value) => (value === null || value === undefined || value === "" || Number.isNaN(Number(value)) ? null : Number(value)));
const transactionSchema = z.object({
  id: z.union([z.string(), z.number()]).nullable().optional().catch(null).transform((value) => (value === null || value === undefined ? null : String(value))),
  entry_type: text,
  balance_bucket: text,
  note: text,
  // Earlier names, read only as a fallback.
  type: text,
  status: text,
  description: text,
  reference: text,
  points,
  amount: points,
  created_at: text,
  date: text,
}).transform((entry) => ({
  id: entry.id,
  type: entry.entry_type ?? entry.type,
  status: entry.balance_bucket ?? entry.status,
  description: entry.note ?? entry.description,
  reference: entry.reference,
  points: entry.points ?? entry.amount,
  date: entry.created_at ?? entry.date,
}));
export type LoyaltyTransaction = z.infer<typeof transactionSchema>;

const loyaltySchema = z.object({
  balances: z.object({ pending: number, available: number }),
  transactions: z.array(z.unknown()).catch([]),
  redemption_enabled: z.boolean().catch(false),
});
export interface Loyalty {
  available: number;
  pending: number;
  transactions: LoyaltyTransaction[];
  redemptionEnabled: boolean;
}

export function parseLoyalty(value: unknown): Loyalty {
  const data = loyaltySchema.parse(value);
  return {
    available: data.balances.available,
    pending: data.balances.pending,
    // At most 100 entries, as returned.
    transactions: data.transactions.slice(0, 100).flatMap((item) => { const parsed = transactionSchema.safeParse(item); return parsed.success ? [parsed.data] : []; }),
    redemptionEnabled: data.redemption_enabled,
  };
}

export function fetchLoyalty(options: { token: string; signal?: AbortSignal }): Promise<Loyalty> {
  return apiRequest("api/v1/b2b/loyalty", { ...options, parse: parseLoyalty });
}

export type LoyaltyFailure = "signed_out" | "forbidden" | "rate_limited" | "network" | "unavailable";
export function classifyLoyaltyError(error: unknown): LoyaltyFailure {
  if (!(error instanceof ApiError)) return "unavailable";
  if (error.kind === "unauthorized") return "signed_out";
  if (error.kind === "forbidden") return "forbidden";
  if (error.kind === "rate_limited") return "rate_limited";
  if (error.kind === "network" || error.kind === "timeout") return "network";
  return "unavailable";
}
