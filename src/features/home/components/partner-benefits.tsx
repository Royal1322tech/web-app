import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/icon";
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
      "Car Rental belongs in your agency workspace. Vehicle search and reservations are coming in a future implementation.",
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
      "Explore every step from room selection to a printable demo voucher, with clear status updates.",
    image: "secure-booking",
    height: 94,
  },
];

export function PartnerBenefits() {
  const visual = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = visual.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let visible = false;
    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const progress = (innerHeight / 2 - rect.top - rect.height / 2) / innerHeight;
      element.style.setProperty("--partner-drift", `${Math.max(-8, Math.min(8, progress * 16))}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const sync = () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
      frame = 0;
      if (visible && !preference.matches) {
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule);
        schedule();
      } else {
        element.style.removeProperty("--partner-drift");
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(element);
    preference.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", sync);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
      element.style.removeProperty("--partner-drift");
    };
  }, []);
  return (
    <section className={`${styles.partnerSection} ${motion.section}`} aria-labelledby="benefits-title">
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
            <article key={benefit.title} className={`${styles.benefit} ${motion.card}`}>
              <div className={motion.thumbnail}>
              <Image
                src={`/images/home/${benefit.image}.png`}
                alt=""
                width={168}
                height={benefit.height}
                sizes="(min-width: 1200px) 140px, (min-width: 600px) 120px, 84px"
              />
              {index === 1 && <svg className={motion.route} viewBox="0 0 140 24" aria-hidden="true">
                <path d="M5 18C35 18 35 5 65 9S110 22 135 6" pathLength="1" />
              </svg>}
              </div>
              <div className={motion.copy}>
                <h3>
                  <Text en={benefit.title} />
                  {index === 2 && <svg className={motion.price} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M3 4h9l9 9-8 8-10-10Z" />
                    <circle cx="8" cy="9" r="1" />
                  </svg>}
                  {index === 3 && <span className={motion.check}><Icon name="check" /></span>}
                </h3>
                <p>
                  <Text en={benefit.description} />
                </p>
              </div>
            </article>
          ))}
        </div>
        <div ref={visual} className={motion.visual}>
        <div className={motion.imageReveal}>
        <Image
          className={motion.photograph}
          src="/images/home/partner-travel.png"
          alt="Suitcase, sun hat, and travel essentials overlooking the blue sea and white coastal villas."
          width={642}
          height={611}
          sizes="(min-width: 1440px) 642px, (min-width: 1000px) 46vw, (min-width: 680px) 642px, calc(100vw - 36px)"
        />
        </div>
        <div className={motion.badge}>
          <Icon name="building" />
          <Text en="Built for Travel Partners" ar="مصممة لشركاء السفر" />
        </div>
        </div>
      </div>
    </section>
  );
}
