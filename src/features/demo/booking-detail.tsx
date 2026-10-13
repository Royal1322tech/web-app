import { fitsDemoRoom } from "./room-policy";
import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { HotelSearchForm } from "@/features/home/components/hotel-search-form";
import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import { SystemState, StatePreview } from "@/components/ui/system-state";
import { useDemo, totalFor } from "./demo-provider";
import {
  Workspace,
  DemoNotice,
  StatusBadge,
  SelectionSummary,
  useMoney,
} from "./shared";
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
  const trigger = useRef<HTMLButtonElement | null>(null);
  const close = () => {
    dialog.current?.close();
    trigger.current?.focus();
  };
  return (
    <Workspace title={t("Booking details", "تفاصيل الحجز")}>
      {!booking ? (
        <SystemState
          title={t("Demo booking not found", "الحجز التجريبي غير موجود")}
          description={t(
            "This session may have been refreshed. Return to the sample bookings or start a new simulation.",
            "ربما أُعيد تحميل الجلسة. عد إلى الحجوزات التجريبية أو ابدأ محاكاة جديدة.",
          )}
        >
          <Link to="/bookings">{t("My bookings", "حجوزاتي")}</Link>
        </SystemState>
      ) : (
        <>
          <DemoNotice />
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
                        {t("View demo voucher", "عرض القسيمة التجريبية")}
                      </Link>
                    )}
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
                              dialog.current?.showModal();
                            }}
                          >
                            {a === "cancel"
                              ? t("Cancel demo booking", "إلغاء الحجز التجريبي")
                              : t(
                                  "Modify demo booking",
                                  "تعديل الحجز التجريبي",
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
                  </div>
                  {notice && (
                    <p role="status" className="success-note">
                      {notice}
                    </p>
                  )}
                </section>
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
                  ? t("Cancel this demo booking?", "إلغاء هذا الحجز التجريبي؟")
                  : t("Modify your demo stay", "تعديل الإقامة التجريبية")}
              </h2>
              <DemoNotice />
              {action === "cancel" ? (
                <p>
                  {t(
                    "This changes the local demonstration status only. It does not contact a supplier, issue a refund or calculate cancellation fees.",
                    "يغيّر هذا الحالة التجريبية المحلية فقط. لا يتم التواصل مع المورد أو رد مبلغ أو حساب رسوم إلغاء.",
                  )}
                </p>
              ) : (
                <>
                  <HotelSearchForm
                    compact
                    fixedDestination
                    initialValues={booking.selection.criteria}
                    onEdit={() => setCriteria(null)}
                    onSearch={(next) => {
                      if (
                        !fitsDemoRoom(next) ||
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
                      {t("Revised demo total", "الإجمالي التجريبي المعدّل")}:{" "}
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
                    if (action === "cancel") cancelBooking(booking.id);
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
