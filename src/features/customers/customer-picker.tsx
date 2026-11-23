import { useEffect, useId, useState } from "react";
import { b2bSession } from "@/features/auth/b2b-session";
import { useLocale } from "@/features/localization/locale-provider";
import { classifyCustomerError, customerName, listCustomers, type Customer, type CustomerFailure } from "./b2b-customers";
import styles from "./customers.module.css";

export type CustomerChoice =
  | { mode: "existing"; customer: Customer | null }
  | { mode: "new"; first_name: string; last_name: string; email: string; phone: string };
export type CustomerErrors = Partial<Record<"customer" | "first_name" | "last_name" | "contact", string>>;

export const emptyNewCustomer: CustomerChoice = { mode: "new", first_name: "", last_name: "", email: "", phone: "" };

/** Client checks matching the backend rules (names ≤100, email ≤254, phone ≤35, email or phone). */
export function validateCustomerChoice(choice: CustomerChoice, t: (en: string, ar: string) => string): CustomerErrors {
  if (choice.mode === "existing") return choice.customer ? {} : { customer: t("Choose a customer.", "اختر عميلًا.") };
  const errors: CustomerErrors = {};
  if (!choice.first_name.trim()) errors.first_name = t("Enter the first name.", "أدخل الاسم الأول.");
  else if (choice.first_name.trim().length > 100) errors.first_name = t("Use 100 characters or fewer.", "استخدم 100 حرف أو أقل.");
  if (!choice.last_name.trim()) errors.last_name = t("Enter the last name.", "أدخل اسم العائلة.");
  else if (choice.last_name.trim().length > 100) errors.last_name = t("Use 100 characters or fewer.", "استخدم 100 حرف أو أقل.");
  const email = choice.email.trim(), phone = choice.phone.trim();
  if (!email && !phone) errors.contact = t("Enter an email or a phone number.", "أدخل بريدًا إلكترونيًا أو رقم هاتف.");
  else if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) errors.contact = t("Enter a valid email address.", "أدخل بريدًا إلكترونيًا صحيحًا.");
  else if (phone.length > 35) errors.contact = t("Use 35 characters or fewer for the phone.", "استخدم 35 حرفًا أو أقل لرقم الهاتف.");
  return errors;
}

const failureText: Record<CustomerFailure, [string, string]> = {
  signed_out: ["Your session has ended. Sign in again.", "انتهت جلستك. سجّل الدخول مرة أخرى."],
  forbidden: ["Your account can't view customers.", "لا يمكن لحسابك عرض العملاء."],
  not_found: ["Customer not found.", "العميل غير موجود."],
  validation: ["Check the search text.", "تحقق من نص البحث."],
  rate_limited: ["Too many requests. Please wait a moment.", "طلبات كثيرة. يرجى الانتظار قليلًا."],
  network: ["We couldn't reach the server.", "تعذر الوصول إلى الخادم."],
  unavailable: ["Customers can't be loaded right now.", "تعذر تحميل العملاء حاليًا."],
};

/**
 * The booking's customer (the beneficiary): one of the company's customers, found by name, email or
 * phone, or a new one created together with the draft.
 */
export function CustomerPicker({ value, onChange, errors, disabled = false }: { value: CustomerChoice; onChange: (next: CustomerChoice) => void; errors: CustomerErrors; disabled?: boolean }) {
  const { t } = useLocale();
  const id = useId();
  const [query, setQuery] = useState("");
  const [settled, setSettled] = useState("");
  const [state, setState] = useState<{ key: string; items?: Customer[]; failure?: CustomerFailure } | null>(null);
  const current = state?.key === settled ? state : null;

  useEffect(() => {
    const timer = setTimeout(() => setSettled(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (value.mode !== "existing") return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const token = b2bSession.token();
      if (!token) { setState({ key: settled, failure: "signed_out" }); return; }
      listCustomers(settled, 1, { token, signal: controller.signal })
        .then((page) => { if (!controller.signal.aborted) setState({ key: settled, items: page.items }); })
        .catch((error: unknown) => { if (!controller.signal.aborted) setState({ key: settled, failure: classifyCustomerError(error) }); });
    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [settled, value.mode]);

  const field = (name: "first_name" | "last_name" | "email" | "phone", label: string, type = "text", error?: string) => value.mode === "new" && (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        id={`${id}-${name}`}
        className="input"
        type={type}
        autoComplete="off"
        dir={name === "email" || name === "phone" ? "ltr" : undefined}
        maxLength={name === "email" ? 254 : name === "phone" ? 35 : 100}
        value={value[name]}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-${name}-error` : undefined}
        onChange={(event) => onChange({ ...value, [name]: event.target.value })}
      />
      {error && <span id={`${id}-${name}-error`} className="field-error" role="alert">{error}</span>}
    </label>
  );

  return (
    <fieldset className={styles.picker} disabled={disabled} data-customer-picker>
      <legend>{t("Customer", "العميل")}</legend>
      <p className={styles.help}>{t("The customer this booking is for. Guests can be different people.", "العميل الذي يُنشأ الحجز له. يمكن أن يكون الضيوف أشخاصًا آخرين.")}</p>
      <div className={styles.modes} role="radiogroup" aria-label={t("Customer", "العميل")}>
        <label className={styles.mode}>
          <input type="radio" name={`${id}-mode`} checked={value.mode === "existing"} onChange={() => onChange({ mode: "existing", customer: null })} />
          <span>{t("Existing customer", "عميل حالي")}</span>
        </label>
        <label className={styles.mode}>
          <input type="radio" name={`${id}-mode`} checked={value.mode === "new"} onChange={() => onChange(emptyNewCustomer)} />
          <span>{t("New customer", "عميل جديد")}</span>
        </label>
      </div>

      {value.mode === "existing" ? (
        <div className={styles.existing}>
          <label className={styles.field}>
            <span>{t("Search by name, email or phone", "ابحث بالاسم أو البريد أو الهاتف")}</span>
            <input className="input" type="search" maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          {!current ? (
            <p className={styles.muted} role="status">{t("Loading customers…", "جارٍ تحميل العملاء…")}</p>
          ) : current.failure ? (
            <p className="field-error" role="alert">{t(...failureText[current.failure])}</p>
          ) : current.items && current.items.length === 0 ? (
            <p className={styles.muted} role="status">{settled ? t("No customer matches this search.", "لا يوجد عميل يطابق هذا البحث.") : t("No customers yet. Choose New customer.", "لا يوجد عملاء بعد. اختر «عميل جديد».")}</p>
          ) : (
            <ul className={styles.results} aria-label={t("Customers", "العملاء")}>
              {current.items!.map((customer) => (
                <li key={customer.id}>
                  <label className={styles.result} data-selected={value.customer?.id === customer.id || undefined} aria-label={customerName(customer)}>
                    <input type="radio" name={`${id}-customer`} checked={value.customer?.id === customer.id} onChange={() => onChange({ mode: "existing", customer })} />
                    <span><b><bdi>{customerName(customer)}</bdi></b><small><bdi dir="ltr">{[customer.email, customer.phone].filter(Boolean).join(" · ")}</bdi></small></span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {errors.customer && <p className="field-error" role="alert">{errors.customer}</p>}
        </div>
      ) : (
        <div className={styles.grid}>
          {field("first_name", t("First name", "الاسم الأول"), "text", errors.first_name)}
          {field("last_name", t("Last name", "اسم العائلة"), "text", errors.last_name)}
          {field("email", t("Email", "البريد الإلكتروني"), "email")}
          {field("phone", t("Phone", "الهاتف"), "tel")}
          {errors.contact && <p className={`field-error ${styles.span}`} role="alert">{errors.contact}</p>}
        </div>
      )}
    </fieldset>
  );
}
