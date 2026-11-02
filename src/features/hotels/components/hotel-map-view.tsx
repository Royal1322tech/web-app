import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import { useLocale } from "@/features/localization/locale-provider";
import { eventDistanceKm, formatDistanceKm, verifiedHotelPoint } from "../lib/event-proximity";
import type { GeoPoint } from "../lib/geo";
import { hotelDisplayName } from "../lib/presentation";
import { stayQuery } from "../lib/stay-query";
import type { HotelListing } from "../types";
import { MapBoundary } from "./hotel-location";
import "./hotel-map-view.css";

const HotelSearchMap = lazy(() => import("./hotel-search-map"));

/** Wording shared by the map panel and the result cards. Distance is geographic only. */
export function EventDistance({ distance }: { distance?: number }) {
  const { t, locale } = useLocale();
  if (distance === undefined) return <span className="hotel-map__distance hotel-map__distance--none">{t("No verified location — distance unavailable", "لا يوجد موقع موثوق — المسافة غير متاحة")}</span>;
  return <span className="hotel-map__distance"><Icon name="pin" />{t(`${formatDistanceKm(distance, locale)} km from event — straight-line distance`, `${formatDistanceKm(distance, locale)} كم من موقع الفعالية — مسافة مباشرة`)}</span>;
}

export function HotelMapView({
  hotels,
  event,
  criteria,
  onSelectEvent,
  onClearEvent,
}: {
  hotels: readonly HotelListing[];
  event: GeoPoint | null;
  criteria?: HotelSearchCriteria;
  onSelectEvent: (point: GeoPoint) => void;
  onClearEvent: () => void;
}) {
  const { t, locale } = useLocale();
  const locatedCount = hotels.filter((hotel) => verifiedHotelPoint(hotel)).length;
  const coordinate = (value: number) => value.toFixed(4);

  return (
    <div className="hotel-map" data-hotel-map>
      <p className="hotel-map__coverage" role="status">
        {locatedCount === hotels.length
          ? t(`All ${hotels.length} hotels in these results are on the map.`, `جميع الفنادق في هذه النتائج (${hotels.length}) على الخريطة.`)
          : t(
              `${locatedCount} of ${hotels.length} hotels in these results have a verified location and appear on the map.`,
              `${locatedCount} من ${hotels.length} فنادق في هذه النتائج لها موقع موثوق وتظهر على الخريطة.`,
            )}
      </p>
      <MapBoundary fallback={<p className="hotel-map__message">{t("The map could not load. Your results are still available in List View.", "تعذر تحميل الخريطة. ما زالت نتائجك متاحة في عرض القائمة.")}</p>}>
        <Suspense fallback={<p className="hotel-map__message">{t("Loading map…", "جارٍ تحميل الخريطة…")}</p>}>
          <HotelSearchMap hotels={hotels} event={event} criteria={criteria} onSelectEvent={onSelectEvent} />
        </Suspense>
      </MapBoundary>
      <section className="hotel-map__panel" aria-labelledby="hotel-map-event-title">
        <div className="hotel-map__event">
          <div>
            <h3 id="hotel-map-event-title">{t("Hotels Near Your Event", "فنادق قريبة من فعاليتك")}</h3>
            {event ? (
              <p>
                {t("Selected map point", "النقطة المحددة على الخريطة")}: <bdi>{coordinate(event.latitude)}, {coordinate(event.longitude)}</bdi>
                <small>{t("Click the map or drag the marker to move it.", "اضغط على الخريطة أو اسحب العلامة لتحريكها.")}</small>
              </p>
            ) : (
              <p>{t("Click the map to mark your event location and see how far each hotel is.", "اضغط على الخريطة لتحديد موقع فعاليتك ومعرفة بُعد كل فندق.")}</p>
            )}
          </div>
          {event && <button type="button" className="button button--outline button--sm" onClick={onClearEvent}>{t("Clear event location", "مسح موقع الفعالية")}</button>}
        </div>
        {event && <p className="hotel-map__note">{t("Distances are approximate straight lines between two points on the map. They are not travel routes or times.", "المسافات تقريبية بخط مستقيم بين نقطتين على الخريطة، وليست مسارات أو أزمنة سفر.")}</p>}
        {hotels.length > 0 && (
          <ul className="hotel-map__list">
            {hotels.map((hotel) => (
              <li key={hotel.id}>
                <Link to={`/hotels/${hotel.id}${criteria ? `?${stayQuery({ ...criteria, destination: hotel.city.en })}` : ""}`}>{hotelDisplayName(hotel.name[locale])}</Link>
                {event ? <EventDistance distance={eventDistanceKm(hotel, event)} /> : !verifiedHotelPoint(hotel) && <span className="hotel-map__distance hotel-map__distance--none">{t("No verified location — not on the map", "لا يوجد موقع موثوق — ليس على الخريطة")}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
