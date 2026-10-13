import { CatalogShell } from "@/features/hotels/components/catalog-shell";
import { CarRentalOverview } from "@/features/car-rental/car-rental-overview";
import { useLocale } from "@/features/localization/locale-provider";
export default function CarRentalPage() {
  const { t } = useLocale();
  return (
    <CatalogShell title={t("Car Rental", "تأجير السيارات")}>
      <h1>{t("Car Rental for your clients", "تأجير السيارات لعملائك")}</h1>
      <CarRentalOverview />
    </CatalogShell>
  );
}
