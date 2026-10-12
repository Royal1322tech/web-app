import { Text } from "@/features/localization/locale-provider";
import { ResponsiveImage as Image } from "@/components/ui/responsive-image";
import { homeHero } from "../data/home-content";
import { collectionHotels } from "../data/hotels.fixture";
import { Hero } from "./hero";
import { HotelSearchForm } from "./hotel-search-form";
import { FeaturedDeals } from "./featured-deals";
import { PartnerBenefits } from "./partner-benefits";
import { HotelCollection } from "./hotel-collection";
import styles from "../home.module.css";

export function HomeScreen() {
  return (
    <div className={styles.home}>
      <a className={styles.skipLink} href="#hotel-search">
        <Text en="Skip to hotel search" />
      </a>
      <main>
        <Hero content={homeHero} />
        <HotelSearchForm />
        <FeaturedDeals />
        <PartnerBenefits />
        <HotelCollection hotels={collectionHotels} />
      </main>
      <footer className={styles.footer}>
        <Image
          src="/images/home/footer-illustration.png"
          alt="Royal Vacation — illustrated travel landscape"
          width={1440}
          height={671}
          sizes="(max-width:1440px) 100vw, 1440px"
        />
      </footer>
    </div>
  );
}
