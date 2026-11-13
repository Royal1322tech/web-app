import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";

export function RegistrationSection({
  title,
  description,
  children,
  icon = "info",
  contentClassName = "registration-fields",
}: {
  title: string;
  description: string;
  children: ReactNode;
  icon?: IconName;
  contentClassName?: string;
}) {
  const { t } = useLocale();
  return (
    <fieldset className="registration-section">
      <legend className="sr-only">{t(title)}</legend>
      <div className="section-heading">
        <span className="icon-badge">
          <Icon name={icon} />
        </span>
        <div>
          <h2>{t(title)}</h2>
          <p>{t(description)}</p>
        </div>
      </div>
      <div className={contentClassName}>{children}</div>
    </fieldset>
  );
}
