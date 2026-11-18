import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { ApiError } from "@/lib/api/client";
import { useLocale } from "@/features/localization/locale-provider";
import { SiteFooter } from "@/features/home/components/site-footer";
import { apiAuthEnabled } from "../auth-config";
import { resendActivationCode, verifyActivationCode } from "../b2b-auth-api";
import { PublicLandingHeader } from "../public-landing-header";
import { CodeDigits, type CodeDigitsHandle } from "./code-digits";
import landing from "../public-landing-page.module.css";
import otp from "./login-otp-page.module.css";
import styles from "./account-activation-page.module.css";

const CODE_LENGTH = 6;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** The page's own pause after a successful resend request. It is never presented as the server's limit. */
export const RESEND_COOLDOWN_SECONDS = 60;
/** How long the success message stays before the page moves on to sign-in. */
export const REDIRECT_DELAY_SECONDS = 5;
/** Only these query parameters belong in an activation link. Anything else (a code, a token) is dropped. */
const LINK_PARAMS = ["email", "company_id"] as const;

type Field = "email" | "companyId" | "code";
type Errors = Partial<Record<Field, string>>;
type Notice = { tone: "error" | "info"; text: string } | null;

/**
 * /activate-account: the one-time email check a company owner completes after admin approval, before
 * their first sign-in. It verifies the emailed code with POST /api/v1/b2b/auth/verify-otp and can ask
 * for a new code. It never issues a token, starts a session or signs anyone in: after success it sends
 * the user to /login. Separate from the sign-in code step (/login/verify-otp) and password recovery
 * (/verify-otp). Real sign-in builds only.
 */
export function AccountActivationPage() {
  if (!apiAuthEnabled) return <Navigate to="/login" replace />;
  return <AccountActivationScreen />;
}

function AccountActivationScreen() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [email, setEmail] = useState(() => params.get("email")?.trim() ?? "");
  const [companyId, setCompanyId] = useState(() => params.get("company_id")?.trim() ?? "");
  const [code, setCode] = useState("");
  // Prefilled values from the link are checked straight away so a broken link is explained, not sent.
  const [errors, setErrors] = useState<Errors>(() => checkDetails(email, companyId, { onlyFilled: true }));
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<"verify" | "resend" | null>(null);
  const [resendUntil, setResendUntil] = useState(0);
  const [verifyUntil, setVerifyUntil] = useState(0);
  const [activatedAt, setActivatedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  // Refs, not state: a second click in the same frame can never send a second request.
  const pending = useRef(false);
  const codeRef = useRef<CodeDigitsHandle>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  const resendWait = Math.max(0, Math.ceil((resendUntil - now) / 1000));
  const verifyWait = Math.max(0, Math.ceil((verifyUntil - now) / 1000));
  const redirectIn = activatedAt ? Math.max(0, REDIRECT_DELAY_SECONDS - Math.floor((now - activatedAt) / 1000)) : 0;
  const ticking = resendWait > 0 || verifyWait > 0 || activatedAt > 0;

  // A code, token or password must never sit in the address bar: keep only the link's email and Company ID.
  useEffect(() => {
    if ([...params.keys()].every((key) => (LINK_PARAMS as readonly string[]).includes(key))) return;
    const kept = new URLSearchParams();
    for (const key of LINK_PARAMS) { const value = params.get(key); if (value) kept.set(key, value); }
    setParams(kept, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    if (!ticking) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ticking]);

  useEffect(() => {
    if (activatedAt && redirectIn === 0) navigate("/login", { replace: true });
  }, [activatedAt, redirectIn, navigate]);

  useEffect(() => { if (activatedAt) successRef.current?.focus(); }, [activatedAt]);

  // After a rejected code, return focus to the boxes once they are enabled again.
  useEffect(() => {
    if (errors.code && !busy) codeRef.current?.focus();
  }, [errors.code, busy]);

  // Focus the first thing the user still has to do.
  useEffect(() => {
    if (!email || errors.email) emailRef.current?.focus();
    else if (!companyId || errors.companyId) companyRef.current?.focus();
    else codeRef.current?.focus();
    // Once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function checkDetails(emailValue: string, companyValue: string, { onlyFilled = false } = {}): Errors {
    const next: Errors = {};
    if ((emailValue || !onlyFilled) && !EMAIL.test(emailValue)) next.email = t("Enter a valid email.", "أدخل بريدًا إلكترونيًا صحيحًا.");
    if ((companyValue || !onlyFilled) && !UUID.test(companyValue)) next.companyId = t("Enter the company ID from your approval email.", "أدخل معرّف الشركة الوارد في رسالة الموافقة.");
    return next;
  }

  function details() {
    const value = { email: email.trim(), companyId: companyId.trim().toLowerCase() };
    return { value, errors: checkDetails(value.email, value.companyId) };
  }

  /**
   * When a 429 says how long to wait. Only a Retry-After the browser can read (the API must expose it
   * through CORS) gives a countdown; otherwise the wait is unknown and none is invented (0).
   */
  function waitFor(failure: ApiError) {
    return failure.retryAfterSeconds ? Date.now() + failure.retryAfterSeconds * 1000 : 0;
  }

  /** One message per failure. The server's own wording is never shown. */
  function describe(failure: unknown, action: "verify" | "resend"): { errors?: Errors; notice: Notice } {
    const service = (text: [string, string]) => ({ notice: { tone: "error" as const, text: t(...text) } });
    if (!(failure instanceof ApiError)) return service(["Something went wrong. Please try again.", "حدث خطأ ما. يرجى المحاولة مرة أخرى."]);
    if (failure.kind === "validation") {
      const fields = failure.fieldErrors;
      const found: Errors = {};
      if (fields.email) found.email = t("Check the email address.", "تحقق من البريد الإلكتروني.");
      if (fields.company_id) found.companyId = t("Check the Company ID.", "تحقق من معرّف الشركة.");
      if (action === "verify" && (fields.otp || !(fields.email || fields.company_id))) {
        found.code = t("That code is incorrect or has expired. Check the latest email or request a new code.", "هذا الرمز غير صحيح أو انتهت صلاحيته. تحقق من أحدث رسالة أو اطلب رمزًا جديدًا.");
      }
      if (Object.keys(found).length) return { errors: found, notice: null };
      return service(["Check the email and Company ID, then try again.", "تحقق من البريد الإلكتروني ومعرّف الشركة، ثم حاول مرة أخرى."]);
    }
    if (failure.kind === "rate_limited") {
      // With a known wait the countdown below says how long; without one, the message says it is unknown.
      const known = !!failure.retryAfterSeconds;
      if (action === "verify") {
        return service(known
          ? ["Too many attempts. Please wait before trying again.", "محاولات كثيرة. يرجى الانتظار قبل المحاولة مرة أخرى."]
          : ["Too many attempts. Please wait a few minutes before trying again.", "محاولات كثيرة. يرجى الانتظار بضع دقائق قبل المحاولة مرة أخرى."]);
      }
      return service(known
        ? ["Too many code requests. Please wait before asking for another code.", "طلبات رموز كثيرة. يرجى الانتظار قبل طلب رمز آخر."]
        : ["Too many code requests. Please wait a few minutes before asking for another code.", "طلبات رموز كثيرة. يرجى الانتظار بضع دقائق قبل طلب رمز آخر."]);
    }
    if (failure.kind === "network" || failure.kind === "timeout") return service(["We couldn't reach the activation service. Check your connection and try again.", "تعذر الوصول إلى خدمة التفعيل. تحقق من اتصالك وحاول مرة أخرى."]);
    if (failure.kind === "unavailable" || (failure.status ?? 0) >= 500) return service(["Account activation isn't available right now. Please try again later.", "تفعيل الحساب غير متاح حاليًا. يرجى المحاولة لاحقًا."]);
    if (failure.kind === "invalid_response" || failure.kind === "configuration") return service(["The activation service returned an unexpected response. Please try again later.", "أعادت خدمة التفعيل استجابة غير متوقعة. يرجى المحاولة لاحقًا."]);
    // 400, 401, 403, 404, 409, 410 and the like: the details don't match an account waiting for activation.
    return service(action === "verify"
      ? ["We couldn't activate an account with these details. Check the email, Company ID and code, or request a new code. If your account is already active, sign in instead.", "تعذر تفعيل حساب بهذه البيانات. تحقق من البريد الإلكتروني ومعرّف الشركة والرمز، أو اطلب رمزًا جديدًا. إذا كان حسابك مفعّلًا بالفعل، فسجّل الدخول."]
      : ["We couldn't request a new code for these details. Check the email and Company ID. If your account is already active, sign in instead.", "تعذر طلب رمز جديد لهذه البيانات. تحقق من البريد الإلكتروني ومعرّف الشركة. إذا كان حسابك مفعّلًا بالفعل، فسجّل الدخول."]);
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || verifyWait > 0) return;
    const { value, errors: found } = details();
    if (!new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code)) found.code = t("Enter all 6 digits of the code.", "أدخل الأرقام الستة للرمز.");
    setErrors(found);
    setNotice(null);
    if (found.email) return emailRef.current?.focus();
    if (found.companyId) return companyRef.current?.focus();
    if (found.code) return codeRef.current?.focus();
    pending.current = true;
    setBusy("verify");
    try {
      await verifyActivationCode({ ...value, code });
      setNow(Date.now());
      setActivatedAt(Date.now());
    } catch (failure) {
      const result = describe(failure, "verify");
      setErrors(result.errors ?? {});
      setNotice(result.notice);
      if (failure instanceof ApiError && failure.kind === "rate_limited") { setVerifyUntil(waitFor(failure)); setNow(Date.now()); }
      if (result.errors?.code) setCode("");
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }

  async function resend() {
    if (pending.current || resendWait > 0) return;
    const { value, errors: found } = details();
    setErrors(found);
    setNotice(null);
    if (found.email) return emailRef.current?.focus();
    if (found.companyId) return companyRef.current?.focus();
    pending.current = true;
    setBusy("resend");
    try {
      await resendActivationCode(value);
      setCode("");
      setNotice({ tone: "info", text: t("If these details match an account waiting for activation, a new code will be sent to that email. It can take a few minutes to arrive; check your spam folder too.", "إذا كانت هذه البيانات مطابقة لحساب بانتظار التفعيل، فسيُرسل رمز جديد إلى هذا البريد. قد يستغرق وصوله بضع دقائق؛ تحقق من مجلد الرسائل غير المرغوب فيها أيضًا.") });
      setResendUntil(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
      setNow(Date.now());
    } catch (failure) {
      const result = describe(failure, "resend");
      setErrors(result.errors ?? {});
      setNotice(result.notice);
      if (failure instanceof ApiError && failure.kind === "rate_limited") { setResendUntil(waitFor(failure)); setNow(Date.now()); }
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }

  const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const clear = (field: Field) => { if (errors[field]) setErrors((previous) => ({ ...previous, [field]: undefined })); };

  return (
    <div className={landing.page} lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} data-route-entrance="none">
      <PublicLandingHeader />
      <main>
        <section className={`${landing.hero} ${otp.hero}`} aria-labelledby="activate-title">
          <section className={`${landing.loginCard} ${otp.card}`} id="activate">
            {activatedAt ? (
              <div className={styles.success} data-activation-state="active">
                <span className={`${otp.badge} ${styles.successBadge}`} aria-hidden="true"><Icon name="check" /></span>
                <p className={landing.cardEyebrow}>{t("AGENCY WORKSPACE", "مساحة الوكالات")}</p>
                <h1 id="activate-title" ref={successRef} tabIndex={-1}>{t("Your account is active", "تم تفعيل حسابك")}</h1>
                <p role="status" className={otp.lede}>
                  {t("Your email is verified and your company account is active. Sign in with your email and password.", "تم تأكيد بريدك الإلكتروني وتفعيل حساب شركتك. سجّل الدخول باستخدام بريدك الإلكتروني وكلمة المرور.")}
                </p>
                <p className={styles.redirect} aria-live="off">
                  {t("Taking you to Sign In in", "سيتم نقلك إلى تسجيل الدخول خلال")} <bdi className={otp.time}>{redirectIn}</bdi>{t("s", " ث")}
                </p>
                <Link className={`button button--primary ${otp.action}`} to="/login" replace>{t("Go to Sign In", "الانتقال إلى تسجيل الدخول")}</Link>
              </div>
            ) : (
              <>
                <span className={otp.badge} aria-hidden="true"><Icon name="shield" /></span>
                <p className={landing.cardEyebrow}>{t("AGENCY WORKSPACE", "مساحة الوكالات")}</p>
                <h1 id="activate-title">{t("Activate your account", "تفعيل حسابك")}</h1>
                <form className={`${otp.form} ${styles.form}`} noValidate onSubmit={verify} aria-busy={busy !== null} data-activation-state="pending">
                  <p className={otp.lede}>
                    {t("Your company has been approved. Enter the 6-digit code we emailed you to verify your email. You only need to do this once.", "تمت الموافقة على شركتك. أدخل الرمز المكوّن من 6 أرقام الذي أرسلناه إلى بريدك الإلكتروني لتأكيده. تحتاج إلى ذلك مرة واحدة فقط.")}
                  </p>
                  <FormField id="activate-email" label={t("Email", "البريد الإلكتروني")} error={errors.email}>
                    <Input id="activate-email" name="email" ref={emailRef} type="email" autoComplete="email" dir="ltr" spellCheck={false} value={email} disabled={busy !== null}
                      placeholder={t("Enter your email", "أدخل بريدك الإلكتروني")} required aria-invalid={!!errors.email} aria-describedby={errors.email ? "activate-email-error" : undefined}
                      onChange={(event) => { setEmail(event.target.value); clear("email"); }} />
                  </FormField>
                  <FormField id="activate-company" label={t("Company ID", "معرّف الشركة")} error={errors.companyId}>
                    <Input id="activate-company" name="company_id" ref={companyRef} autoComplete="off" dir="ltr" spellCheck={false} value={companyId} disabled={busy !== null}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required aria-invalid={!!errors.companyId}
                      aria-describedby={["activate-company-help", errors.companyId ? "activate-company-error" : ""].filter(Boolean).join(" ")}
                      onChange={(event) => { setCompanyId(event.target.value); clear("companyId"); }} />
                    <p id="activate-company-help" className={`fine-print ${styles.help}`}>{t("The company ID from your registration or approval email.", "معرّف الشركة الوارد في رسالة التسجيل أو الموافقة.")}</p>
                  </FormField>

                  <div className={otp.codeField}>
                    <label className={otp.label} htmlFor="activate-code">{t("Verification Code", "رمز التحقق")}</label>
                    <CodeDigits
                      ref={codeRef}
                      id="activate-code"
                      length={CODE_LENGTH}
                      value={code}
                      onChange={(next) => { setCode(next); clear("code"); }}
                      invalid={!!errors.code}
                      disabled={busy !== null}
                      describedBy={errors.code ? "activate-code-error" : undefined}
                    />
                    {errors.code && <p id="activate-code-error" className="field-error" role="alert">{errors.code}</p>}
                  </div>

                  <Button type="submit" className={otp.action} disabled={busy !== null || verifyWait > 0} aria-describedby={verifyWait > 0 ? "activate-verify-wait" : undefined}>
                    {busy === "verify" ? t("Verifying…", "جارٍ التحقق…") : t("Verify and activate", "تأكيد وتفعيل الحساب")}
                  </Button>
                  {verifyWait > 0 && (
                    <p id="activate-verify-wait" className={styles.wait} data-activation-wait="verify">
                      {t("You can try again in", "يمكنك المحاولة مرة أخرى بعد")} <bdi dir="ltr" className={otp.time}>{clock(verifyWait)}</bdi>
                    </p>
                  )}

                  <div className={styles.resend}>
                    <span>{t("Didn't get a code?", "لم يصلك الرمز؟")}</span>
                    <button type="button" className="text-button" onClick={() => void resend()} disabled={busy !== null || resendWait > 0} aria-describedby={resendWait > 0 ? "activate-resend-wait" : undefined}>
                      {busy === "resend" ? t("Requesting…", "جارٍ الطلب…") : t("Send a new code", "إرسال رمز جديد")}
                    </button>
                    {resendWait > 0 && (
                      <span id="activate-resend-wait" className={styles.wait} data-activation-wait="resend">
                        {t("Available again in", "متاح مرة أخرى بعد")} <bdi dir="ltr" className={otp.time}>{clock(resendWait)}</bdi>
                      </span>
                    )}
                  </div>

                  <div role={notice?.tone === "info" ? "status" : "alert"}>
                    {notice && <p className={notice.tone === "info" ? styles.info : "availability-notice"} data-activation-notice={notice.tone}>{notice.text}</p>}
                  </div>
                </form>
                <Link className={`text-button ${otp.back}`} to="/login">
                  <Icon name="back" />{t("Already active? Sign In", "حسابك مفعّل؟ سجّل الدخول")}
                </Link>
              </>
            )}
          </section>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
