import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import type {
  SampleRoom,
  SampleRoomRate,
} from "@/features/hotels/data/rooms.fixture";
import type { SampleBooking } from "@/features/bookings/data/bookings.fixture";
import type { CancellationPolicy } from "@/features/hotels/cancellation-policy";
export type DemoStatus = "confirmed" | "pending" | "failed" | "cancelled";
export type PaymentMethod = "instapay" | "fawry" | "card" | "agency_credit";
export type InvoiceLifecycleStatus = "draft" | "issued";
export type PaymentSettlementStatus = "unpaid" | "partially_paid" | "fully_settled";
export type AccountingReviewStatus = "not_submitted" | "pending_review" | "approved" | "rejected" | "reconciled";
export interface InvoiceLineItem {
  description: string;
  amountMinor: number;
}
export interface InvoiceRecord {
  reference: string;
  referenceType: "local_preview" | "official";
  issueDate?: string;
  lifecycle: InvoiceLifecycleStatus;
  settlement: PaymentSettlementStatus;
  currency: string;
  lineItems: readonly InvoiceLineItem[];
  subtotalMinor: number;
  taxAndFeesMinor?: number;
  totalMinor: number;
}
export interface AccountingPaymentReview {
  status: AccountingReviewStatus;
  reference?: string;
  submittedAt?: string;
  amountMinor?: number;
  currency?: string;
}
export interface DemoSelection {
  hotelId: string;
  room: SampleRoom;
  rate: SampleRoomRate;
  criteria: HotelSearchCriteria;
}
export interface GuestValues {
  leadName: string;
  email: string;
  phone: string;
  additional: { name: string }[];
  requests: string;
  reference: string;
}
export interface DemoBooking extends Omit<SampleBooking, "status"> {
  status: DemoStatus;
  selection: DemoSelection;
  policyAcknowledged?: boolean;
  cancellationPolicySnapshot?: CancellationPolicy;
  guests: GuestValues;
  total: number;
  timeline: { label: string; at: string }[];
  invoice?: InvoiceRecord;
  paymentReview?: AccountingPaymentReview;
}
export interface AgencyProfile {
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  country: string;
}
export interface DemoNotification {
  id: string;
  title: string;
  description: string;
  href: string;
  read: boolean;
}
export interface Transaction {
  id: string;
  date: string;
  type: "credit" | "reservation" | "adjustment";
  amount: number;
  status: "completed" | "pending" | "failed";
  description: string;
  reference: string;
}
