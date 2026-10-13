import { useEffect, useRef } from "react";

/** Small, pointer-only image depth. It never moves controls or changes scroll position. */
export function usePointerDepth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const enabled = matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    let frame = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      element.style.removeProperty("--depth-x");
      element.style.removeProperty("--depth-y");
    };
    const move = (event: PointerEvent) => {
      if (!enabled.matches) return;
      const bounds = element.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 8;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 6;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.setProperty("--depth-x", `${x.toFixed(2)}px`);
        element.style.setProperty("--depth-y", `${y.toFixed(2)}px`);
      });
    };
    element.addEventListener("pointermove", move, { passive: true });
    element.addEventListener("pointerleave", reset);
    enabled.addEventListener("change", reset);
    return () => {
      reset();
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", reset);
      enabled.removeEventListener("change", reset);
    };
  }, []);
  return ref;
}
