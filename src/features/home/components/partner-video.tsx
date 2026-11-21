import { useEffect, useRef, useState } from "react";
import { useMediaEnvironment } from "@/components/motion/use-media-environment";
import { useLocale } from "@/features/localization/locale-provider";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import imageSources from "@/generated/image-sources.json";
import styles from "./partner-benefits.module.css";

const POSTER = "/images/home/partner-travel.png";
/** The largest optimized WebP of the poster (about 40 KB) instead of the original PNG, when available. */
const posterUrl = (() => {
  const set = (imageSources as Record<string, string>)[POSTER];
  const last = set?.split(",").map((entry) => entry.trim().split(" ")[0]).filter(Boolean).at(-1);
  return last ?? POSTER;
})();

/**
 * Decorative promotional video for "Built for Travel Partners". Muted, looped and inline; it loads
 * only once near the viewport, plays only while visible on a visible page, and pauses otherwise.
 * With reduced motion it stays on the poster. If the video can't load, the photograph is shown.
 */
export function PartnerVideo() {
  const { t } = useLocale();
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const { visible, pageVisible, reduced } = useMediaEnvironment(container);
  const [requested, setRequested] = useState(false);
  const [failed, setFailed] = useState(false);
  if (visible && !reduced && !requested) setRequested(true);

  useEffect(() => {
    const media = video.current;
    if (!media) return;
    if (visible && pageVisible && !reduced && !failed) {
      // A browser that blocks autoplay keeps the poster; nothing else changes.
      media.play().catch(() => undefined);
    } else media.pause();
    return () => { media.pause(); };
  }, [visible, pageVisible, reduced, failed, requested]);

  return (
    <div ref={container} className={styles.visual} data-partner-video>
      {failed ? (
        <ResponsiveImage className={styles.photograph} src={POSTER} alt={t("Coastal travel scene", "مشهد سفر ساحلي")} width={642} height={611} />
      ) : (
        <video
          ref={video}
          src={requested ? "/videos/partner-travel.mp4" : undefined}
          poster={posterUrl}
          muted
          loop
          playsInline
          disablePictureInPicture
          preload="none"
          className={styles.video}
          aria-hidden="true"
          tabIndex={-1}
          onError={() => setFailed(true)}
        />
      )}
      <div className={styles.badge}>{t("Built for Travel Partners", "مصممة لشركاء السفر")}</div>
    </div>
  );
}
