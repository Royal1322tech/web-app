import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import { b2bAuthApi } from "../api/b2b-auth";

export function LoginForm() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const username = values.get("username")?.toString().trim() ?? "";
    const password = values.get("password")?.toString() ?? "";
    const errors: typeof fieldErrors = {};
    if (!usernameRef.current?.validity.valid) errors.username = t("Enter a valid email.", "أدخل بريدًا إلكترونيًا صحيحًا.");
    if (!password) errors.password = t("Enter your password.", "أدخل كلمة المرور.");
    setFieldErrors(errors);
    setNotice("");
    if (errors.username) {
      usernameRef.current?.focus();
      return;
    }
    if (errors.password) {
      passwordRef.current?.focus();
      return;
    }
    const companyId = searchParams.get("company_id") ?? "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)) {
      setNotice(t("A valid company login link is required.", "يلزم استخدام رابط تسجيل دخول صحيح خاص بالشركة."));
      return;
    }
    setSubmitting(true);
    try {
      const result = await b2bAuthApi.login(username, password, companyId);
      sessionStorage.setItem("royal.b2b.login.challenge", result.challenge_id);
      navigate("/login/verify-otp");
    } catch {
      setNotice(t("Sign in failed. Please check your details and try again.", "تعذر تسجيل الدخول. تحقق من بياناتك وحاول مرة أخرى."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="login-form"
      noValidate
      onSubmit={submit}
    >
      <FormField
        id="username"
        label={t("Email", "البريد الإلكتروني")}
        error={fieldErrors.username}
      >
        <Input
          id="username"
          name="username"
          ref={usernameRef}
          autoComplete="username"
          placeholder={t("Enter your email", "أدخل بريدك الإلكتروني")}
          type="email"
          required
          aria-invalid={!!fieldErrors.username}
          aria-describedby={fieldErrors.username ? "username-error" : undefined}
        />
      </FormField>
      <FormField
        id="password"
        label={t("Password", "كلمة المرور")}
        error={fieldErrors.password}
      >
        <Input
          id="password"
          name="password"
          ref={passwordRef}
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder={t("Enter your password", "أدخل كلمة المرور")}
          required
          aria-invalid={!!fieldErrors.password}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
          endAdornment={
            <button
              type="button"
              className="password-toggle"
              aria-label={showPassword ? t("Hide password", "إخفاء كلمة المرور") : t("Show password", "إظهار كلمة المرور")}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              <Icon name={showPassword ? "eyeOff" : "eye"} />
            </button>
          }
        />
      </FormField>
      <Link to="/forgot-password" className="text-button login-form__forgot">
        {t("Forgot My Password?", "هل نسيت كلمة المرور؟")}
      </Link>
      <Button type="submit" disabled={submitting}>
        {t("Sign In", "تسجيل الدخول")}
      </Button>
      <div className="login-form__registration">
        <span>{t("Don't have an account?", "ليس لديك حساب؟")}</span>
        <Link to="/register/agency" className="text-button">{t("Register with us", "سجل معنا")}</Link>
      </div>
      <div role="status" aria-live="polite">
        {notice && <p className="availability-notice">{notice}</p>}
      </div>
    </form>
  );
}
