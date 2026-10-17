import { hotelDisplayName, hotelDisplayAddress } from "@/features/hotels/lib/presentation";
import { cancellationPolicyLabels } from "@/features/hotels/cancellation-policy";
import { CancellationPolicyCard } from "./cancellation-policy-card";
import { assessAgencyCredit, paymentMethods } from "./payment-methods";
import { fitsDemoRoom } from "./room-policy";
import { stayQuery } from "@/features/hotels/lib/stay-query";
import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale } from "@/features/localization/locale-provider";
import { HotelSearchForm } from "@/features/home/components/hotel-search-form";
import { SystemState } from "@/components/ui/system-state";
import { Icon } from "@/components/ui/icon";
import { BrandLogo } from "@/components/brand-logo";
import { hotels } from "@/features/hotels/data/hotels.fixture";
import { HotelPolicySections } from "./hotel-policy-sections";
import { useDemo, totalFor } from "./demo-provider";
import { demoFinance } from "./fixtures";
import {
  Workspace,
  SelectionSummary,
  StatusBadge,
  useMoney,
} from "./shared";
import type { DemoSelection, GuestValues } from "./types";

function formatCurrency(amount: number, currency: string, locale: "en" | "ar") {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

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
        ["Payment Details", "بيانات الدفع"],
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
        "Select a room to begin. Your progress is kept for this session.",
        "اختر غرفة للبدء. يُحفظ تقدمك لهذه الجلسة.",
      )}
    >
      <Link className="button button--primary" to="/search">
        {t("Explore hotels", "استكشف الفنادق")}
      </Link>
    </SystemState>
  );
}
export function BookingSummaryPage() {
  const { locale, t } = useLocale();
  const { selection, updateCriteria, acknowledgePolicy: setAccepted } = useDemo();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  return (
    <Workspace title={t("Review your stay", "راجع إقامتك")}>
      <Progress step={0} />
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
                          "This room supports up to 2 adults and no children. Adjust the guest count to continue.",
                          "تتسع هذه الغرفة لبالغين كحد أقصى دون أطفال. عدّل عدد الضيوف للمتابعة.",
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
              <div className="booking-rate-policy">
                <h3>{t("Cancellation Policy", "سياسة الإلغاء")}</h3>
                <p>{cancellationPolicyLabels[selection.rate.cancellationPolicy?.kind ?? "unavailable"][locale]}</p>
              </div>
              <h3>{t("Rate conditions", "شروط السعر")}</h3>
              <ul>
                <li>
                  {t(
                    "Room occupancy: up to 2 adults. Child occupancy is not supplied.",
                    "إشغال الغرفة: بالغان كحد أقصى. لم تُقدّم بيانات إشغال الأطفال.",
                  )}
                </li>
                <li>
                  {t(
                    "Continuing does not send a reservation to the hotel.",
                    "المتابعة لا ترسل حجزًا إلى الفندق.",
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
            "These details stay in this browser session and are not sent to the hotel.",
            "تبقى هذه البيانات في جلسة المتصفح ولا تُرسل إلى الفندق.",
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
              "Requests are not sent to the hotel.",
              "لا تُرسل الطلبات إلى الفندق.",
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
  const { locale, t } = useLocale();
  const { selection, guests, policyAcknowledged, acknowledgePolicy } = useDemo();
  if (selection && !guests) return <Navigate to="/booking/guests" replace />;
  return (
    <Workspace title={t("Cancellation Policy", "سياسة الإلغاء")}>
      <Progress step={2} />
      {!selection ? <EmptySelection /> : (
        <div className="workspace-grid policy-page-grid">
          <div className="policy-page-main">
            <p className="policy-intro">{t("Review the conditions supplied for your selected room and rate.", "راجع الشروط المقدمة للغرفة والسعر المحددين.")}</p>
            <CancellationPolicyCard
              policy={selection.rate.cancellationPolicy}
              roomName={selection.room.name[locale]}
              rateName={selection.rate.board[locale]}
            />
            <HotelPolicySections
              hotel={hotels.find((item) => item.id === selection.hotelId)}
              rate={selection.rate}
            />
            <section className="workspace-card policy-acknowledgement">
              <label className="choice-label">
                <input
                  type="checkbox"
                  checked={policyAcknowledged}
                  onChange={(event) => acknowledgePolicy(event.target.checked)}
                />
                {t("I have reviewed the cancellation and stay information shown above.", "راجعت معلومات الإلغاء والإقامة الموضحة أعلاه.")}
              </label>
              <div className="workspace-actions">
                <Link className="button button--outline" to="/booking/guests">
                  {t("Back to guest details", "العودة لبيانات الضيوف")}
                </Link>
                {policyAcknowledged ? (
                  <Link className="button button--primary" to="/booking/payment">
                    {t("Continue to Payment Details", "المتابعة إلى بيانات الدفع")}
                  </Link>
                ) : (
                  <button className="button button--primary" disabled>
                    {t("Continue to Payment Details", "المتابعة إلى بيانات الدفع")}
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
export function PaymentPage() {
  const { locale, t } = useLocale();
  const {
    selection,
    guests,
    policyAcknowledged,
    paymentMethod,
    selectPaymentMethod,
    preparePaymentDetails,
  } = useDemo();
  const navigate = useNavigate();
  const money = useMoney();
  const creditMoney = (amount: number) => formatCurrency(amount, demoFinance.currency, locale);
  const bookingTotal = selection ? totalFor(selection) : 0;
  const credit = assessAgencyCredit(
    { amount: demoFinance.available, currency: demoFinance.currency },
    bookingTotal,
    "USD",
  );
  const creditInvalid = credit.status !== "sufficient";
  if (!selection)
    return (
      <Workspace title={t("Payment Details", "بيانات الدفع")}>
        <EmptySelection />
      </Workspace>
    );
  if (!guests) return <Navigate to="/booking/guests" replace />;
  if (!policyAcknowledged) return <Navigate to="/booking/policy" replace />;
  return (
    <Workspace title={t("Payment Details", "بيانات الدفع")}>
      <Progress step={3} />
      <div className="workspace-grid">
        <section className="workspace-card payment-details-card">
          <div className="payment-heading">
            <p className="workspace-eyebrow">{t("04 · PAYMENT DETAILS", "٠٤ · بيانات الدفع")}</p>
            <h2>{t("Choose a payment method", "اختر طريقة الدفع")}</h2>
            <p>{t("Select how you would prefer to pay for this stay.", "اختر الطريقة التي تفضلها لدفع قيمة الإقامة.")}</p>
          </div>
          <fieldset className="payment-methods">
            <legend>{t("Available methods", "الطرق المتاحة")}</legend>
            {paymentMethods.map((option) => (
              <label className={`payment-method-option${paymentMethod === option.id ? " is-selected" : ""}`} key={option.id}>
                <input
                  type="radio"
                  name="payment-method"
                  value={option.id}
                  checked={paymentMethod === option.id}
                  onChange={() => selectPaymentMethod(option.id)}
                />
                <Icon name={option.icon} />
                <span className="payment-method-copy">
                  <strong>{option.label[locale]}</strong>
                  <small>{option.description[locale]}</small>
                </span>
                <span className="payment-radio-indicator" aria-hidden="true" />
              </label>
            ))}
          </fieldset>
          {paymentMethod === "agency_credit" && (
            <section className="payment-credit-breakdown" aria-label={t("Agency credit summary", "ملخص رصيد الوكالة")}>
              <dl>
                <div><dt>{t("Available balance", "الرصيد المتاح")}</dt><dd><bdi>{creditMoney(demoFinance.available)}</bdi></dd></div>
                <div><dt>{t("Booking total", "إجمالي الحجز")}</dt><dd><bdi>{money(bookingTotal)}</bdi></dd></div>
                {credit.status === "sufficient" && <div className="payment-credit-remaining"><dt>{t("Estimated remaining", "الرصيد المتبقي التقديري")}</dt><dd><bdi>{creditMoney(credit.remaining)}</bdi></dd></div>}
              </dl>
              <p className="payment-credit-note">{t("Balance is shown from the existing account data. No funds will be deducted.", "الرصيد المعروض مستند إلى بيانات الحساب الحالية. لن يتم خصم أي أموال.")}</p>
              {credit.status === "insufficient" && <p role="alert" className="error-note">{t("Agency credit is insufficient for this booking total.", "رصيد الوكالة غير كافٍ لإجمالي الحجز هذا.")}</p>}
              {credit.status === "currency-mismatch" && <p role="alert" className="error-note">{t(`Agency credit is ${credit.availableCurrency}; this booking is priced in ${credit.bookingCurrency}. A currency conversion is unavailable.`, `رصيد الوكالة بعملة ${credit.availableCurrency} والحجز بعملة ${credit.bookingCurrency}. لا يتوفر تحويل للعملات.`)}</p>}
              {credit.status === "unavailable" && <p role="status">{t("Agency balance is unavailable.", "رصيد الوكالة غير متاح.")}</p>}
            </section>
          )}
          <p className="payment-local-note">{t("Your method is saved for this session. Continuing prepares the details only; it does not initiate payment or reserve a room.", "تُحفظ الطريقة لهذه الجلسة. المتابعة تجهز التفاصيل فقط ولا تبدأ الدفع أو تحجز غرفة.")}</p>
          <div className="workspace-actions">
            <Link className="button button--outline" to="/booking/policy">{t("Back", "رجوع")}</Link>
            <button className="button button--primary" disabled={!paymentMethod || (paymentMethod === "agency_credit" && creditInvalid)} onClick={() => { preparePaymentDetails(); navigate("/booking/result", { replace: true }); }}>{t("Continue", "متابعة")}</button>
          </div>
          {!paymentMethod && <p className="payment-selection-hint" role="status">{t("Select a payment method to continue.", "اختر طريقة دفع للمتابعة.")}</p>}
        </section>
        <SelectionSummary selection={selection} />
      </div>
    </Workspace>
  );
}
export function BookingPreparedPage() {
  const { locale, t } = useLocale();
  const { selection, guests, policyAcknowledged, paymentMethod, paymentDetailsPrepared } = useDemo();
  if (!selection) return <Workspace title={t("Booking details prepared", "تم تجهيز تفاصيل الحجز")}><EmptySelection /></Workspace>;
  if (!guests) return <Navigate to="/booking/guests" replace />;
  if (!policyAcknowledged) return <Navigate to="/booking/policy" replace />;
  if (!paymentMethod || !paymentDetailsPrepared) return <Navigate to="/booking/payment" replace />;
  return (
    <Workspace title={t("Booking details prepared", "تم تجهيز تفاصيل الحجز")}>
      <Progress step={4} />
      <div className="workspace-grid">
        <section className="workspace-card payment-prepared-result">
          <Icon name="check" />
          <h2>{t("Ready for the next step", "جاهز للخطوة التالية")}</h2>
          <p role="status">{t("Your booking details and selected payment method are ready for the next step. No payment or hotel reservation has been processed.", "تفاصيل الحجز وطريقة الدفع المختارة جاهزة للخطوة التالية. لم تتم معالجة أي دفعة أو حجز فندقي.")}</p>
          <p><strong>{t("Selected method", "طريقة الدفع المختارة")}:</strong> {paymentMethods.find((method) => method.id === paymentMethod)?.label[locale]}</p>
          <div className="workspace-actions"><Link className="button button--outline" to="/booking/summary">{t("Review stay details", "مراجعة تفاصيل الإقامة")}</Link><Link className="button button--primary" to="/search">{t("Return to hotel search", "العودة إلى البحث عن الفنادق")}</Link></div>
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
          <div className="workspace-grid">
            <section className="workspace-card">
              <StatusBadge status={booking.status} />
              <h2>
                {booking.status === "confirmed"
                  ? t("Your booking record is ready.", "سجل الحجز جاهز.")
                  : booking.status === "pending"
                    ? t("Pending outcome recorded.", "تم تسجيل نتيجة معلقة.")
                    : booking.status === "cancelled"
                      ? t(
                          "This booking record is cancelled.",
                          "أُلغي سجل الحجز هذا.",
                        )
                      : t(
                          "Payment outcome recorded as failed.",
                          "تم تسجيل نتيجة الدفع كفاشلة.",
                        )}
              </h2>
              <p>
                {t("Reference", "المرجع")}:{" "}
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
                    {t("View voucher", "عرض القسيمة")}
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
    <Workspace title={t("Travel voucher", "قسيمة السفر")}>
      {!booking || !hotel ? (
        <EmptySelection />
      ) : booking.status !== "confirmed" ? (
        <SystemState
          title={t("Voucher unavailable", "القسيمة غير متاحة")}
          description={t(
            "A printable voucher is available only for a confirmed booking record.",
            "تتوفر القسيمة القابلة للطباعة لسجل حجز مؤكد فقط.",
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
              {t("Print voucher", "طباعة القسيمة")}
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
                  {t("NOT VALID FOR TRAVEL", "غير صالح للسفر")}
                </p>
                <h2>{t("Accommodation voucher", "قسيمة الإقامة")}</h2>
                <p>
                  <bdi>{booking.id}</bdi>
                </p>
              </div>
            </div>
            <h2>{hotelDisplayName(hotel.name[locale])}</h2>
            <p>{hotelDisplayAddress(hotel.address[locale], locale)}</p>
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
                  {hotelDisplayName(booking.selection.room.name[locale])}
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
                <dt>{t("Stay total", "إجمالي الإقامة")}</dt>
                <dd>
                  <bdi>{money(booking.total)}</bdi>
                </dd>
              </div>
            </dl>
            <h3>{t("Special requests", "طلبات خاصة")}</h3>
            <p>{booking.guests.requests || t("None", "لا يوجد")}</p>
            <p className="fine-print">
              {t(
                "This record is for review only. It is not a supplier confirmation, check-in document or payment receipt.",
                "هذا السجل للمراجعة فقط، ولا يُعد تأكيدًا من المورد أو مستند تسجيل وصول أو إيصال دفع.",
              )}
            </p>
          </div>
        </>
      )}
    </Workspace>
  );
}
