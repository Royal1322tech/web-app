import { hotelDisplayName, hotelDisplayAddress } from "../lib/presentation";
import { readStayQuery } from "../lib/stay-query";
import { useSearchParams } from "react-router-dom";
import { RoomOptions } from "./room-options";
import { StatePreview } from "@/components/ui/system-state";
import { type HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import { defaultCriteria } from "@/features/demo/demo-provider";
import { useState } from "react";
import { HotelSearchForm } from "@/features/home/components/hotel-search-form";
import { useLocale } from "@/features/localization/locale-provider";
import type { HotelListing } from "../types";
import { amenityLabels } from "../data/hotels.fixture";
import { CatalogShell } from "./catalog-shell";
import { SectionHeading } from "./section-heading";
import { Icon } from "@/components/ui/icon";
import { HotelGallery } from "./hotel-gallery";
import { HotelMap } from "./hotel-map";
import { RecommendedHotels } from "./recommended-hotels";
import { PriceChart } from "./price-chart";
import { Comparison } from "./comparison";
import styles from "../hotels.module.css";
export function HotelDetails({ hotel }: { hotel: HotelListing }) {
  const { locale, t } = useLocale();
  const [board, setBoard] = useState("any");
  const [query] = useSearchParams();
  const [criteria, setCriteria] = useState<HotelSearchCriteria>(
    () => readStayQuery(query, hotel.city.en) ?? defaultCriteria(hotel.city.en),
  );
  return (
    <CatalogShell title={hotelDisplayName(hotel.name[locale])} detail>
      <HotelGallery hotel={hotel} />
      <div className={styles.detailIntro}>
        <div>
          {hotel.luxury && (
            <span className={styles.badge}>
              {t("Luxury Collection", "مجموعة فاخرة")}
            </span>
          )}
          <h1>{hotelDisplayName(hotel.name[locale])}</h1>
          <p className={styles.address}>
            <Icon name="pin" /> {hotelDisplayAddress(hotel.address[locale], locale)} ·{" "}
            <a href="#location">{t("View On Map", "عرض على الخريطة")}</a>
          </p>
          <ul className={styles.amenityGrid}>
            {hotel.amenities.map((a) => (
              <li key={a}>
                <Icon name={a === "roomService" ? "bell" : "bed"} />
                {amenityLabels[a][locale]}
              </li>
            ))}
          </ul>
          <h2>{t("Overview", "نظرة عامة")}</h2>
          <p>
            {t(
              "Explore the hotel, room options and stay details.",
              "استكشف الفندق وخيارات الغرف وتفاصيل الإقامة.",
            )}
          </p>
          <details>
            <summary>{t("View More", "عرض المزيد")}</summary>
            <p>
              {t(
                "Photos, amenities, ratings and prices are design fixtures, not verified property inventory. Room availability and booking policies will come from the future hotel service.",
                "الصور والمرافق والتقييمات والأسعار بيانات تصميم تجريبية وليست مخزوناً موثقاً للفندق. سيُوفّر توافر الغرف وسياسات الحجز من خدمة الفنادق لاحقاً.",
              )}
            </p>
          </details>
        </div>
        <aside className={styles.facts}>
          <h2 className="sr-only">
            {t("Property information", "معلومات الفندق")}
          </h2>
          <dl className={styles.stayTimes}>
            <dt>{t("Check-in time", "وقت الوصول")}</dt>
            <dd>{t("Not connected", "غير متصل")}</dd>
            <dt>{t("Check-out time", "وقت المغادرة")}</dt>
            <dd>{t("Not connected", "غير متصل")}</dd>
          </dl>
          <dl>
            <dt>{t("Year of most recent renovation", "سنة آخر تجديد")}</dt>
            <dd>—</dd>
            <dt>
              {t(
                "Number of floors (main building)",
                "عدد الطوابق (المبنى الرئيسي)",
              )}
            </dt>
            <dd>—</dd>
            <dt>{t("Connecting rooms", "غرف متصلة")}</dt>
            <dd>—</dd>
            <dt>{t("Number of rooms", "عدد الغرف")}</dt>
            <dd>—</dd>
          </dl>
          <a className={styles.primary} href="#location">
            {t("View On Map", "عرض على الخريطة")}
          </a>
        </aside>
      </div>
      <section id="rooms" className={styles.detailSection}>
        <SectionHeading
          icon="bed"
          title={t("Rooms & Boards", "الغرف والوجبات")}
        >
          {t(
            "Set your stay criteria to review room options and rates.",
            "حدد معايير إقامتك لمراجعة خيارات الغرف والأسعار.",
          )}
        </SectionHeading>
        <div className={styles.roomSearch}>
          <HotelSearchForm
            compact
            fixedDestination
            initialValues={criteria}
            onSearch={setCriteria}
          />
        </div>
        <details>
          <summary>{t("Board preference", "تفضيل الوجبات")}</summary>
          <label className={styles.boardField}>
            {t("Board preference", "تفضيل الوجبات")}
            <select
              aria-label={t("Board preference", "تفضيل الوجبات")}
              value={board}
              onChange={(event) => {
                setBoard(event.target.value);
              }}
            >
              <option value="any">{t("Any board", "كل الخيارات")}</option>
              <option value="room">{t("Room only", "غرفة فقط")}</option>
              <option value="breakfast">
                {t("Breakfast included", "تشمل الإفطار")}
              </option>
            </select>
          </label>
        </details>
        <StatePreview
          emptyTitle={t("No matching rooms", "لا توجد غرف مطابقة")}
        >
          {board === "room" ? (
            <p className={styles.empty}>
              {t(
                "No room-only rates are supplied. Choose Any board or Breakfast included.",
                "لا تتوفر أسعار لغرف دون وجبات. اختر كل الخيارات أو تشمل الإفطار.",
              )}
            </p>
          ) : (
            <RoomOptions hotel={hotel} dates={criteria} />
          )}
        </StatePreview>
      </section>
      <PriceChart />
      <HotelMap hotel={hotel} />
      <RecommendedHotels criteria={criteria} />
      <Comparison />
    </CatalogShell>
  );
}
