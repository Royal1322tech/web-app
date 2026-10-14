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
