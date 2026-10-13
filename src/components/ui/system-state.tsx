import { useState, type ReactNode } from "react";
import { AnimatedBrandLogo } from "@/components/brand-logo";
import { useLocale } from "@/features/localization/locale-provider";

export function InlineLoadingState() {
  const { t } = useLocale();
  return (
    <span className="inline-loading" role="status">
      <span aria-hidden="true" />
      {t("Loading…", "جارٍ التحميل…")}
    </span>
  );
}
export function BrandLoader() {
  const { t } = useLocale();
  return (
    <div className="brand-loader" role="status">
      <AnimatedBrandLogo />
      <p>{t("Preparing your workspace…", "جارٍ تجهيز مساحة عملك…")}</p>
    </div>
  );
}
export function PageLoadingState() {
  return (
    <main className="page-loading">
      <BrandLoader />
    </main>
  );
}
export function Skeleton() {
  const { t } = useLocale();
  return (
    <div
      className="skeleton-group"
      role="status"
      aria-label={t("Loading preview", "معاينة التحميل")}
    >
      <span />
      <span />
      <span />
    </div>
  );
}
export function SystemState({
  title,
  description,
  onRetry,
  children,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div className="system-state">
      <span className="state-orbit" aria-hidden="true">
        ✧
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {onRetry && (
        <button className="button button--outline" onClick={onRetry}>
          {t("Retry", "إعادة المحاولة")}
        </button>
      )}
      {children}
    </div>
  );
}
/** Explicit demonstration controls, not invented network requests or artificial loading. */
export function StatePreview({
  children,
  emptyTitle = "Nothing here yet",
}: {
  children: ReactNode;
  emptyTitle?: string;
}) {
  const { t } = useLocale();
  const [state, setState] = useState("ready");
  return (
    <>
      <details className="demo-state-controls">
        <summary>
          {t("Preview interface states", "معاينة حالات الواجهة")}
        </summary>
        <label>
          {t("Demo state", "الحالة التجريبية")}
          <select
            aria-label={t("Demo state", "الحالة التجريبية")}
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            {[
              ["ready", "Ready", "جاهز"],
              ["loading", "Loading preview", "معاينة التحميل"],
              ["empty", "Empty preview", "معاينة الفراغ"],
              ["error", "Network error preview", "معاينة خطأ الشبكة"],
              ["unavailable", "Unavailable preview", "معاينة عدم التوفر"],
            ].map(([v, en, ar]) => (
              <option key={v} value={v}>
                {t(en, ar)}
              </option>
            ))}
          </select>
        </label>
      </details>
      {state === "ready" ? (
        children
      ) : state === "loading" ? (
        <Skeleton />
      ) : (
        <SystemState
          title={
            state === "empty"
              ? emptyTitle
              : state === "error"
                ? t("Unable to load this view", "تعذر تحميل هذه الصفحة")
                : t("Currently unavailable", "غير متاح حالياً")
          }
          description={t(
            "Demonstration state. No network request was made. Return to the sample data when ready.",
            "حالة تجريبية. لم يتم إرسال طلب للشبكة. يمكنك العودة للبيانات التجريبية.",
          )}
          onRetry={() => setState("ready")}
        />
      )}
    </>
  );
}
