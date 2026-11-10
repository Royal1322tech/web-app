import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { b2bAuthApi } from "@/features/auth/api/b2b-auth";
import { b2bSession } from "@/features/auth/api/b2b-session";
import { useLocale } from "@/features/localization/locale-provider";

export default function LoginVerifyOtpPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const challengeId = sessionStorage.getItem(
      "royal.b2b.login.challenge"
    );

    if (!challengeId) {
      setError(
        t(
          "Your login session has expired. Please sign in again.",
          "انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى."
        )
      );
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError(
        t(
          "Enter the 6-digit verification code.",
          "أدخل رمز التحقق المكوّن من 6 أرقام."
        )
      );
      return;
    }

    setSubmitting(true);

    try {
      const result = await b2bAuthApi.verifyOtp(challengeId, otp);

      sessionStorage.removeItem("royal.b2b.login.challenge");

      b2bSession.setToken(result.access_token);

      navigate("/", { replace: true });
    } catch {
      setError(
        t(
          "Verification failed. Check your code or sign in again.",
          "فشل التحقق. تأكد من الرمز أو سجل الدخول مرة أخرى."
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="registration-page">
      <section className="registration-shell">
        <h1>{t("Verify your login", "تأكيد تسجيل الدخول")}</h1>

        <p>
          {t(
            "Enter the verification code sent to your email.",
            "أدخل رمز التحقق المرسل إلى بريدك الإلكتروني."
          )}
        </p>

        <form onSubmit={submit}>
          <label htmlFor="login-otp">
            {t("Verification code", "رمز التحقق")}
          </label>

          <input
            id="login-otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={otp}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            required
          />

          {error && <p role="alert">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting
              ? t("Verifying...", "جارٍ التحقق...")
              : t("Verify", "تأكيد")}
          </button>
        </form>

        <Link to="/login">
          {t("Back to sign in", "العودة لتسجيل الدخول")}
        </Link>
      </section>
    </main>
  );
}
