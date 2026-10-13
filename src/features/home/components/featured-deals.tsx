import { Text } from "@/features/localization/locale-provider";
import { featuredHotels } from "../data/hotels.fixture";
import { HotelCard } from "./hotel-card";
import styles from "../home.module.css";

export function FeaturedDeals() {
  return (
    <section className={styles.section} aria-labelledby="deals-title">
      <h2 id="deals-title" className={styles.dealsTitle}>
        <Text
          en="A world of stays. One workspace."
          ar="عالم من الإقامات. مساحة عمل واحدة."
        />
      </h2>
      <p className={styles.sampleNote}>
        <Text en="Design preview: sample hotels, prices and ratings. Live availability is not connected." />
      </p>
      <div className={`${styles.featuredGrid} motion-stagger`}>
        {featuredHotels.map((hotel) => (
          <HotelCard key={hotel.id} hotel={hotel} compact />
        ))}
      </div>
    </section>
  );
}
