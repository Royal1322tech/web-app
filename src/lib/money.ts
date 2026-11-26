/**
 * Shows an API decimal amount ("108.1", "46", "46.20") with two decimal places, as text only: the
 * value is never rounded or converted, and payloads keep the original string. An amount with more
 * than two decimals, or one that isn't a plain decimal, is shown exactly as received.
 */
export function formatAmount(amount: string): string {
  const value = amount.trim();
  const match = /^(-?\d+)(?:\.(\d{0,2}))?$/.exec(value);
  if (!match) return value;
  return `${match[1]}.${(match[2] ?? "").padEnd(2, "0")}`;
}

/** "USD 1234.50": the currency code the API sent, then the amount (digits as sent). */
export const formatMoney = (amount: string, currency: string | null | undefined) => `${(currency ?? "").trim()} ${formatAmount(amount)}`.trim();
