import { useState } from "react";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import styles from "./hero-airplane.module.css";

/** A single decorative flight over a plane-free background; never a hit target. */
export function HeroAirplane() {
  const [ready, setReady] = useState(false);
  return (
    <div className={styles.sky} aria-hidden="true" data-hero-flight>
      <ResponsiveImage
        src="/images/home/flight/airplane.png"
        alt=""
        width={768}
        height={288}
        sizes="(max-width: 599px) 120px, (max-width: 1199px) 180px, 260px"
        eager
        draggable={false}
        onLoad={() => setReady(true)}
        onError={() => setReady(false)}
        className={`${styles.airplane} ${ready ? styles.ready : ""}`}
      />
    </div>
  );
}
