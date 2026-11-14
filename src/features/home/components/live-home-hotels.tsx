import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import { searchDestinations } from "@/features/hotels/data/destinations";
import { LiveHotelCard, LiveHotelCardSkeleton } from "@/features/hotels/components/live-hotel-card";
import { searchFailureMessages } from "@/features/hotels/components/search-failure-messages";
import { useDefaultHotelSearch } from "@/features/hotels/lib/default-hotel-search";
import { stayQuery } from "@/features/hotels/lib/stay-query";
import type { HotelSearchCriteria } from "../schemas/hotel-search.schema";
import { HotelCarousel } from "./featured-deals";
import styles from "../home.module.css";
import live from "./live-home-hotels.module.css";

const CAROUSEL_COUNT = 10;
const GRID_COUNT = 8;

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
 * The lower hotel section: more hotels from the same default search (never a "best" ranking), then
 * shortcuts that run a real search for each destination.
 */
export function LiveHotelCollection() {
  const { t } = useLocale();
  const { state, criteria, destination } = useDefaultHotelSearch();
  const city = t(destination.name.en, destination.name.ar);
  const more = state.status === "done" ? state.result.hotels.slice(CAROUSEL_COUNT, CAROUSEL_COUNT + GRID_COUNT) : [];

  return (
    <section className={styles.section} aria-labelledby="collection-title" data-live-home="collection">
      <div className={styles.sectionHeading}>
        <h2 id="collection-title">{t("Explore more stays", "استكشف المزيد من الإقامات")}</h2>
        <p>{more.length
          ? t(`More hotels available in ${city} for the same dates, straight from live availability.`, `المزيد من الفنادق المتاحة في ${city} لنفس التواريخ، مباشرة من التوافر الفعلي.`)
          : t("Search live availability in any of our destinations.", "ابحث في التوافر الفعلي في أي من وجهاتنا.")}</p>
      </div>
      {state.status === "loading" && (
        <div className={live.grid} aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <LiveHotelCardSkeleton key={index} variant="compact" />)}</div>
      )}
      {state.status === "done" && more.length > 0 && (
        <ul className={live.grid} aria-label={t(`More hotels in ${city}`, `المزيد من الفنادق في ${city}`)}>
          {more.map((hotel, index) => (
            <li key={`more-${hotel.result_index ?? "x"}-${index}`}><LiveHotelCard hotel={hotel} result={state.result} variant="compact" /></li>
          ))}
        </ul>
      )}
      <nav className={live.destinations} aria-label={t("Search a destination", "ابحث في وجهة")}>
        <h3>{t("Search a destination", "ابحث في وجهة")}</h3>
        <ul>
          {searchDestinations.map((place) => (
            <li key={place.id}>
              <Link to={`/search?${stayQuery({ ...criteria, destination: place.id })}`}>
                <Icon name="pin" />
                <span><strong>{t(place.name.en, place.name.ar)}</strong><small>{t(place.country.en, place.country.ar)}</small></span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
