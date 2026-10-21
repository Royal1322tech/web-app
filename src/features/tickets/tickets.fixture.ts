import { demoUserIds } from "@/features/auth/demo-auth";
import type { SupportTicket } from "./ticket-types";

// Sample conversations for the demonstration only. No support team, delivery or response time is implied.
export const sampleTickets: readonly SupportTicket[] = [
  {
    reference: "TKT-SAMPLE-0001",
    bookingId: "DEMO-1003",
    bookingReference: "DEMO-1003",
    bookingType: "hotel",
    ownerId: demoUserIds.current,
    category: "cancellation_refund",
    subject: "Cancellation fee applied to DEMO-1003",
    subjectAr: "رسوم إلغاء مطبقة على الحجز DEMO-1003",
    status: "waiting_for_customer",
    createdAt: "2026-10-11T09:20:00Z",
    updatedAt: "2026-10-12T14:05:00Z",
    origin: "sample",
    messages: [
      {
        id: "m1",
        author: "owner",
        body: "The booking was cancelled before the deadline, but a cancellation fee is shown. Please review the charge.",
        bodyAr: "أُلغي الحجز قبل الموعد النهائي، لكن تظهر رسوم إلغاء. يرجى مراجعة الرسوم.",
        at: "2026-10-11T09:20:00Z",
      },
      {
        id: "m2",
        author: "support",
        body: "Sample reply: please share the cancellation confirmation you received so the charge can be reviewed.",
        bodyAr: "رد تجريبي: يرجى مشاركة تأكيد الإلغاء الذي استلمته لمراجعة الرسوم.",
        at: "2026-10-12T14:05:00Z",
      },
    ],
  },
  {
    reference: "TKT-SAMPLE-0002",
    bookingId: "DEMO-1001",
    bookingReference: "DEMO-1001",
    bookingType: "hotel",
    ownerId: demoUserIds.current,
    category: "stay_issue",
    subject: "Early check-in request for the lead guest",
    subjectAr: "طلب تسجيل وصول مبكر للضيف الرئيسي",
    status: "resolved",
    createdAt: "2026-10-18T07:45:00Z",
    updatedAt: "2026-10-19T10:30:00Z",
    origin: "sample",
    messages: [
      {
        id: "m1",
        author: "owner",
        body: "The lead guest arrives early on 20 October. Can early check-in be noted on the booking?",
        bodyAr: "يصل الضيف الرئيسي مبكرًا يوم ٢٠ أكتوبر. هل يمكن تدوين طلب تسجيل الوصول المبكر في الحجز؟",
        at: "2026-10-18T07:45:00Z",
      },
      {
        id: "m2",
        author: "support",
        body: "Sample reply: the request was noted for the hotel. Early check-in remains subject to availability.",
        bodyAr: "رد تجريبي: تم تدوين الطلب للفندق. يظل تسجيل الوصول المبكر حسب التوفر.",
        at: "2026-10-19T10:30:00Z",
      },
    ],
  },
  {
    reference: "TKT-SAMPLE-0003",
    bookingId: "DEMO-1002",
    bookingReference: "DEMO-1002",
    bookingType: "hotel",
    ownerId: demoUserIds.colleague,
    category: "booking_status",
    subject: "Colleague ticket — must never be visible to other users",
    status: "open",
    createdAt: "2026-10-05T12:00:00Z",
    updatedAt: "2026-10-05T12:00:00Z",
    origin: "sample",
    messages: [
      {
        id: "m1",
        author: "owner",
        body: "Private sample message owned by another agency user.",
        at: "2026-10-05T12:00:00Z",
      },
    ],
  },
];
