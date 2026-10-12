import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "./icon";

export function Input({
  icon,
  endAdornment,
  className = "",
  ...props
}: ComponentProps<"input"> & { icon?: IconName; endAdornment?: ReactNode }) {
  return (
    <div
      className={`input-wrap${icon ? " input-wrap--icon" : ""}${endAdornment ? " input-wrap--end" : ""}`}
    >
      {icon && <Icon name={icon} className="input-icon" />}
      <input className={`input ${className}`} {...props} />
      {endAdornment}
    </div>
  );
}
