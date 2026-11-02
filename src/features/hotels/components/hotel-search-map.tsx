import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import { divIcon, latLngBounds, type Map as LeafletMap } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Link } from "react-router-dom";
import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import { useLocale } from "@/features/localization/locale-provider";
import { hotelDisplayRate } from "../lib/display-rate";
import { eventDistanceKm, formatDistanceKm, verifiedHotelPoint } from "../lib/event-proximity";
import type { GeoPoint } from "../lib/geo";
import { hotelDisplayName } from "../lib/presentation";
import { stayQuery } from "../lib/stay-query";
import type { HotelListing } from "../types";

// A neutral overview of Egypt, used only before there is any hotel or event to frame.
const OVERVIEW = { center: [27, 31] as [number, number], zoom: 5 };

/** Frames the hotels when the set changes, not on event changes, so panning is not reset. */
function FitHotels({ points }: { points: readonly GeoPoint[] }) {
  const map = useMap();
  const key = points.map((point) => `${point.latitude},${point.longitude}`).join("|");
  useEffect(() => {
    if (!key) {
      map.setView(OVERVIEW.center, OVERVIEW.zoom);
      return;
    }
    const coordinates = key.split("|").map((pair) => pair.split(",").map(Number) as [number, number]);
    if (coordinates.length === 1) map.setView(coordinates[0], 12);
    else map.fitBounds(latLngBounds(coordinates).pad(0.2), { maxZoom: 13 });
  }, [map, key]);
  return null;
}

function ClickToSelect({ onSelect }: { onSelect: (point: GeoPoint) => void }) {
  useMapEvents({ click: (event) => onSelect({ latitude: event.latlng.lat, longitude: event.latlng.lng }) });
  return null;
}

const eventIcon = divIcon({ className: "hotel-map-event", html: "<span></span>", iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -28] });

function hotelIcon(label: string) {
  // The label is built from a number and a fixed word, so it holds no markup.
  return divIcon({ className: "hotel-map-marker", html: `<span dir="ltr">${label}</span>`, iconSize: [64, 30], iconAnchor: [32, 15], popupAnchor: [0, -15] });
}

/** Interactive map of the current results. Loaded lazily with the Leaflet code. */
export default function HotelSearchMap({
  hotels,
  event,
  criteria,
  onSelectEvent,
}: {
  hotels: readonly HotelListing[];
  event: GeoPoint | null;
  criteria?: HotelSearchCriteria;
  onSelectEvent: (point: GeoPoint) => void;
}) {
  const { t, locale } = useLocale();
  const mapRef = useRef<LeafletMap>(null);
  const located = useMemo(() => hotels.flatMap((hotel) => {
    const point = verifiedHotelPoint(hotel);
    return point ? [{ hotel, point }] : [];
  }), [hotels]);

  return (
    <div className="hotel-map__frame">
      <div dir="ltr" className="hotel-map__canvas-wrap">
        <MapContainer ref={mapRef} center={OVERVIEW.center} zoom={OVERVIEW.zoom} scrollWheelZoom={false} doubleClickZoom={false} className="hotel-map__canvas">
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
          <FitHotels points={located.map(({ point }) => point)} />
          <ClickToSelect onSelect={onSelectEvent} />
          {located.map(({ hotel, point }) => {
            const rate = hotelDisplayRate(hotel);
            const name = hotelDisplayName(hotel.name[locale]);
            const distance = eventDistanceKm(hotel, event);
            return (
              <Marker key={hotel.id} position={[point.latitude, point.longitude]} icon={hotelIcon(`$${rate.amount}`)} title={name} alt={name}>
                <Popup>
                  <div className="hotel-map__popup" dir={locale === "ar" ? "rtl" : "ltr"}>
                    <strong>{name}</strong>
                    <span>{rate.basis === "offer" ? t("From", "من") : t("Listed rate", "السعر المدرج")} <bdi>${rate.amount}</bdi> {t("per night", "لليلة")}</span>
                    {distance !== undefined && <span>{t(`${formatDistanceKm(distance, locale)} km from event — straight-line distance`, `${formatDistanceKm(distance, locale)} كم من موقع الفعالية — مسافة مباشرة`)}</span>}
                    <Link to={`/hotels/${hotel.id}${criteria ? `?${stayQuery({ ...criteria, destination: hotel.city.en })}` : ""}`}>{t("View Hotel", "عرض الفندق")}</Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
          {event && (
            <Marker
              position={[event.latitude, event.longitude]}
              icon={eventIcon}
              draggable
              title={t("Event location", "موقع الفعالية")}
              alt={t("Event location", "موقع الفعالية")}
              zIndexOffset={1000}
              eventHandlers={{
                dragend: (drag) => {
                  const { lat, lng } = drag.target.getLatLng();
                  onSelectEvent({ latitude: lat, longitude: lng });
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <button
        type="button"
        className="hotel-map__centre button button--outline button--sm"
        onClick={() => {
          const centre = mapRef.current?.getCenter();
          if (centre) onSelectEvent({ latitude: centre.lat, longitude: centre.lng });
        }}
      >
        {t("Set event at map centre", "تحديد الفعالية في وسط الخريطة")}
      </button>
    </div>
  );
}
