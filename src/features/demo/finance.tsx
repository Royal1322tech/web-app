import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { StatePreview, SystemState } from "@/components/ui/system-state";
import { demoFinance, demoTransactions } from "./fixtures";
import { Workspace, StatusBadge, useMoney } from "./shared";
import type { Transaction } from "./types";
import { formatCalendarDate } from "@/lib/format-date";
const transactionTypeLabels: Record<Transaction["type"], [string, string]> = {
  credit: ["Credit top-up", "إضافة رصيد"],
  reservation: ["Reservation", "حجز"],
  adjustment: ["Account adjustment", "تسوية حساب"],
};

// The named, horizontally scrollable region is keyboard-focusable so users can scroll the table.
/* eslint-disable jsx-a11y/no-noninteractive-tabindex */
function TransactionTable({
  rows,
  onOpen,
}: {
  rows: readonly Transaction[];
  onOpen: (row: Transaction, trigger: HTMLButtonElement) => void;
}) {
  const { t, locale } = useLocale();
  const money = useMoney();
  return (
    <div
      className="table-wrap"
      role="region"
      aria-label={t("Transaction table", "جدول المعاملات")}
      tabIndex={0}
    >
      <table>
        <thead>
          <tr>
            {[
              ["Reference", "المرجع"],
              ["Date", "التاريخ"],
              ["Type", "النوع"],
              ["Status", "الحالة"],
              ["Amount", "المبلغ"],
              ["Details", "التفاصيل"],
            ].map(([en, ar]) => (
              <th key={en} scope="col">
                {t(en, ar)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <bdi>{row.id}</bdi>
              </td>
              <td>
                <time dateTime={row.date}>{formatCalendarDate(row.date, locale)}</time>
              </td>
              <td>{t(...transactionTypeLabels[row.type])}</td>
              <td>
                <StatusBadge status={row.status} />
              </td>
              <td>
                <strong>
                  <bdi>{money(row.amount)}</bdi>
                </strong>
              </td>
              <td>
                <button
                  className="button button--outline"
                  onClick={(e) => onOpen(row, e.currentTarget)}
                  aria-label={`${t("View transaction", "عرض المعاملة")} ${row.id}`}
                >
                  {t("View", "عرض")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function useTransactionDialog() {
  const { t, locale } = useLocale();
  const money = useMoney();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [row, setRow] = useState<Transaction | null>(null);
  const open = (next: Transaction, button: HTMLButtonElement) => {
    setRow(next);
    trigger.current = button;
    dialog.current?.showModal();
  };
  const element = (
    <dialog
      ref={dialog}
      className="workspace-dialog"
      aria-labelledby="transaction-title"
      onClose={() => trigger.current?.focus()}
    >
      <div className="workspace">
        <h2 id="transaction-title">
          {t("Transaction details", "تفاصيل المعاملة")}
        </h2>
        {row && (
          <>
            <StatusBadge status={row.status} />
            <dl className="summary-dl">
              <div>
                <dt>{t("Reference", "المرجع")}</dt>
                <dd>{row.id}</dd>
              </div>
              <div>
                <dt>{t("Date", "التاريخ")}</dt>
                <dd><time dateTime={row.date}>{formatCalendarDate(row.date, locale)}</time></dd>
              </div>
              <div>
                <dt>{t("Type", "النوع")}</dt>
                <dd>{t(...transactionTypeLabels[row.type])}</dd>
              </div>
              <div>
                <dt>{t("Amount", "المبلغ")}</dt>
                <dd>
                  <bdi>{money(row.amount)}</bdi>
                </dd>
              </div>
              <div>
                <dt>{t("Related reference", "المرجع المرتبط")}</dt>
                <dd>{row.reference}</dd>
              </div>
            </dl>
            <p>{t(row.description)}</p>

          </>
        )}
        <button
          className="button button--outline"
          onClick={() => dialog.current?.close()}
        >
          {t("Close", "إغلاق")}
        </button>
      </div>
    </dialog>
  );
  return { open, element };
}
export function WalletPage() {
  const { t } = useLocale();
  const money = useMoney();
  const { open, element } = useTransactionDialog();
  const [insufficient, setInsufficient] = useState(false);
  return (
    <Workspace title={t("Wallet", "المحفظة")} accountNavigation={false}>
      <p className="fine-print">{t("Account figures are informational and are not connected to a live balance.", "أرقام الحساب للمعلومات فقط ولا ترتبط برصيد مباشر.")}</p>
      <StatePreview
        emptyTitle={t("No credit information", "لا توجد بيانات ائتمانية")}
      >
        <div className="metric-grid">
          {(
            [
              [
                t("Available balance", "الرصيد المتاح"),
                demoFinance.available,
              ],
              [
                t("Used credit", "الائتمان المستخدم"),
                demoFinance.used,
              ],
              [
                t("Credit limit", "حد الائتمان"),
                demoFinance.limit,
              ],
              [
                t("Outstanding", "المستحق"),
                demoFinance.outstanding,
              ],
            ] as const
          ).map(([label, amount]) => (
            <div className="metric" key={label}>
              <span>{label}</span>
              <strong>
                <bdi>{money(amount)}</bdi>
              </strong>
            </div>
          ))}
        </div>
        <div className="workspace-grid">
          <section className="workspace-card">
            <h2>{t("Account overview", "ملخص الحساب")}</h2>
            <p>{t("Posted entries determine the displayed balance. Pending and failed entries do not change it.", "تحدد القيود المسجلة الرصيد المعروض. ولا تغيّره القيود المعلقة أو الفاشلة.")}</p>
            <div className="workspace-actions">
              <Link className="button button--primary" to="/transactions">
                {t("View transaction history", "عرض سجل المعاملات")}
              </Link>
            </div>
            {/* Demo-only control: kept available but visually separate from real account actions. */}
            <div className="demo-tools">
              <span className="demo-tools__label">{t("Demo", "تجريبي")}</span>
              <button
                type="button"
                className="text-button"
                aria-pressed={insufficient}
                onClick={() => setInsufficient(!insufficient)}
              >
                {t("Preview insufficient balance", "معاينة الرصيد غير الكافي")}
              </button>
            </div>
            {insufficient && (
              <p className="error-note" role="alert">
                {t(
                  "Insufficient balance — demonstration. A booking above the available demo credit requires the test payment method. No real credit request can be submitted.",
                  "رصيد غير كافٍ — عرض تجريبي. حجز يتجاوز الرصيد التجريبي يتطلب الدفع الاختباري. لا يمكن إرسال طلب ائتمان فعلي.",
                )}
              </p>
            )}
          </section>
          <aside className="workspace-card">
            <p className="workspace-eyebrow">
              {t("CREDIT USAGE · DEMO", "استخدام الائتمان · تجريبي")}
            </p>
            <h2>
              <bdi>
                {money(demoFinance.used)} / {money(demoFinance.limit)}
              </bdi>
            </h2>
            <meter
              aria-label={t("Demo credit used", "الائتمان التجريبي المستخدم")}
              min={0}
              max={demoFinance.limit}
              value={demoFinance.used}
              style={{ width: "100%", height: 20 }}
            />
            <p className="fine-print">
              {t(
                "37.5% of illustrative credit limit. No real wallet is connected.",
                "٣٧٫٥٪ من حد الائتمان التوضيحي. لا توجد محفظة فعلية متصلة.",
              )}
            </p>
          </aside>
        </div>
        <section style={{ marginTop: 32 }}>
          <h2>{t("Recent activity", "النشاط الأخير")}</h2>
          <TransactionTable rows={demoTransactions.slice(0, 3)} onOpen={open} />
        </section>
      </StatePreview>
      {element}
    </Workspace>
  );
}
export function TransactionsPage() {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const { open, element } = useTransactionDialog();
  const rows = demoTransactions.filter(
    (r) =>
      (type === "all" || r.type === type) &&
      (status === "all" || r.status === status) &&
      `${r.id} ${r.description} ${r.reference}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(rows.length / 4));
  return (
    <Workspace title={t("Transaction history", "سجل المعاملات")}>
      <p className="fine-print">{t("Transaction records are informational and are not processed by a payment provider.", "سجلات المعاملات للمعلومات فقط ولا يعالجها مزود دفع.")}</p>
      <div className="table-toolbar">
        <label>
          {t("Search transactions", "بحث المعاملات")}
          <input
            type="search"
            value={query}
            placeholder={t("Reference or description", "المرجع أو الوصف")}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          {t("Transaction type", "نوع المعاملة")}
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            {["all", "credit", "reservation", "adjustment"].map((v) => (
              <option key={v} value={v}>
                {t(v)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Transaction status", "حالة المعاملة")}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {["all", "completed", "pending", "failed"].map((v) => (
              <option key={v} value={v}>
                {t(v)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button button--outline"
          onClick={() => {
            setQuery("");
            setType("all");
            setStatus("all");
            setPage(1);
          }}
        >
          {t("Reset filters", "إعادة ضبط التصفية")}
        </button>
      </div>
      <StatePreview
        emptyTitle={t("No transactions yet", "لا توجد معاملات بعد")}
      >
        {rows.length ? (
          <>
            <p role="status">
              {rows.length} {t("transactions", "معاملات")}
            </p>
            <TransactionTable
              rows={rows.slice((page - 1) * 4, page * 4)}
              onOpen={open}
            />
            <div className="pagination">
              <button
                className="button button--outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {t("Previous", "السابق")}
              </button>
              <span>
                {t("Page", "صفحة")} {page} / {pages}
              </span>
              <button
                className="button button--outline"
                disabled={page === pages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("Next", "التالي")}
              </button>
            </div>
          </>
        ) : (
          <SystemState
            title={t("No matching transactions", "لا توجد معاملات مطابقة")}
            description={t(
              "Try a different reference or reset the filters.",
              "جرّب مرجعاً آخر أو أعد ضبط التصفية.",
            )}
            onRetry={() => {
              setQuery("");
              setType("all");
              setStatus("all");
              setPage(1);
            }}
          />
        )}
      </StatePreview>
      {element}
    </Workspace>
  );
}
