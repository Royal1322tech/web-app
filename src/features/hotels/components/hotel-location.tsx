import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import { directionsUrl, haversineKm, type GeoPoint } from "../lib/geo";
import { hotelDisplayAddress, hotelDisplayName } from "../lib/presentation";
import { mapLinks } from "../lib/map-location";
import type { HotelListing } from "../types";
import { SectionHeading } from "./section-heading";
import "./hotel-location.css";

const HotelLocationMap = lazy(() => import("./hotel-location-map"));

type LocationState =
  | { status: "idle" | "locating" | "denied" | "unavailable" | "timeout" | "unsupported" }
  | { status: "ready"; point: GeoPoint };

/** Keeps a map failure (script, tiles setup) from breaking Hotel Details. */
export class MapBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Location & Directions. Shows a map only for verified coordinates, asks for the traveller's
 * location only after a click, and keeps that position in memory without storing or sending it.
 */
export function HotelLocation({ hotel }: { hotel: HotelListing }) {
  const { t, locale } = useLocale();
  const container = useRef<HTMLElement>(null);
  const mounted = useRef(true);
  // Without IntersectionObserver the map loads immediately.
  const [mapActive, setMapActive] = useState(() => typeof IntersectionObserver === "undefined");
  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const verified = mapLinks(hotel.coordinates) ? hotel.coordinates : undefined;
  const hotelName = hotelDisplayName(hotel.name[locale]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Load the map only when the section is close to the viewport.
  useEffect(() => {
    if (!verified || mapActive || !container.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setMapActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [verified, mapActive]);

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setLocation({ status: "unsupported" });
      return;
    }
    setLocation({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mounted.current) return;
        setLocation({ status: "ready", point: { latitude: position.coords.latitude, longitude: position.coords.longitude } });
      },
      (error) => {
        if (!mounted.current) return;
        setLocation({
          status: error.code === error.PERMISSION_DENIED ? "denied" : error.code === error.TIMEOUT ? "timeout" : "unavailable",
        });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  const user = location.status === "ready" ? location.point : undefined;
  const distance = verified && user ? haversineKm(user, verified) : undefined;
  const messages: Partial<Record<LocationState["status"], string>> = {
    locating: t("Finding your location…", "جارٍ تحديد موقعك…"),
    denied: t("Location permission was denied. You can still get directions; Google Maps will ask for your starting point.", "تم رفض إذن الموقع. ما زال بإمكانك الحصول على الاتجاهات، وسيطلب منك خرائط جوجل نقطة البداية."),
    unavailable: t("Your location could not be determined. Check your device location settings and try again.", "تعذر تحديد موقعك. تحقق من إعدادات الموقع في جهازك وحاول مرة أخرى."),
    timeout: t("Finding your location took too long. Please try again.", "استغرق تحديد موقعك وقتًا طويلًا. حاول مرة أخرى."),
    unsupported: t("This browser does not support location services.", "هذا المتصفح لا يدعم خدمات تحديد الموقع."),
  };

  return (
    <section ref={container} id="location" className="hotel-location" aria-labelledby="hotel-location-title">
      <SectionHeading icon="pin" title={t("Location & Directions", "الموقع والاتجاهات")} id="hotel-location-title">
        {hotelDisplayAddress(hotel.address[locale], locale)}
      </SectionHeading>
      {!verified ? (
        <div className="hotel-location__unavailable">
          <Icon name="info" />
          <p>
            {t(
              "A verified location is not available for this listing, so no map or distance is shown.",
              "لا يتوفر موقع موثوق لهذا الفندق، لذلك لا تُعرض خريطة أو مسافة.",
            )}
          </p>
        </div>
      ) : (
        <div className="hotel-location__layout">
          <div className="hotel-location__map" dir="ltr" role="region" aria-label={`${t("Hotel location map", "خريطة موقع الفندق")}: ${hotelName}`}>
            <MapBoundary
              fallback={
                <p className="hotel-location__map-message" dir={locale === "ar" ? "rtl" : "ltr"}>
                  {t("The map could not load. Use Get Directions to open Google Maps.", "تعذر تحميل الخريطة. استخدم زر الاتجاهات لفتح خرائط جوجل.")}
                </p>
              }
            >
              {mapActive ? (
                <Suspense fallback={<p className="hotel-location__map-message">{t("Loading map…", "جارٍ تحميل الخريطة…")}</p>}>
                  <HotelLocationMap
                    hotel={verified}
                    user={user}
                    hotelLabel={hotelName}
                    userLabel={t("Your location", "موقعك")}
                  />
                </Suspense>
              ) : (
                <p className="hotel-location__map-message">{t("The map loads as you scroll to this section.", "تُحمَّل الخريطة عند الوصول إلى هذا القسم.")}</p>
              )}
            </MapBoundary>
          </div>
          <div className="hotel-location__panel">
            <div className="hotel-location__actions">
              <button type="button" className="button button--outline" onClick={requestLocation} disabled={location.status === "locating"}>
                <Icon name="pin" />
                {user ? t("Update My Location", "تحديث موقعي") : t("Use My Location", "استخدم موقعي")}
              </button>
              <a className="button button--primary" href={directionsUrl(verified)} target="_blank" rel="noopener noreferrer">
                {t("Get Directions", "احصل على الاتجاهات")}
                <Icon name="arrowRight" />
              </a>
            </div>
            <div className="hotel-location__status" role="status" aria-live="polite">
              {distance !== undefined ? (
                <p className="hotel-location__distance">
                  <strong>
                    {new Intl.NumberFormat(locale, { maximumFractionDigits: distance < 10 ? 1 : 0 }).format(distance)} {t("km", "كم")}
                  </strong>
                  <span>{t("Straight-line distance from your location — not a driving distance.", "المسافة المباشرة من موقعك — وليست مسافة القيادة.")}</span>
                </p>
              ) : (
                messages[location.status] && <p className={`hotel-location__message hotel-location__message--${location.status}`}>{messages[location.status]}</p>
              )}
            </div>
            {user && (
              <button type="button" className="text-button" onClick={() => setLocation({ status: "idle" })}>
                {t("Clear my location", "مسح موقعي")}
              </button>
            )}
            <p className="hotel-location__note">
              {t(
                "Your location is used only on this page to measure distance. It is not saved or sent.",
                "يُستخدم موقعك في هذه الصفحة فقط لحساب المسافة، ولا يتم حفظه أو إرساله.",
              )}
            </p>
            {hotel.coordinates?.source && (
              <a className="hotel-location__source" href={hotel.coordinates.source} target="_blank" rel="noopener noreferrer">
                {t("Location source", "مصدر الموقع")}
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
