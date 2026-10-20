import type { CancellationPolicy, CancellationRule } from "@/features/hotels/cancellation-policy";

export interface CancellationAssessment {
  policyAvailable: boolean;
  applicableRule?: CancellationRule;
  freeCancellation: boolean;
  deadline?: string;
  cancellationFee?: { amount: number; currency: string };
  cancellationFeeDescription?: { kind: "percentage"; percentage: number } | { kind: "non-refundable" };
  noShow?: CancellationPolicy["noShow"];
}

function timestamp(value: string | undefined, timezone?: string): number | undefined {
  if (!value) return undefined;
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(value)) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  const local = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(value);
  if (!timezone || !local) return undefined;
  const [, year, month, day, hour, minute, second = "0", fraction = "0"] = local;
  const target = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
  const millisecond = +(fraction + "00").slice(0, 3);
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    });
    let candidate = target;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const parts = Object.fromEntries(formatter.formatToParts(candidate).map((part) => [part.type, part.value]));
      const represented = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
      const next = candidate + target - represented;
      if (next === candidate) return candidate + millisecond;
      candidate = next;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function matchesRule(rule: CancellationRule, at: number, policyTimezone?: string): boolean {
  const timezone = rule.timezone ?? policyTimezone;
  const from = timestamp(rule.cancelledOnOrAfter, timezone);
  const through = timestamp(rule.cancelledOnOrBefore, timezone);
  if (rule.cancelledOnOrAfter && from === undefined) return false;
  if (rule.cancelledOnOrBefore && through === undefined) return false;
  return (from === undefined || at >= from) && (through === undefined || at <= through);
}

export function assessCancellation(
  policy: CancellationPolicy | undefined,
  cancelledAt: Date,
): CancellationAssessment {
  if (!policy || policy.kind === "unavailable") {
    return { policyAvailable: false, freeCancellation: false, noShow: policy?.noShow };
  }

  const now = cancelledAt.getTime();
  if (!Number.isFinite(now)) return { policyAvailable: true, freeCancellation: false, noShow: policy.noShow };

  const applicableRule = policy.rules?.find((rule) => matchesRule(rule, now, policy.timezone));
  const deadline = policy.deadline;
  const deadlineTime = timestamp(deadline, policy.timezone);
  const beforeDeadline = deadlineTime !== undefined && now <= deadlineTime;
  const charge = applicableRule?.charge;
  const freeCancellation = policy.kind === "free" && !charge && (applicableRule ? true : beforeDeadline);

  if (freeCancellation || (policy.kind === "free" && applicableRule && !charge)) {
    return { policyAvailable: true, applicableRule, freeCancellation: true, deadline, noShow: policy.noShow };
  }

  if (charge?.kind === "amount" && Number.isFinite(charge.amount) && charge.amount >= 0 && charge.currency.trim()) {
    return {
      policyAvailable: true,
      applicableRule,
      freeCancellation: false,
      deadline,
      cancellationFee: { amount: charge.amount, currency: charge.currency },
      noShow: policy.noShow,
    };
  }
  if (charge?.kind === "percentage" && Number.isFinite(charge.percentage) && charge.percentage >= 0) {
    return {
      policyAvailable: true,
      applicableRule,
      freeCancellation: false,
      deadline,
      cancellationFeeDescription: { kind: "percentage", percentage: charge.percentage },
      noShow: policy.noShow,
    };
  }
  if (charge?.kind === "non-refundable" || policy.kind === "non-refundable") {
    return {
      policyAvailable: true,
      applicableRule,
      freeCancellation: false,
      deadline,
      cancellationFeeDescription: { kind: "non-refundable" },
      noShow: policy.noShow,
    };
  }
  return { policyAvailable: true, applicableRule, freeCancellation: false, deadline, noShow: policy.noShow };
}

export function snapshotCancellationPolicy(policy: CancellationPolicy | undefined): CancellationPolicy | undefined {
  if (!policy) return undefined;
  return {
    ...policy,
    penalty: policy.penalty ? { ...policy.penalty } : undefined,
    conditions: policy.conditions ? { ...policy.conditions } : undefined,
    noShow: policy.noShow ? { ...policy.noShow } : undefined,
    earlyDeparture: policy.earlyDeparture ? { ...policy.earlyDeparture } : undefined,
    rules: policy.rules?.map((rule) => ({
      ...rule,
      charge: rule.charge ? { ...rule.charge } : undefined,
      refundConditions: rule.refundConditions ? { ...rule.refundConditions } : undefined,
      restriction: rule.restriction ? { ...rule.restriction } : undefined,
    })),
    rateRestrictions: policy.rateRestrictions?.map((restriction) => ({ ...restriction })),
  };
}
