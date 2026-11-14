import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import { searchDestinations } from "@/features/hotels/data/destinations";
import { LiveHotelCard, LiveHotelCardSkeleton } from "@/features/hotels/components/live-hotel-card";
import { searchFailureMessages } from "@/features/hotels/components/search-failure-messages";
import { useDefaultHotelSearch } from "@/features/hotels/lib/default-hotel-search";
import { stayQuery } from "@/features/hotels/lib/stay-query";
import type { HotelSearchCriteria } from "../schemas/hotel-search.schema";
import { HotelCarousel } from "./featured-deals";
import { HotelCollectionShell, type CollectionItem } from "./hotel-collection";
import styles from "../home.module.css";
import live from "./live-home-hotels.module.css";

const CAROUSEL_COUNT = 10;
const STRIP_COUNT = 8;

function useDates() {
  const { locale } = useLocale();
  return (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
}

/** "A world of stays": the first hotels of the default search, in the existing carousel. */
export function LiveFeaturedHotels() {
  const { t } = useLocale();
  const date = useDates();
  const { state, criteria, destination, retry } = useDefaultHotelSearch();
  const city = t(destination.name.en, destination.name.ar);
  const scope = t(
    `Available in ${city}, ${date(criteria.checkIn)} – ${date(criteria.checkOut)}, 2 adults`,
    `المتاح في ${city}، ${date(criteria.checkIn)} – ${date(criteria.checkOut)}، شخصان بالغان`,
  );

  const note = (
    <p className={live.scope} data-live-scope>
      <Icon name="pin" />
      <span>{scope}{state.status === "done" && !state.result.pricingVerified && <> · {t("prices not yet verified", "الأسعار غير مؤكدة بعد")}</>}</span>
    </p>
  );

  if (state.status === "error") {
    const message = searchFailureMessages[state.failure];
    return (
      <section className={`${styles.section} ${live.statusSection}`} aria-labelledby="deals-title" data-live-home="featured" data-search-state={state.failure}>
        <h2 id="deals-title" className={styles.dealsTitle}>{t("A world of stays. One workspace.", "عالم من الإقامات. مساحة عمل واحدة.")}</h2>
        {note}
        <div className={live.statusBox} role="alert">
          <strong>{t(...message.title)}</strong>
          <p>{t(...message.description)}</p>
          {message.retry && <button type="button" className="button button--outline" onClick={retry}>{t("Retry", "إعادة المحاولة")}</button>}
        </div>
      </section>
    );
  }

  const hotels = state.status === "done" ? state.result.hotels.slice(0, CAROUSEL_COUNT) : [];
  if (state.status === "done" && hotels.length === 0) {
    return (
      <section className={`${styles.section} ${live.statusSection}`} aria-labelledby="deals-title" data-live-home="featured" data-search-state="empty">
        <h2 id="deals-title" className={styles.dealsTitle}>{t("A world of stays. One workspace.", "عالم من الإقامات. مساحة عمل واحدة.")}</h2>
        {note}
        <div className={live.statusBox}>
          <strong>{t("No hotels found for these dates", "لم يتم العثور على فنادق لهذه التواريخ")}</strong>
          <p>{t("Use the search above to try another destination or other dates.", "استخدم البحث أعلاه لتجربة وجهة أو تواريخ أخرى.")}</p>
        </div>
      </section>
    );
  }

  const slides = state.status === "done"
    ? hotels.map((hotel, index) => ({ key: `live-${hotel.result_index ?? "x"}-${index}`, node: <LiveHotelCard hotel={hotel} result={state.result} variant="compact" eager={index < 2} /> }))
    : Array.from({ length: 4 }, (_, index) => ({ key: `skeleton-${index}`, node: <LiveHotelCardSkeleton variant="compact" /> }));

  return (
    <div data-live-home="featured" data-search-state={state.status === "done" ? "results" : "loading"}>
      <HotelCarousel
        note={note}
        slides={slides}
        busy={state.status === "loading"}
        label={t(`Hotels in ${city}`, `فنادق في ${city}`)}
        footer={state.status === "done" && (
          <SeeAll criteria={criteria} total={state.result.total} />
        )}
      />
    </div>
  );
}

function SeeAll({ criteria, total }: { criteria: HotelSearchCriteria; total: number }) {
  const { t } = useLocale();
  return (
    <p className={live.seeAll}>
      <Link to={`/search?${stayQuery(criteria)}`} className="button button--outline">
        {t(`See all ${total} hotels`, `عرض جميع الفنادق (${total})`)}<Icon name="arrowRight" />
      </Link>
    </p>
  );
}

/**
 * "Stay At Best Hotels" with live data: the original illustration, heading, description, toolbar and
 * left-sliding strip, filled with hotels from the same default search as the carousel above (no
 * second request). The toolbar runs a real search for the chosen destination.
 */
export function LiveHotelCollection() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const date = useDates();
  const { state, criteria, destination } = useDefaultHotelSearch();
  const [choice, setChoice] = useState(destination.id);
  const city = t(destination.name.en, destination.name.ar);
  const hotels = state.status === "done" ? state.result.hotels : [];
  // Hotels after the carousel's first ten; if there are none, the same hotels as above.
  const more = hotels.slice(CAROUSEL_COUNT, CAROUSEL_COUNT + STRIP_COUNT);
  const strip = more.length ? more : hotels.slice(0, STRIP_COUNT);

  const items: CollectionItem[] = state.status === "done"
    ? strip.map((hotel, index) => ({ key: `strip-${hotel.result_index ?? "x"}-${index}`, render: () => <LiveHotelCard hotel={hotel} result={state.result} variant="compact" /> }))
    : state.status === "loading"
      ? Array.from({ length: 4 }, (_, index) => ({ key: `skeleton-${index}`, render: () => <LiveHotelCardSkeleton variant="compact" /> }))
      : [];

  const note = (
    <p className={styles.sampleNote} role="status" data-live-scope>
      {state.status === "error"
        ? t("Hotels couldn't be loaded right now. Use the search above to try again.", "تعذر تحميل الفنادق حاليًا. استخدم البحث أعلاه للمحاولة مرة أخرى.")
        : state.status === "done" && strip.length === 0
          ? t("No hotels found for these dates. Choose a destination to search.", "لم يتم العثور على فنادق لهذه التواريخ. اختر وجهة للبحث.")
          : t(
              `Available in ${city}, ${date(criteria.checkIn)} – ${date(criteria.checkOut)}, 2 adults · prices not yet verified`,
              `المتاح في ${city}، ${date(criteria.checkIn)} – ${date(criteria.checkOut)}، شخصان بالغان · الأسعار غير مؤكدة بعد`,
            )}
    </p>
  );

  return (
    <div data-live-home="collection" data-search-state={state.status === "done" ? (strip.length ? "results" : "empty") : state.status === "error" ? state.failure : "loading"}>
      <HotelCollectionShell
        label={t(`Hotels in ${city}`, `فنادق في ${city}`)}
        animate={state.status === "done"}
        stripKey={state.status}
        note={note}
        items={items}
        toolbar={
          <form onSubmit={(event) => { event.preventDefault(); navigate(`/search?${stayQuery({ ...criteria, destination: choice })}`); }}>
            <label htmlFor="hotel-city">
              <span className="sr-only">{t("Destination", "الوجهة")}</span>
              <select id="hotel-city" value={choice} onChange={(event) => setChoice(event.target.value)}>
                {searchDestinations.map((place) => <option key={place.id} value={place.id}>{t(place.name.en, place.name.ar)}</option>)}
              </select>
            </label>
            <button type="submit" className={styles.primaryButton}>{t("Search", "بحث")}</button>
          </form>
        }
      />
    </div>
  );
}
