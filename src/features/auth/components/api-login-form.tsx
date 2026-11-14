import { Link, useLocation, useNavigate } from "react-router-dom";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { ApiError } from "@/lib/api/client";
import { useLocale } from "@/features/localization/locale-provider";
import { authConfig } from "../auth-config";
import { requestLoginCode } from "../b2b-auth-api";
import { useB2BSession } from "../b2b-session";
import { loginChallenge } from "../login-challenge";
import { ApiStatusNotice } from "./api-status-notice";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


type Errors = { email?: string; password?: string; companyId?: string };

/**
 * Sign-in against the Laravel B2B API, step 1: credentials. A valid login returns an OTP challenge
 * (no session yet); the emailed code is entered on /login/verify-otp.
 */
export function ApiLoginForm() {
  const { t } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const session = useB2BSession();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const blocked = !authConfig.companyIdEntry;

  const navigationNotice = (location.state as { notice?: string } | null)?.notice;
  const endReason = session.status === "signed-out" ? session.reason : undefined;
  const statusNotice =
    navigationNotice === "logout-unconfirmed" ? t("You're signed out on this device, but the server couldn't confirm it. If this is a shared computer, close the browser.", "تم تسجيل خروجك على هذا الجهاز، لكن الخادم لم يؤكد ذلك. إذا كان هذا جهازًا مشتركًا فأغلق المتصفح.")
      : endReason === "expired" || navigationNotice === "expired" ? t("Your session has ended. Please sign in again.", "انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.")
      : endReason === "access-revoked" ? t("Your company access is no longer active.", "لم يعد وصول شركتك نشطًا.")
      : endReason === "company-mismatch" ? t("We couldn't confirm your company access. Please sign in again.", "تعذر تأكيد وصول شركتك. يرجى تسجيل الدخول مرة أخرى.")
      : "";

  function describe(error: unknown): { notice?: string; errors?: Errors } {
    if (!(error instanceof ApiError)) return { notice: t("Something went wrong. Please try again.", "حدث خطأ ما. يرجى المحاولة مرة أخرى.") };
    if (error.kind === "validation") {
      const fields = error.fieldErrors;
      if (fields.company_id) return { errors: { companyId: t("Check the company ID.", "تحقق من معرّف الشركة.") } };
      const message = fields.email?.[0] ?? "";
      // "Company is not approved or account is inactive." The backend sends this after the password
      // check when the user has no active, approved membership in the submitted company. That
      // includes a Company ID the user doesn't belong to, so the Company ID is named first.
      if (/not approved|inactive/i.test(message)) return { notice: t("We couldn't sign you in to this company. Check the Company ID from your registration. If it's correct, the company or your access to it isn't active yet.", "تعذر تسجيل دخولك إلى هذه الشركة. تحقق من معرّف الشركة من تسجيلك. إذا كان صحيحًا، فإن الشركة أو صلاحية وصولك إليها غير مفعّلة بعد.") };
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
    // UUIDs are case-insensitive; the canonical lower-case form is sent.
    const companyId = values.get("companyId")?.toString().trim().toLowerCase() ?? "";
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
      // The expiry comes from the API's expires_in and is stored as an absolute time, so the
      // countdown survives a refresh. The password is not kept anywhere.
      loginChallenge.save({ challengeId: issued.challengeId, email, expiresAt: Date.now() + issued.expiresInSeconds * 1000 });
      // Navigation state carries only where to go after sign-in, exactly as /login received it.
      navigate("/login/verify-otp", { state: location.state });
    } catch (error) {
      const result = describe(error);
      setErrors(result.errors ?? {});
      setNotice(result.notice ?? "");
      if (result.errors?.companyId) companyRef.current?.focus();
    } finally {
      setBusy(false);
    }
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
