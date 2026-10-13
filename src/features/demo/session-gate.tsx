import { Link, Outlet } from "react-router-dom";
import { CatalogShell } from "@/features/hotels/components/catalog-shell";
import { useLocale } from "@/features/localization/locale-provider";
import { useDemo } from "./demo-provider";

/** Frontend preview boundary only; this is not an authentication/security layer. */
export function DemoSessionGate() {
  const { demoSessionActive, enterDemoSession } = useDemo();
  const { t } = useLocale();
  if (demoSessionActive) return <Outlet />;
  return (
    <CatalogShell title={t("Partner access", "دخول الشركاء")}>
      <section className="demo-session-gate">
        <h1>{t("Partner access", "دخول الشركاء")}</h1>
        <p>
          {t(
            "Choose your account type to sign in or register, or explicitly enter the sample workspace.",
            "اختر نوع حسابك للدخول أو التسجيل، أو ادخل مساحة العمل التجريبية صراحةً.",
          )}
        </p>
        <Link className="button button--primary" to="/welcome">
          {t("Choose account type", "اختر نوع الحساب")}
        </Link>
        <button
          className="button button--outline"
          type="button"
          onClick={enterDemoSession}
        >
          {t(
            "Explore demo agency workspace",
            "استكشاف مساحة الوكالة التجريبية",
          )}
        </button>
        <p>
          {t(
            "Demo only. No real authentication. Access and local changes reset on refresh or Sign Out.",
            "تجربة فقط، دون مصادقة فعلية. يُعاد ضبط الدخول والتعديلات المحلية عند تحديث الصفحة أو تسجيل الخروج.",
          )}
        </p>
      </section>
    </CatalogShell>
  );
}
