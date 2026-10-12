import type { Coordinates } from "../types";
export function mapLinks(point?: Coordinates) {
  if (
    !point ||
    !Number.isFinite(point.latitude) ||
    !Number.isFinite(point.longitude) ||
    Math.abs(point.latitude) > 90 ||
    Math.abs(point.longitude) > 180
  )
    return null;
  const { latitude: lat, longitude: lon } = point;
  const bbox = [
    Math.max(-180, lon - 0.012),
    Math.max(-90, lat - 0.008),
    Math.min(180, lon + 0.012),
    Math.min(90, lat + 0.008),
  ].join(",");
  return {
    embed: `https://www.openstreetmap.org/export/embed.html?${new URLSearchParams({ bbox, layer: "mapnik", marker: `${lat},${lon}` })}`,
    google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`,
  };
}
