import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import type { HotelListing } from "@/features/hotels/types";
import type { SampleRoomRate } from "@/features/hotels/data/rooms.fixture";
import { useLocale } from "@/features/localization/locale-provider";

function PolicyAccordion({
  title,
  icon,
  children,
}: {
  title: string;
  icon: IconName;
  children: ReactNode;
}) {
  return (
    <details className="policy-accordion policy-compact-accordion">
      <summary>
        <span className="policy-accordion-icon"><Icon name={icon} /></span>
        <strong>{title}</strong>
        <Icon className="policy-accordion-chevron" name="chevron" />
      </summary>
      <div className="policy-accordion-content">{children}</div>
    </details>
  );
}

export function HotelPolicySections({
  hotel,
  rate,
}: {
  hotel?: HotelListing;
  rate: SampleRoomRate;
}) {
  const { locale, t } = useLocale();
  const hotelPolicies = hotel?.policies;
  const norms: { label: string; value: string }[] = [];

  if (hotelPolicies?.checkIn?.from || hotelPolicies?.checkIn?.until) {
    norms.push({
      label: t("Check-in", "تسجيل الوصول"),
      value: [hotelPolicies.checkIn.from, hotelPolicies.checkIn.until].filter(Boolean).join(" – "),
    });
  }
  if (hotelPolicies?.checkOut?.from || hotelPolicies?.checkOut?.until) {
    norms.push({
      label: t("Check-out", "تسجيل المغادرة"),
      value: [hotelPolicies.checkOut.from, hotelPolicies.checkOut.until].filter(Boolean).join(" – "),
    });
  }
  if (hotelPolicies?.childPolicy) {
    norms.push({ label: t("Children", "الأطفال"), value: hotelPolicies.childPolicy[locale] });
  }
  if (hotelPolicies?.extraBedPolicy) {
    norms.push({ label: t("Extra beds", "الأسرّة الإضافية"), value: hotelPolicies.extraBedPolicy[locale] });
  }
  if (hotelPolicies?.identificationRequirements) {
    norms.push({ label: t("Identification", "إثبات الهوية"), value: hotelPolicies.identificationRequirements[locale] });
  }
  for (const restriction of hotelPolicies?.restrictions ?? []) {
    norms.push({ label: t("Property restriction", "قيود العقار"), value: restriction[locale] });
  }

  const terms = [...(rate.terms ?? []), ...(hotelPolicies?.terms ?? [])];

  return (
    <div className="policy-accordion-list">
      <PolicyAccordion title={t("Hotel Norms", "سياسات الفندق")} icon="people">
        {norms.length ? (
          <dl className="policy-facts">
            {norms.map(({ label, value }, index) => (
              <div key={`${label}-${index}`}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        ) : (
          <p className="policy-empty">{t("Hotel norms not supplied.", "لم تُقدّم سياسات الفندق.")}</p>
        )}
      </PolicyAccordion>

      <PolicyAccordion title={t("Terms & Conditions", "الشروط والأحكام")} icon="document">
        {terms.length ? (
          <ul className="policy-restrictions">
            {terms.map((item, index) => <li key={`term-${index}`}>{item[locale]}</li>)}
          </ul>
        ) : (
          <p className="policy-empty">{t("No hotel or rate terms were supplied.", "لم تُقدّم شروط للفندق أو السعر.")}</p>
        )}
      </PolicyAccordion>
    </div>
  );
}
