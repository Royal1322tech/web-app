import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { b2bSession } from "../b2b-session";

/** Shown when a stored session can't be confirmed because the server can't be reached. */
export function SessionUnavailable() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  return (
    <main className="page-loading">
      <div className="system-state" role="alert">
        <h1>{t("We couldn't confirm your session", "تعذر تأكيد جلستك")}</h1>
        <p>{t("The sign-in service can't be reached right now. Check your connection, then try again.", "لا يمكن الوصول إلى خدمة تسجيل الدخول حاليًا. تحقق من اتصالك ثم حاول مرة أخرى.")}</p>
        <div className="session-unavailable__actions">
          <button type="button" className="button button--primary" disabled={busy} onClick={() => { setBusy(true); void b2bSession.retry().finally(() => setBusy(false)); }}>
            {busy ? t("Checking…", "جارٍ التحقق…") : t("Try again", "حاول مرة أخرى")}
          </button>
          <button type="button" className="button button--outline" disabled={busy} onClick={() => { void b2bSession.signOut().then((result) => navigate("/login", { replace: true, state: result === "unconfirmed" ? { notice: "logout-unconfirmed" } : undefined })); }}>
            {t("Sign out", "تسجيل الخروج")}
          </button>
        </div>
      </div>
    </main>
  );
}
