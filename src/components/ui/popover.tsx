import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import "./popover.css";

/** Native buttons/links retain Tab and radio Arrow-key behavior; Escape restores focus. */
export function Popover({ label, trigger, children, panelClassName = "", triggerClassName = "" }: { label: string; trigger: ReactNode; children: ReactNode | ((close: () => void) => ReactNode); panelClassName?: string; triggerClassName?: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
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
  useLayoutEffect(() => {
    if (!open) return;

    const reposition = () => {
      const element = panel.current;
      if (!element) return;

      element.style.translate = "0px 0px";

      const bounds = element.getBoundingClientRect();
      const padding = 8;
      let shift = 0;

      if (bounds.left < padding) {
        shift = padding - bounds.left;
      } else if (bounds.right > document.documentElement.clientWidth - padding) {
        shift = document.documentElement.clientWidth - padding - bounds.right;
      }

      element.style.translate = `${shift}px 0px`;
    };

    reposition();
    window.addEventListener("resize", reposition);
    // Currency labels, content and responsive layout can resize without a window event.
    const observer = new ResizeObserver(reposition);
    if (root.current) observer.observe(root.current);
    if (root.current?.parentElement) observer.observe(root.current.parentElement);
    if (panel.current) observer.observe(panel.current);
    return () => {
      window.removeEventListener("resize", reposition);
      observer.disconnect();
    };
  }, [open, label]);

  return <div className="rv-popover" ref={root} onBlur={event => { const container = event.currentTarget; requestAnimationFrame(() => { if (!container.contains(document.activeElement)) setOpen(false); }); }}>
    <button ref={button} className={`rv-popover-trigger ${triggerClassName}`} type="button" aria-label={label} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{trigger}</button>
    {open && <div id={id} role="region" aria-label={label} className={`rv-popover-panel ${panelClassName}`} ref={panel}>{typeof children === "function" ? children(() => setOpen(false)) : children}</div>}
  </div>;
}
