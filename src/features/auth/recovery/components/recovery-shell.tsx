import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { apiAuthEnabled } from "@/features/auth/auth-config";
import { AuthShell } from "@/components/layout/auth-shell";
import { BrandLogo } from "@/components/brand-logo";
import { useRecoveryText } from "../messages";
import styles from "../recovery.module.css";
export function RecoveryShell({
  title,
  backHref,
  backLabel,
  children,
}: {
  title: string;
  backHref: string;
  backLabel: string;
  children: ReactNode;
}) {
  const { text, locale, setLocale } = useRecoveryText();
  return (
    <AuthShell
      variant="login"
      language={locale}
      backHref={backHref}
      backLabel={text(backLabel)}
    >
      <div className={`login-content ${styles.content}`}>
        <div className={styles.brandRow}>
          <BrandLogo />
          <label>
            <span className="sr-only">
              {locale === "en" ? "Language" : "اللغة"}
            </span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value === "ar" ? "ar" : "en")}
            >
              <option value="en">EN</option>
              <option value="ar">AR</option>
            </select>
          </label>
        </div>
        <h1>{text(title)}</h1>
        {/* Real sign-in builds: there is no password recovery API yet, so the original screens are a preview. */}
        {apiAuthEnabled && (
          <div className={`availability-notice ${styles.preview}`} role="note">
            <p>{text("Online password reset isn't available yet. Contact Royal Vacation to reset your password.")}</p>
            <Link to="/contact">{text("Contact Royal Vacation to reset your password")}</Link>
          </div>
        )}
        {children}
      </div>
    </AuthShell>
  );
}
