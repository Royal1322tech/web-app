import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { latLngBounds, type LatLngTuple } from "leaflet";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { GeoPoint } from "../lib/geo";

/** Re-fits only when a coordinate actually changes, so user panning is not reset on re-render. */
function FitView({ hotel, user }: { hotel: GeoPoint; user?: GeoPoint }) {
  const map = useMap();
  const { latitude: hLat, longitude: hLon } = hotel;
  const uLat = user?.latitude;
  const uLon = user?.longitude;
  useEffect(() => {
    if (uLat !== undefined && uLon !== undefined) map.fitBounds(latLngBounds([[hLat, hLon], [uLat, uLon]]).pad(0.2), { maxZoom: 15 });
    else map.setView([hLat, hLon], 15);
  }, [map, hLat, hLon, uLat, uLon]);
  return null;
}

/** Interactive OpenStreetMap view; loaded lazily. MapContainer removes the Leaflet instance on unmount. */
export default function HotelLocationMap({
  hotel,
  user,
  hotelLabel,
  userLabel,
}: {
  hotel: GeoPoint;
  user?: GeoPoint;
  hotelLabel: string;
  userLabel: string;
}) {
  const hotelPoint: LatLngTuple = [hotel.latitude, hotel.longitude];
  const userPoint: LatLngTuple | undefined = user ? [user.latitude, user.longitude] : undefined;
  return (
    <MapContainer center={hotelPoint} zoom={15} scrollWheelZoom={false} className="hotel-location-map__canvas">
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <CircleMarker center={hotelPoint} radius={10} pathOptions={{ color: "#0b3667", fillColor: "#0e4d92", fillOpacity: 0.9, weight: 3 }}>
        <Tooltip permanent direction="top" offset={[0, -10]}>{hotelLabel}</Tooltip>
      </CircleMarker>
      {userPoint && (
        <CircleMarker center={userPoint} radius={9} pathOptions={{ color: "#00697a", fillColor: "#007f93", fillOpacity: 0.85, weight: 3 }}>
          <Tooltip direction="top" offset={[0, -8]}>{userLabel}</Tooltip>
        </CircleMarker>
      )}
      <FitView hotel={hotel} user={user} />
    </MapContainer>
  );
}
