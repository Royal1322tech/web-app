import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/brand-logo";
import { Reveal } from "@/components/motion/reveal";
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
        <Reveal>
          <FeaturedDeals />
        </Reveal>
        <Reveal>
          <PartnerBenefits />
        </Reveal>
        <Reveal>
          <HotelCollection hotels={collectionHotels} />
        </Reveal>
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div>
            <BrandLogo withName />
            <p>
              <Text
                en="Thoughtful travel. Lasting partnerships."
                ar="سفر مدروس. شراكات دائمة."
              />
            </p>
          </div>
          <nav aria-label="Footer">
            <Link to="/car-rental">
              <Text en="Car Rental" ar="تأجير السيارات" />
            </Link>
            <Link to="/search">
              <Text en="Discover hotels" ar="اكتشف الفنادق" />
            </Link>
            <Link to="/agency">
              <Text en="Agency workspace" ar="مساحة الوكالة" />
            </Link>
            <Link to="/welcome">
              <Text en="Partner access" ar="دخول الشركاء" />
            </Link>
          </nav>
          <p>
            <Text
              en="Frontend demonstration · No live reservations or transactions"
              ar="عرض توضيحي · لا توجد حجوزات أو معاملات فعلية"
            />
          </p>
        </div>
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
