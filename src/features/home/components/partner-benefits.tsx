import { PartnerVideo } from "./partner-video";
import { TravelTrail } from "@/components/motion/travel-trail";
import { Text } from "@/features/localization/locale-provider";
import { ResponsiveImage as Image } from "@/components/ui/responsive-image";
import styles from "../home.module.css";
import motion from "./partner-benefits.module.css";

const benefits = [
  {
    title: "Handpicked Hotels",
    description:
      "Discover a wide range of hotels and accommodations carefully selected to suit every destination, budget, and travel style.",
    image: "handpicked-hotels",
    height: 103,
  },
  {
    title: "Car Rental for Agencies",
    description:
      "Explore vehicle categories and a streamlined rental journey for your agency.",
    image: "car-rental",
    height: 112,
  },
  {
    title: "Competitive Prices",
    description:
      "Compare available options and enjoy competitive rates designed to give you the best value for your trip.",
    image: "competitive-prices",
    height: 114,
  },
  {
    title: "A Clear Booking Journey",
    description:
      "Follow each step from room selection to voucher details, with clear status updates.",
    image: "secure-booking",
    height: 94,
  },
];

export function PartnerBenefits() {
  return (
    <section
      className={`${styles.partnerSection} ${motion.section}`}
      aria-labelledby="benefits-title"
    >
      <TravelTrail draw />
      <div className={`${styles.partnerHeading} ${motion.heading}`}>
        <h2 id="benefits-title">
          <Text en="Why Partner with us" />
        </h2>
        <p>
          <Text en="Discover a wide range of travel services designed to help you grow your business and give your clients the best travel experience." />
        </p>
      </div>
      <div className={styles.benefitsGrid}>
        <div className={`${styles.benefitList} ${motion.cards}`}>
          {benefits.map((benefit, index) => (
            <article
              key={benefit.title}
              className={`${styles.benefit} ${motion.card}`}
            >
              <div className={motion.thumbnail}>
                <Image
                  src={`/images/home/${benefit.image}.png`}
                  alt=""
                  width={168}
                  height={benefit.height}
                  sizes="(min-width: 1200px) 140px, (min-width: 600px) 120px, 84px"
                />
                {index === 1 && (
                  <svg className={motion.route} viewBox="0 0 140 24" aria-hidden="true">
                    <path d="M5 18C35 18 35 5 65 9S110 22 135 6" pathLength="1" />
                  </svg>
                )}
              </div>
              <div className={motion.copy}>
                <h3>
                  <Text en={benefit.title} />
                </h3>
                <p>
                  <Text en={benefit.description} />
                </p>
              </div>
            </article>
          ))}
        </div>
        <PartnerVideo />
      </div>
    </section>
  );
}
