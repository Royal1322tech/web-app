import { RentalLanding } from "@/features/car-rental/rental-landing";
import { CatalogShell } from "@/features/hotels/components/catalog-shell";
import { useLocale } from "@/features/localization/locale-provider";
export default function CarRentalPage() {
  const { t } = useLocale();
  return (
    <CatalogShell title={t("Car Rental", "تأجير السيارات")} showPreview={false}>
      <RentalLanding />
    </CatalogShell>
  );
}
