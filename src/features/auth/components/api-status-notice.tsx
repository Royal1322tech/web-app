import { useEffect, useState } from "react";
import { checkFoundation } from "@/lib/api/foundation";
import { useLocale } from "@/features/localization/locale-provider";

/**
 * Real sign-in builds only. Checks GET /api/v1/foundation-check when the form opens and, only if the
 * API can't be reached, says so before the user types anything. The form itself stays usable.
 */
export function ApiStatusNotice({ service }: { service: "sign-in" | "registration" }) {
  const { t } = useLocale();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"checking" | "ok" | "unreachable">("checking");

  useEffect(() => {
    const controller = new AbortController();
    checkFoundation({ signal: controller.signal, timeoutMs: 10000 }).then(
      () => setState("ok"),
      () => { if (!controller.signal.aborted) setState("unreachable"); },
    );
    return () => controller.abort();
  }, [attempt]);

  if (state !== "unreachable") return null;
  return (
    <div className="availability-notice api-status-notice" role="status">
      <p>
        {service === "sign-in"
          ? t("The sign-in service can't be reached right now. Check your connection, or try again in a few minutes.", "لا يمكن الوصول إلى خدمة تسجيل الدخول حاليًا. تحقق من اتصالك أو حاول مرة أخرى بعد بضع دقائق.")
          : t("The registration service can't be reached right now. Your details are kept; check your connection, or try again in a few minutes.", "لا يمكن الوصول إلى خدمة التسجيل حاليًا. بياناتك محفوظة؛ تحقق من اتصالك أو حاول مرة أخرى بعد بضع دقائق.")}
      </p>
      <button type="button" className="text-button" onClick={() => { setState("checking"); setAttempt((value) => value + 1); }}>
        {t("Check again", "تحقق مرة أخرى")}
      </button>
    </div>
  );
}
