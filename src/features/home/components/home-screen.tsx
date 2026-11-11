import { Reveal } from "@/components/motion/reveal";
import { Text } from "@/features/localization/locale-provider";
import { SiteFooter } from "./site-footer";
import { homeHeroSlides } from "../data/home-content";
import { collectionHotels } from "../data/hotels.fixture";
import { ProductsServices, PlatformStrengths } from "./platform-sections";
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
        <Hero slides={homeHeroSlides} />
        <HotelSearchForm />
        <Reveal>
          <FeaturedDeals />
        </Reveal>
        <Reveal>
          <PartnerBenefits />
        </Reveal>
        <Reveal><ProductsServices /></Reveal>
        <Reveal><PlatformStrengths /></Reveal>
        <Reveal>
          <HotelCollection hotels={collectionHotels} />
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}
