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
    // Anchored to the trigger: opens below it (above when there is more room there), aligned to its
    // inline end, shifted sideways to stay inside the viewport, and no taller than the space it has.
    // Inside a container that lays panels out in place (the phone menu), the panel is static: skip.
    const reposition = () => {
      const element = panel.current;
      const anchor = button.current;
      if (!element || !anchor || getComputedStyle(element).position === "static") return;
      // Writes only on change: a resize here would otherwise re-trigger the observer below.
      const set = (property: "translate" | "maxHeight", value: string) => { if (element.style[property] !== value) element.style[property] = value; };
      const edge = 12, gap = 8;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      const trigger = anchor.getBoundingClientRect();
      const below = viewportHeight - trigger.bottom - gap - edge;
      const above = trigger.top - gap - edge;
      const flip = element.scrollHeight > below && above > below;
      if (flip !== (element.getAttribute("data-placement") === "top")) {
        if (flip) element.setAttribute("data-placement", "top"); else element.removeAttribute("data-placement");
      }
      set("maxHeight", `${Math.round(Math.max(160, Math.min(540, flip ? above : below)))}px`);
      // The shift is measured from the unshifted position, so the current one is taken off first.
      const current = Number.parseFloat(element.style.translate) || 0;
      const bounds = element.getBoundingClientRect();
      const left = bounds.left - current, right = bounds.right - current;
      let shift = 0;
      if (left < edge) shift = edge - left;
      else if (right > viewportWidth - edge) shift = viewportWidth - edge - right;
      set("translate", `${Math.round(shift)}px 0px`);
    };

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, { passive: true, capture: true });
    // Currency labels, content and responsive layout can resize without a window event.
    const observer = new ResizeObserver(reposition);
    if (root.current) observer.observe(root.current);
    if (root.current?.parentElement) observer.observe(root.current.parentElement);
    if (panel.current) observer.observe(panel.current);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, { capture: true });
      observer.disconnect();
    };
  }, [open, label]);

  return <div className="rv-popover" ref={root} onBlur={event => { // A label temporarily blurs to no target before activating its radio.
    // Close only for an actual focus move outside; outside pointer events are handled above.
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={button} className={`rv-popover-trigger ${triggerClassName}`} type="button" aria-label={label} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{trigger}</button>
    {open && <div id={id} role="region" aria-label={label} className={`rv-popover-panel ${panelClassName}`} ref={panel}>{typeof children === "function" ? children(() => setOpen(false)) : children}</div>}
  </div>;
}
