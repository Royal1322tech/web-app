import type { IconName } from "@/components/ui/icon";
import type { PaymentMethod } from "./types";

export const paymentMethods: readonly {
  id: PaymentMethod;
  label: { en: string; ar: string };
  description: { en: string; ar: string };
  icon: IconName;
}[] = [
  {
    id: "instapay",
    label: { en: "InstaPay", ar: "إنستا باي" },
    description: { en: "Bank transfer payment option", ar: "خيار الدفع بالتحويل البنكي" },
    icon: "building",
  },
  {
    id: "fawry",
    label: { en: "Fawry", ar: "فوري" },
    description: { en: "Payment service option", ar: "خيار خدمة دفع" },
    icon: "document",
  },
  {
    id: "card",
    label: { en: "Credit / Debit Card", ar: "بطاقة ائتمان أو خصم" },
    description: { en: "Card payment option", ar: "خيار الدفع بالبطاقة" },
    icon: "id",
  },
  {
    id: "agency_credit",
    label: { en: "Agency Credit", ar: "رصيد الوكالة" },
    description: { en: "Pay using the agency account balance", ar: "الدفع باستخدام رصيد حساب الوكالة" },
    icon: "buildingFilled",
  },
];

export type AgencyCreditAssessment =
  | { status: "unavailable" }
  | { status: "currency-mismatch"; availableCurrency: string; bookingCurrency: string }
  | { status: "insufficient"; remaining: number }
  | { status: "sufficient"; remaining: number };

export function assessAgencyCredit(
  available: { amount: number; currency: string } | null,
  bookingTotal: number,
  bookingCurrency: string,
): AgencyCreditAssessment {
  if (!available) return { status: "unavailable" };
  if (available.currency !== bookingCurrency) {
    return {
      status: "currency-mismatch",
      availableCurrency: available.currency,
      bookingCurrency,
    };
  }

  const remaining = available.amount - bookingTotal;
  return remaining >= 0
    ? { status: "sufficient", remaining }
    : { status: "insufficient", remaining };
}
