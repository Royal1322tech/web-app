import { CancellationPolicyCard } from "./cancellation-policy-card";
import { fitsDemoRoom } from "./room-policy";
import { stayQuery } from "@/features/hotels/lib/stay-query";
import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale } from "@/features/localization/locale-provider";
import { HotelSearchForm } from "@/features/home/components/hotel-search-form";
import { SystemState, InlineLoadingState } from "@/components/ui/system-state";
import { BrandLogo } from "@/components/brand-logo";
import { hotels } from "@/features/hotels/data/hotels.fixture";
import { useDemo, totalFor } from "./demo-provider";
import { demoFinance } from "./fixtures";
import {
  Workspace,
  DemoNotice,
  SelectionSummary,
  StatusBadge,
  useMoney,
} from "./shared";
import type { DemoSelection, GuestValues } from "./types";

function Progress({ step }: { step: number }) {
  const { t } = useLocale();
  return (
    <ol
      className="booking-progress"
      aria-label={t("Booking progress", "مراحل الحجز")}
    >
      {[
        ["Summary", "الملخص"],
        ["Guest details", "بيانات الضيوف"],
        ["Cancellation Policy", "سياسة الإلغاء"],
        ["Payment preview", "معاينة الدفع"],
        ["Result", "النتيجة"],
      ].map(([en, ar], i) => (
        <li key={en} aria-current={i === step ? "step" : undefined}>
          <span>{i + 1}</span>
          {t(en, ar)}
        </li>
      ))}
    </ol>
  );
}
function EmptySelection() {
  const { t } = useLocale();
  return (
    <SystemState
      title={t("Choose a room to begin", "اختر غرفة للبدء")}
      description={t(
        "Your booking workspace is empty. Selections and guest details are kept only for this session and reset on refresh.",
        "مساحة الحجز فارغة. تُحفظ الاختيارات وبيانات الضيوف لهذه الجلسة فقط وتُمسح عند إعادة التحميل.",
      )}
    >
      <Link className="button button--primary" to="/search">
        {t("Explore hotels", "استكشف الفنادق")}
      </Link>
    </SystemState>
  );
}
export function BookingSummaryPage() {
  const { t } = useLocale();
  const { selection, updateCriteria, acknowledgePolicy: setAccepted } = useDemo();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  return (
    <Workspace title={t("Review your stay", "راجع إقامتك")}>
      <Progress step={0} />
      <DemoNotice />
      {!selection ? (
        <EmptySelection />
      ) : (
        <div className="workspace-grid">
          <div className="workspace-stack">
            <section className="workspace-card">
              <p className="workspace-eyebrow">
                {t("01 · BOOKING SUMMARY", "٠١ · ملخص الحجز")}
              </p>
              <h2>
                {t(
                  "A great stay starts with the details.",
                  "الإقامة الرائعة تبدأ بالتفاصيل.",
                )}
              </h2>
              <p>
                {t(
                  "Review the selected room, stay and rate conditions before adding your guests.",
                  "راجع الغرفة والإقامة وشروط السعر قبل إضافة ضيوفك.",
                )}
              </p>
              <div className="workspace-actions">
                <button
                  className="button button--outline"
                  onClick={() => setEditing(!editing)}
                  aria-expanded={editing}
                >
                  {t("Edit stay dates & guests", "تعديل التواريخ والضيوف")}
                </button>
                <Link
                  to={`/hotels/${selection.hotelId}?${stayQuery(selection.criteria)}`}
                >
                  {t("Change room", "تغيير الغرفة")}
                </Link>
              </div>
              {editing && (
                <HotelSearchForm
                  compact
                  initialValues={selection.criteria}
                  fixedDestination
                  onSearch={(criteria) => {
                    if (!fitsDemoRoom(criteria)) {
                      setError(
                        t(
                          "This demo double room accommodates up to 2 adults per room, without children. Choose matching occupancy to continue.",
                          "الغرفة المزدوجة التجريبية تتسع لبالغين كحد أقصى دون أطفال. اختر إشغالاً متوافقاً للمتابعة.",
                        ),
                      );
                      return;
                    }
                    updateCriteria(criteria);
                    setError("");
                    setAccepted(false);
                    setEditing(false);
                  }}
                />
              )}
              {error && (
                <p role="alert" className="error-note">
                  {error}
                </p>
              )}
            </section>
            <section className="workspace-card">
              <CancellationPolicyCard policy={selection.rate.cancellationPolicy} />
              <h3>{t("Rate conditions", "شروط السعر")}</h3>
              <ul>
                <li>
                  {t(
                    "Room occupancy: up to 2 adults per room. No child inventory is supplied for this demo room.",
                    "إشغال الغرفة: بالغان كحد أقصى. لا تتوفر بيانات أطفال لهذه الغرفة التجريبية.",
                  )}
                </li>
                <li>
                  {t(
                    "No supplier reservation is made, and prices are illustrative.",
                    "لا يتم إنشاء حجز لدى المورد والأسعار توضيحية.",
                  )}
                </li>
              </ul>
              <div className="workspace-actions">
                {!editing ? (
                  <Link className="button button--primary" to="/booking/guests">
                    {t("Continue to guest details", "المتابعة لبيانات الضيوف")}
                  </Link>
                ) : (
                  <button className="button button--primary" disabled>
                    {t("Continue to guest details", "المتابعة لبيانات الضيوف")}
                  </button>
                )}
              </div>
            </section>
          </div>
          <SelectionSummary selection={selection} />
        </div>
      )}
    </Workspace>
  );
}
const guestSchema = z.object({
  leadName: z.string().trim().min(2, "Enter the lead guest name."),
  email: z.email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid contact phone."),
  additional: z.array(
    z.object({ name: z.string().trim().min(2, "Enter this guest’s name.") }),
  ),
  requests: z.string().max(500, "Use 500 characters or fewer."),
  reference: z.string().max(60, "Use 60 characters or fewer."),
});
export function GuestInformationPage() {
  const { t } = useLocale();
  const { selection } = useDemo();
  return (
    <Workspace title={t("Guest information", "بيانات الضيوف")}>
      <Progress step={1} />
      <DemoNotice />
      {selection ? <GuestForm selection={selection} /> : <EmptySelection />}
    </Workspace>
  );
}
function GuestForm({ selection }: { selection: DemoSelection }) {
  const { t } = useLocale();
  const { guests, saveGuests } = useDemo();
  const navigate = useNavigate();
  const count =
    selection.criteria.rooms.reduce(
      (n, r) => n + r.adults + r.childAges.length,
      0,
    ) - 1;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GuestValues>({
    resolver: zodResolver(guestSchema),
    defaultValues: guests ?? {
      leadName: "",
      email: "",
      phone: "",
      additional: Array.from({ length: count }, () => ({ name: "" })),
      requests: "",
      reference: "",
    },
  });
  return (
    <div className="workspace-grid">
      <form
        className="workspace-card workspace-form hotel-guest-form"
        noValidate
        onSubmit={handleSubmit((v) => {
          saveGuests(v);
          navigate("/booking/policy");
        })}
      >
        <h2>{t("Who’s travelling?", "من المسافر؟")}</h2>
        <p className="fine-print">
          {t(
            "Enter fictional names as they should appear on the demo voucher. Nothing is sent or saved to browser storage.",
            "أدخل أسماء وهمية كما ستظهر بالقسيمة التجريبية. لا يتم إرسال البيانات أو حفظها في تخزين المتصفح.",
          )}
        </p>
        <fieldset className="guest-contact-section"><legend>{t("Guest & contact information", "معلومات الضيف والتواصل")}</legend><div className="workspace-fields">
          {(
            [
              ["leadName", "Lead guest name", "اسم الضيف الرئيسي"],
              ["email", "Contact email", "البريد الإلكتروني"],
              ["phone", "Contact phone", "هاتف التواصل"],
              [
                "reference",
                "Agency reference (optional)",
                "مرجع الوكالة (اختياري)",
              ],
            ] as const
          ).map(([key, en, ar]) => (
            <label key={key}>
              {t(en, ar)}
              <input
                type={
                  key === "email" ? "email" : key === "phone" ? "tel" : "text"
                }
                autoComplete="off"
                aria-label={t(en, ar)}
                aria-invalid={!!errors[key]}
                aria-describedby={errors[key] ? `${key}-error` : undefined}
                {...register(key)}
              />
              {errors[key] && (
                <span role="alert" className="field-error" id={`${key}-error`}>
                  {t(errors[key].message!)}
                </span>
              )}
            </label>
          ))}
        </div>
        </fieldset>
        {count > 0 && (
          <fieldset>
            <legend>{t("Additional guests", "الضيوف الإضافيون")}</legend>
            <div className="workspace-fields">
              {Array.from({ length: count }, (_, i) => (
                <label key={i}>
                  {t(`Guest ${i + 2} name`, `اسم الضيف ${i + 2}`)}
                  <input
                    autoComplete="off"
                    aria-label={t(`Guest ${i + 2} name`, `اسم الضيف ${i + 2}`)}
                    {...register(`additional.${i}.name`)}
                    aria-invalid={!!errors.additional?.[i]?.name}
                    aria-describedby={
                      errors.additional?.[i]?.name
                        ? `guest-${i}-error`
                        : undefined
                    }
                  />
                  {errors.additional?.[i]?.name && (
                    <span
                      role="alert"
                      className="field-error"
                      id={`guest-${i}-error`}
                    >
                      {t(errors.additional[i]!.name!.message!)}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <label>
          {t("Special requests (optional)", "طلبات خاصة (اختياري)")}
          <textarea
            aria-label={t(
              "Special requests (optional)",
              "طلبات خاصة (اختياري)",
            )}
            {...register("requests")}
            maxLength={500}
          />
          <span className="fine-print">
            {t(
              "Requests are illustrative and cannot be guaranteed.",
              "الطلبات توضيحية ولا يمكن ضمانها.",
            )}
          </span>
        </label>
        {errors.requests && <p role="alert">{t(errors.requests.message!)}</p>}
        <div className="workspace-actions">
          <Link className="button button--outline" to="/booking/summary">
            {t("Back", "رجوع")}
          </Link>
          <button className="button button--primary">
            {t("Continue to cancellation policy", "المتابعة لسياسة الإلغاء")}
          </button>
        </div>
      </form>
      <SelectionSummary selection={selection} />
    </div>
  );
}
export function CancellationPolicyPage() {
  const { t } = useLocale();
  const { selection, guests, policyAcknowledged, acknowledgePolicy } = useDemo();
  if (selection && !guests) return <Navigate to="/booking/guests" replace />;
  return <Workspace title={t("Cancellation Policy", "سياسة الإلغاء")}>
    <Progress step={2} /><DemoNotice />
    {!selection ? <EmptySelection /> : <div className="workspace-grid">
      <section className="workspace-card workspace-form policy-stage">
        <CancellationPolicyCard policy={selection.rate.cancellationPolicy} />
        <label className="choice-label"><input type="checkbox" checked={policyAcknowledged} onChange={e => acknowledgePolicy(e.target.checked)} />
          {t("I have reviewed the cancellation policy information.", "راجعت معلومات سياسة الإلغاء.")}
        </label>
        <div className="workspace-actions">
          <Link className="button button--outline" to="/booking/guests">{t("Back to guest details", "العودة لبيانات الضيوف")}</Link>
          {policyAcknowledged ? <Link className="button button--primary" to="/booking/payment">{t("Continue to payment preview", "المتابعة لمعاينة الدفع")}</Link> : <button className="button button--primary" disabled>{t("Continue to payment preview", "المتابعة لمعاينة الدفع")}</button>}
        </div>
      </section><SelectionSummary selection={selection} />
    </div>}
  </Workspace>;
}
export function PaymentPage() {
  const { t } = useLocale();
  const { selection, guests, createBooking, policyAcknowledged } = useDemo();
  const navigate = useNavigate();
  const money = useMoney();
  const [method, setMethod] = useState("credit");
  const [scenario, setScenario] = useState("confirmed");
  const [processing, setProcessing] = useState(false);
  if (!selection)
    return (
      <Workspace title={t("Payment preview", "معاينة الدفع")}>
        <EmptySelection />
      </Workspace>
    );
  if (!guests) return <Navigate to="/booking/guests" replace />;
  if (!policyAcknowledged) return <Navigate to="/booking/policy" replace />;
  const insufficient =
    method === "credit" &&
    (scenario === "insufficient" ||
      totalFor(selection) > demoFinance.available);
  function finish() {
    if (insufficient) return;
    const id = createBooking(
      scenario === "failed"
        ? "failed"
        : scenario === "pending"
          ? "pending"
          : "confirmed",
    );
    if (id) navigate(`/booking/result/${id}`, { replace: true });
  }
  return (
    <Workspace title={t("Payment preview", "معاينة الدفع")}>
      <Progress step={3} />
      <DemoNotice />
      <div className="workspace-grid">
        <section className="workspace-card workspace-form">
          <h2>
            {t("A clear view before confirmation.", "رؤية واضحة قبل التأكيد.")}
          </h2>
          <p>
            {t(
              "Select a simulated payment method and an outcome. No card details are collected and no credit balance is changed.",
              "اختر طريقة دفع ونتيجة تجريبيتين. لا نجمع بيانات البطاقات ولا يتغير الرصيد الائتماني.",
            )}
          </p>
          <fieldset disabled={processing}>
            <legend>{t("Payment method", "طريقة الدفع")}</legend>
            <label className="choice-label">
              <input
                type="radio"
                name="method"
                checked={method === "credit"}
                onChange={() => setMethod("credit")}
              />
              {t("Agency credit — simulated", "ائتمان الوكالة — تجريبي")} ·{" "}
              <bdi>{money(demoFinance.available)}</bdi>
            </label>
            <label className="choice-label">
              <input
                type="radio"
                name="method"
                checked={method === "test"}
                onChange={() => {
                  setMethod("test");
                  if (scenario === "insufficient") setScenario("confirmed");
                }}
              />
              {t("Test payment — no card required", "دفع اختباري — دون بطاقة")}
            </label>
          </fieldset>
          <label>
            {t("Demonstration outcome", "النتيجة التجريبية")}
            <select
              aria-label={t("Demonstration outcome", "النتيجة التجريبية")}
              value={scenario}
              disabled={processing}
              onChange={(e) => setScenario(e.target.value)}
            >
              <option value="confirmed">{t("Confirmed", "مؤكد")}</option>
              <option value="pending">
                {t("Pending supplier response", "بانتظار رد المورد")}
              </option>
              <option value="failed">{t("Payment failed", "فشل الدفع")}</option>
              {method === "credit" && (
                <option value="insufficient">
                  {t("Insufficient credit", "رصيد غير كافٍ")}
                </option>
              )}
            </select>
          </label>
          {insufficient && (
            <p role="alert" className="error-note">
              {t(
                "Insufficient demo credit. Choose test payment to continue; no top-up or real credit request is available.",
                "الرصيد التجريبي غير كافٍ. اختر الدفع الاختباري للمتابعة؛ لا تتوفر تعبئة أو طلب ائتمان فعلي.",
              )}
            </p>
          )}
          {processing ? (
            <div className="workspace-card" role="status">
              <InlineLoadingState />
              <p>
                {t(
                  "Processing state preview. Advance manually to view the selected result. No payment request is running.",
                  "معاينة حالة المعالجة. تابع يدوياً لعرض النتيجة المختارة. لا يوجد طلب دفع قيد التنفيذ.",
                )}
              </p>
              <div className="workspace-actions">
                <button className="button button--primary" onClick={finish}>
                  {t("Show simulated result", "عرض النتيجة التجريبية")}
                </button>
                <button
                  className="button button--outline"
                  onClick={() => setProcessing(false)}
                >
                  {t("Cancel preview", "إلغاء المعاينة")}
                </button>
              </div>
            </div>
          ) : (
            <div className="workspace-actions">
              <Link className="button button--outline" to="/booking/policy">
                {t("Back", "رجوع")}
              </Link>
              <button
                className="button button--primary"
                disabled={insufficient}
                onClick={() => setProcessing(true)}
              >
                {t("Simulate payment", "محاكاة الدفع")}
              </button>
            </div>
          )}
        </section>
        <SelectionSummary selection={selection} />
      </div>
    </Workspace>
  );
}
export function BookingResultPage() {
  const { id } = useParams();
  const { records, selectRoom, saveGuests, acknowledgePolicy } = useDemo();
  const { t } = useLocale();
  const navigate = useNavigate();
  const booking = records.find((b) => b.id === id);
  return (
    <Workspace title={t("Booking result", "نتيجة الحجز")}>
      <Progress step={4} />
      {!booking ? (
        <EmptySelection />
      ) : (
        <>
          <DemoNotice />
          <div className="workspace-grid">
            <section className="workspace-card">
              <StatusBadge status={booking.status} />
              <h2>
                {booking.status === "confirmed"
                  ? t("Your demo itinerary is ready.", "برنامجك التجريبي جاهز.")
                  : booking.status === "pending"
                    ? t("Awaiting a simulated response.", "بانتظار رد تجريبي.")
                    : booking.status === "cancelled"
                      ? t(
                          "This demo booking is cancelled.",
                          "تم إلغاء هذا الحجز التجريبي.",
                        )
                      : t(
                          "The simulated payment failed.",
                          "فشلت عملية الدفع التجريبية.",
                        )}
              </h2>
              <p>
                {t("Demo reference", "المرجع التجريبي")}:{" "}
                <strong>
                  <bdi>{booking.id}</bdi>
                </strong>
              </p>
              <p>
                {t(
                  "No real booking or payment occurred. This record is available only in the current browser session.",
                  "لم يحدث حجز أو دفع فعلي. يتوفر هذا السجل في جلسة المتصفح الحالية فقط.",
                )}
              </p>
              <div className="workspace-actions">
                <Link
                  className="button button--primary"
                  to={`/bookings/${booking.id}`}
                >
                  {t("View booking details", "عرض تفاصيل الحجز")}
                </Link>
                {booking.status === "confirmed" && (
                  <Link
                    className="button button--outline"
                    to={`/bookings/${booking.id}/voucher`}
                  >
                    {t("View demo voucher", "عرض القسيمة التجريبية")}
                  </Link>
                )}
                {booking.status === "failed" && (
                  <button
                    className="button button--outline"
                    onClick={() => {
                      selectRoom(booking.selection);
                      saveGuests(booking.guests);
                      // Retrying the unchanged offer retains its explicitly recorded review.
                      acknowledgePolicy(booking.policyAcknowledged === true);
                      navigate(booking.policyAcknowledged ? "/booking/payment" : "/booking/summary");
                    }}
                  >
                    {t("Retry simulation", "إعادة المحاكاة")}
                  </button>
                )}
              </div>
            </section>
            <SelectionSummary selection={booking.selection} />
          </div>
        </>
      )}
    </Workspace>
  );
}
export function VoucherPage() {
  const { id } = useParams();
  const { records } = useDemo();
  const { locale, t } = useLocale();
  const money = useMoney();
  const booking = records.find((b) => b.id === id);
  const hotel = hotels.find((h) => h.id === booking?.hotelId);
  return (
    <Workspace title={t("Demo travel voucher", "قسيمة السفر التجريبية")}>
      {!booking || !hotel ? (
        <EmptySelection />
      ) : booking.status !== "confirmed" ? (
        <SystemState
          title={t("Voucher unavailable", "القسيمة غير متاحة")}
          description={t(
            "A printable demo voucher is available only for a confirmed demonstration record.",
            "تتوفر القسيمة التجريبية للطباعة للحجوزات التجريبية المؤكدة فقط.",
          )}
        >
          <Link to={`/bookings/${booking.id}`}>
            {t("Return to booking", "العودة للحجز")}
          </Link>
        </SystemState>
      ) : (
        <>
          <div className="workspace-actions no-print">
            <button
              className="button button--primary"
              onClick={() => window.print()}
            >
              {t("Print demo voucher", "طباعة القسيمة التجريبية")}
            </button>
            <Link to={`/bookings/${booking.id}`}>
              {t("Back to booking", "العودة للحجز")}
            </Link>
          </div>
          <div className="voucher">
            <div className="voucher-top">
              <BrandLogo withName />
              <div>
                <p className="watermark">
                  {t("DEMO · NOT VALID FOR TRAVEL", "تجريبي · غير صالح للسفر")}
                </p>
                <h2>{t("Accommodation voucher", "قسيمة الإقامة")}</h2>
                <p>
                  <bdi>{booking.id}</bdi>
                </p>
              </div>
            </div>
            <h2>{hotel.name[locale]}</h2>
            <p>{hotel.address[locale]}</p>
            <dl className="summary-dl">
              <div>
                <dt>{t("Lead guest", "الضيف الرئيسي")}</dt>
                <dd>{booking.guests.leadName}</dd>
              </div>
              <div>
                <dt>{t("Additional guests", "الضيوف الإضافيون")}</dt>
                <dd>
                  {booking.guests.additional.map((g) => g.name).join(", ") ||
                    "—"}
                </dd>
              </div>
              <div>
                <dt>{t("Stay", "الإقامة")}</dt>
                <dd>
                  <bdi>
                    {booking.checkIn} → {booking.checkOut}
                  </bdi>
                </dd>
              </div>
              <div>
                <dt>{t("Rooms", "الغرف")}</dt>
                <dd>
                  {booking.selection.criteria.rooms.length} ×{" "}
                  {booking.selection.room.name[locale]}
                </dd>
              </div>
              <div>
                <dt>{t("Board", "الوجبات")}</dt>
                <dd>{booking.selection.rate.board[locale]}</dd>
              </div>
              <div>
                <dt>{t("Contact", "التواصل")}</dt>
                <dd>
                  <bdi>
                    {booking.guests.email}
                    <br />
                    {booking.guests.phone}
                  </bdi>
                </dd>
              </div>
              <div>
                <dt>{t("Agency reference", "مرجع الوكالة")}</dt>
                <dd>{booking.agencyReference}</dd>
              </div>
              <div>
                <dt>{t("Demo room total", "إجمالي الغرف التجريبي")}</dt>
                <dd>
                  <bdi>{money(booking.total)}</bdi>
                </dd>
              </div>
            </dl>
            <h3>{t("Special requests", "طلبات خاصة")}</h3>
            <p>{booking.guests.requests || t("None", "لا يوجد")}</p>
            <DemoNotice />
            <p className="fine-print">
              {t(
                "No supplier confirmation, check-in entitlement or payment receipt. All rates and cancellation conditions are illustrative. This voucher cannot be used at the property.",
                "لا يُعد تأكيداً من المورد أو تصريح إقامة أو إيصال دفع. جميع الأسعار وشروط الإلغاء توضيحية. لا يمكن استخدام القسيمة في الفندق.",
              )}
            </p>
          </div>
        </>
      )}
    </Workspace>
  );
}
