import { hotelBookingContext } from "@/features/tickets/ticket-access";
import { BookingSupportSection, ReportIssueAction } from "@/features/tickets/ticket-ui";
import { fitsDemoRoom } from "./room-policy";
import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { assessCancellation } from "./cancellation-assessment";
import { cancellationPolicyLabels } from "@/features/hotels/cancellation-policy";
import type { DemoBooking } from "./types";
import type { CancellationAssessment } from "./cancellation-assessment";
import type { Locale } from "@/features/localization/locale-provider";
import { HotelSearchForm } from "@/features/home/components/hotel-search-form";
import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import { SystemState, StatePreview } from "@/components/ui/system-state";
import { useDemo, totalFor } from "./demo-provider";
import {
  Workspace,
  StatusBadge,
  SelectionSummary,
  useMoney,
} from "./shared";

function CancellationReview({
  booking,
  assessment,
  locale,
  t,
}: {
  booking: DemoBooking;
  assessment: CancellationAssessment;
  locale: Locale;
  t: (english: string, arabic?: string) => string;
}) {
  const policy = booking.cancellationPolicySnapshot;
  const formatDeadline = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString(locale);
  };

  return (
    <section className="cancellation-review" aria-label={t("Cancellation review", "مراجعة الإلغاء")}>
      <p>{t("Booking reference", "مرجع الحجز")}: <strong><bdi>{booking.id}</bdi></strong></p>
      {!assessment.policyAvailable ? (
        <div className="cancellation-review-unavailable" role="status">
          <h3>{t("Cancellation terms unavailable", "شروط الإلغاء غير متاحة")}</h3>
          <p>{t("Refund and cancellation fees cannot be determined.", "لا يمكن تحديد قيمة الاسترداد أو رسوم الإلغاء.")}</p>
          {assessment.noShow?.[locale] && <p><strong>{t("No-show conditions", "شروط عدم الحضور")}:</strong> {assessment.noShow[locale]}</p>}
        </div>
      ) : (
        <>
          <h3>{t("Applicable cancellation policy", "سياسة الإلغاء المطبقة")}</h3>
          <p>{cancellationPolicyLabels[policy?.kind ?? "unavailable"][locale]}</p>
          {policy?.conditions?.[locale] && <p>{policy.conditions[locale]}</p>}
          {policy?.penalty?.[locale] && <p>{policy.penalty[locale]}</p>}
          {assessment.deadline && <p><strong>{t("Cancellation deadline", "الموعد النهائي للإلغاء")}:</strong> <bdi>{formatDeadline(assessment.deadline)}</bdi></p>}
          {assessment.freeCancellation && <p>{t("This cancellation falls within the supplied free-cancellation period. No cancellation fee is stated in the captured policy.", "يقع هذا الإلغاء ضمن فترة الإلغاء المجاني المحددة. لا تذكر السياسة المحفوظة رسوم إلغاء.")}</p>}
          {assessment.cancellationFee && <p><strong>{t("Cancellation fee stated by policy", "رسوم الإلغاء المحددة في السياسة")}:</strong> <bdi>{assessment.cancellationFee.amount} {assessment.cancellationFee.currency}</bdi></p>}
          {assessment.cancellationFeeDescription?.kind === "percentage" && <p><strong>{t("Policy cancellation charge", "رسوم الإلغاء حسب السياسة")}:</strong> {assessment.cancellationFeeDescription.percentage}% {t("(the charge basis is not supplied, so an amount cannot be calculated).", "(لم يُحدد أساس احتساب النسبة، لذلك لا يمكن حساب المبلغ.)")}</p>}
          {assessment.cancellationFeeDescription?.kind === "non-refundable" && <p>{t("The captured rate is marked non-refundable; the amount paid and any settlement are not available here.", "السعر المحفوظ محدد بأنه غير قابل للاسترداد؛ لا تتوفر هنا قيمة مدفوعة أو تسوية مالية.")}</p>}
          {!assessment.freeCancellation && !assessment.cancellationFee && !assessment.cancellationFeeDescription && <p>{t("Refund and cancellation fees cannot be determined from the supplied terms.", "لا يمكن تحديد قيمة الاسترداد أو رسوم الإلغاء من الشروط المقدمة.")}</p>}
          {assessment.applicableRule?.restriction?.[locale] && <p>{assessment.applicableRule.restriction[locale]}</p>}
          {assessment.applicableRule?.refundConditions?.[locale] && <p>{assessment.applicableRule.refundConditions[locale]}</p>}
          {assessment.noShow?.[locale] && <p><strong>{t("No-show conditions", "شروط عدم الحضور")}:</strong> {assessment.noShow[locale]}</p>}
        </>
      )}
      <p className="fine-print">{t("Any refund eligibility or amount cannot be confirmed because payment settlement is not connected.", "لا يمكن تأكيد استحقاق الاسترداد أو قيمته لعدم اتصال تسوية المدفوعات.")}</p>
      <p className="fine-print">{t("This is a local cancellation simulation. It updates this browser session only and does not cancel a supplier reservation or process a refund.", "هذه محاكاة إلغاء محلية. تحدّث جلسة المتصفح فقط ولا تلغي حجزًا لدى المورد أو تعالج استردادًا.")}</p>
    </section>
  );
}
export function BookingDetailPage() {
  const { id } = useParams();
  const { records, cancelBooking, modifyBooking } = useDemo();
  const { t, locale } = useLocale();
  const money = useMoney();
  const booking = records.find((b) => b.id === id);
  const dialog = useRef<HTMLDialogElement>(null);
  const [action, setAction] = useState<"cancel" | "modify">("cancel");
  const [criteria, setCriteria] = useState<HotelSearchCriteria | null>(null);
  const [requests, setRequests] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [cancellationTime, setCancellationTime] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const close = () => {
    dialog.current?.close();
    trigger.current?.focus();
  };
  return (
    <Workspace title={t("Booking details", "تفاصيل الحجز")}>
      {!booking ? (
        <SystemState
          title={t("Booking not found", "الحجز التجريبي غير موجود")}
          description={t(
            "This session may have been refreshed. Return to your bookings or start a new booking.",
            "ربما أُعيد تحميل الجلسة. عد إلى حجوزاتك أو ابدأ حجزًا جديدًا.",
          )}
        >
          <Link to="/bookings">{t("My bookings", "حجوزاتي")}</Link>
        </SystemState>
      ) : (
        <>

          <StatePreview>
            <div className="workspace-grid">
              <div className="workspace-stack">
                <section className="workspace-card">
                  <StatusBadge status={booking.status} />
                  <h2>
                    <bdi>{booking.id}</bdi>
                  </h2>
                  <p>
                    {t("Lead guest", "الضيف الرئيسي")}:{" "}
                    <strong>{booking.guests.leadName}</strong>
                  </p>
                  <p>
                    {t("Contact", "التواصل")}: <bdi>{booking.guests.email}</bdi>
                  </p>
                  <p>
                    {t("Agency reference", "مرجع الوكالة")}:{" "}
                    {booking.agencyReference}
                  </p>
                  <p>
                    {t("Special requests", "طلبات خاصة")}:{" "}
                    {booking.guests.requests || t("None", "لا يوجد")}
                  </p>
                  <div className="workspace-actions">
                    {booking.status === "confirmed" && (
                      <Link
                        className="button button--primary"
                        to={`/bookings/${booking.id}/voucher`}
                      >
                        {t("View voucher", "عرض القسيمة")}
                      </Link>
                    )}
                    <Link className="button button--outline" to={`/bookings/${booking.id}/invoice`}>
                      {t("View invoice", "عرض الفاتورة")}
                    </Link>
                    {["confirmed", "pending"].includes(booking.status) && (
                      <>
                        {(["modify", "cancel"] as const).map((a) => (
                          <button
                            key={a}
                            className={`button button--${a === "cancel" ? "danger" : "outline"}`}
                            onClick={(e) => {
                              trigger.current = e.currentTarget;
                              setAction(a);
                              setCriteria(null);
                              setError("");
                              setRequests(booking.guests.requests);
                              setCancellationTime(a === "cancel" ? new Date().toISOString() : null);
                              dialog.current?.showModal();
                            }}
                          >
                            {a === "cancel"
                              ? t("Cancel booking", "إلغاء الحجز")
                              : t(
                                  "Modify booking",
                                  "تعديل الحجز",
                                )}
                          </button>
                        ))}
                      </>
                    )}
                    {booking.status === "failed" && (
                      <Link
                        className="button button--outline"
                        to={`/booking/result/${booking.id}`}
                      >
                        {t("Review failed simulation", "راجع المحاكاة الفاشلة")}
                      </Link>
                    )}
                    <ReportIssueAction booking={hotelBookingContext(booking)} />
                  </div>
                  {notice && (
                    <p role="status" className="success-note">
                      {notice}
                    </p>
                  )}
                </section>
                <BookingSupportSection booking={hotelBookingContext(booking)} />
                <section className="workspace-card">
                  <h2>{t("Booking timeline", "سجل الحجز")}</h2>
                  <ol className="timeline">
                    {booking.timeline.map((item, i) => (
                      <li key={`${item.at}-${i}`}>
                        <strong>{t(item.label)}</strong>
                        <time dateTime={item.at}>
                          {new Date(item.at).toLocaleString(locale)}
                        </time>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
              <SelectionSummary selection={booking.selection} />
            </div>
          </StatePreview>
          <dialog
            ref={dialog}
            className="workspace-dialog"
            aria-labelledby="booking-action-title"
            onClose={() => trigger.current?.focus()}
          >
            <div className="workspace">
              <h2 id="booking-action-title">
                {action === "cancel"
                  ? t("Cancel this booking?", "إلغاء هذا الحجز؟")
                  : t("Modify your stay", "تعديل الإقامة")}
              </h2>

              {action === "cancel" ? (
                <CancellationReview
                  booking={booking}
                  assessment={assessCancellation(booking.cancellationPolicySnapshot, new Date(cancellationTime ?? booking.bookedAt))}
                  locale={locale}
                  t={t}
                />
              ) : (
                <>
                  <HotelSearchForm
                    compact
                    fixedDestination
                    initialValues={booking.selection.criteria}
                    onEdit={() => setCriteria(null)}
                    onSearch={(next) => {
                      if (
                        !fitsDemoRoom(next, booking.selection.room.occupancy) ||
                        next.rooms.length !==
                          booking.selection.criteria.rooms.length ||
                        next.rooms.some(
                          (r, i) =>
                            r.adults !==
                            booking.selection.criteria.rooms[i].adults,
                        )
                      ) {
                        setError(
                          t(
                            "Keep the original room and guest counts. Start a new simulation to change occupancy.",
                            "احتفظ بعدد الغرف والضيوف الأصلي. ابدأ محاكاة جديدة لتغيير الإشغال.",
                          ),
                        );
                        setCriteria(null);
                        return;
                      }
                      setCriteria(next);
                      setError("");
                    }}
                  />
                  <label>
                    {t("Special requests", "طلبات خاصة")}
                    <textarea
                      maxLength={500}
                      value={requests}
                      onChange={(e) => setRequests(e.target.value)}
                    />
                  </label>
                  {criteria && (
                    <p>
                      {t("Revised total", "الإجمالي المعدّل")}:{" "}
                      <bdi>
                        {money(totalFor({ ...booking.selection, criteria }))}
                      </bdi>
                    </p>
                  )}
                  {error && (
                    <p className="error-note" role="alert">
                      {error}
                    </p>
                  )}
                  <p className="fine-print">
                    {t(
                      "Use Search to validate revised dates, then save the simulation.",
                      "استخدم البحث للتحقق من التواريخ المعدلة ثم احفظ المحاكاة.",
                    )}
                  </p>
                </>
              )}
              <div className="workspace-actions">
                <button className="button button--outline" onClick={close}>
                  {t("Keep booking", "الاحتفاظ بالحجز")}
                </button>
                <button
                  className={`button button--${action === "cancel" ? "danger" : "primary"}`}
                  disabled={action === "modify" && !criteria}
                  onClick={() => {
                    if (action === "cancel") cancelBooking(booking.id, cancellationTime ?? new Date().toISOString());
                    else if (criteria)
                      modifyBooking(booking.id, criteria, requests);
                    setNotice(
                      t(
                        "Simulation updated. Supplier reservations and finances are unchanged.",
                        "تم تحديث المحاكاة. لم تتغير حجوزات المورد أو الأرصدة المالية.",
                      ),
                    );
                    close();
                  }}
                >
                  {action === "cancel"
                    ? t(
                        "Confirm simulated cancellation",
                        "تأكيد الإلغاء التجريبي",
                      )
                    : t("Save simulated changes", "حفظ التغييرات التجريبية")}
                </button>
              </div>
            </div>
          </dialog>
        </>
      )}
    </Workspace>
  );
}
