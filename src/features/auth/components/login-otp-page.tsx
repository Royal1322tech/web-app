import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ApiError } from "@/lib/api/client";
import { useLocale } from "@/features/localization/locale-provider";
import { SiteFooter } from "@/features/home/components/site-footer";
import { apiAuthEnabled } from "../auth-config";
import { verifyLoginCode } from "../b2b-auth-api";
import { b2bSession, useB2BSession } from "../b2b-session";
import { loginChallenge, type PendingLoginChallenge } from "../login-challenge";
import { PublicLandingHeader } from "../public-landing-header";
import { CodeDigits, type CodeDigitsHandle } from "./code-digits";
import landing from "../public-landing-page.module.css";
import styles from "./login-otp-page.module.css";

const CODE_LENGTH = 6;

/**
 * /login/verify-otp: step 2 of real sign-in. Verifies the emailed code for the challenge that /login
 * received, with POST /api/v1/b2b/auth/verify-otp, then hands the issued token to the existing B2B
 * session. Real sign-in builds only; it never runs in demo mode and has nothing to do with the
 * password-recovery screens.
 */
export function LoginOtpPage() {
  if (!apiAuthEnabled) return <Navigate to="/login" replace />;
  return <LoginOtpScreen />;
}

function LoginOtpScreen() {
  const { t, locale } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const session = useB2BSession();
  const [challenge] = useState<PendingLoginChallenge | null>(() => loginChallenge.read());
  const [now, setNow] = useState(() => Date.now());
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  // A ref, not state: a second click in the same frame can never send a second verification.
  const pending = useRef(false);
  const codeRef = useRef<CodeDigitsHandle>(null);

  const remaining = challenge ? Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000)) : 0;
  const expired = !!challenge && remaining === 0;

  // The countdown is derived from the stored absolute expiry, so re-renders and refreshes never restart it.
  useEffect(() => {
    if (!challenge || expired) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [challenge, expired]);

  useEffect(() => {
    if (challenge && !expired) codeRef.current?.focus();
    // Focus once, when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After a rejected or incomplete code, return focus to the boxes once they are enabled again.
  useEffect(() => {
    if (error && !busy) codeRef.current?.focus();
  }, [error, busy]);

  function backToSignIn() {
    loginChallenge.clear();
    navigate("/login", { replace: true, state: location.state });
  }

  function describe(failure: unknown): { error?: string; notice?: string } {
    if (!(failure instanceof ApiError)) return { notice: t("Something went wrong. Please try again.", "حدث خطأ ما. يرجى المحاولة مرة أخرى.") };
    if (failure.kind === "validation") return { error: t("That code is incorrect or has expired. Check the latest email and try again.", "هذا الرمز غير صحيح أو انتهت صلاحيته. تحقق من أحدث رسالة وحاول مرة أخرى.") };
    if (failure.kind === "rate_limited") return { notice: t("Too many attempts. Wait a minute, then try again.", "محاولات كثيرة. انتظر دقيقة ثم حاول مرة أخرى.") };
    if (failure.kind === "forbidden") return { notice: t("Your company access is no longer active.", "لم يعد وصول شركتك نشطًا.") };
    if (failure.kind === "network" || failure.kind === "timeout") return { notice: t("We couldn't reach the sign-in service. Check your connection and try again.", "تعذر الوصول إلى خدمة تسجيل الدخول. تحقق من اتصالك وحاول مرة أخرى.") };
    return { notice: t("The sign-in service returned an unexpected response. Please try again later.", "أعادت خدمة تسجيل الدخول استجابة غير متوقعة. يرجى المحاولة لاحقًا.") };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge || pending.current) return;
    if (challenge.expiresAt <= Date.now()) {
      setNow(Date.now());
      return;
    }
    if (!new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code)) {
      setError(t("Enter all 6 digits of the code.", "أدخل الأرقام الستة للرمز."));
      return;
    }
    setError("");
    setNotice("");
    pending.current = true;
    setBusy(true);
    try {
      const issued = await verifyLoginCode({ challengeId: challenge.challengeId, code });
      // The challenge is used up whatever happens next.
      loginChallenge.clear();
      const result = await b2bSession.establish(issued);
      // "active": the session gate sends the user on from this route. "signed-out": the profile
      // belonged to another company, and /login explains why.
      if (result.status === "signed-out") navigate("/login", { replace: true, state: location.state });
      else if (result.status === "unavailable") setNotice(t("You're signed in, but we couldn't load your account. Try again.", "تم تسجيل دخولك، لكن تعذر تحميل حسابك. حاول مرة أخرى."));
    } catch (failure) {
      const result = describe(failure);
      setError(result.error ?? "");
      setNotice(result.notice ?? "");
      if (result.error) setCode("");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, "0");
  // The code was accepted and a token issued, but the profile could not be loaded yet.
  const signedInButUnavailable = session.status === "unavailable";

  return (
    <div className={landing.page} lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} data-route-entrance="none">
      <PublicLandingHeader />
      <main>
        <section className={`${landing.hero} ${styles.hero}`} aria-labelledby="verify-title">
          <section className={`${landing.loginCard} ${styles.card}`} id="verify">
            <span className={styles.badge} aria-hidden="true"><Icon name="shield" /></span>
            <p className={landing.cardEyebrow}>{t("AGENCY WORKSPACE", "مساحة الوكالات")}</p>
            <h1 id="verify-title">{t("Email Verification", "تأكيد البريد الإلكتروني")}</h1>

            {!challenge ? (
              <div className={styles.state}>
                <p role="status">{t("There's no sign-in waiting for a code on this device, or it has ended. Sign in again to get a new code.", "لا يوجد تسجيل دخول بانتظار رمز على هذا الجهاز، أو انتهت صلاحيته. سجّل الدخول مرة أخرى للحصول على رمز جديد.")}</p>
                <Link className={`button button--primary ${styles.action}`} to="/login" replace state={location.state}>
                  {t("Back to Sign In", "العودة لتسجيل الدخول")}
                </Link>
              </div>
            ) : (
              <form className={styles.form} noValidate onSubmit={submit} aria-busy={busy}>
                <p className={styles.lede}>{t("Enter the verification code sent to your email.", "أدخل رمز التحقق المرسل إلى بريدك الإلكتروني.")}</p>
                <p className={styles.email}>
                  <Icon name="mail" />
                  <bdi dir="ltr">{challenge.email}</bdi>
                </p>

                <div className={styles.codeField}>
                  <label className={styles.label} htmlFor="login-code">{t("Verification Code", "رمز التحقق")}</label>
                  <CodeDigits
                    ref={codeRef}
                    id="login-code"
                    length={CODE_LENGTH}
                    value={code}
                    onChange={(next) => { setCode(next); if (error) setError(""); }}
                    invalid={!!error}
                    disabled={expired || busy}
                    describedBy={["login-code-expiry", error ? "login-code-error" : ""].filter(Boolean).join(" ")}
                  />
                  {error && <p id="login-code-error" className="field-error" role="alert">{error}</p>}
                </div>

                <p id="login-code-expiry" className={`${styles.expiry} ${expired ? styles.expired : ""}`} aria-live="polite">
                  <Icon name="clock" />
                  {expired
                    ? <span>{t("This code has expired. Go back to sign in to get a new code.", "انتهت صلاحية هذا الرمز. ارجع لتسجيل الدخول للحصول على رمز جديد.")}</span>
                    : <span>{t("Code expires in", "تنتهي صلاحية الرمز خلال")} <bdi className={styles.time}>{minutes}:{seconds}</bdi></span>}
                </p>

                <Button type="submit" className={styles.action} disabled={busy || expired}>
                  {busy ? t("Verifying…", "جارٍ التحقق…") : t("Verify", "تأكيد")}
                </Button>
                {signedInButUnavailable && (
                  <Button type="button" variant="outline" className={styles.action} onClick={() => void b2bSession.retry()}>
                    {t("Try loading your account again", "حاول تحميل حسابك مرة أخرى")}
                  </Button>
                )}
                <div role="alert">{notice && <p className="availability-notice">{notice}</p>}</div>
              </form>
            )}

            {challenge && (
              <button type="button" className={`text-button ${styles.back}`} onClick={backToSignIn}>
                <Icon name="back" />{t("Back to Sign In", "العودة لتسجيل الدخول")}
              </button>
            )}
          </section>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
