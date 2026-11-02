import { useCallback, useEffect, useState, type RefObject } from "react";
import { useMediaEnvironment } from "./use-media-environment";

/** How long before a rotation the next image starts loading, so it never competes with the first paint. */
const PRELOAD_LEAD_MS = 2500;
const RETRY_MS = 250;

/**
 * Shared timing for the hero carousels. Slides mark their wrapper with `data-slide={position}`.
 * It rests while the page is hidden, the hero is offscreen or the viewer paused it; with reduced
 * motion it stays on the first image. Only shown and next images are rendered, and a slide changes
 * only once the next image is decoded, so a slow connection waits instead of fading to a blank frame.
 */
export function useHeroRotation(root: RefObject<HTMLElement | null>, { count, intervalMs }: { count: number; intervalMs: number }) {
  const { canAnimate, reduced } = useMediaEnvironment(root);
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set([0]));
  const [paused, setPaused] = useState(false);
  const next = (index + 1) % count;
  const running = canAnimate && !paused;

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setSeen((current) => new Set(current).add(next)), Math.max(0, intervalMs - PRELOAD_LEAD_MS));
    return () => window.clearTimeout(timer);
  }, [running, next, intervalMs]);

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    let timer = 0;
    const advance = () => {
      const image = root.current?.querySelector<HTMLImageElement>(`[data-slide="${next}"] img`);
      if (!image?.complete) {
        timer = window.setTimeout(advance, RETRY_MS);
        return;
      }
      void image.decode().catch(() => undefined).then(() => {
        if (!cancelled) setIndex(next);
      });
    };
    timer = window.setTimeout(advance, intervalMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [root, running, next, intervalMs]);

  const togglePaused = useCallback(() => setPaused((current) => !current), []);
  return { index, running, paused, reduced, togglePaused, isLoaded: (position: number) => seen.has(position) };
}
