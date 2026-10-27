import { z } from "zod";
import type { CancellationPolicy } from "../cancellation-policy";

/*
 * Integration boundary for a booking's cancellation policy. No backend endpoint provides this yet;
 * when one exists, map its response to this shape and pass `parseCancellationPolicy` as the
 * `requestJson` parser. Unknown or malformed data becomes `undefined` (shown as "not supplied"),
 * never a guessed policy.
 */
const localized = z.object({ en: z.string().trim().min(1), ar: z.string().trim().min(1) });
const timestamp = z.string().trim().min(1);

const charge = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("amount"), amount: z.number().finite().nonnegative(), currency: z.string().trim().length(3) }),
  z.object({ kind: z.literal("percentage"), percentage: z.number().finite().min(0).max(100) }),
  z.object({ kind: z.literal("non-refundable") }),
]);

const rule = z.object({
  cancelledOnOrAfter: timestamp.optional(),
  cancelledOnOrBefore: timestamp.optional(),
  timezone: z.string().trim().min(1).optional(),
  charge: charge.optional(),
  refundConditions: localized.optional(),
  restriction: localized.optional(),
});

const policySchema = z.object({
  kind: z.enum(["free", "non-refundable", "conditional", "unavailable"]),
  deadline: timestamp.optional(),
  timezone: z.string().trim().min(1).optional(),
  penalty: localized.optional(),
  conditions: localized.optional(),
  rules: z.array(rule).optional(),
  noShow: localized.optional(),
  earlyDeparture: localized.optional(),
  rateRestrictions: z.array(localized).optional(),
});

export function parseCancellationPolicy(data: unknown): CancellationPolicy | undefined {
  const result = policySchema.safeParse(data);
  return result.success ? result.data : undefined;
}
