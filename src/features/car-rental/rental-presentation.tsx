import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import type { DemoVehicle } from "./rental-model";
import "./rental-flow.css";

export function vehicleName(vehicle: DemoVehicle, locale: "en" | "ar") {
  return vehicle.name[locale].replace(/ — (sample|مثال)$/, "");
}
export function RentalHero({ title, compact = false, primary = false, children }: { title: string; compact?: boolean; primary?: boolean; children?: ReactNode }) {
  const { t } = useLocale();
  const Heading = primary ? "h1" : "h2";
  return <section className={`rental-hero ${compact ? "rental-hero--compact" : ""}`}>
    <img src="/images/rental/luxury-arrival.webp" alt="" width="1536" height="1024" fetchPriority={compact ? "auto" : "high"} />
    <div className="rental-hero-copy"><p className="rental-kicker">{t("ROYAL VACATION · THE ROAD AHEAD", "رويال فاكيشن · رحلتك القادمة")}</p>
      <Heading>{title}</Heading><p>{t("A considered journey, from arrival to departure.", "رحلة مدروسة من الوصول إلى المغادرة.")}</p>
    </div>
    {children}
  </section>;
}
export const vehicleImages: Record<string, string> = {
  "demo-city": "/images/rental/compact.webp",
  "demo-family": "/images/rental/suv.webp",
  "demo-group": "/images/rental/van.webp",
};
export function VehiclePhoto({ vehicle, className = "" }: { vehicle: DemoVehicle; className?: string }) {
  const { t } = useLocale();
  return <figure className={`rental-vehicle-photo ${className}`}>
    <img src={vehicleImages[vehicle.id]} alt={t("Vehicle photo for reference; the exact model may vary", "صورة السيارة للاسترشاد؛ قد يختلف الطراز الفعلي")} width="1536" height="1024" loading="lazy" />
  </figure>;
}
export function VehicleFacts({ vehicle }: { vehicle: DemoVehicle }) {
  const { t } = useLocale();
  return <ul className="rental-facts">
    <li><Icon name="people" />{vehicle.seats} {t("seats", "مقاعد")}</li>
    <li><Icon name="cart" />{vehicle.bags} {t("bags", "حقائب")}</li>
    <li><Icon name="car" />{vehicle.transmission === "automatic" ? t("Automatic", "أوتوماتيك") : t("Manual", "يدوي")}</li>
  </ul>;
}
export function VehicleGallery({ vehicle }: { vehicle: DemoVehicle }) {
  const { t } = useLocale();
  return <div className="rental-gallery">
    <VehiclePhoto vehicle={vehicle} />
    <div className="rental-thumbnails" role="group" aria-label={t("Vehicle gallery", "معرض السيارة")}>
      <button type="button" aria-pressed="true" aria-label={t("Vehicle illustration", "صورة السيارة")}><img src={vehicleImages[vehicle.id]} alt="" /></button>
      <p>{t("Vehicle illustration · model subject to supplier confirmation", "صورة توضيحية · الطراز يتطلب تأكيد المورد")}</p>
    </div>
  </div>;
}
