import { WorkspaceNavigation } from "@/features/demo/workspace-navigation";
import { Link, useMatches } from "react-router-dom";
import type { ReactNode } from "react";
import { SiteHeader } from "@/features/home/components/site-header";
import { useLocale } from "@/features/localization/locale-provider";
import styles from "../hotels.module.css";
export function CatalogShell({
  title,
  detail = false,
  workspace = false,
  showPreview = false,
  children,
}: {
  title: string;
  detail?: boolean;
  workspace?: boolean;
  showPreview?: boolean;
  children: ReactNode;
}) {
  const { t } = useLocale();
  const workspaceRoute = useMatches().some(match => (match.handle as { workspace?: boolean } | undefined)?.workspace);
  return (
    <div className={styles.shell}>
      <a href="#catalog-main" className={styles.skip}>
        {t("Skip to content", "انتقل إلى المحتوى")}
      </a>
      <SiteHeader standalone />
      <main id="catalog-main">
        <nav
          aria-label={t("Breadcrumb", "مسار التنقل")}
          className={styles.breadcrumb}
        >
          <Link to="/">{t("Home", "الرئيسية")}</Link>
          <span aria-hidden="true">›</span>
          {detail && (
            <>
              <Link to="/search">{t("Search", "بحث")}</Link>
              <span aria-hidden="true">›</span>
            </>
          )}
          <span aria-current="page">{title}</span>
        </nav>
        {showPreview && <p className={styles.preview}>
          {t(
            "Design preview — sample hotels, prices and bookings. No live availability or transactions.",
            "معاينة تصميم — فنادق وأسعار وحجوزات تجريبية. لا يوجد توافر مباشر أو معاملات فعلية.",
          )}
        </p>}
        {(workspace || workspaceRoute) && <WorkspaceNavigation />}
        {children}
      </main>
    </div>
  );
}
