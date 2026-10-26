import { Link, useLocation } from "react-router-dom";
import { BrandLogo } from "@/components/brand-logo";
import { AuthShell } from "@/components/layout/auth-shell";
import { buttonClass } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { useLocale, type Locale } from "@/features/localization/locale-provider";
import "../welcome.css";

const languages: { value: Locale; label: string; name: string }[] = [
  { value: "en", label: "EN", name: "English" },
  { value: "ar", label: "عربي", name: "العربية" },
];

/** Whole-card link: one keyboard stop per account choice, with the button as a visual cue. */
function AccountCard({
  to,
  state,
  icon,
  title,
  description,
  action,
  variant,
}: {
  to: string;
  state?: unknown;
  icon: IconName;
  title: string;
  description: string;
  action: string;
  variant: "primary" | "outline";
}) {
  const id = `account-${to.replace(/\W+/g, "-")}`;
  return (
    <Link to={to} state={state} className="account-card" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}>
      <span className="icon-badge" aria-hidden="true">
        <Icon name={icon} />
      </span>
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-description`}>{description}</p>
      <span className={`${buttonClass(variant)} account-card__action`} aria-hidden="true">
        {action}
      </span>
    </Link>
  );
}

export function WelcomeScreen() {
  const { locale, t, setLocale } = useLocale();
  const location = useLocation();
  return (
    <AuthShell variant="welcome" language={locale}>
      <div className="welcome-content">
        <div className="welcome-language" role="group" aria-label={t("Language", "اللغة")}>
          {languages.map((language) => (
            <button
              key={language.value}
              type="button"
              lang={language.value}
              aria-label={language.name}
              aria-pressed={locale === language.value}
              onClick={() => setLocale(language.value)}
            >
              {language.label}
            </button>
          ))}
        </div>
        <div className="welcome-flight"><BrandLogo variant="auth" /></div>
        <h1>{t("Welcome to Royal Vacation", "مرحبًا بكم في رويال فاكيشن")}</h1>
        <p className="welcome-subtitle">
          {t("Your gateway to seamless travel partnerships.", "بوابتك إلى شراكات سفر سلسة.")}
        </p>
        <p className="intro-copy">
          {t(
            "Please select your account type to continue",
            "يرجى اختيار نوع حسابك للمتابعة",
          )}
        </p>
        <div className="account-options">
          <AccountCard
            to="/login"
            state={location.state}
            icon="building"
            title={t("Existing Partner", "شريك حالي")}
            description={t(
              "Sign in with your user name and password",
              "سجّل الدخول باسم المستخدم وكلمة المرور",
            )}
            action={t("Sign In", "تسجيل الدخول")}
            variant="primary"
          />
          <AccountCard
            to="/register/agency"
            icon="user"
            title={t("New Travel Agency", "وكالة سفر جديدة")}
            description={t(
              "Register your company and become a partner",
              "سجّل شركتك وانضم إلينا كشريك",
            )}
            action={t("Register", "تسجيل وكالة")}
            variant="outline"
          />
        </div>
        <p className="welcome-trust">
          <Icon name="shield" aria-hidden="true" />
          {t("Built for travel professionals.", "مصممة لمحترفي السفر.")}
        </p>
      </div>
    </AuthShell>
  );
}
