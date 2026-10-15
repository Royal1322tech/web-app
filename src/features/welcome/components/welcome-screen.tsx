import { Link, useLocation } from "react-router-dom";
import { BrandLogo } from "@/components/brand-logo";
import { AuthShell } from "@/components/layout/auth-shell";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import "../welcome.css";

export function WelcomeScreen() {
  const { locale, t, setLocale } = useLocale();
  const location = useLocation();
  return (
    <AuthShell variant="welcome" language={locale}>
      <div className="welcome-content">
        <svg className="welcome-flight" viewBox="0 0 160 32" aria-hidden="true" focusable="false">
          <path className="welcome-flight-path" d="M8 24 C45 24 60 4 92 8 S130 28 150 8" />
          <g className="welcome-flight-plane"><path transform="scale(.5) rotate(45) translate(-91 -28)" d="m85 28-14-9 5-3 17 6 13-9q6-3 6 1l-13 13-1 17-5 3-3-16-9 5-5-3Z" /></g>
        </svg>
        <BrandLogo variant="auth" />
        <button type="button" className="text-button" onClick={() => setLocale(locale === "en" ? "ar" : "en")} aria-label={t("Switch to Arabic", "التبديل إلى الإنجليزية")}>{locale === "en" ? "العربية" : "English"}</button>
        <h1>{t("Welcome!", "مرحبًا!")}</h1>
        <p className="intro-copy">
          {t(
            "Please select your account type to continue",
            "يرجى اختيار نوع حسابك للمتابعة",
          )}
        </p>
        <div className="account-options">
          <section className="account-card">
            <span className="icon-badge">
              <Icon name="building" />
            </span>
            <h2>{t("Existing Partner", "شريك حالي")}</h2>
            <p>
              {t(
                "Sign in with your user name and password",
                "سجّل الدخول باسم المستخدم وكلمة المرور",
              )}
            </p>
            <Link state={location.state} to="/login" className={buttonClass()}>
              {t("Sign In", "تسجيل الدخول")}
            </Link>
          </section>
          <section className="account-card">
            <span className="icon-badge">
              <Icon name="user" />
            </span>
            <h2>{t("New Travel Agency", "وكالة سفر جديدة")}</h2>
            <p>
              {t(
                "Register your company and become a partner",
                "سجّل شركتك وانضم إلينا كشريك",
              )}
            </p>
            <Link to="/register/agency" className={buttonClass("outline")}>
              {t("Register", "تسجيل وكالة")}
            </Link>
          </section>
        </div>
      </div>
    </AuthShell>
  );
}
