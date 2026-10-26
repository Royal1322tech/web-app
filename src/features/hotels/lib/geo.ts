export interface GeoPoint {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371.0088;

/** Great-circle (straight-line) distance in kilometres using the Haversine formula. Not a driving distance. */
export function haversineKm(from: GeoPoint, to: GeoPoint): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(to.latitude - from.latitude);
  const dLon = radians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Google Maps directions to the hotel. The traveller's position is intentionally not included:
 * Google Maps asks for the starting point itself, so the app never transmits the user's location.
 */
export function directionsUrl(destination: GeoPoint): string {
  const params = new URLSearchParams({ api: "1", destination: `${destination.latitude},${destination.longitude}` });
  return `https://www.google.com/maps/dir/?${params}`;
}
