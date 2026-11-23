import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { BackLink } from "@/components/ui/back-link";
import { Icon } from "@/components/ui/icon";
import { SystemState } from "@/components/ui/system-state";
import { b2bSession } from "@/features/auth/b2b-session";
import { Workspace } from "@/features/demo/shared";
import { useLocale } from "@/features/localization/locale-provider";
import { ApiError } from "@/lib/api/client";
import { useB2BResource } from "@/lib/api/use-b2b-resource";
import { formatCalendarDate } from "@/lib/format-date";
import { classifyCustomerError, createCustomer, customerName, getCustomer, listCustomers, type Customer, type CustomerFailure } from "./b2b-customers";
import { validateCustomerChoice, type CustomerErrors } from "./customer-picker";
import styles from "./customers.module.css";

const failureText: Record<CustomerFailure | "signed_out", [string, string]> = {
  signed_out: ["Your session has ended. Sign in again.", "انتهت جلستك. سجّل الدخول مرة أخرى."],
  forbidden: ["Your account can't view customers.", "لا يمكن لحسابك عرض العملاء."],
  not_found: ["This customer wasn't found in your company.", "لم يُعثر على هذا العميل في شركتك."],
  validation: ["Check the details and try again.", "تحقق من البيانات وحاول مرة أخرى."],
  rate_limited: ["Too many requests. Please wait a moment and try again.", "طلبات كثيرة. يرجى الانتظار قليلًا ثم المحاولة مرة أخرى."],
  network: ["We couldn't reach the server. Check your connection and try again.", "تعذر الوصول إلى الخادم. تحقق من اتصالك وحاول مرة أخرى."],
  unavailable: ["Customers can't be loaded right now. Please try again later.", "تعذر تحميل العملاء حاليًا. يرجى المحاولة لاحقًا."],
};

/** The company's customer directory with search and a create form (API builds). No edit or delete. */
export function CustomersPage() {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [settled, setSettled] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => { const timer = setTimeout(() => { setSettled(query.trim()); setPage(1); }, 350); return () => clearTimeout(timer); }, [query]);
  const { state, retry } = useB2BResource(`${settled}:${page}:${version}`, (token, signal) => listCustomers(settled, page, { token, signal }), classifyCustomerError);

  return (
    <Workspace title={t("Customers", "العملاء")}>
      <div className={styles.page} data-customers-page>
        <div className={styles.toolbar}>
          <label className={styles.field}>
            <span>{t("Search by name, email or phone", "ابحث بالاسم أو البريد أو الهاتف")}</span>
            <input className="input" type="search" maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          {!adding && <button type="button" className="button button--primary" onClick={() => setAdding(true)}><Icon name="plus" aria-hidden="true" />{t("Add customer", "إضافة عميل")}</button>}
        </div>
        {adding && <NewCustomerForm onCancel={() => setAdding(false)} onCreated={() => { setAdding(false); setVersion((value) => value + 1); }} />}
        {state.status === "loading" && <p className={styles.muted} role="status">{t("Loading customers…", "جارٍ تحميل العملاء…")}</p>}
        {state.status === "error" && (
          <div role="alert" data-customers-state={state.failure}>
            <SystemState title={t("Customers couldn't be loaded", "تعذر تحميل العملاء")} description={t(...failureText[state.failure])} onRetry={state.failure === "signed_out" || state.failure === "forbidden" ? undefined : retry} />
          </div>
        )}
        {state.status === "done" && state.data.items.length === 0 && (
          <div data-customers-state="empty">
            <SystemState title={settled ? t("No customer matches this search", "لا يوجد عميل يطابق هذا البحث") : t("No customers yet", "لا يوجد عملاء بعد")} description={t("Add a customer here, or when you create a booking draft.", "أضف عميلًا من هنا، أو عند إنشاء مسودة حجز.")} />
          </div>
        )}
        {state.status === "done" && state.data.items.length > 0 && (
          <>
            <p className={styles.muted}>{t(`${state.data.total} ${state.data.total === 1 ? "customer" : "customers"}`, `${state.data.total} عميل`)}</p>
            <ul className={styles.list} aria-label={t("Customers", "العملاء")} data-customers-state="list">
              {state.data.items.map((customer) => (
                <li key={customer.id}>
                  <Link className={styles.row} to={`/customers/${encodeURIComponent(customer.id)}`}>
                    <span><b><bdi>{customerName(customer)}</bdi></b><small><bdi dir="ltr">{[customer.email, customer.phone].filter(Boolean).join(" · ")}</bdi></small></span>
                    <Icon name="arrowRight" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
            {state.data.lastPage > 1 && (
              <nav className={styles.pager} aria-label={t("Customer pages", "صفحات العملاء")}>
                <button type="button" className="button button--outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("Previous", "السابق")}</button>
                <span>{t(`Page ${state.data.page} of ${state.data.lastPage}`, `الصفحة ${state.data.page} من ${state.data.lastPage}`)}</span>
                <button type="button" className="button button--outline" disabled={page >= state.data.lastPage} onClick={() => setPage(page + 1)}>{t("Next", "التالي")}</button>
              </nav>
            )}
          </>
        )}
      </div>
    </Workspace>
  );
}

function NewCustomerForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (customer: Customer) => void }) {
  const { t } = useLocale();
  const [values, setValues] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [errors, setErrors] = useState<CustomerErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => { first.current?.focus(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending.current) return;
    const found = validateCustomerChoice({ mode: "new", ...values }, t);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) return;
    const token = b2bSession.token();
    if (!token) { setFailure(t(...failureText.signed_out)); return; }
    sending.current = true;
    setBusy(true);
    try {
      onCreated(await createCustomer(values, { token }));
    } catch (error) {
      const kind = classifyCustomerError(error);
      if (kind === "validation" && error instanceof ApiError) {
        const fields = error.fieldErrors;
        setErrors({
          first_name: fields.first_name ? t("Check this name.", "تحقق من هذا الاسم.") : undefined,
          last_name: fields.last_name ? t("Check this name.", "تحقق من هذا الاسم.") : undefined,
          contact: fields.email || fields.phone ? t("Check the email or phone.", "تحقق من البريد أو الهاتف.") : undefined,
        });
      }
      setFailure(t(...failureText[kind]));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const input = (name: keyof typeof values, label: string, type: string, error?: string, ref?: typeof first) => (
    <label className={styles.field}>
      <span>{label}</span>
      <input ref={ref} className="input" type={type} autoComplete="off" dir={name === "email" || name === "phone" ? "ltr" : undefined}
        maxLength={name === "email" ? 254 : name === "phone" ? 35 : 100} value={values[name]} aria-invalid={!!error}
        onChange={(event) => setValues({ ...values, [name]: event.target.value })} />
      {error && <span className="field-error" role="alert">{error}</span>}
    </label>
  );

  return (
    <form className={styles.card} noValidate onSubmit={submit} aria-busy={busy} aria-labelledby="new-customer-title" data-new-customer>
      <h2 id="new-customer-title">{t("New customer", "عميل جديد")}</h2>
      <div className={styles.grid}>
        {input("first_name", t("First name", "الاسم الأول"), "text", errors.first_name, first)}
        {input("last_name", t("Last name", "اسم العائلة"), "text", errors.last_name)}
        {input("email", t("Email", "البريد الإلكتروني"), "email")}
        {input("phone", t("Phone", "الهاتف"), "tel")}
        {errors.contact && <p className={`field-error ${styles.span}`} role="alert">{errors.contact}</p>}
      </div>
      {failure && <p className="field-error" role="alert">{failure}</p>}
      <div className={styles.actions}>
        <button type="submit" className="button button--primary" disabled={busy}>{busy ? t("Saving…", "جارٍ الحفظ…") : t("Save customer", "حفظ العميل")}</button>
        <button type="button" className="button button--outline" onClick={onCancel} disabled={busy}>{t("Cancel", "إلغاء")}</button>
      </div>
    </form>
  );
}

/** One of the company's customers. Another company's customer is not found (404). */
export function CustomerDetailPage() {
  const { t, locale } = useLocale();
  const { id = "" } = useParams();
  const { state, retry } = useB2BResource(id, (token, signal) => getCustomer(id, { token, signal }), classifyCustomerError);
  return (
    <Workspace title={t("Customer", "العميل")}>
      <div className={styles.page} data-customer-detail>
        <BackLink to="/customers">{t("Back to customers", "العودة إلى العملاء")}</BackLink>
        {state.status === "loading" && <p className={styles.muted} role="status">{t("Loading customer…", "جارٍ تحميل العميل…")}</p>}
        {state.status === "error" && (
          <div role="alert" data-customer-state={state.failure}>
            <SystemState title={t("Customer couldn't be shown", "تعذر عرض العميل")} description={t(...failureText[state.failure])} onRetry={["signed_out", "forbidden", "not_found"].includes(state.failure) ? undefined : retry} />
          </div>
        )}
        {state.status === "done" && (
          <section className={styles.card} aria-labelledby="customer-name">
            <h2 id="customer-name"><bdi>{customerName(state.data)}</bdi></h2>
            <dl className={styles.facts}>
              <div><dt>{t("Email", "البريد الإلكتروني")}</dt><dd><bdi dir="ltr">{state.data.email ?? "—"}</bdi></dd></div>
              <div><dt>{t("Phone", "الهاتف")}</dt><dd><bdi dir="ltr">{state.data.phone ?? "—"}</bdi></dd></div>
              {state.data.created_at && /^\d{4}-\d{2}-\d{2}/.test(state.data.created_at) && (
                <div><dt>{t("Added", "تاريخ الإضافة")}</dt><dd>{formatCalendarDate(state.data.created_at.slice(0, 10), locale === "ar" ? "ar" : "en")}</dd></div>
              )}
            </dl>
          </section>
        )}
      </div>
    </Workspace>
  );
}
