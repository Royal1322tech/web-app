import { SystemState } from "@/components/ui/system-state";
import { Workspace } from "@/features/demo/shared";
import { useLocale } from "@/features/localization/locale-provider";
import { LoyaltySummaryCard } from "@/features/loyalty/loyalty-points-page";
import { useB2BResource } from "@/lib/api/use-b2b-resource";
import { formatCalendarDate } from "@/lib/format-date";
import { classifyFinanceError, fetchFinance, formatCents, type Finance, type FinanceEntry, type FinanceFailure } from "./b2b-finance";
import styles from "@/features/customers/customers.module.css";

const failureText: Record<FinanceFailure | "signed_out", [string, string]> = {
  signed_out: ["Your session has ended. Sign in again.", "انتهت جلستك. سجّل الدخول مرة أخرى."],
  forbidden: ["Only company administrators can view the wallet and credit.", "يمكن لمسؤولي الشركة فقط عرض المحفظة والائتمان."],
  rate_limited: ["Too many requests. Please wait a moment and try again.", "طلبات كثيرة. يرجى الانتظار قليلًا ثم المحاولة مرة أخرى."],
  network: ["We couldn't reach the server. Check your connection and try again.", "تعذر الوصول إلى الخادم. تحقق من اتصالك وحاول مرة أخرى."],
  unavailable: ["Finance details can't be loaded right now. Please try again later.", "تعذر تحميل البيانات المالية حاليًا. يرجى المحاولة لاحقًا."],
};

function entryLabel(type: string, t: (en: string, ar: string) => string) {
  const known: Record<string, [string, string]> = {
    wallet_topup: ["Wallet top-up", "شحن المحفظة"], set_credit_limit: ["Credit limit set", "تحديد حد الائتمان"],
    credit_settlement: ["Credit settlement", "تسوية الائتمان"], credit_freeze: ["Credit frozen", "تجميد الائتمان"], credit_unfreeze: ["Credit unfrozen", "إلغاء تجميد الائتمان"],
  };
  const pair = known[type];
  return pair ? t(...pair) : type.replace(/_/g, " ");
}

function useFinance() {
  return useB2BResource<Finance, FinanceFailure>("finance", (token, signal) => fetchFinance({ token, signal }), classifyFinanceError);
}

function FinanceState({ state, retry }: ReturnType<typeof useFinance>) {
  const { t } = useLocale();
  if (state.status === "loading") return <p className={styles.muted} role="status" data-finance-state="loading">{t("Loading finance details…", "جارٍ تحميل البيانات المالية…")}</p>;
  if (state.status === "error") {
    return (
      <div role="alert" data-finance-state={state.failure}>
        <SystemState title={t("Finance details couldn't be shown", "تعذر عرض البيانات المالية")} description={t(...failureText[state.failure])} onRetry={state.failure === "signed_out" || state.failure === "forbidden" ? undefined : retry} />
      </div>
    );
  }
  return null;
}

function EntriesList({ entries, currency }: { entries: FinanceEntry[]; currency: string }) {
  const { t, locale } = useLocale();
  if (!entries.length) return <p className={styles.muted} data-finance-state="no-entries">{t("No wallet or credit activity yet.", "لا يوجد نشاط في المحفظة أو الائتمان بعد.")}</p>;
  return (
    <ul className={styles.list} aria-label={t("Wallet and credit activity", "نشاط المحفظة والائتمان")} data-finance-entries>
      {entries.map((entry) => (
        <li key={entry.id} className={styles.row}>
          <span>
            <b>{entryLabel(entry.type, t)}{entry.amount_cents !== null && <> · <bdi dir="ltr">{formatCents(entry.amount_cents, currency, locale)}</bdi></>}</b>
            <small>{[entry.created_at && /^\d{4}-\d{2}-\d{2}/.test(entry.created_at) ? formatCalendarDate(entry.created_at.slice(0, 10), locale === "ar" ? "ar" : "en") : null, entry.reference, entry.reason].filter(Boolean).join(" · ")}</small>
          </span>
          <small><bdi dir="ltr">{t("Wallet after", "المحفظة بعد")}: {formatCents(entry.wallet_after_cents, currency, locale)}</bdi></small>
        </li>
      ))}
    </ul>
  );
}

/** The company's real wallet and credit (API builds). Read-only: no top-up or payment actions. */
export function LiveWalletPage() {
  const { t, locale } = useLocale();
  const finance = useFinance();
  const { state } = finance;
  return (
    <Workspace title={t("Wallet", "المحفظة")} accountNavigation={false}>
      <div className={styles.page} data-live-wallet>
        <LoyaltySummaryCard />
        <FinanceState {...finance} />
        {state.status === "done" && (() => {
          const { account } = state.data;
          const money = (value: number) => formatCents(value, account.currency, locale);
          const metrics: [string, number, string][] = [
            [t("Wallet available", "المتاح في المحفظة"), account.wallet_available_cents, "wallet_available"],
            [t("Held for bookings", "محجوز للحجوزات"), account.wallet_reserved_cents, "wallet_reserved"],
            [t("Credit limit", "حد الائتمان"), account.credit_limit_cents, "credit_limit"],
            [t("Credit used", "الائتمان المستخدم"), account.credit_used_cents, "credit_used"],
            [t("Credit available", "الائتمان المتاح"), account.credit_available_cents, "credit_available"],
            [t("Total available", "الإجمالي المتاح"), account.total_available_cents, "total_available"],
          ];
          return (
            <>
              <div className={styles.metrics}>
                {metrics.map(([label, value, key]) => (
                  <section key={key} className={styles.metric} data-metric={key}><h2>{label}</h2><strong><bdi dir="ltr">{money(value)}</bdi></strong></section>
                ))}
              </div>
              {account.credit_frozen && <p className="field-error" role="status">{t("Credit is currently frozen. Contact Royal Vacation.", "الائتمان مجمّد حاليًا. تواصل مع رويال فاكيشن.")}</p>}
              <section className={styles.card} aria-labelledby="finance-activity">
                <h2 id="finance-activity">{t("Recent activity", "النشاط الأخير")}</h2>
                <EntriesList entries={state.data.entries} currency={account.currency} />
              </section>
              <p className={styles.muted}>{t("Top-ups, credit limits and settlements are handled by Royal Vacation.", "تتولى رويال فاكيشن الشحن وحدود الائتمان والتسويات.")}</p>
            </>
          );
        })()}
      </div>
    </Workspace>
  );
}

/** The company's real wallet and credit entries (API builds). */
export function LiveTransactionsPage() {
  const { t } = useLocale();
  const finance = useFinance();
  return (
    <Workspace title={t("Transactions", "المعاملات")} accountNavigation={false}>
      <div className={styles.page} data-live-transactions>
        <FinanceState {...finance} />
        {finance.state.status === "done" && <EntriesList entries={finance.state.data.entries} currency={finance.state.data.account.currency} />}
      </div>
    </Workspace>
  );
}
