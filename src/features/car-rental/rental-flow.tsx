import { useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale } from "@/features/localization/locale-provider";
import { useDemo } from "@/features/demo/demo-provider";
import {
  DemoNotice,
  Workspace,
  StatusBadge,
  useMoney,
} from "@/features/demo/shared";
import { StatePreview, SystemState } from "@/components/ui/system-state";
import { Icon } from "@/components/ui/icon";
import {
  defaultRentalCriteria,
  demoVehicles,
  driverSchema,
  readRentalQuery,
  rentalDays,
  rentalLocations,
  rentalQuery,
  rentalSchema,
  rentalTotal,
  type RentalCriteria,
  type RentalSelection,
  type RentalDriver,
} from "./rental-model";
import "./rental-flow.css";

function RentalShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const steps = [
    ["/car-rental/summary", t("Summary", "الملخص")],
    ["/car-rental/driver", t("Driver", "السائق")],
    ["/car-rental/payment", t("Payment preview", "معاينة الدفع")],
  ];
  return (
    <Workspace title={title}>
      <DemoNotice />
      <nav
        className="rental-nav"
        aria-label={t("Rental navigation", "التنقل في التأجير")}
      >
        <Link to="/car-rental">{t("Car Rental", "تأجير السيارات")}</Link>
        <Link to="/car-rental/search">
          {t("Vehicle search", "البحث عن سيارة")}
        </Link>
        <Link to="/car-rental/bookings">
          {t("Demo rentals", "التأجيرات التجريبية")}
        </Link>
      </nav>
      {steps.some(([path]) => pathname === path) && (
        <ol
          className="booking-progress"
          aria-label={t("Rental progress", "خطوات التأجير")}
        >
          {steps.map(([path, label], index) => (
            <li
              key={path}
              aria-current={pathname === path ? "step" : undefined}
            >
              <span>{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      )}
      {children}
    </Workspace>
  );
}
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
      className="workspace-card workspace-form"
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
                <option key={location}>{location}</option>
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
          "Whole-day sample pricing. No pickup time, airport delivery, taxes, insurance or one-way fees are quoted.",
          "أسعار أمثلة لأيام كاملة؛ لا تشمل مواعيد الاستلام أو التوصيل أو الضرائب أو التأمين أو رسوم الإعادة المختلفة.",
        )}
      </p>
      <button className="button button--primary">
        {label ?? t("Search demo vehicles", "ابحث في السيارات التجريبية")}
      </button>
    </form>
  );
}
function RentalSummary({ selection }: { selection: RentalSelection }) {
  const { t, locale } = useLocale();
  const money = useMoney();
  const vehicle = demoVehicles.find((v) => v.id === selection.vehicleId)!;
  return (
    <section className="workspace-card rental-summary">
      <h2>{vehicle.name[locale]}</h2>
      <dl className="summary-dl">
        <div>
          <dt>{t("Pickup", "الاستلام")}</dt>
          <dd>
            {selection.criteria.pickup} · <bdi>{selection.criteria.start}</bdi>
          </dd>
        </div>
        <div>
          <dt>{t("Return", "الإعادة")}</dt>
          <dd>
            {selection.criteria.dropoff} · <bdi>{selection.criteria.end}</bdi>
          </dd>
        </div>
        <div>
          <dt>
            {t("Days × daily sample rate", "الأيام × السعر اليومي التجريبي")}
          </dt>
          <dd>
            {rentalDays(selection.criteria)} × <bdi>{money(vehicle.daily)}</bdi>
          </dd>
        </div>
        <div>
          <dt>{t("Demo subtotal", "الإجمالي التجريبي")}</dt>
          <dd>
            <bdi>{money(rentalTotal(selection))}</bdi>
          </dd>
        </div>
      </dl>
      <p>
        {t(
          "Not a payable quote. Vehicle, price and availability are fictional. No real cancellation or insurance terms are supplied.",
          "ليس عرضًا قابلًا للدفع. السيارة والسعر والتوافر أمثلة وهمية. لا توجد شروط فعلية للإلغاء أو التأمين.",
        )}
      </p>
    </section>
  );
}
function MissingSelection() {
  const { t } = useLocale();
  return (
    <SystemState
      title={t("Choose a demo vehicle first", "اختر سيارة تجريبية أولًا")}
      description={t(
        "Selections and rental records reset on refresh or Sign Out.",
        "تُمسح الاختيارات وسجلات التأجير عند التحديث أو تسجيل الخروج.",
      )}
    >
      <Link to="/car-rental/search" className="button button--primary">
        {t("Vehicle search", "البحث عن سيارة")}
      </Link>
    </SystemState>
  );
}

export function RentalSearchPage() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const { search } = useLocation();
  const money = useMoney();
  const parsed = readRentalQuery(search);
  const criteria = parsed.success ? parsed.data : null;
  const [category, setCategory] = useState("all");
  const [transmission, setTransmission] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState("low");
  const vehicles = demoVehicles
    .filter(
      (v) =>
        (category === "all" || v.category === category) &&
        (transmission === "all" || v.transmission === transmission) &&
        (!availableOnly || v.available),
    )
    .sort((a, b) => (sort === "low" ? a.daily - b.daily : b.daily - a.daily));
  return (
    <RentalShell title={t("Vehicle search · demo", "البحث عن سيارة · تجريبي")}>
      {search && !criteria && (
        <p role="alert" className="error-note">
          {t(
            "Invalid or expired search dates. Choose a new rental period.",
            "تواريخ البحث غير صالحة أو منتهية. اختر فترة تأجير جديدة.",
          )}
        </p>
      )}
      <RentalCriteriaForm
        key={search}
        initial={criteria ?? undefined}
        onSubmit={(v) => navigate(`/car-rental/search?${rentalQuery(v)}`)}
      />
      {criteria && (
        <StatePreview>
          <div className="table-toolbar">
            <label>
              {t("Vehicle category", "فئة السيارة")}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {[
                  ["all", "All", "الكل"],
                  ["economy", "Economy", "اقتصادية"],
                  ["suv", "SUV", "عائلية"],
                  ["van", "Van", "فان"],
                ].map(([id, en, ar]) => (
                  <option key={id} value={id}>
                    {t(en, ar)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("Transmission", "ناقل الحركة")}
              <select
                aria-label={t("Transmission", "ناقل الحركة")}
                value={transmission}
                onChange={(e) => setTransmission(e.target.value)}
              >
                <option value="all">{t("All", "الكل")}</option>
                <option value="automatic">{t("Automatic", "أوتوماتيك")}</option>
                <option value="manual">{t("Manual", "يدوي")}</option>
              </select>
            </label>
            <label>
              {t("Sort price", "ترتيب السعر")}
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="low">{t("Lowest first", "الأقل أولًا")}</option>
                <option value="high">
                  {t("Highest first", "الأعلى أولًا")}
                </option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
              />
              {t(
                "Available demo examples only",
                "الأمثلة التجريبية المتاحة فقط",
              )}
            </label>
          </div>
          <p role="status">
            {vehicles.length}{" "}
            {t("fictional vehicle examples", "أمثلة سيارات وهمية")}
          </p>
          {vehicles.length ? (
            <div className="rental-grid motion-stagger">
              {vehicles.map((v) => (
                <article className="workspace-card rental-card" key={v.id}>
                  <Icon name="car" />
                  <h2>{v.name[locale]}</h2>
                  <p>
                    {v.seats} {t("seats", "مقاعد")} · {v.bags}{" "}
                    {t("bags", "حقائب")} ·{" "}
                    {t(
                      v.transmission,
                      v.transmission === "automatic" ? "أوتوماتيك" : "يدوي",
                    )}
                  </p>
                  <strong>
                    <bdi>{money(v.daily)}</bdi> /{" "}
                    {t("day · sample", "يوم · مثال")}
                  </strong>
                  <p>
                    {v.available
                      ? t(
                          "Available example · not live",
                          "مثال متاح · ليس توافرًا فعليًا",
                        )
                      : t("Unavailable example", "مثال غير متاح")}
                  </p>
                  <Link
                    className="button button--outline"
                    to={`/car-rental/vehicles/${v.id}?${rentalQuery(criteria)}`}
                  >
                    {t("View vehicle", "عرض السيارة")}
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <SystemState
              title={t("No matching vehicles", "لا توجد سيارات مطابقة")}
              description={t(
                "Try another category or transmission.",
                "جرّب فئة أو ناقل حركة آخر.",
              )}
            />
          )}
        </StatePreview>
      )}
    </RentalShell>
  );
}
export function VehicleDetailsPage() {
  const { id } = useParams();
  const { search } = useLocation();
  const { t, locale } = useLocale();
  const { selectRental } = useDemo();
  const navigate = useNavigate();
  const vehicle = demoVehicles.find((v) => v.id === id);
  const parsed = readRentalQuery(search);
  return (
    <RentalShell title={t("Vehicle details · demo", "تفاصيل السيارة · تجريبي")}>
      {!vehicle ? (
        <SystemState
          title={t("Vehicle not found", "السيارة غير موجودة")}
          description={t("Return to vehicle search.", "ارجع للبحث عن سيارة.")}
        />
      ) : !parsed.success ? (
        <MissingSelection />
      ) : (
        <StatePreview>
          <RentalSummary
            selection={{ vehicleId: vehicle.id, criteria: parsed.data }}
          />
          <section className="workspace-card">
            <h2>{vehicle.name[locale]}</h2>
            <p>
              {vehicle.seats} {t("seats", "مقاعد")} · {vehicle.bags}{" "}
              {t("bags", "حقائب")} ·{" "}
              {t(
                vehicle.transmission,
                vehicle.transmission === "automatic" ? "أوتوماتيك" : "يدوي",
              )}
            </p>
            <h3>{t("Sample rental conditions", "شروط المعاينة التجريبية")}</h3>
            <p>
              {t(
                "No supplier, model guarantee, insurance, deposit or license eligibility has been agreed. This demonstration collects fictional contact details only, never driving-license documents or card credentials.",
                "لم يتم تحديد مورد أو ضمان طراز أو تأمين أو وديعة أو أهلية رخصة. تجمع المعاينة بيانات تواصل وهمية فقط، دون مستندات رخصة أو بيانات بطاقة دفع.",
              )}
            </p>
            <button
              type="button"
              className="button button--primary"
              disabled={!vehicle.available}
              onClick={() => {
                selectRental({ vehicleId: vehicle.id, criteria: parsed.data });
                navigate("/car-rental/summary");
              }}
            >
              {vehicle.available
                ? t("Select vehicle — demo", "اختر السيارة — تجريبي")
                : t("Unavailable — demo", "غير متاحة — تجريبي")}
            </button>
          </section>
        </StatePreview>
      )}
    </RentalShell>
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
        <>
          <RentalSummary selection={rentalSelection} />
          <div className="workspace-card">
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
                "I understand this is a fictional rental with no reservation or payment.",
                "أفهم أن هذا تأجير وهمي دون حجز أو دفع.",
              )}
            </label>
            {accepted && (
              <Link className="button button--primary" to="/car-rental/driver">
                {t("Continue to driver information", "المتابعة لبيانات السائق")}
              </Link>
            )}
          </div>
        </>
      )}
    </RentalShell>
  );
}
export function RentalDriverPage() {
  const { t } = useLocale();
  const { rentalSelection, rentalDriver, saveRentalDriver } = useDemo();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RentalDriver>({
    resolver: zodResolver(driverSchema),
    defaultValues: rentalDriver ?? {
      name: "",
      email: "",
      phone: "",
      acknowledged: false,
    },
  });
  return (
    <RentalShell
      title={t("Driver information · demo", "بيانات السائق · تجريبي")}
    >
      {!rentalSelection ? (
        <MissingSelection />
      ) : (
        <div className="workspace-grid">
          <form
            className="workspace-card workspace-form"
            noValidate
            onSubmit={handleSubmit((v) => {
              saveRentalDriver(v);
              navigate("/car-rental/payment");
            })}
          >
            {(
              [
                ["name", "Driver name", "اسم السائق"],
                ["email", "Driver email", "بريد السائق"],
                ["phone", "Driver phone", "هاتف السائق"],
              ] as const
            ).map(([name, en, ar]) => (
              <label key={name}>
                {t(en, ar)}
                <input
                  {...register(name)}
                  type={
                    name === "email"
                      ? "email"
                      : name === "phone"
                        ? "tel"
                        : "text"
                  }
                  aria-label={t(en, ar)}
                  aria-invalid={!!errors[name]}
                  aria-describedby={
                    errors[name] ? `driver-${name}-error` : undefined
                  }
                />
                {errors[name] && (
                  <span
                    id={`driver-${name}-error`}
                    role="alert"
                    className="field-error"
                  >
                    {t(
                      errors[name].message!,
                      "أدخل بيانات تجريبية صالحة لهذا الحقل.",
                    )}
                  </span>
                )}
              </label>
            ))}
            <label className="rental-consent">
              <input type="checkbox" {...register("acknowledged")} />
              {t("These are fictional driver details", "هذه بيانات سائق وهمية")}
            </label>
            {errors.acknowledged && (
              <p role="alert">
                {t(errors.acknowledged.message!, "أكد أن البيانات وهمية.")}
              </p>
            )}
            <button className="button button--primary">
              {t(
                "Continue to rental payment preview",
                "المتابعة لمعاينة دفع التأجير",
              )}
            </button>
          </form>
          <RentalSummary selection={rentalSelection} />
        </div>
      )}
    </RentalShell>
  );
}
export function RentalPaymentPage() {
  const { t } = useLocale();
  const { rentalSelection, rentalDriver, createRental } = useDemo();
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState("confirmed");
  const [processing, setProcessing] = useState(false);
  const [insufficient, setInsufficient] = useState(false);
  return (
    <RentalShell
      title={t("Rental payment · simulation", "دفع التأجير · محاكاة")}
    >
      {!rentalSelection || !rentalDriver ? (
        <MissingSelection />
      ) : (
        <>
          <RentalSummary selection={rentalSelection} />
          <section className="workspace-card">
            <p>
              {t(
                "Test payment only. No card information, debit, credit deduction or payment request is made.",
                "دفع اختباري فقط. لا بيانات بطاقة ولا خصم من الرصيد ولا طلب دفع.",
              )}
            </p>
            {processing ? (
              <div role="status">
                <h2>{t("Processing preview", "معاينة المعالجة")}</h2>
                <p>
                  {t(
                    "No network request is running. Advance the simulation when ready.",
                    "لا يجري طلب شبكة. تابع المحاكاة عندما تكون جاهزًا.",
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
                  {t("Show rental outcome", "عرض نتيجة التأجير")}
                </button>
              </div>
            ) : (
              <>
                <label>
                  {t("Rental demo outcome", "نتيجة التأجير التجريبية")}
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
                      "Insufficient credit preview. No balance was checked or changed. Choose another demo outcome.",
                      "معاينة رصيد غير كافٍ. لم يُفحص أو يتغير أي رصيد. اختر نتيجة تجريبية أخرى.",
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
                  {t("Simulate rental payment", "محاكاة دفع التأجير")}
                </button>
              </>
            )}
          </section>
        </>
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
    <RentalShell title={t("Demo rental bookings", "حجوزات التأجير التجريبية")}>
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
                  {demoVehicles.find((v) => v.id === r.vehicleId)!.name[locale]}
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
            title={t("No demo rentals", "لا توجد تأجيرات تجريبية")}
            description={t(
              "Complete a simulation or change the filters. Reload clears rental records.",
              "أكمل محاكاة أو غيّر عوامل التصفية. التحديث يمسح سجلات التأجير.",
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
      title={t("Rental booking details · demo", "تفاصيل حجز التأجير · تجريبي")}
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
          <StatusBadge status={record.status} />
          <h2>
            <bdi>{record.id}</bdi>
          </h2>
          <p>
            {t(
              "No vehicle is reserved. This is a frontend outcome preview, not a supplier confirmation.",
              "لم تُحجز سيارة. هذه معاينة نتيجة في الواجهة وليست تأكيد مورد.",
            )}
          </p>
          <RentalSummary selection={record} />
          <section className="workspace-card">
            <h2>{t("Driver", "السائق")}</h2>
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
                        ? t("Cancel demo rental", "إلغاء التأجير التجريبي")
                        : t("Modify demo rental", "تعديل التأجير التجريبي")}
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
                  {t("Retry rental simulation", "إعادة محاكاة التأجير")}
                </button>
              )}
            </div>
          </section>
          <dialog
            ref={dialog}
            className="rental-dialog"
            aria-labelledby="rental-action-title"
          >
            <h2 id="rental-action-title">
              {action === "cancel"
                ? t("Cancel this demo rental?", "إلغاء هذا التأجير التجريبي؟")
                : t("Modify this demo rental", "تعديل هذا التأجير التجريبي")}
            </h2>
            <p>
              {t(
                "Only this local example changes. No supplier request or refund occurs.",
                "يتغير المثال المحلي فقط؛ لا طلب مورد أو استرداد فعلي.",
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
