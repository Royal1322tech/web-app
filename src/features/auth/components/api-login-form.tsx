import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { ApiError } from "@/lib/api/client";
import { useLocale } from "@/features/localization/locale-provider";
import { authConfig } from "../auth-config";
import { requestLoginCode, verifyLoginCode, type LoginChallenge } from "../b2b-auth-api";
import { b2bSession, useB2BSession } from "../b2b-session";
import { ApiStatusNotice } from "./api-status-notice";
import { CodeDigits, type CodeDigitsHandle } from "./code-digits";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


type Errors = { email?: string; password?: string; companyId?: string; code?: string };

/** Sign-in against the Laravel B2B API: credentials, then the emailed one-time code. */
export function ApiLoginForm() {
  const { t } = useLocale();
  const location = useLocation();
  const session = useB2BSession();
  const [step, setStep] = useState<"credentials" | "code">("credentials");
  const [challenge, setChallenge] = useState<(LoginChallenge & { expiresAt: number; email: string }) | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<CodeDigitsHandle>(null);
  const [code, setCode] = useState("");
  const blocked = !authConfig.companyIdEntry;

  const navigationNotice = (location.state as { notice?: string } | null)?.notice;
  const endReason = session.status === "signed-out" ? session.reason : undefined;
  const statusNotice =
    navigationNotice === "logout-unconfirmed" ? t("You're signed out on this device, but the server couldn't confirm it. If this is a shared computer, close the browser.", "تم تسجيل خروجك على هذا الجهاز، لكن الخادم لم يؤكد ذلك. إذا كان هذا جهازًا مشتركًا فأغلق المتصفح.")
      : endReason === "expired" || navigationNotice === "expired" ? t("Your session has ended. Please sign in again.", "انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.")
      : endReason === "access-revoked" ? t("Your company access is no longer active.", "لم يعد وصول شركتك نشطًا.")
      : endReason === "company-mismatch" ? t("We couldn't confirm your company access. Please sign in again.", "تعذر تأكيد وصول شركتك. يرجى تسجيل الدخول مرة أخرى.")
      : "";

  const remaining = challenge ? Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000)) : 0;
  const expired = step === "code" && remaining === 0;

  useEffect(() => {
    if (step !== "code") return;
    codeRef.current?.focus();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step]);

  function describe(error: unknown, stage: "credentials" | "code"): { notice?: string; errors?: Errors } {
    if (!(error instanceof ApiError)) return { notice: t("Something went wrong. Please try again.", "حدث خطأ ما. يرجى المحاولة مرة أخرى.") };
    if (error.kind === "validation") {
      const fields = error.fieldErrors;
      if (stage === "code") return { errors: { code: t("That code is incorrect or has expired.", "هذا الرمز غير صحيح أو انتهت صلاحيته.") } };
      if (fields.company_id) return { errors: { companyId: t("Check the company ID.", "تحقق من معرّف الشركة.") } };
      const message = fields.email?.[0] ?? "";
      if (/not approved|inactive/i.test(message)) return { notice: t("This company isn't approved yet, or the account is inactive.", "هذه الشركة غير معتمدة بعد، أو أن الحساب غير نشط.") };
      return { notice: t("Incorrect email or password, or the account isn't activated yet.", "البريد الإلكتروني أو كلمة المرور غير صحيحة، أو أن الحساب غير مفعّل بعد.") };
    }
    if (error.kind === "forbidden") return { notice: t("Your company access is no longer active.", "لم يعد وصول شركتك نشطًا.") };
    if (error.kind === "rate_limited") return { notice: t("Too many attempts. Wait a minute, then try again.", "محاولات كثيرة. انتظر دقيقة ثم حاول مرة أخرى.") };
    if (error.kind === "unavailable") return { notice: t("We couldn't send the verification code. Please try again later.", "تعذر إرسال رمز التحقق. يرجى المحاولة لاحقًا.") };
    if (error.kind === "network" || error.kind === "timeout") return { notice: t("We couldn't reach the sign-in service. Check your connection and try again.", "تعذر الوصول إلى خدمة تسجيل الدخول. تحقق من اتصالك وحاول مرة أخرى.") };
    return { notice: t("The sign-in service returned an unexpected response. Please try again later.", "أعادت خدمة تسجيل الدخول استجابة غير متوقعة. يرجى المحاولة لاحقًا.") };
  }

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked || busy) return;
    const values = new FormData(event.currentTarget);
    const email = values.get("username")?.toString().trim() ?? "";
    const password = values.get("password")?.toString() ?? "";
    const companyId = values.get("companyId")?.toString().trim() ?? "";
    const next: Errors = {};
    if (!emailRef.current?.validity.valid) next.email = t("Enter a valid email.", "أدخل بريدًا إلكترونيًا صحيحًا.");
    if (!password) next.password = t("Enter your password.", "أدخل كلمة المرور.");
    if (!UUID.test(companyId)) next.companyId = t("Enter the company ID from your registration.", "أدخل معرّف الشركة من تسجيلك.");
    setErrors(next);
    setNotice("");
    if (next.email) return emailRef.current?.focus();
    if (next.password) return passwordRef.current?.focus();
    if (next.companyId) return companyRef.current?.focus();
    setBusy(true);
    try {
      const issued = await requestLoginCode({ email, password, companyId });
      setChallenge({ ...issued, email, expiresAt: Date.now() + issued.expiresInSeconds * 1000 });
      setCode("");
      setNow(Date.now());
      setStep("code");
    } catch (error) {
      const result = describe(error, "credentials");
      setErrors(result.errors ?? {});
      setNotice(result.notice ?? "");
      if (result.errors?.companyId) companyRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge || busy || expired) return;
    if (!/^\d{6}$/.test(code)) {
      setErrors({ code: t("Enter the 6-digit code.", "أدخل الرمز المكون من 6 أرقام.") });
      return codeRef.current?.focus();
    }
    setErrors({});
    setNotice("");
    setBusy(true);
    try {
      const issued = await verifyLoginCode({ challengeId: challenge.challengeId, code });
      const result = await b2bSession.establish(issued);
      if (result.status === "unavailable") setNotice(t("You're signed in, but we couldn't load your account. Try again.", "تم تسجيل دخولك، لكن تعذر تحميل حسابك. حاول مرة أخرى."));
      else if (result.status === "signed-out") restart();
    } catch (error) {
      const result = describe(error, "code");
      setErrors(result.errors ?? {});
      setNotice(result.notice ?? "");
      if (result.errors?.code) codeRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setStep("credentials");
    setChallenge(null);
    setErrors({});
    setTimeout(() => emailRef.current?.focus());
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, "0");

  if (step === "code" && challenge) {
    return (
      // Separate keys give each step fresh inputs, so a typed password can never carry into the code field.
      <form key="code" className="login-form login-otp" noValidate onSubmit={submitCode} aria-labelledby="login-otp-title">
        <div className="login-otp__intro">
          <h2 id="login-otp-title">{t("Enter your verification code", "أدخل رمز التحقق")}</h2>
          <p>{t("We sent a 6-digit code to", "أرسلنا رمزًا من 6 أرقام إلى")} <bdi>{challenge.email}</bdi>.</p>
        </div>
        <CodeDigits
          ref={codeRef}
          id="login-code"
          value={code}
          onChange={(next) => { setCode(next); if (errors.code) setErrors({}); }}
          invalid={!!errors.code}
          disabled={expired}
          describedBy={["login-code-expiry", errors.code ? "login-code-error" : ""].filter(Boolean).join(" ")}
        />
        {errors.code && <p id="login-code-error" className="field-error" role="alert">{errors.code}</p>}
        <p id="login-code-expiry" className={`login-otp__expiry${expired ? " is-expired" : ""}`}>
          {expired
            ? t("This code has expired. Go back and sign in again to get a new code.", "انتهت صلاحية هذا الرمز. ارجع وسجّل الدخول مرة أخرى للحصول على رمز جديد.")
            : <>{t("Code expires in", "تنتهي صلاحية الرمز خلال")} <bdi>{minutes}:{seconds}</bdi></>}
        </p>
        <Button type="submit" disabled={busy || expired}>
          {busy ? t("Verifying…", "جارٍ التحقق…") : t("Verify and sign in", "تحقق وسجّل الدخول")}
        </Button>
        {session.status === "unavailable" && (
          <Button type="button" variant="outline" disabled={busy} onClick={() => void b2bSession.retry()}>
            {t("Try loading your account again", "حاول تحميل حسابك مرة أخرى")}
          </Button>
        )}
        <button type="button" className="text-button login-otp__back" onClick={restart}>
          <Icon name="back" />{t("Back to sign in", "العودة لتسجيل الدخول")}
        </button>
        <div role="alert">{notice && <p className="availability-notice">{notice}</p>}</div>
      </form>
    );
  }

  return (
    <form key="credentials" className="login-form" noValidate onSubmit={submitCredentials}>
      <ApiStatusNotice service="sign-in" />
      <FormField id="username" label={t("Email", "البريد الإلكتروني")} error={errors.email}>
        <Input id="username" name="username" ref={emailRef} autoComplete="username" placeholder={t("Enter your email", "أدخل بريدك الإلكتروني")} type="email" required aria-invalid={!!errors.email} aria-describedby={errors.email ? "username-error" : undefined} />
      </FormField>
      <FormField id="password" label={t("Password", "كلمة المرور")} error={errors.password}>
        <Input
          id="password"
          name="password"
          ref={passwordRef}
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder={t("Enter your password", "أدخل كلمة المرور")}
          required
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          endAdornment={
            <button type="button" className="password-toggle" aria-label={showPassword ? t("Hide password", "إخفاء كلمة المرور") : t("Show password", "إظهار كلمة المرور")} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
              <Icon name={showPassword ? "eyeOff" : "eye"} />
            </button>
          }
        />
      </FormField>
      {authConfig.companyIdEntry && (
        <FormField id="company-id" label={t("Company ID", "معرّف الشركة")} error={errors.companyId}>
          <Input id="company-id" name="companyId" ref={companyRef} autoComplete="off" spellCheck={false} dir="ltr" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required aria-invalid={!!errors.companyId} aria-describedby={["company-id-help", errors.companyId ? "company-id-error" : ""].filter(Boolean).join(" ")} />
          <p id="company-id-help" className="fine-print login-form__field-help">{t("The company ID from your registration confirmation.", "معرّف الشركة الوارد في تأكيد تسجيلك.")}</p>
        </FormField>
      )}
      <Link to="/forgot-password" className="text-button login-form__forgot">
        {t("Forgot My Password?", "هل نسيت كلمة المرور؟")}
      </Link>
      {blocked && (
        <p id="login-unavailable" className="availability-notice">
          {t("Partner sign-in is being connected. How companies are identified at sign-in hasn't been finalised yet, so sign-in is unavailable for now.", "يجري ربط تسجيل دخول الشركاء. لم يُحدَّد بعد كيفية تعريف الشركات عند تسجيل الدخول، لذا تسجيل الدخول غير متاح حاليًا.")}
        </p>
      )}
      <Button type="submit" disabled={blocked || busy} aria-describedby={blocked ? "login-unavailable" : undefined}>
        {busy ? t("Signing in…", "جارٍ تسجيل الدخول…") : t("Sign In", "تسجيل الدخول")}
      </Button>
      <div className="login-form__registration">
        <span>{t("Don't have an account?", "ليس لديك حساب؟")}</span>
        <Link to="/register/agency" className="text-button">{t("Register with us", "سجل معنا")}</Link>
      </div>
      <p className="fine-print">{t("We'll email you a one-time code to finish signing in.", "سنرسل إليك رمزًا لمرة واحدة عبر البريد الإلكتروني لإكمال تسجيل الدخول.")}</p>
      <div role="status" aria-live="polite">
        {(notice || statusNotice) && <p className="availability-notice">{notice || statusNotice}</p>}
      </div>
    </form>
  );
}
