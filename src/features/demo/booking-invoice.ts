import { hotelDisplayName } from "@/features/hotels/lib/presentation";
import type { LocalizedText } from "@/features/hotels/types";
import type { DemoBooking, InvoiceRecord } from "./types";

/** Whether the document is a supplied invoice or a preview derived from a demo booking. */
export type InvoiceSource = "supplied" | "demo-preview";

export interface InvoiceLine {
  description: LocalizedText | string;
  amountMinor: number;
  /** Set only when the amount really equals rate × nights × rooms. */
  calculation?: { nightlyMinor: number; nights: number; rooms: number };
}

export interface InvoiceCancellation {
  originalMinor: number;
  /** `null` means no authoritative value exists: show it as pending, never calculate it. */
  chargeMinor: number | null;
  refundMinor: number | null;
  /** The booking record says a fee applies, without stating an amount. */
  feeIndicated: boolean;
}

export interface InvoiceView {
  source: InvoiceSource;
  reference: string;
  issueDate?: string;
  lifecycle?: InvoiceRecord["lifecycle"];
  settlement?: InvoiceRecord["settlement"];
  currency: string;
  lines: readonly InvoiceLine[];
  subtotalMinor: number;
  taxAndFeesMinor?: number;
  totalMinor: number;
  cancellation?: InvoiceCancellation;
}

const toMinor = (amount: number) => Math.round(amount * 100);

export function stayNights(checkIn: string, checkOut: string) {
  const days = Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000);
  return Number.isFinite(days) && days > 0 ? days : 0;
}

/**
 * Builds the invoice shown for a booking. A supplied invoice record is used as it is. Otherwise
 * confirmed and cancelled demo bookings get an explicitly labelled preview from their own recorded
 * total: no invoice number or issue date is created. Pending and failed bookings have no invoice.
 *
 * Cancellation charge and refund are only ever read from a supplied record. They are not derived
 * from the policy text, the fee flag or each other.
 */
export function buildInvoiceView(booking: DemoBooking): InvoiceView | undefined {
  const supplied = booking.invoice;
  const cancelled = booking.status === "cancelled";
  if (!supplied && booking.status !== "confirmed" && !cancelled) return undefined;

  const totalMinor = supplied?.totalMinor ?? toMinor(booking.total);
  const cancellation: InvoiceCancellation | undefined = cancelled
    ? {
        originalMinor: totalMinor,
        chargeMinor: supplied?.cancellation?.chargeMinor ?? null,
        refundMinor: supplied?.cancellation?.refundMinor ?? null,
        feeIndicated: booking.cancellationFee,
      }
    : undefined;

  if (supplied) {
    return {
      source: "supplied",
      reference: supplied.reference,
      issueDate: supplied.issueDate,
      lifecycle: supplied.lifecycle,
      settlement: supplied.settlement,
      currency: supplied.currency,
      lines: supplied.lineItems.map((line) => ({ description: line.description, amountMinor: line.amountMinor })),
      subtotalMinor: supplied.subtotalMinor,
      taxAndFeesMinor: supplied.taxAndFeesMinor,
      totalMinor,
      cancellation,
    };
  }

  const nights = stayNights(booking.checkIn, booking.checkOut);
  const rooms = booking.selection.criteria.rooms.length;
  const nightlyMinor = toMinor(booking.selection.rate.nightlyRate);
  const room = booking.selection.room.name;
  return {
    source: "demo-preview",
    reference: `PREVIEW-${booking.id}`,
    currency: "USD",
    lines: [
      {
        description: { en: hotelDisplayName(room.en), ar: hotelDisplayName(room.ar) },
        amountMinor: totalMinor,
        calculation: nights > 0 && nightlyMinor * nights * rooms === totalMinor ? { nightlyMinor, nights, rooms } : undefined,
      },
    ],
    subtotalMinor: totalMinor,
    totalMinor,
    cancellation,
  };
}
