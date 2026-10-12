import { Text } from "@/features/localization/locale-provider";
import { ResponsiveImage as Image } from "@/components/ui/responsive-image";
import styles from "../home.module.css";

const benefits = [
  {
    title: "Handpicked Hotels",
    description:
      "Discover a wide range of hotels and accommodations carefully selected to suit every destination, budget, and travel style.",
    image: "handpicked-hotels",
    height: 103,
  },
  {
    title: "Easy Car Rental",
    description:
      "Choose from a variety of reliable vehicles and book your rental car quickly and conveniently.",
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
    title: "Fast & Secure Booking",
    description:
      "Book with confidence through a simple, secure, and hassle-free booking experience from start to confirmation.",
    image: "secure-booking",
    height: 94,
  },
];

export function PartnerBenefits() {
  return (
    <section className={styles.partnerSection} aria-labelledby="benefits-title">
      <div className={styles.partnerHeading}>
        <h2 id="benefits-title">
          <Text en="Why Partner with us" />
        </h2>
        <p>
          <Text en="Discover a wide range of travel services designed to help you grow your business and give your clients the best travel experience." />
        </p>
      </div>
      <div className={styles.benefitsGrid}>
        <div className={styles.benefitList}>
          {benefits.map((benefit) => (
            <article key={benefit.title} className={styles.benefit}>
              <Image
                className={styles.benefitImage}
                src={`/images/home/${benefit.image}.png`}
                alt=""
                width={168}
                height={benefit.height}
                sizes="(min-width: 1440px) 168px, (min-width: 1000px) 12vw, (min-width: 600px) 140px, 84px"
              />
              <div>
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
        <Image
          className={styles.partnerVisual}
          src="/images/home/partner-travel.png"
          alt="Suitcase, sun hat, and travel essentials overlooking the blue sea and white coastal villas."
          width={642}
          height={611}
          sizes="(min-width: 1440px) 642px, (min-width: 1000px) 46vw, (min-width: 680px) 642px, calc(100vw - 36px)"
        />
      </div>
    </section>
  );
}
