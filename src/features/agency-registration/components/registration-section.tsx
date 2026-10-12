import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";

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
  return (
    <fieldset className="registration-section">
      <legend className="sr-only">{title}</legend>
      <div className="section-heading">
        <span className="icon-badge">
          <Icon name={icon} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className={contentClassName}>{children}</div>
    </fieldset>
  );
}
