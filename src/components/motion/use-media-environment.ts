import { useEffect, useState, type RefObject } from "react";

/** Shared motion lifecycle: no timers or playback for hidden/offscreen content. */
export function useMediaEnvironment(ref: RefObject<HTMLElement | null>) {
  const [reduced, setReduced] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => setReduced(query.matches);
    const visibility = () => setPageVisible(!document.hidden);
    query.addEventListener("change", preference);
    document.addEventListener("visibilitychange", visibility);
    let observer: IntersectionObserver | undefined;
    if (ref.current && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.12 });
      observer.observe(ref.current);
    } else {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => {
        cancelAnimationFrame(frame);
        query.removeEventListener("change", preference);
        document.removeEventListener("visibilitychange", visibility);
      };
    }
    return () => {
      observer?.disconnect();
      query.removeEventListener("change", preference);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [ref]);
  return { reduced, visible, pageVisible, canAnimate: !reduced && visible && pageVisible };
}
