import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import "./popover.css";

/** Native buttons/links retain Tab and radio Arrow-key behavior; Escape restores focus. */
export function Popover({ label, trigger, children, panelClassName = "" }: { label: string; trigger: ReactNode; children: ReactNode; panelClassName?: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); setOpen(false); button.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape, true); };
  }, [open]);
  return <div className="rv-popover" ref={root} onBlur={event => { const container = event.currentTarget; requestAnimationFrame(() => { if (!container.contains(document.activeElement)) setOpen(false); }); }}>
    <button ref={button} className="rv-popover-trigger" type="button" aria-label={label} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{trigger}</button>
    {open && <div id={id} role="region" aria-label={label} className={`rv-popover-panel ${panelClassName}`}>{children}</div>}
  </div>;
}
