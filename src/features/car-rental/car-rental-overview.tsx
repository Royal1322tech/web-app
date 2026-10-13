import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { Reveal } from "@/components/motion/reveal";
import { useLocale } from "@/features/localization/locale-provider";
import styles from "./car-rental.module.css";

/** Original service overview, now linked to an explicitly fictional rental journey. */
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
          {t("Explore the car rental demo", "استكشف تأجير السيارات التجريبي")}
        </h2>
        <p>
          {t(
            "Car Rental is part of the Royal Vacation partner platform. Explore fictional vehicles, sample prices and a complete frontend rental simulation. No live inventory is offered.",
            "تأجير السيارات جزء من منصة شركاء رويال فاكيشن. استكشف سيارات وأسعار أمثلة ومحاكاة تأجير كاملة في الواجهة. لا يوجد مخزون فعلي.",
          )}
        </p>
        <p className={styles.note}>
          {t(
            "No rental request or payment can be submitted from this preview.",
            "لا يمكن إرسال طلب تأجير أو دفع من هذه المعاينة.",
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
                {t("Search demo vehicles", "ابحث في السيارات التجريبية")}
              </Link>
              <Link to="/agency" className="button button--outline">
                {t("Agency workspace", "مساحة الوكالة")}
              </Link>
            </>
          )}
        </div>
      </div>
      <ResponsiveImage
        src="/images/home/car-rental.png"
        alt={t(
          "Car Rental service illustration",
          "رسم توضيحي لخدمة تأجير السيارات",
        )}
        width={168}
        height={112}
        sizes="168px"
        className={styles.illustration}
      />
    </Reveal>
  );
}
