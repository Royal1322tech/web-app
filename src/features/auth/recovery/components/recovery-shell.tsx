import { LanguageSelector } from "@/features/localization/language-selector";
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
  const { text, locale } = useRecoveryText();
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
          {/* The same language switcher as sign-in and registration. */}
          <LanguageSelector />
        </div>
        <h1>{text(title)}</h1>
        {/* Real sign-in builds: there is no password recovery API yet, so the forms are hidden (not
            shown as if they worked) and the support route is offered instead. The routes stay. */}
        {apiAuthEnabled ? (
          <div className={`availability-notice ${styles.preview}`} role="note" data-recovery-unavailable>
            <p>{text("Online password reset isn't available yet. Contact Royal Vacation to reset your password.")}</p>
            <Link to="/contact">{text("Contact Royal Vacation to reset your password")}</Link>
            <Link to="/login">{text("Back to sign in")}</Link>
          </div>
        ) : children}
      </div>
    </AuthShell>
  );
}
