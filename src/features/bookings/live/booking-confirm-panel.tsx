import { formatMoney } from "@/lib/money";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { b2bSession } from "@/features/auth/b2b-session";
import { useLocale } from "@/features/localization/locale-provider";
import { ApiError } from "@/lib/api/client";
import {
  announceFinanceChange,
  canReconcile,
  classifyConfirmError,
  confirmBooking,
  confirmationView,
  getBookingConfirmation,
  isPollingView,
  type BookingConfirmation,
  type ConfirmFailure,
  type ConfirmationView,
} from "./b2b-booking-confirm";
import styles from "./booking-confirm.module.css";

const POLL_EVERY_MS = 7000;
const POLL_FOR_MS = 3 * 60 * 1000;
type Text = [string, string];

const viewText: Record<ConfirmationView, { title: Text; text: Text }> = {
  draft: { title: ["Draft: not confirmed yet", "مسودة: لم يتم التأكيد بعد"], text: ["Nothing has been charged and no reservation has been made.", "لم يتم أي خصم ولم يُنشأ أي حجز."] },
  wallet_held: { title: ["Wallet amount held", "تم حجز المبلغ في المحفظة"], text: ["The amount is held in your wallet while the confirmation is prepared.", "المبلغ محجوز في محفظتك أثناء تجهيز التأكيد."] },
  preparing: { title: ["Preparing confirmation", "جارٍ تجهيز التأكيد"], text: ["The supplier is preparing the booking. This page updates automatically.", "يجهّز المورد الحجز. تتحدث هذه الصفحة تلقائيًا."] },
  processing: { title: ["Supplier processing", "المورد يعالج الحجز"], text: ["The supplier is processing the booking. This page updates automatically.", "يعالج المورد الحجز. تتحدث هذه الصفحة تلقائيًا."] },
  manual_review: { title: ["Manual review", "مراجعة يدوية"], text: ["Royal Vacation is reviewing this booking with the supplier. Don't create another booking for the same stay.", "تراجع رويال فاكيشن هذا الحجز مع المورد. لا تنشئ حجزًا آخر للإقامة نفسها."] },
  uncertain: { title: ["Outcome not confirmed yet", "لم تتأكد النتيجة بعد"], text: ["The supplier's answer isn't known yet. Check with the supplier below; don't create another booking for the same stay.", "رد المورد غير معروف بعد. تحقّق مع المورد أدناه، ولا تنشئ حجزًا آخر للإقامة نفسها."] },
  confirmed: { title: ["Booking confirmed", "تم تأكيد الحجز"], text: ["The supplier confirmed this booking.", "أكد المورد هذا الحجز."] },
  failed: { title: ["Booking not confirmed", "لم يتم تأكيد الحجز"], text: ["The confirmation expired or failed before the supplier finished it.", "انتهت صلاحية التأكيد أو فشل قبل أن يُكمله المورد."] },
  other: { title: ["Status updated", "تم تحديث الحالة"], text: ["See the booking details for its current status.", "اطّلع على تفاصيل الحجز لمعرفة حالته الحالية."] },
};

const failureText: Record<ConfirmFailure, Text> = {
  signed_out: ["Your session has ended. Sign in again.", "انتهت جلستك. سجّل الدخول مرة أخرى."],
  disabled: ["Booking confirmation isn't available for your account or on this environment yet.", "تأكيد الحجز غير متاح لحسابك أو في هذه البيئة حاليًا."],
  insufficient_funds: ["Your wallet doesn't have enough available balance for the agency purchase price. Nothing was charged.", "لا يوجد رصيد متاح كافٍ في محفظتك لسعر شراء الوكالة. لم يتم أي خصم."],
  conflict: ["This booking is already being confirmed, or this draft can no longer be confirmed. Its current status is shown below.", "هذا الحجز قيد التأكيد بالفعل، أو لم يعد من الممكن تأكيد هذه المسودة. حالته الحالية معروضة أدناه."],
  expired: ["The price check for this draft has expired. Refresh the rates and create a new draft.", "انتهت صلاحية التحقق من سعر هذه المسودة. حدّث الأسعار وأنشئ مسودة جديدة."],
  not_found: ["This booking wasn't found in your company.", "لم يُعثر على هذا الحجز في شركتك."],
  validation: ["The confirmation wasn't accepted. Check the booking and try again.", "لم يُقبل التأكيد. تحقق من الحجز وحاول مرة أخرى."],
  rate_limited: ["Too many requests. Wait a minute before trying again.", "طلبات كثيرة. انتظر دقيقة قبل المحاولة مرة أخرى."],
  uncertain: ["We couldn't get the supplier's answer. Checking the booking status instead of confirming again…", "تعذر الحصول على رد المورد. نتحقق من حالة الحجز بدلًا من التأكيد مرة أخرى…"],
  unavailable: ["Confirmation isn't available right now. Please try again later.", "التأكيد غير متاح حاليًا. يرجى المحاولة لاحقًا."],
};

/**
 * Confirms a booking draft (API builds). The agency purchase price is shown and must be accepted
 * explicitly; one confirmation request runs at a time. A response is shown as confirmed only when
 * the backend says confirmed. An unknown outcome is never retried automatically: the status is read
 * instead, and "Check with supplier" reconciles the same attempt on request.
 */
export function BookingConfirmPanel({ bookingId, agencyPurchasePrice, customerTotal, currency, initial, expiresAt, onRefreshRates, onViewChange }: {
  bookingId: string;
  /** The company wallet charge, from the draft. Without it the draft can't be confirmed here. */
  agencyPurchasePrice: string | null;
  customerTotal: string | null;
  currency: string | null;
  initial: BookingConfirmation | null;
  /** When the draft's prebook expires (10 minutes), if known. */
  expiresAt?: number;
  onRefreshRates?: () => void;
  /** Told the backend's current state ("draft" until the confirmation is accepted), e.g. to show a Result step. */
  onViewChange?: (view: ConfirmationView) => void;
}) {
  const { t, locale } = useLocale();
  const id = useId();
  const lang = locale === "ar" ? "ar" : "en";
  const [state, setState] = useState<BookingConfirmation | null>(initial);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState<"confirm" | "status" | null>(null);
  const [failure, setFailure] = useState<{ kind: ConfirmFailure; retryAt?: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // A booking opened while the supplier is still working on it is followed automatically too.
  const [pollUntil, setPollUntil] = useState<number | null>(() => (initial && isPollingView(confirmationView(initial.status, initial.confirmation_state, initial.confirmed_at)) ? Date.now() + POLL_FOR_MS : null));
  const pending = useRef(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const view = state ? confirmationView(state.status, state.confirmation_state, state.confirmed_at) : "draft";
  useEffect(() => { onViewChange?.(view); }, [view, onViewChange]);
  const usd = (currency ?? "").toUpperCase() === "USD";
  const expired = expiresAt !== undefined && now >= expiresAt && view === "draft";
  const waitSeconds = failure?.retryAt ? Math.max(0, Math.ceil((failure.retryAt - now) / 1000)) : 0;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const readStatus = useCallback(async () => {
    const token = b2bSession.token();
    if (!token || pending.current) return;
    pending.current = true;
    setBusy("status");
    try {
      const next = await getBookingConfirmation(bookingId, { token, locale: lang });
      if (!alive.current) return;
      setState(next);
      if (next.confirmation_state) announceFinanceChange();
    } catch (error) {
      if (alive.current) setFailure({ kind: error instanceof ApiError && error.status === 404 ? "not_found" : error instanceof ApiError && error.status === 429 ? "rate_limited" : "unavailable" });
    } finally {
      pending.current = false;
      if (alive.current) setBusy(null);
    }
  }, [bookingId, lang]);

  // Bounded polling while the supplier works on it; stops on a final state, on timeout or on leaving.
  const polling = isPollingView(view) && pollUntil !== null && now < pollUntil;
  useEffect(() => {
    if (!polling) return;
    const timer = setInterval(() => { void readStatus(); }, POLL_EVERY_MS);
    return () => clearInterval(timer);
  }, [polling, readStatus]);

  async function send() {
    const token = b2bSession.token();
    if (!token || pending.current) return;
    pending.current = true;
    setBusy("confirm");
    setFailure(null);
    try {
      const next = await confirmBooking(bookingId, { token, locale: lang });
      if (!alive.current) return;
      setState(next);
      announceFinanceChange();
      setPollUntil(Date.now() + POLL_FOR_MS);
    } catch (error) {
      if (!alive.current) return;
      const kind = classifyConfirmError(error);
      const wait = kind === "rate_limited" ? (error instanceof ApiError && error.retryAfterSeconds ? error.retryAfterSeconds : 60) : 0;
      setFailure({ kind, retryAt: wait ? Date.now() + wait * 1000 : undefined });
      pending.current = false;
      // Outcome unknown, or already confirming: read the status (never resend the confirmation).
      if (kind === "uncertain" || kind === "conflict") { await readStatus(); setPollUntil(Date.now() + POLL_FOR_MS); }
      if (kind === "insufficient_funds") announceFinanceChange();
    } finally {
      pending.current = false;
      if (alive.current) setBusy(null);
    }
  }

  const money = (amount: string | null) => (amount ? formatMoney(amount, currency ?? "USD") : null);
  const copy = viewText[view];
  const canConfirm = view === "draft" && usd && !!agencyPurchasePrice && !expired;
  return (
    <section className={styles.panel} aria-labelledby={`${id}-title`} data-confirm-view={view} aria-busy={!!busy}>
      <h3 id={`${id}-title`}>{t(...copy.title)}</h3>
      <p role="status" aria-live="polite">{t(...copy.text)}{view === "confirmed" && state?.confirmed_at && <> <bdi dir="ltr">{state.confirmed_at.slice(0, 16).replace("T", " ")} UTC</bdi></>}</p>

      {view === "draft" && (
        <>
          <dl className={styles.prices}>
            {money(agencyPurchasePrice) && <div data-price="agency"><dt>{t("Agency purchase price (charged to your wallet)", "سعر شراء الوكالة (يُخصم من محفظتك)")}</dt><dd><bdi dir="ltr">{money(agencyPurchasePrice)}</bdi></dd></div>}
            {money(customerTotal) && <div data-price="customer"><dt>{t("Customer selling price", "سعر البيع للعميل")}</dt><dd><bdi dir="ltr">{money(customerTotal)}</bdi></dd></div>}
          </dl>
          {!usd && <p className={styles.note} data-confirm-blocked="currency">{t("Confirmation is available for USD bookings only.", "التأكيد متاح لحجوزات الدولار الأمريكي فقط.")}</p>}
          {usd && !agencyPurchasePrice && <p className={styles.note} data-confirm-blocked="price">{t("This draft can't be confirmed from this page. To book, choose the room again from the hotel's rates and confirm right after creating the draft, or contact Royal Vacation.", "لا يمكن تأكيد هذه المسودة من هذه الصفحة. للحجز، اختر الغرفة مرة أخرى من أسعار الفندق وأكّد مباشرة بعد إنشاء المسودة، أو تواصل مع رويال فاكيشن.")}</p>}
          {expired && (
            <p className={styles.warning} role="alert" data-confirm-blocked="expired">
              {t("The price check for this draft has expired. Refresh the rates and create a new draft.", "انتهت صلاحية التحقق من سعر هذه المسودة. حدّث الأسعار وأنشئ مسودة جديدة.")}
              {onRefreshRates && <button type="button" className="button button--outline" onClick={onRefreshRates}>{t("Refresh rates", "تحديث الأسعار")}</button>}
            </p>
          )}
          {canConfirm && (
            <label className={styles.accept}>
              <input type="checkbox" checked={accepted} disabled={!!busy} onChange={(event) => setAccepted(event.target.checked)} />
              <span>{t(`I accept the agency purchase price of USD ${agencyPurchasePrice}. It will be charged to the company wallet.`, `أوافق على سعر شراء الوكالة البالغ ${agencyPurchasePrice} دولار أمريكي، وسيُخصم من محفظة الشركة.`)}</span>
            </label>
          )}
        </>
      )}

      {failure && (
        <p className={styles.warning} role="alert" data-confirm-failure={failure.kind}>
          {t(...failureText[failure.kind])}
          {waitSeconds > 0 && <> {t(`Try again in ${waitSeconds} seconds.`, `حاول مرة أخرى بعد ${waitSeconds} ثانية.`)}</>}
          {failure.kind === "insufficient_funds" && <> <Link to="/wallet">{t("View wallet", "عرض المحفظة")}</Link></>}
          {failure.kind === "expired" && onRefreshRates && <button type="button" className="button button--outline" onClick={onRefreshRates}>{t("Refresh rates", "تحديث الأسعار")}</button>}
        </p>
      )}
      {polling && <p className={styles.note}>{t("Checking the status automatically…", "يتم التحقق من الحالة تلقائيًا…")}</p>}
      {isPollingView(view) && pollUntil !== null && !polling && <p className={styles.note}>{t("Still in progress. Check again later; don't create another booking for the same stay.", "ما زال قيد المعالجة. تحقق لاحقًا، ولا تنشئ حجزًا آخر للإقامة نفسها.")}</p>}

      <div className={styles.actions}>
        {canConfirm && (
          <button type="button" className="button button--primary" disabled={!accepted || !!busy || waitSeconds > 0} onClick={() => void send()}>
            {busy === "confirm" ? t("Confirming…", "جارٍ التأكيد…") : t("Confirm booking", "تأكيد الحجز")}
          </button>
        )}
        {canReconcile(view) && (
          <button type="button" className="button button--primary" disabled={!!busy || waitSeconds > 0} onClick={() => void send()}>
            {busy === "confirm" ? t("Checking with supplier…", "جارٍ التحقق مع المورد…") : t("Check with supplier", "التحقق مع المورد")}
          </button>
        )}
        {view !== "draft" && view !== "confirmed" && view !== "failed" && (
          <button type="button" className="button button--outline" disabled={!!busy} onClick={() => void readStatus()}>
            {busy === "status" ? t("Refreshing…", "جارٍ التحديث…") : t("Refresh status", "تحديث الحالة")}
          </button>
        )}
      </div>
    </section>
  );
}
