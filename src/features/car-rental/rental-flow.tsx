import { vehicleName } from "./rental-presentation";
import { RentalShell, RentalSummary, MissingSelection } from "./rental-layout";
import { useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale } from "@/features/localization/locale-provider";
import { useDemo } from "@/features/demo/demo-provider";
import {
  StatusBadge,
} from "@/features/demo/shared";
import { StatePreview, SystemState } from "@/components/ui/system-state";
import { Icon } from "@/components/ui/icon";
import {
  defaultRentalCriteria,
  demoVehicles,
  rentalLocations,
  rentalQuery,
  rentalSchema,
  type RentalCriteria,
} from "./rental-model";
import "./rental-flow.css";

export function RentalCriteriaForm({
  initial = defaultRentalCriteria(),
  onSubmit,
  label,
}: {
  initial?: RentalCriteria;
  onSubmit: (v: RentalCriteria) => void;
  label?: string;
}) {
  const { t } = useLocale();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RentalCriteria>({
    resolver: zodResolver(rentalSchema),
    defaultValues: initial,
  });
  return (
    <form
      id="rental-search-form"
      className="workspace-card workspace-form rental-criteria"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="workspace-fields">
        {(
          [
            ["pickup", "Pickup location", "مكان الاستلام"],
            ["dropoff", "Return location", "مكان الإعادة"],
          ] as const
        ).map(([name, en, ar]) => (
          <label key={name}>
            {t(en, ar)}
            <select {...register(name)}>
              {rentalLocations.map((location) => (
                <option key={location} value={location}>{t(location)}</option>
              ))}
            </select>
          </label>
        ))}
        {(
          [
            ["start", "Pickup date", "تاريخ الاستلام"],
            ["end", "Return date", "تاريخ الإعادة"],
          ] as const
        ).map(([name, en, ar]) => (
          <label key={name}>
            {t(en, ar)}
            <input
              type="date"
              {...register(name)}
              aria-label={t(en, ar)}
              aria-invalid={!!errors[name]}
              aria-describedby={
                errors[name] ? `rental-${name}-error` : undefined
              }
            />
            {errors[name] && (
              <span
                id={`rental-${name}-error`}
                className="field-error"
                role="alert"
              >
                {t(
                  errors[name].message!,
                  name === "start"
                    ? "اختر اليوم أو تاريخًا مستقبليًا."
                    : "يجب أن تكون الإعادة بعد الاستلام.",
                )}
              </span>
            )}
          </label>
        ))}
      </div>
      <p className="fine-print">
        {t(
          "Daily rates exclude taxes, insurance and additional services.",
          "الأسعار اليومية لا تشمل الضرائب أو التأمين أو الخدمات الإضافية.",
        )}
      </p>
      <button className="button button--primary">
        {label ?? t("Search vehicles", "ابحث عن سيارات")}
      </button>
    </form>
  );
}
export function RentalSummaryPage() {
  const { rentalSelection } = useDemo();
  const { t } = useLocale();
  const [accepted, setAccepted] = useState(false);
  return (
    <RentalShell title={t("Rental summary", "ملخص التأجير")}>
      {!rentalSelection ? (
        <MissingSelection />
      ) : (
        <div className="workspace-grid">
          <div className="workspace-card workspace-form">
            <h2>{t("Your journey at a glance", "رحلتك في لمحة")}</h2>
            <p>{t("Review your pickup, return dates and daily rate before adding contact details.", "راجع مكان الاستلام وتواريخ الإعادة والسعر اليومي قبل إضافة بيانات التواصل.")}</p>
            <Link
              to={`/car-rental/search?${rentalQuery(rentalSelection.criteria)}`}
            >
              {t("Change vehicle or dates", "تغيير السيارة أو التواريخ")}
            </Link>
            <label className="rental-consent">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              {t(
                "I understand the vehicle and price require supplier confirmation; no reservation or payment is made here.",
                "أفهم أن السيارة والسعر يحتاجان إلى تأكيد المورد، ولا يتم هنا إنشاء حجز أو دفع.",
              )}
            </label>
            {accepted && (
              <Link className="button button--primary" to="/car-rental/driver">
                {t("Continue to driver information", "المتابعة لبيانات السائق")}
              </Link>
            )}
          </div><RentalSummary selection={rentalSelection} />
        </div>
      )}
    </RentalShell>
  );
}
export function RentalPaymentPage() {
  const { t } = useLocale();
  const { rentalSelection, rentalDriver, createRental, rentalPolicyAcknowledged } = useDemo();
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState("confirmed");
  const [processing, setProcessing] = useState(false);
  const [insufficient, setInsufficient] = useState(false);
  if (rentalSelection && rentalDriver && !rentalPolicyAcknowledged) return <Navigate to="/car-rental/review" replace />;
  return (
    <RentalShell
      title={t("Payment outcome", "نتيجة الدفع")}
    >
      {!rentalSelection || !rentalDriver ? (
        <MissingSelection />
      ) : (
        <div className="workspace-grid">
          <section className="workspace-card workspace-form">
            <p>
              {t(
                "Choose an outcome to review the payment step. No payment is processed.",
                "دفع اختباري فقط. لا بيانات بطاقة ولا خصم من الرصيد ولا طلب دفع.",
              )}
            </p>
            {processing ? (
              <div role="status">
                <h2>{t("Preparing outcome", "تجهيز النتيجة")}</h2>
                <p>
                  {t(
                    "No payment request is running. Continue to view the selected outcome.",
                    "لا يوجد طلب دفع قيد التنفيذ. تابع لعرض النتيجة المختارة.",
                  )}
                </p>
                <button
                  className="button button--primary"
                  onClick={() => {
                    const id = createRental(
                      outcome as "confirmed" | "pending" | "failed",
                    );
                    if (id)
                      navigate(`/car-rental/bookings/${id}`, { replace: true });
                  }}
                >
                  {t("Show outcome", "عرض النتيجة")}
                </button>
              </div>
            ) : (
              <>
                <label>
                  {t("Payment outcome", "نتيجة الدفع")}
                  <select
                    value={outcome}
                    onChange={(e) => {
                      setOutcome(e.target.value);
                      setInsufficient(false);
                    }}
                  >
                    {[
                      ["confirmed", "Confirmed", "مؤكد"],
                      ["pending", "Pending", "معلق"],
                      ["failed", "Failed", "فشل"],
                      ["insufficient", "Insufficient credit", "رصيد غير كافٍ"],
                    ].map(([id, en, ar]) => (
                      <option key={id} value={id}>
                        {t(en, ar)}
                      </option>
                    ))}
                  </select>
                </label>
                {insufficient && (
                  <p role="alert" className="error-note">
                    {t(
                      "The displayed credit is insufficient. No balance was checked or changed. Choose another outcome.",
                      "الرصيد المعروض غير كافٍ. لم يُفحص أو يتغير أي رصيد. اختر نتيجة أخرى.",
                    )}
                  </p>
                )}
                <button
                  className="button button--primary"
                  onClick={() =>
                    outcome === "insufficient"
                      ? setInsufficient(true)
                      : setProcessing(true)
                  }
                >
                  {t("Continue to outcome", "متابعة للنتيجة")}
                </button>
              </>
            )}
          </section><RentalSummary selection={rentalSelection} />
        </div>
      )}
    </RentalShell>
  );
}
export function RentalBookingsPage() {
  const { rentals } = useDemo();
  const { t, locale } = useLocale();
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const list = rentals.filter(
    (r) =>
      (status === "all" || r.status === status) &&
      `${r.id} ${r.driver.name}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <RentalShell title={t("Rental records", "سجلات التأجير")}>
      <div className="table-toolbar">
        <label>
          {t("Search rentals", "بحث التأجيرات")}
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label>
          {t("Rental status", "حالة التأجير")}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {[
              ["all", "All", "الكل"],
              ["confirmed", "Confirmed", "مؤكد"],
              ["pending", "Pending", "معلق"],
              ["failed", "Failed", "فشل"],
              ["cancelled", "Cancelled", "ملغى"],
            ].map(([id, en, ar]) => (
              <option key={id} value={id}>
                {t(en, ar)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <StatePreview>
        {list.length ? (
          <div className="rental-grid">
            {list.map((r) => (
              <article className="workspace-card" key={r.id}>
                <StatusBadge status={r.status} />
                <h2>
                  {vehicleName(demoVehicles.find((v) => v.id === r.vehicleId)!, locale)}
                </h2>
                <p>
                  <bdi>{r.id}</bdi>
                </p>
                <Link to={`/car-rental/bookings/${r.id}`}>
                  {t("View rental details", "عرض تفاصيل التأجير")}
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <SystemState
            title={t("No rental records", "لا توجد سجلات تأجير")}
            description={t(
              "Create a local outcome or change the filters. Records are kept for this session.",
              "أنشئ نتيجة محلية أو غيّر عوامل التصفية. تُحفظ السجلات لهذه الجلسة.",
            )}
          />
        )}
      </StatePreview>
    </RentalShell>
  );
}
export function RentalBookingDetailsPage() {
  const { id } = useParams();
  const {
    rentals,
    cancelRental,
    modifyRental,
    selectRental,
    saveRentalDriver,
  } = useDemo();
  const { t } = useLocale();
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const [action, setAction] = useState<"cancel" | "modify">("cancel");
  const [revision, setRevision] = useState(0);
  const record = rentals.find((r) => r.id === id);
  const active = record && ["confirmed", "pending"].includes(record.status);
  return (
    <RentalShell
      title={t("Rental record details", "تفاصيل سجل التأجير")}
    >
      {!record ? (
        <SystemState
          title={t(
            "Rental not available in this session",
            "التأجير غير متاح في هذه الجلسة",
          )}
          description={t(
            "This reference may have been cleared by refresh or Sign Out.",
            "قد يكون هذا المرجع مُسح بالتحديث أو تسجيل الخروج.",
          )}
        />
      ) : (
        <>
          <div className="rental-booking-layout"><div className="rental-panel">
          <section className="rental-result-banner"><Icon name="shield" /><div><p className="rental-kicker">{t("LOCAL OUTCOME", "نتيجة محلية")}</p><h2>{t("Rental outcome", "نتيجة التأجير")}</h2><StatusBadge status={record.status} /></div></section>
          <h2>
            <bdi>{record.id}</bdi>
          </h2>
          <p>
            {t(
              "No vehicle is reserved. This is a frontend outcome preview, not a supplier confirmation.",
              "لم تُحجز سيارة. هذه معاينة نتيجة في الواجهة وليست تأكيد مورد.",
            )}
          </p>
          <section className="rental-form-section">
            <h2>{t("Passenger / driver contact", "تواصل الراكب / السائق")}</h2>
            <p>{record.driver.name}</p>
            <p>
              <bdi>{record.driver.email}</bdi>
            </p>
            <ol className="timeline">
              {record.timeline.map((line, index) => (
                <li key={index}>
                  {t(
                    line,
                    line.startsWith("Cancellation")
                      ? "تمت محاكاة الإلغاء دون تغيير لدى المورد"
                      : line.startsWith("Modification")
                        ? "تمت محاكاة التعديل دون تغيير لدى المورد"
                        : `نتيجة تجريبية: ${record.status}`,
                  )}
                </li>
              ))}
            </ol>
            <div className="workspace-actions">
              {active && (
                <>
                  {(["modify", "cancel"] as const).map((kind) => (
                    <button
                      key={kind}
                      className="button button--outline"
                      onClick={() => {
                        setAction(kind);
                        setRevision((v) => v + 1);
                        dialog.current?.showModal();
                      }}
                    >
                      {kind === "cancel"
                        ? t("Cancel rental", "إلغاء التأجير")
                        : t("Modify rental", "تعديل التأجير")}
                    </button>
                  ))}
                </>
              )}
              {record.status === "failed" && (
                <button
                  className="button button--primary"
                  onClick={() => {
                    selectRental({
                      vehicleId: record.vehicleId,
                      criteria: record.criteria,
                    });
                    saveRentalDriver(record.driver);
                    navigate("/car-rental/payment");
                  }}
                >
                  {t("Review another outcome", "مراجعة نتيجة أخرى")}
                </button>
              )}
            </div>
          </section>
          <Link className="button button--outline" to="/car-rental/bookings">{t("Back to my rentals", "العودة لتأجيراتي")}</Link>
          </div><RentalSummary selection={record} /></div>
          <dialog
            ref={dialog}
            className="rental-dialog"
            aria-labelledby="rental-action-title"
          >
            <h2 id="rental-action-title">
              {action === "cancel"
                ? t("Cancel this rental record?", "إلغاء سجل التأجير هذا؟")
                : t("Modify this rental record", "تعديل سجل التأجير هذا")}
            </h2>
            <p>
              {t(
                "This updates the session record only. No supplier request or refund occurs.",
                "يحدّث هذا سجل الجلسة فقط. لا يُرسل طلب للمورد ولا يتم استرداد مبلغ.",
              )}
            </p>
            {action === "modify" ? (
              <RentalCriteriaForm
                key={revision}
                initial={record.criteria}
                label={t("Save rental changes", "حفظ تعديلات التأجير")}
                onSubmit={(criteria) => {
                  modifyRental(record.id, {
                    vehicleId: record.vehicleId,
                    criteria,
                  });
                  dialog.current?.close();
                }}
              />
            ) : (
              <button
                className="button button--danger"
                onClick={() => {
                  cancelRental(record.id);
                  dialog.current?.close();
                }}
              >
                {t("Confirm simulated cancellation", "تأكيد الإلغاء التجريبي")}
              </button>
            )}
            <button
              className="button button--outline"
              onClick={() => dialog.current?.close()}
            >
              {t("Close", "إغلاق")}
            </button>
          </dialog>
        </>
      )}
    </RentalShell>
  );
}
