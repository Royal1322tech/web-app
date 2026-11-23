import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CustomerPicker, validateCustomerChoice, type CustomerChoice, type CustomerErrors } from "@/features/customers/customer-picker";
import { newCustomerBody } from "@/features/customers/b2b-customers";
import { Icon } from "@/components/ui/icon";
import { ApiError } from "@/lib/api/client";
import { useLocale } from "@/features/localization/locale-provider";
import { b2bSession } from "@/features/auth/b2b-session";
import {
  classifyDraftError,
  createBookingDraft,
  guestSlots,
  isRetryableDraftFailure,
  newIdempotencyKey,
  type DraftCreated,
  type DraftCustomer,
  type DraftFailure,
  type DraftGuest,
} from "../api/b2b-booking-draft";
import type { RoomsRequest } from "../api/b2b-hotel-rooms";
import styles from "./hotel-rooms-page.module.css";

/** Wall-clock time for event handlers (kept out of render). */
const clock = () => Date.now();

type Names = Record<string, { first: string; last: string }>;
type FieldErrors = Record<string, { first?: string; last?: string }>;
type Text = [string, string];

const MESSAGES: Record<Exclude<DraftFailure, "validation" | "signed_out">, Text> = {
  forbidden: ["Your account can't create booking drafts.", "لا يمكن لحسابك إنشاء مسودات حجز."],
  customer_missing: ["This customer wasn't found in your company. Choose another customer.", "لم يُعثر على هذا العميل في شركتك. اختر عميلًا آخر."],
  conflict: ["This room can't be drafted anymore. Choose another room or refresh the rates.", "لم يعد من الممكن إنشاء مسودة لهذه الغرفة. اختر غرفة أخرى أو حدّث الأسعار."],
  expired: ["This price check has expired. Refresh the rates and choose the room again.", "انتهت صلاحية التحقق من السعر. حدّث الأسعار واختر الغرفة مرة أخرى."],
  rate_limited: ["Too many requests. Please wait a few minutes before trying again.", "طلبات كثيرة. يرجى الانتظار بضع دقائق قبل المحاولة مرة أخرى."],
  network: ["We couldn't reach the server, so no draft was created. Check your connection and try again.", "تعذر الوصول إلى الخادم، لذلك لم تُنشأ أي مسودة. تحقق من اتصالك وحاول مرة أخرى."],
  timeout: ["The server took too long, so the draft may not have been created. Try again: the same request won't create a second draft.", "استغرق الخادم وقتًا طويلًا، لذلك ربما لم تُنشأ المسودة. حاول مرة أخرى: لن يُنشئ الطلب نفسه مسودة ثانية."],
  unavailable: ["Booking drafts can't be created right now. Please try again later.", "لا يمكن إنشاء مسودات الحجز حاليًا. يرجى المحاولة لاحقًا."],
  unexpected: ["The booking draft couldn't be created. Please try again later.", "تعذر إنشاء مسودة الحجز. يرجى المحاولة لاحقًا."],
};

/**
 * Guest details and POST /b2b/bookings/draft for a confirmed price review. One lead adult is required.
 * The Idempotency-Key is reused only when the exact same submission is retried, and replaced as soon as
 * anything in it changes. A draft is never presented as a reservation or payment.
 */
export function BookingDraftForm({ reviewToken, occupancy, onRefresh }: { reviewToken: string; occupancy: RoomsRequest["guests"]; onRefresh: () => void }) {
  const { t, locale } = useLocale();
  const slots = guestSlots(occupancy);
  const adults = slots.filter((slot) => slot.type === "adult");
  const [names, setNames] = useState<Names>({});
  const [lead, setLead] = useState(adults[0]?.key ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<{ kind: DraftFailure; text: string; retryAfter?: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<DraftCreated | null>(null);
  const [customer, setCustomer] = useState<CustomerChoice>({ mode: "existing", customer: null });
  const [customerErrors, setCustomerErrors] = useState<CustomerErrors>({});
  const [now, setNow] = useState(clock);
  const pending = useRef(false);
  const submitted = useRef<{ payload: string; key: string } | null>(null);
  const formId = useId();
  const successRef = useRef<HTMLHeadingElement>(null);

  const waitUntil = failure?.kind === "rate_limited" && failure.retryAfter ? failure.retryAfter : 0;
  const wait = Math.max(0, Math.ceil((waitUntil - now) / 1000));
  useEffect(() => {
    if (!wait) return;
    const timer = setInterval(() => setNow(clock()), 1000);
    return () => clearInterval(timer);
  }, [wait]);
  useEffect(() => { if (created) successRef.current?.focus(); }, [created]);

  if (created) {
    return (
      <section className={styles.draftDone} data-draft-state="created" aria-labelledby={`${formId}-done`}>
        <h3 id={`${formId}-done`} ref={successRef} tabIndex={-1}><Icon name="check" />{t("Booking Draft Created", "تم إنشاء مسودة الحجز")}</h3>
        <p>{t("The guest details and this price check were saved as a booking draft. A draft is not a confirmed reservation, and no payment has been taken.", "تم حفظ بيانات الضيوف وهذا التحقق من السعر كمسودة حجز. المسودة ليست حجزًا مؤكدًا، ولم يتم أي دفع.")}</p>
        <p className={styles.draftReference}>{t("Booking number", "رقم الحجز")}: <bdi dir="ltr">{created.booking_no}</bdi></p>
        <div className={styles.actions}>
          <Link className="button button--primary" to={`/bookings/${encodeURIComponent(created.booking_id)}`}>{t("View booking", "عرض الحجز")}</Link>
        </div>
      </section>
    );
  }

  const label = (slot: (typeof slots)[number]) => slot.type === "adult"
    ? t(`Adult ${slot.number}`, `بالغ ${slot.number}`)
    : t(`Child ${slot.number}`, `طفل ${slot.number}`);
  const set = (key: string, part: "first" | "last", value: string) => {
    setNames((current) => ({ ...current, [key]: { first: current[key]?.first ?? "", last: current[key]?.last ?? "", [part]: value } }));
    if (errors[key]?.[part]) setErrors((current) => ({ ...current, [key]: { ...current[key], [part]: undefined } }));
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || wait > 0) return;
    const found: FieldErrors = {};
    const guests: DraftGuest[] = slots.map((slot) => {
      const first = (names[slot.key]?.first ?? "").trim();
      const last = (names[slot.key]?.last ?? "").trim();
      const issue: { first?: string; last?: string } = {};
      if (!first) issue.first = t("Enter the first name.", "أدخل الاسم الأول.");
      else if (first.length > 100) issue.first = t("Use 100 characters or fewer.", "استخدم 100 حرف أو أقل.");
      if (!last) issue.last = t("Enter the last name.", "أدخل اسم العائلة.");
      else if (last.length > 100) issue.last = t("Use 100 characters or fewer.", "استخدم 100 حرف أو أقل.");
      if (issue.first || issue.last) found[slot.key] = issue;
      return { first_name: first, last_name: last, guest_type: slot.type, is_lead: slot.key === lead };
    });
    const foundCustomer = validateCustomerChoice(customer, t);
    setErrors(found);
    setCustomerErrors(foundCustomer);
    setFailure(null);
    if (Object.keys(foundCustomer).length) {
      document.querySelector<HTMLElement>("[data-customer-picker] input")?.focus();
      return;
    }
    if (Object.keys(found).length) {
      document.getElementById(`${formId}-${Object.keys(found)[0]}-${found[Object.keys(found)[0]].first ? "first" : "last"}`)?.focus();
      return;
    }
    const token = b2bSession.token();
    if (!token) return;
    // Same submission (unchanged after a failure that's safe to retry): same key. Anything else: new key.
    const draftCustomer: DraftCustomer = customer.mode === "existing"
      ? { customer_id: customer.customer!.id }
      : { customer: newCustomerBody(customer) };
    const payload = JSON.stringify([reviewToken, guests, draftCustomer]);
    const key = submitted.current?.payload === payload ? submitted.current.key : newIdempotencyKey();
    submitted.current = { payload, key };
    pending.current = true;
    setBusy(true);
    try {
      setCreated(await createBookingDraft(reviewToken, guests, draftCustomer, key, { token, locale: locale === "ar" ? "ar" : "en" }));
    } catch (error) {
      const kind = classifyDraftError(error);
      // A failure that can't succeed on retry: the next attempt, even unchanged, gets a new key.
      if (!isRetryableDraftFailure(kind)) submitted.current = null;
      if (kind === "validation") {
        const fields = error instanceof ApiError ? error.fieldErrors : {};
        const mapped: FieldErrors = {};
        for (const field of Object.keys(fields)) {
          const match = /^guests\.(\d+)\.(first_name|last_name)$/.exec(field);
          const slot = match ? slots[Number(match[1])] : undefined;
          if (slot) mapped[slot.key] = { ...mapped[slot.key], [match![2] === "first_name" ? "first" : "last"]: t("Check this name.", "تحقق من هذا الاسم.") };
        }
        const customerFields: CustomerErrors = {};
        for (const field of Object.keys(fields)) {
          if (field === "customer_id" || field === "customer") customerFields.customer = t("Choose a customer or enter a new one.", "اختر عميلًا أو أدخل عميلًا جديدًا.");
          if (field === "customer.first_name") customerFields.first_name = t("Check this name.", "تحقق من هذا الاسم.");
          if (field === "customer.last_name") customerFields.last_name = t("Check this name.", "تحقق من هذا الاسم.");
          if (field === "customer.email" || field === "customer.phone") customerFields.contact = t("Check the email or phone.", "تحقق من البريد أو الهاتف.");
        }
        setCustomerErrors(customerFields);
        setErrors(mapped);
        setFailure({ kind, text: t("Check the guest details: a first and last name for every guest, and exactly one lead guest.", "تحقق من بيانات الضيوف: اسم أول واسم عائلة لكل ضيف، وضيف رئيسي واحد فقط.") });
      } else if (kind !== "signed_out") {
        const retryAfter = kind === "rate_limited" && error instanceof ApiError && error.retryAfterSeconds ? clock() + error.retryAfterSeconds * 1000 : undefined;
        setNow(clock());
        setFailure({ kind, text: t(...MESSAGES[kind]), retryAfter });
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const rooms = [...new Set(slots.map((slot) => slot.room))];
  return (
    <form className={styles.draftForm} noValidate onSubmit={submit} aria-busy={busy} aria-labelledby={`${formId}-title`} data-draft-state="form">
      <h3 id={`${formId}-title`}>{t("Guest details", "بيانات الضيوف")}</h3>
      <p className={styles.note}>{t("Enter every guest's name as on their passport, and choose the lead guest. This saves a booking draft only: it isn't a reservation and takes no payment.", "أدخل اسم كل ضيف كما في جواز سفره، واختر الضيف الرئيسي. هذا يحفظ مسودة حجز فقط: ليس حجزًا ولا يتضمن أي دفع.")}</p>
      <CustomerPicker value={customer} onChange={(next) => { setCustomer(next); setCustomerErrors({}); }} errors={customerErrors} disabled={busy} />
      {rooms.map((room) => (
        <fieldset key={room} className={styles.draftRoom} disabled={busy}>
          <legend>{t(`Room ${room}`, `الغرفة ${room}`)}</legend>
          {slots.filter((slot) => slot.room === room).map((slot) => (
            <div key={slot.key} className={styles.guestRow} data-guest={slot.key}>
              <p className={styles.guestLabel}>{label(slot)}</p>
              <label className={styles.guestField}>
                <span>{t("First name", "الاسم الأول")}</span>
                <input id={`${formId}-${slot.key}-first`} className="input" autoComplete="off" value={names[slot.key]?.first ?? ""} aria-invalid={!!errors[slot.key]?.first} aria-describedby={errors[slot.key]?.first ? `${formId}-${slot.key}-first-error` : undefined} onChange={(event) => set(slot.key, "first", event.target.value)} />
                {errors[slot.key]?.first && <span id={`${formId}-${slot.key}-first-error`} className="field-error" role="alert">{errors[slot.key]!.first}</span>}
              </label>
              <label className={styles.guestField}>
                <span>{t("Last name", "اسم العائلة")}</span>
                <input id={`${formId}-${slot.key}-last`} className="input" autoComplete="off" value={names[slot.key]?.last ?? ""} aria-invalid={!!errors[slot.key]?.last} aria-describedby={errors[slot.key]?.last ? `${formId}-${slot.key}-last-error` : undefined} onChange={(event) => set(slot.key, "last", event.target.value)} />
                {errors[slot.key]?.last && <span id={`${formId}-${slot.key}-last-error`} className="field-error" role="alert">{errors[slot.key]!.last}</span>}
              </label>
              {slot.type === "adult" && (
                <label className={styles.leadChoice}>
                  <input type="radio" name={`${formId}-lead`} checked={lead === slot.key} onChange={() => setLead(slot.key)} />
                  <span>{t("Lead guest", "الضيف الرئيسي")}</span>
                </label>
              )}
            </div>
          ))}
        </fieldset>
      ))}
      <div role="alert">
        {failure && (
          <p className={styles.draftError} data-draft-failure={failure.kind}>
            {failure.text}
            {wait > 0 && <> {t("You can try again in", "يمكنك المحاولة مرة أخرى بعد")} <bdi dir="ltr">{Math.floor(wait / 60)}:{String(wait % 60).padStart(2, "0")}</bdi></>}
          </p>
        )}
      </div>
      <div className={styles.actions}>
        {failure?.kind === "expired" || failure?.kind === "conflict"
          ? <button type="button" className="button button--primary" onClick={onRefresh}>{t("Refresh rates", "تحديث الأسعار")}</button>
          : <button type="submit" className="button button--primary" disabled={busy || wait > 0}>{busy ? t("Creating draft…", "جارٍ إنشاء المسودة…") : t("Create booking draft", "إنشاء مسودة حجز")}</button>}
      </div>
    </form>
  );
}
