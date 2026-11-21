import type { ReactNode } from "react";
import { Link, type To } from "react-router-dom";
import { Icon } from "./icon";
import "./back-link.css";

/**
 * The shared contextual "Back to …" control: a light secondary button with a direction-aware arrow.
 * Use it for page-level back navigation, not for actions inside a form or button row.
 */
export function BackLink({ to, state, children, className = "" }: { to: To; state?: unknown; children: ReactNode; className?: string }) {
  return (
    <Link to={to} state={state} className={`rv-back-link ${className}`.trim()}>
      <Icon name="back" aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}
