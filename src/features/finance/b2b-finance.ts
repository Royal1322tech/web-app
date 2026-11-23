import { z } from "zod";
import { ApiError, apiRequest } from "@/lib/api/client";

/*
 * GET /api/v1/b2b/finance (backend 888cb8c, ROYAL_TRAVEL_B2B_API_HANDOFF.md §3.8): the company's
 * wallet and credit, read-only. Permission payments.view (company admins). Amounts are integer USD
 * cents. Entries: the latest 100, no pagination. Top-ups, limits and settlements are made by Royal
 * Vacation staff; there is no endpoint to change them here.
 */
const cents = z.number().int().catch(0);
const accountSchema = z.object({
  currency: z.string().catch("USD"),
  wallet_cents: cents,
  wallet_reserved_cents: cents,
  wallet_available_cents: cents,
  credit_limit_cents: cents,
  credit_used_cents: cents,
  credit_available_cents: cents,
  credit_frozen: z.boolean().catch(false),
  total_available_cents: cents,
});
const text = z.string().nullable().optional().catch(null).transform((value) => (value?.trim() ? value : null));
const entrySchema = z.object({
  id: z.string(),
  type: z.string(),
  amount_cents: z.number().int().nullable().optional().catch(null).transform((value) => value ?? null),
  wallet_after_cents: cents,
  limit_after_cents: cents,
  used_after_cents: cents,
  frozen_after: z.boolean().catch(false),
  reference: text,
  reason: text,
  created_at: text,
});
export type FinanceAccount = z.infer<typeof accountSchema>;
export type FinanceEntry = z.infer<typeof entrySchema>;
export interface Finance { account: FinanceAccount; entries: FinanceEntry[] }

export function fetchFinance(options: { token: string; signal?: AbortSignal }): Promise<Finance> {
  return apiRequest("api/v1/b2b/finance", {
    ...options,
    parse: (value) => {
      const data = z.object({ account: z.unknown(), entries: z.array(z.unknown()).catch([]) }).parse(value);
      return {
        account: accountSchema.parse(data.account),
        entries: data.entries.flatMap((entry) => { const parsed = entrySchema.safeParse(entry); return parsed.success ? [parsed.data] : []; }),
      };
    },
  });
}

export type FinanceFailure = "forbidden" | "rate_limited" | "network" | "unavailable";
export function classifyFinanceError(error: unknown): FinanceFailure | "signed_out" {
  if (!(error instanceof ApiError)) return "unavailable";
  if (error.kind === "unauthorized") return "signed_out";
  if (error.kind === "forbidden") return "forbidden";
  if (error.kind === "rate_limited") return "rate_limited";
  if (error.kind === "network" || error.kind === "timeout") return "network";
  return "unavailable";
}

/** Integer cents as a currency amount; the sign is kept. */
export function formatCents(value: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2 }).format(value / 100);
}
