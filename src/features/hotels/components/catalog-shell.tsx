import { WorkspaceNavigation } from "@/features/demo/workspace-navigation";
import { useMatches } from "react-router-dom";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import type { ReactNode } from "react";
import { SiteHeader } from "@/features/home/components/site-header";
import { useLocale } from "@/features/localization/locale-provider";
import styles from "../hotels.module.css";
import { PublicLandingHeader } from "@/features/auth/public-landing-header";
export function CatalogShell({
  title,
  detail = false,
  workspace,
  showPreview = false,
  publicHeader = false,
  trail = [],
  children,
}: {
  title: string;
  detail?: boolean;
  /** Account navigation: explicit true/false wins; otherwise the route's workspace handle decides. */
  workspace?: boolean;
  showPreview?: boolean;
  publicHeader?: boolean;
  /** Intermediate breadcrumb links between Home and the current page. */
  trail?: readonly { to: string; label: string }[];
  children: ReactNode;
}) {
  const { t } = useLocale();
  const workspaceRoute = useMatches().some(match => (match.handle as { workspace?: boolean } | undefined)?.workspace);
  return (
    <div className={styles.shell}>
      <a href="#catalog-main" className={styles.skip}>
        {t("Skip to content", "انتقل إلى المحتوى")}
      </a>
      {publicHeader ? <PublicLandingHeader /> : <SiteHeader standalone />}
      <main id="catalog-main">
        <Breadcrumb
          label={t("Breadcrumb", "مسار التنقل")}
          homeLabel={t("Home", "الرئيسية")}
          items={[...(detail ? [{ to: "/search", label: t("Search", "بحث") }] : []), ...trail]}
          current={title}
        />
        {showPreview && <p className={styles.preview}>
          {t(
            "Design preview — sample hotels, prices and bookings. No live availability or transactions.",
            "معاينة تصميم — فنادق وأسعار وحجوزات تجريبية. لا يوجد توافر مباشر أو معاملات فعلية.",
          )}
        </p>}
        {(workspace ?? workspaceRoute) ? (
          <div className="workspace-layout">
            <WorkspaceNavigation />
            <div className="workspace-layout__content">{children}</div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
