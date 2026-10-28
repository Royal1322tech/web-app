import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/** Class names for the shared button system; also used to style links as buttons. */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return `button button--${variant}${size === "md" ? "" : ` button--${size}`}`;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Marks the button busy while an action runs; it stays focusable and keeps its label. */
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      className={`${buttonClass(variant, size)} ${className}`}
      {...props}
    />
  );
}
