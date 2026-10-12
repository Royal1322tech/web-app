import { Text } from "@/features/localization/locale-provider";
import { ResponsiveImage as Image } from "@/components/ui/responsive-image";
import type { HeroContent } from "../types";
import { SiteHeader } from "./site-header";
import styles from "../home.module.css";

export function Hero({ content }: { content: HeroContent }) {
  return (
    <section className={styles.hero} aria-label="Explore Royal Vacation">
      <Image
        src={content.image}
        alt={content.alt}
        width={content.width}
        height={content.height}
        sizes="(max-width: 1440px) 100vw, 1440px"
        eager
        className={styles.heroImage}
      />
      <SiteHeader />
      <h1 className="sr-only">
        <Text en="Royal Vacation \u2014 Hotels and travel partners" />
      </h1>
    </section>
  );
}
