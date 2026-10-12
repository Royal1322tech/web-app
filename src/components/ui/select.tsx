import type { ComponentProps } from "react";
import { Icon, type IconName } from "./icon";

export function Select({
  icon,
  children,
  ...props
}: ComponentProps<"select"> & { icon?: IconName }) {
  return (
    <div
      className={`input-wrap input-wrap--end${icon ? " input-wrap--icon" : ""}`}
    >
      {icon && <Icon name={icon} className="input-icon" />}
      <select className="input select" {...props}>
        {children}
      </select>
      <Icon name="chevron" className="select-chevron" />
    </div>
  );
}
