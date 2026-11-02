import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { SiteFooter } from "@/features/home/components/site-footer";
import { CatalogShell } from "@/features/hotels/components/catalog-shell";
import { useLocale } from "@/features/localization/locale-provider";

export function NotFound() {
  const { t } = useLocale();
  const title = t("Page not found", "الصفحة غير موجودة");
  return (
    <>
      <CatalogShell title={title} workspace={false}>
        <title>{`${title} | Royal Vacation`}</title>
        <section className="not-found">
          <p className="not-found__code">404</p>
          <h1>{title}</h1>
          <p>{t("The page you are looking for has moved or no longer exists.", "الصفحة التي تبحث عنها نُقلت أو لم تعد موجودة.")}</p>
          <div className="not-found__actions">
            <Link className="button button--primary" to="/">{t("Return home", "العودة إلى الرئيسية")}</Link>
            <Link className="button button--outline" to="/contact"><Icon name="mail" />{t("Contact Us", "تواصل معنا")}</Link>
          </div>
        </section>
      </CatalogShell>
      <SiteFooter />
    </>
  );
}
