import { Link } from "react-router-dom";
import { Text } from "@/features/localization/locale-provider";
import { ResponsiveImage as Image } from "@/components/ui/responsive-image";
import type { HeroContent } from "../types";
import { SiteHeader } from "./site-header";
import { HeroAirplane } from "./hero-airplane";
import styles from "../home.module.css";
export function Hero({ content }: { content: HeroContent }) {
  return (
    <section
      className={styles.hero}
      aria-label="Royal Vacation agency platform"
    >
      <Image
        src={content.image}
        alt={content.alt}
        width={content.width}
        height={content.height}
        sizes="(max-width: 1199px) 2048px, (max-width: 1875px) 1875px, 100vw"
        eager
        className={styles.heroImage}
      />
      <HeroAirplane />
      <div className={styles.heroOverlay} />
      <SiteHeader />
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>
          <span />{" "}
          <Text
            en="THE WORLD, THROUGH YOUR AGENCY"
            ar="العالم من خلال وكالتك"
          />
        </p>
        <h1>
          <Text en="Exceptional stays." ar="إقامات استثنائية." />
          <br />
          <span>
            <Text en="Stronger partnerships." ar="شراكات أقوى." />
          </span>
        </h1>
        <p>
          <Text
            en="A considered workspace for travel professionals. Discover hotels, compare room options, and plan every guest’s next chapter."
            ar="مساحة عمل مصممة لمحترفي السفر. اكتشف الفنادق وقارن الغرف وخطط للرحلة القادمة لكل ضيف."
          />
        </p>
        <div className={styles.heroActions}>
          <a href="#hotel-search" className="button button--gold">
            <Text en="Find a hotel" ar="ابحث عن فندق" />
            <span aria-hidden="true">↗</span>
          </a>
          <Link to="/register/agency/company">
            <Text en="Become a partner" ar="انضم كشريك" />{" "}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className={styles.heroProof}>
          <span>
            <Text en="AGENCY WORKSPACE" ar="مساحة الوكالة" />
          </span>
          <span>
            <Text en="HOTELS, SIMPLIFIED" ar="الفنادق ببساطة" />
          </span>
          <span>
            <Text en="DEMO EXPERIENCE" ar="تجربة توضيحية" />
          </span>
        </div>
      </div>
      <div className={styles.heroCaption}>
        <span>
          <Text en="CURATED FOR YOUR CLIENTS" ar="مختارة لعملائك" />
        </span>
        <Text
          en="Your next great stay starts here"
          ar="إقامتك القادمة تبدأ هنا"
        />
        <i />
      </div>
    </section>
  );
}
