import { hotelDisplayAddress, hotelDisplayName } from "../lib/presentation";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { hotels } from "../data/hotels.fixture";
import { useLocale } from "@/features/localization/locale-provider";
import type { HotelListing } from "../types";
import { SectionHeading } from "./section-heading";
import { mapLinks } from "../lib/map-location";
import styles from "../hotels.module.css";
export function HotelMap({ hotel }: { hotel: HotelListing }) {
  const { locale, t } = useLocale();
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  const links = mapLinks(hotel.coordinates);
  const container = useRef<HTMLElement>(null);
  const hasLocation = !!links;
  const mappedHotel = hotels.find(
    (candidate) => !!mapLinks(candidate.coordinates),
  );
  useEffect(() => {
    if (
      !hasLocation ||
      active ||
      !container.current ||
      !("IntersectionObserver" in window)
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150px" },
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [hasLocation, active]);
  return (
    <section ref={container} id="location" className={styles.detailSection}>
      <SectionHeading icon="pin" title={t("Location", "الموقع")}>
        {hotelDisplayAddress(hotel.address[locale], locale)}
      </SectionHeading>
      {links ? (
        <>
          <p className={styles.muted}>
            {t(
              "Interactive map by OpenStreetMap. Zoom or drag to explore this hotel’s location.",
              "خريطة تفاعلية من OpenStreetMap. كبّر أو اسحب لاستكشاف موقع هذا الفندق.",
            )}
          </p>
          <details>
            <summary>{t("View More", "عرض المزيد")}</summary>
            <p>
              {t(
                "The map shows this hotel’s published location. Confirm travel details with the property before travelling.",
                "تعرض الخريطة موقع الفندق المنشور. تحقق من تفاصيل السفر مع الفندق قبل السفر.",
              )}
            </p>
            {hotel.coordinates && (
              <a
                href={hotel.coordinates.source}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("Location source", "مصدر الموقع")}
              </a>
            )}
          </details>
          <div className={styles.map}>
            {active && !failed ? (
              <iframe
                title={`${t("Hotel location map", "خريطة موقع الفندق")}: ${hotelDisplayName(hotel.name[locale])}`}
                src={links.embed}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setFailed(true)}
              />
            ) : (
              <div className={styles.mapPlaceholder}>
                <p>
                  {failed
                    ? t(
                        "The map could not load. Try again or open Google Maps.",
                        "تعذر تحميل الخريطة. حاول مجدداً أو افتح خرائط جوجل.",
                      )
                    : t("Explore the hotel location", "استكشف موقع الفندق")}
                </p>
                <button
                  className={styles.primary}
                  onClick={() => {
                    setFailed(false);
                    setActive(true);
                  }}
                >
                  {t("Load interactive map", "تحميل الخريطة التفاعلية")}
                </button>
              </div>
            )}
          </div>
          <p>
            <a href={links.google} target="_blank" rel="noopener noreferrer">
              {t("Open in Google Maps", "افتح في خرائط جوجل")}
            </a>
          </p>
          <p className={styles.muted}>
            {t(
              "If the embedded map is blocked or unavailable, use the external map link.",
              "إذا تعذر عرض الخريطة المضمنة، استخدم رابط الخرائط الخارجي.",
            )}
          </p>
        </>
      ) : (
        <div className={styles.empty}>
          <p>
            {t(
              "A verified location is not available for this listing.",
              "لا يتوفر موقع موثوق لهذا الفندق.",
            )}
          </p>
          {mappedHotel && (
            <Link to={`/hotels/${mappedHotel.id}#location`}>
              {t(
                `View the mapped location for ${mappedHotel.name.en}`,
                `عرض الموقع المتاح لـ ${mappedHotel.name.ar}`,
              )}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
