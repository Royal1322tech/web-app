import type { DemoStatus } from "@/features/demo/types";

/** Frontend demo statuses, not a backend contract. */
export type TicketStatus = "open" | "in_progress" | "waiting_for_customer" | "resolved" | "closed";
export const ticketStatuses: readonly TicketStatus[] = ["open", "in_progress", "waiting_for_customer", "resolved", "closed"];
export const activeTicketStatuses: readonly TicketStatus[] = ["open", "in_progress", "waiting_for_customer"];

export type TicketCategory =
  | "booking_status"
  | "booking_change"
  | "stay_issue"
  | "vehicle_issue"
  | "payment"
  | "invoice"
  | "cancellation_refund"
  | "other";

/** Every booking type the frontend records. Enquiries (chauffeur, group quotation) are not bookings. */
export type TicketBookingType = "hotel" | "rental";

/** Where a booking is in its lifecycle; "completed" is derived from a confirmed booking whose end date has passed. */
export type BookingStage = "pending" | "upcoming" | "in_progress" | "completed" | "cancelled" | "failed";

export interface TicketAttachment {
  name: string;
  type: string;
  size: number;
}

export interface TicketMessage {
  id: string;
  author: "owner" | "support" | "system";
  body: string;
  /** Arabic text for bilingual sample fixture messages; user-written messages keep their original text. */
  bodyAr?: string;
  at: string;
  attachment?: TicketAttachment;
}

export interface SupportTicket {
  reference: string;
  bookingId: string;
  bookingReference: string;
  bookingType: TicketBookingType;
  ownerId: string;
  category: TicketCategory;
  subject: string;
  subjectAr?: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
  /** Sample fixture data or a ticket created in this browser session; neither is sent to support. */
  origin: "sample" | "local-preview";
}

/** A recorded booking resolved for support: the only source of booking details on a ticket. */
export interface TicketBookingContext {
  bookingType: TicketBookingType;
  bookingId: string;
  bookingReference: string;
  ownerId: string;
  status: DemoStatus;
  stage: BookingStage;
  title: { en: string; ar: string };
  startDate: string;
  endDate: string;
  agencyReference?: string;
  detailsHref: string;
  /** Existing booking imagery only; never invented. */
  image?: { src: string; width: number; height: number };
}

export interface NewTicketInput {
  bookingType: TicketBookingType;
  bookingId: string;
  category: TicketCategory;
  subject: string;
  description: string;
  attachment?: TicketAttachment;
}
