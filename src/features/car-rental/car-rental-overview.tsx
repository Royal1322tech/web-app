import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { Reveal } from "@/components/motion/reveal";
import { useLocale } from "@/features/localization/locale-provider";
import styles from "./car-rental.module.css";

/** Homepage entry card for the self-drive rental journey. */
export function CarRentalOverview({ compact = false }: { compact?: boolean }) {
  const { t } = useLocale();
  return (
    <Reveal className={`${styles.overview} ${compact ? styles.compact : ""}`}>
      <div>
        <span className={styles.eyebrow}>
          <Icon name="car" />
          {t(
            "CAR RENTAL · FOR TRAVEL AGENCIES",
            "تأجير السيارات · لوكالات السفر",
          )}
        </span>
        <h2>
          {t("Explore Car Rentals", "استكشف تأجير السيارات")}
        </h2>
        <p>
          {t(
            "Discover comfortable and premium vehicle options for your clients, with a streamlined rental experience designed for travel professionals.",
            "اكتشف خيارات مريحة ومميزة لعملائك، مع تجربة تأجير مبسطة مصممة لمحترفي السفر.",
          )}
        </p>
        <div className={styles.actions}>
          {compact ? (
            <Link to="/car-rental" className="button button--primary">
              {t("Explore Car Rental", "استكشف تأجير السيارات")}
            </Link>
          ) : (
            <>
              <Link to="/car-rental/search" className="button button--primary">
                {t("Explore vehicles", "استكشف السيارات")}
              </Link>
              <Link to="/agency" className="button button--outline">
                {t("Agency workspace", "مساحة الوكالة")}
              </Link>
            </>
          )}
        </div>
      </div>
      <ResponsiveImage
        src={compact ? "/images/rental/luxury-arrival.webp" : "/images/home/car-rental.png"}
        alt={t(
          "Car Rental service illustration",
          "رسم توضيحي لخدمة تأجير السيارات",
        )}
        width={compact ? 1536 : 168}
        height={compact ? 1024 : 112}
        sizes={compact ? "(max-width: 700px) 100vw, 50vw" : "168px"}
        className={styles.illustration}
      />
    </Reveal>
  );
}
