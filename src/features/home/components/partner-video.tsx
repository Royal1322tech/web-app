import { useEffect, useRef, useState } from "react";
import { useMediaEnvironment } from "@/components/motion/use-media-environment";
import { useLocale } from "@/features/localization/locale-provider";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import styles from "./partner-benefits.module.css";

export function PartnerVideo() {
  const { t } = useLocale();
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const { visible, pageVisible, reduced } = useMediaEnvironment(container);
  const [loaded, setLoaded] = useState(false);
  const [paused, setPaused] = useState(false);
  const [manualPlay, setManualPlay] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const media = video.current;
    if (!media) return;
    let live = true;
    if (visible && pageVisible && !paused && (!reduced || manualPlay) && !failed) {
      media.play().catch(() => { if (live) setBlocked(true); });
    } else media.pause();
    return () => { live = false; media.pause(); };
  }, [visible, pageVisible, reduced, paused, manualPlay, failed]);
  return (
    <div ref={container} className={styles.visual} data-partner-video>
      {failed ? <ResponsiveImage className={styles.photograph} src="/images/home/partner-travel.png" alt={t("Coastal travel scene", "مشهد سفر ساحلي")} width={642} height={611} /> :
        <video ref={video} src={visible || loaded ? "/videos/partner-travel.mp4" : undefined}
          poster="/images/home/partner-travel.png" muted loop playsInline preload="metadata"
          autoPlay={!reduced && !paused && visible && pageVisible}
          className={styles.video} aria-label={t("Travel inspiration: a tropical resort", "إلهام السفر: منتجع استوائي")}
          onLoadStart={() => setLoaded(true)} onPlay={() => { setPlaying(true); setBlocked(false); }} onPause={() => setPlaying(false)} onError={() => setFailed(true)} />}
      <div className={styles.badge}>{t("Built for Travel Partners", "مصممة لشركاء السفر")}</div>
      <div className={styles.videoControls}>
        {failed ? <p role="status">{t("Video unavailable. Showing the travel photograph.", "الفيديو غير متاح. تُعرض صورة السفر.")}</p> :
          <button type="button" onClick={() => {
            if (playing) { video.current?.pause(); setPaused(true); setManualPlay(false); }
            else { setPaused(false); setManualPlay(true); video.current?.play().catch(() => setBlocked(true)); }
          }}>{playing ? t("Pause video", "إيقاف الفيديو") : t("Play video", "تشغيل الفيديو")}</button>}
        {blocked && !playing && <p role="status">{t("Playback is paused by your browser. Use Play to try again.", "أوقف المتصفح التشغيل. اضغط تشغيل للمحاولة.")}</p>}
      </div>
    </div>
  );
}
