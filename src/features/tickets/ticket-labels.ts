import { useLocale } from "@/features/localization/locale-provider";
import type { BookingStage, TicketBookingType, TicketCategory, TicketStatus } from "./ticket-types";

export function useTicketLabels() {
  const { t, locale } = useLocale();
  const category: Record<TicketCategory, string> = {
    booking_status: t("Booking status or confirmation", "حالة الحجز أو تأكيده"),
    booking_change: t("Change to booking details", "تعديل بيانات الحجز"),
    stay_issue: t("Stay or room issue", "مشكلة في الإقامة أو الغرفة"),
    vehicle_issue: t("Vehicle or pickup issue", "مشكلة في السيارة أو الاستلام"),
    payment: t("Payment", "الدفع"),
    invoice: t("Invoice or billing", "الفاتورة أو الفوترة"),
    cancellation_refund: t("Cancellation or refund", "الإلغاء أو الاسترداد"),
    other: t("Other", "أخرى"),
  };
  const status: Record<TicketStatus, string> = {
    open: t("Open", "مفتوحة"),
    in_progress: t("In Progress", "قيد المعالجة"),
    waiting_for_customer: t("Waiting for your reply", "بانتظار ردك"),
    resolved: t("Resolved", "تم الحل"),
    closed: t("Closed", "مغلقة"),
  };
  const bookingType: Record<TicketBookingType, string> = {
    hotel: t("Hotel booking", "حجز فندقي"),
    rental: t("Car rental", "تأجير سيارة"),
  };
  const stage: Record<BookingStage, string> = {
    pending: t("Pending", "معلق"),
    upcoming: t("Confirmed · upcoming", "مؤكد · قادم"),
    in_progress: t("Confirmed · in progress", "مؤكد · جارٍ"),
    completed: t("Completed", "مكتمل"),
    cancelled: t("Cancelled", "ملغى"),
    failed: t("Failed", "فشل"),
  };
  const dateTime = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  return { category, status, bookingType, stage, dateTime, date };
}
