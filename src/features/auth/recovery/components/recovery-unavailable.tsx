import { Link } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { RecoveryShell } from "./recovery-shell";

/**
 * Real sign-in builds have no password recovery API yet, so these routes say so instead of
 * running the recovery demo. The demo recovery screens (including its 4-digit code) are not the
 * login code and are never used for real sign-in.
 */
export function RecoveryUnavailable() {
  const { t } = useLocale();
  return (
    <RecoveryShell title="Forgot Your Password?" backHref="/login" backLabel="Back to sign in">
      <div className="availability-notice" role="status">
        <p>{t("Password recovery isn't available online yet. Please contact Royal Vacation to reset your password.", "استعادة كلمة المرور غير متاحة عبر الإنترنت بعد. يرجى التواصل مع رويال فاكيشن لإعادة تعيين كلمة المرور.")}</p>
      </div>
      <Link className="button button--outline" to="/contact">{t("Contact Royal Vacation", "تواصل مع رويال فاكيشن")}</Link>
    </RecoveryShell>
  );
}
