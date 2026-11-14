import type { GeoPoint } from "../lib/geo";

export interface SearchDestination {
  /**
   * Stable value used by the selector and the `destination` search parameter. The Egyptian IDs are
   * their original English names, so existing links and the sample catalogue keep working.
   */
  id: string;
  name: { en: string; ar: string };
  country: { code: string; en: string; ar: string };
  /** City centre. Hotel search sends these numbers, never the city name. */
  point: GeoPoint;
}

export const searchDestinations: readonly SearchDestination[] = [
  { id: "Alexandria", name: { en: "Alexandria", ar: "الإسكندرية" }, country: { code: "EG", en: "Egypt", ar: "مصر" }, point: { latitude: 31.2001, longitude: 29.9187 } },
  { id: "Cairo", name: { en: "Cairo", ar: "القاهرة" }, country: { code: "EG", en: "Egypt", ar: "مصر" }, point: { latitude: 30.0444, longitude: 31.2357 } },
  { id: "Hurghada", name: { en: "Hurghada", ar: "الغردقة" }, country: { code: "EG", en: "Egypt", ar: "مصر" }, point: { latitude: 27.2579, longitude: 33.8116 } },
  { id: "Sharm El Sheikh", name: { en: "Sharm El Sheikh", ar: "شرم الشيخ" }, country: { code: "EG", en: "Egypt", ar: "مصر" }, point: { latitude: 27.9158, longitude: 34.33 } },
  { id: "dubai", name: { en: "Dubai", ar: "دبي" }, country: { code: "AE", en: "United Arab Emirates", ar: "الإمارات العربية المتحدة" }, point: { latitude: 25.2048, longitude: 55.2708 } },
  { id: "paris", name: { en: "Paris", ar: "باريس" }, country: { code: "FR", en: "France", ar: "فرنسا" }, point: { latitude: 48.8566, longitude: 2.3522 } },
  { id: "los-angeles", name: { en: "Los Angeles", ar: "لوس أنجلوس" }, country: { code: "US", en: "United States", ar: "الولايات المتحدة" }, point: { latitude: 34.0522, longitude: -118.2437 } },
];

export const findDestination = (id: string | undefined | null): SearchDestination | undefined =>
  id ? searchDestinations.find((destination) => destination.id === id) : undefined;
