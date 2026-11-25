import { useEffect, useId, useRef, useState } from "react";
import { Link, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { BackLink } from "@/components/ui/back-link";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import { useTravelPreferences } from "@/features/preferences/travel-preferences";
import { b2bSession } from "@/features/auth/b2b-session";
import { isB2BSearchCurrency } from "../api/b2b-hotel-search";
import {
  classifyRoomsError,
  roomsRetryAt,
  confirmedPrice,
  fetchHotelRooms,
  isHotelHid,
  prebookHotelRoom,
  rateIsSelectable,
  selectHotelRoom,
  toRoomsRequest,
  type PrebookResult,
  type RatePrice,
  type RoomRate,
  type RoomsFailure,
  type RoomsRequest,
  type RoomsResult,
  type SelectResult,
} from "../api/b2b-hotel-rooms";
import { apiHotelSearchEnabled } from "../hotel-search-config";
import { findDestination } from "../data/destinations";
import { destinationName } from "../lib/destination-name";
import { hotelImageUrl, mealLabel } from "../lib/live-hotels";
import { readHotelSummary, type RoomsHotelSummary } from "../lib/rooms-route";
import { readStayQuery, stayQuery } from "../lib/stay-query";
import { BookingDraftForm } from "./booking-draft-form";
import { CatalogShell } from "./catalog-shell";
import styles from "./hotel-rooms-page.module.css";

type Text = [en: string, ar: string];

/**
 * Rooms → select → prebook (price recheck) → review, for one hotel. Every token stays in this
 * component's memory: nothing is written to storage or the URL, and leaving or reloading the page
 * starts the flow again. Final booking is not available, so the last step is review only.
 */
export function HotelRoomsPage() {
  const { t, locale } = useLocale();
  const { hid: hidParam } = useParams();
  const [query] = useSearchParams();
  const location = useLocation();
  const preferences = useTravelPreferences();
  const hid = /^\d+$/.test(hidParam ?? "") ? Number(hidParam) : NaN;
  const criteria = readStayQuery(query);
  const currency = isB2BSearchCurrency(preferences.currency) ? preferences.currency : "USD";
  const request = criteria ? toRoomsRequest(criteria, { language: locale === "ar" ? "ar" : "en", currency }) : null;
  const summary = isHotelHid(hid) ? readHotelSummary(location.state, hid) : null;
  const backToResults = criteria ? `/search?${stayQuery(criteria)}` : "/search";
  // Room names from the real rooms reply, offered on the Reduce Price request.
  const [roomNames, setRoomNames] = useState<string[]>([]);

  if (!apiHotelSearchEnabled) return <Navigate to="/search" replace />;

  const title = summary?.name ?? t("Hotel rooms", "غرف الفندق");
  return (
    <CatalogShell title={t("Rooms", "الغرف")}>
      <div className={styles.page} data-rooms-page>
        <BackLink to={backToResults}>{t("Back to search results", "العودة إلى نتائج البحث")}</BackLink>
        {!isHotelHid(hid) || !criteria || !request ? (
          <Notice
            tone="error"
            title={t("These rooms can't be shown", "لا يمكن عرض هذه الغرف")}
            text={!isHotelHid(hid)
              ? t("This hotel link isn't valid. Open the hotel again from your search results.", "رابط الفندق غير صالح. افتح الفندق مرة أخرى من نتائج البحث.")
              : t("The dates, nationality or guests in this link aren't valid. Search again to choose them.", "التواريخ أو الجنسية أو النزلاء في هذا الرابط غير صالحة. ابحث مرة أخرى لاختيارها.")}
            action={<Link className="button button--primary" to={backToResults}>{t("Search hotels", "ابحث عن فنادق")}</Link>}
          />
        ) : (
          <>
            <HotelHeader title={title} summary={summary} criteria={criteria} request={request} />
            <PriceRequestCta to={`/hotels/rooms/${hid}/reduce-price?${stayQuery(criteria)}`} state={{ ...(summary ? { hotel: summary } : {}), rooms: roomNames }} />
            {/* Keyed by the request: new dates, guests, language or currency start again and drop every token. */}
            <RoomsFlow key={`${hid}:${JSON.stringify(request)}`} hid={hid} request={request} searchHref={backToResults} onRoomNames={setRoomNames} />
          </>
        )}
      </div>
    </CatalogShell>
  );
}

/** The Reduce Price entry: a promotional call to action under the hotel header. */
function PriceRequestCta({ to, state }: { to: string; state?: unknown }) {
  const { t } = useLocale();
  const id = useId();
  return (
    <aside className={styles.priceCta} aria-labelledby={`${id}-cta`}>
      <span className={styles.priceCtaIcon} aria-hidden="true"><Icon name="percent" /></span>
      <div className={styles.priceCtaText}>
        <h2 id={`${id}-cta`}>{t("Found a better price?", "وجدت سعرًا أفضل؟")}</h2>
        <p>{t("Tell us the rate you've seen for this stay and prepare a request for a lower price.", "أخبرنا بالسعر الذي وجدته لهذه الإقامة وجهّز طلبًا للحصول على سعر أقل.")}</p>
      </div>
      <Link className={styles.priceCtaButton} to={to} state={state}>
        <span>{t("Request a Lower Price", "اطلب سعرًا أقل")}</span><Icon name="arrowRight" aria-hidden="true" />
      </Link>
    </aside>
  );
}

export function HotelHeader({ title, summary, criteria, request }: {
  title: string;
  summary: RoomsHotelSummary | null;
  criteria: NonNullable<ReturnType<typeof readStayQuery>>;
  request: RoomsRequest;
}) {
  const { t, locale } = useLocale();
  const date = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  const nights = Math.round((Date.parse(criteria.checkOut) - Date.parse(criteria.checkIn)) / 86_400_000);
  const adults = criteria.rooms.reduce((sum, room) => sum + room.adults, 0);
  const children = criteria.rooms.reduce((sum, room) => sum + room.childAges.length, 0);
  const place = findDestination(criteria.destination);
  const image = hotelImageUrl(summary?.image ?? null);
  const country = new Intl.DisplayNames([locale], { type: "region" }).of(request.residency.toUpperCase()) ?? request.residency.toUpperCase();
  return (
    <header className={styles.header}>
      {image ? (
        <img className={styles.headerImage} src={image} alt="" referrerPolicy="no-referrer" />
      ) : (
        // The same neutral "no photo" frame as the search cards: no stock image stands in for the hotel.
        <div className={`${styles.headerImage} ${styles.headerPlaceholder}`} data-image-missing>
          <span aria-hidden="true"><Icon name="building" /></span>
          <small>{t("No photo provided", "لم تُقدَّم صورة")}</small>
        </div>
      )}
      <div className={styles.headerText}>
        {summary?.stars ? <p className={styles.stars} aria-label={t(`${summary.stars}-star hotel`, `فندق ${summary.stars} نجوم`)}><span aria-hidden="true">{"★".repeat(Math.round(summary.stars))}</span></p> : null}
        <h1 className={styles.title}><bdi>{title}</bdi></h1>
        {(summary?.address || criteria.destination) && (
          <p className={styles.address}><Icon name="pin" /><bdi>{summary?.address ?? (place ? t(place.name.en, place.name.ar) : destinationName(criteria.destination, locale))}</bdi></p>
        )}
      </div>
      <dl className={styles.stay} aria-label={t("Your stay", "إقامتك")}>
        <div><dt>{t("Check-in", "الوصول")}</dt><dd><bdi>{date(criteria.checkIn)}</bdi></dd></div>
        <div><dt>{t("Check-out", "المغادرة")}</dt><dd><bdi>{date(criteria.checkOut)}</bdi></dd></div>
        <div><dt>{t("Nights", "الليالي")}</dt><dd>{nights}</dd></div>
        <div>
          <dt>{t("Guests", "النزلاء")}</dt>
          <dd>{t(`${criteria.rooms.length} ${criteria.rooms.length === 1 ? "room" : "rooms"}, ${adults} ${adults === 1 ? "adult" : "adults"}${children ? `, ${children} ${children === 1 ? "child" : "children"}` : ""}`,
            `${criteria.rooms.length} غرف، ${adults} بالغين${children ? `، ${children} أطفال` : ""}`)}</dd>
        </div>
        <div><dt>{t("Nationality", "الجنسية")}</dt><dd>{country}</dd></div>
        <div><dt>{t("Currency", "العملة")}</dt><dd><bdi>{request.currency}</bdi></dd></div>
      </dl>
    </header>
  );
}

/* ---------- The flow ---------- */

type Held<T> = { value: T; expiresAt: number };
type RoomsState = { status: "loading" } | { status: "error"; failure: RoomsFailure; retryAt?: number } | { status: "done"; rooms: Held<RoomsResult> };
type Step =
  | { step: "rooms" }
  | { step: "checking"; rate: RoomRate; phase: "select" | "prebook" }
  | { step: "failed"; rate: RoomRate; failure: RoomsFailure; at: "select" | "prebook"; selection: Held<SelectResult> | null; retryAt?: number }
  | { step: "review"; rate: RoomRate; selection: Held<SelectResult>; review: Held<PrebookResult>; accepted: boolean };

const hold = <T extends { expires_in_seconds: number }>(value: T): Held<T> => ({ value, expiresAt: Date.now() + value.expires_in_seconds * 1000 });

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function RoomsFlow({ hid, request: initialRequest, searchHref, onRoomNames }: { hid: number; request: RoomsRequest; searchHref: string; onRoomNames?: (names: string[]) => void }) {
  const { t } = useLocale();
  // The parent keys this component by the request, so the first value is the one to keep.
  const [request] = useState(initialRequest);
  const [roomsAttempt, setRoomsAttempt] = useState(0);
  const [settled, setSettled] = useState<{ attempt: number; state: RoomsState } | null>(null);
  const [flow, setFlow] = useState<Step>({ step: "rooms" });
  // Every rooms load or selection gets a new generation; replies from an older one are ignored.
  const generation = useRef(0);
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);

  const rooms: RoomsState = settled && settled.attempt === roomsAttempt ? settled.state : { status: "loading" };
  const now = useNow(rooms.status === "done");

  useEffect(() => {
    const attempt = roomsAttempt;
    const local = new AbortController();
    // Deferred so a mount that is immediately undone (React Strict Mode in development) sends nothing.
    const timer = setTimeout(() => {
      const token = b2bSession.token();
      if (!token) { setSettled({ attempt, state: { status: "error", failure: "signed_out" } }); return; }
      fetchHotelRooms(hid, request, { token, signal: local.signal, locale: request.language })
        .then((result) => {
          if (local.signal.aborted) return;
          if (result.hotel_hid !== hid) throw new Error("Rooms reply for another hotel.");
          setSettled({ attempt, state: { status: "done", rooms: hold(result) } });
          onRoomNames?.([...new Set(result.rooms.map((rate) => rate.room_name?.trim()).filter((name): name is string => !!name))]);
        })
        .catch((error: unknown) => { if (!local.signal.aborted) setSettled({ attempt, state: { status: "error", failure: classifyRoomsError(error), retryAt: roomsRetryAt(error) } }); });
    }, 0);
    return () => { clearTimeout(timer); local.abort(); };
  }, [hid, request, roomsAttempt, onRoomNames]);

  // Leaving the page cancels whatever is in flight.
  useEffect(() => () => controller.current?.abort(), []);

  useEffect(() => { if (flow.step === "review") reviewHeading.current?.focus(); }, [flow.step]);

  /** Drops every token and loads fresh rates. */
  function refreshRooms() {
    generation.current += 1;
    controller.current?.abort();
    busy.current = false;
    setFlow({ step: "rooms" });
    setRoomsAttempt((value) => value + 1);
  }

  function chooseAnother() {
    generation.current += 1;
    controller.current?.abort();
    busy.current = false;
    setFlow({ step: "rooms" });
  }

  async function runPrebook(rate: RoomRate, selection: Held<SelectResult>, id: number, signal: AbortSignal, token: string) {
    if (Date.now() >= selection.expiresAt) {
      setFlow({ step: "failed", rate, failure: "expired", at: "prebook", selection: null });
      return;
    }
    setFlow({ step: "checking", rate, phase: "prebook" });
    try {
      const result = await prebookHotelRoom(selection.value.selection_token, { token, signal, locale: request.language });
      if (id !== generation.current) return;
      setFlow({ step: "review", rate, selection, review: hold(result), accepted: false });
    } catch (error) {
      if (id !== generation.current || signal.aborted) return;
      setFlow({ step: "failed", rate, failure: classifyRoomsError(error), at: "prebook", selection, retryAt: roomsRetryAt(error) });
    }
  }

  async function select(rate: RoomRate) {
    if (busy.current || rooms.status !== "done") return;
    if (Date.now() >= rooms.rooms.expiresAt) { refreshRooms(); return; }
    if (!rateIsSelectable(rate)) return;
    const token = b2bSession.token();
    if (!token) { setFlow({ step: "failed", rate, failure: "signed_out", at: "select", selection: null }); return; }
    busy.current = true;
    const id = ++generation.current;
    controller.current?.abort();
    const local = new AbortController();
    controller.current = local;
    setFlow({ step: "checking", rate, phase: "select" });
    try {
      const selected = await selectHotelRoom(rooms.rooms.value.rooms_token, rate.rate_index, { token, signal: local.signal, locale: request.language });
      if (id !== generation.current) return;
      await runPrebook(rate, hold(selected), id, local.signal, token);
    } catch (error) {
      if (id === generation.current && !local.signal.aborted) setFlow({ step: "failed", rate, failure: classifyRoomsError(error), at: "select", selection: null, retryAt: roomsRetryAt(error) });
    } finally {
      if (id === generation.current) busy.current = false;
    }
  }

  async function retryPrebook(rate: RoomRate, selection: Held<SelectResult>) {
    if (busy.current) return;
    const token = b2bSession.token();
    if (!token) { setFlow({ step: "failed", rate, failure: "signed_out", at: "prebook", selection: null }); return; }
    busy.current = true;
    const id = ++generation.current;
    controller.current?.abort();
    const local = new AbortController();
    controller.current = local;
    try {
      await runPrebook(rate, selection, id, local.signal, token);
    } finally {
      if (id === generation.current) busy.current = false;
    }
  }

  const currentStep = flow.step === "rooms" ? 1 : flow.step === "review" ? 3 : 2;

  return (
    <div className={styles.flow}>
      <Steps current={currentStep} />

      {flow.step === "rooms" && rooms.status === "loading" && <RatesSkeleton />}

      {flow.step === "rooms" && rooms.status === "error" && (
        <div data-rooms-state={rooms.failure}>
          <FailureNotice failure={rooms.failure} retryAt={rooms.retryAt} context="rooms" onRefresh={refreshRooms} searchHref={searchHref} />
        </div>
      )}

      {flow.step === "rooms" && rooms.status === "done" && (
        <RatesList rooms={rooms.rooms} now={now} onSelect={(rate) => void select(rate)} onRefresh={refreshRooms} searchHref={searchHref} />
      )}

      {flow.step === "checking" && (
        <section className={styles.panel} aria-busy="true" data-rooms-state={flow.phase === "select" ? "selecting" : "rechecking"}>
          <p className={styles.checking} role="status">
            <span className={styles.spinner} aria-hidden="true" />
            {flow.phase === "select"
              ? t("Reserving your choice with the supplier…", "جارٍ تثبيت اختيارك لدى المورد…")
              : t("Checking the latest price with the supplier…", "جارٍ التحقق من أحدث سعر لدى المورد…")}
          </p>
          <RateSummary rate={flow.rate} label={t("Room you chose", "الغرفة التي اخترتها")} price={flow.rate.price} provisional />
        </section>
      )}

      {flow.step === "failed" && (
        <div data-rooms-state={flow.failure}>
          <FailureNotice
            failure={flow.failure}
            retryAt={flow.retryAt}
            context={flow.at}
            onRefresh={refreshRooms}
            onRetry={flow.at === "prebook" && flow.selection && now < flow.selection.expiresAt
              ? () => void retryPrebook(flow.rate, flow.selection!)
              : flow.at === "select" ? () => void select(flow.rate) : undefined}
            onChooseAnother={chooseAnother}
            searchHref={searchHref}
          />
        </div>
      )}

      {flow.step === "review" && (
        <Review
          headingRef={reviewHeading}
          step={flow}
          now={now}
          onAccept={() => setFlow({ ...flow, accepted: true })}
          onChooseAnother={chooseAnother}
          onRefresh={refreshRooms}
          searchHref={searchHref}
          occupancy={request.guests}
          residency={request.residency}
        />
      )}
    </div>
  );
}

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const { t } = useLocale();
  const steps: Text[] = [["Choose a room", "اختر غرفة"], ["Price check", "التحقق من السعر"], ["Review", "المراجعة"]];
  return (
    <ol className={styles.steps} aria-label={t("Progress", "التقدم")}>
      {steps.map((label, index) => {
        const position = index + 1;
        const state = position < current ? "done" : position === current ? "current" : "next";
        return (
          <li key={label[0]} data-state={state} aria-current={state === "current" ? "step" : undefined}>
            <span className={styles.stepMark} aria-hidden="true">{state === "done" ? <Icon name="check" /> : position}</span>
            <span>{t(...label)}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Rates ---------- */

function RatesSkeleton() {
  const { t } = useLocale();
  return (
    <div aria-busy="true" data-rooms-state="loading">
      <p className={styles.srOnly} role="status">{t("Loading room rates…", "جارٍ تحميل أسعار الغرف…")}</p>
      <ul className={styles.rates} aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <li key={index} className={`${styles.rate} ${styles.rateSkeleton}`}>
            <span className={styles.shimmer} style={{ width: "45%", height: 18 }} />
            <span className={styles.shimmer} style={{ width: "30%", height: 12 }} />
            <span className={styles.shimmer} style={{ width: "20%", height: 24, justifySelf: "end" }} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function RatesList({ rooms, now, onSelect, onRefresh, searchHref }: {
  rooms: Held<RoomsResult>;
  now: number;
  onSelect: (rate: RoomRate) => void;
  onRefresh: () => void;
  searchHref: string;
}) {
  const { t } = useLocale();
  const remaining = Math.max(0, Math.round((rooms.expiresAt - now) / 1000));
  const expired = remaining === 0;
  const rates = rooms.value.rooms;
  if (!rates.length) {
    return (
      <div data-rooms-state="empty">
        <Notice
          title={t("No rooms are available for these dates", "لا توجد غرف متاحة لهذه التواريخ")}
          text={t("Try other dates or guests, or choose another hotel.", "جرّب تواريخ أو نزلاء آخرين، أو اختر فندقًا آخر.")}
          action={<Link className="button button--primary" to={searchHref}>{t("Back to search results", "العودة إلى نتائج البحث")}</Link>}
        />
      </div>
    );
  }
  return (
    <section className={styles.ratesSection} aria-labelledby="rates-title" data-rooms-state={expired ? "rates-expired" : "rates"}>
      <div className={styles.ratesHeading}>
        <h2 id="rates-title">{t(`${rates.length} room ${rates.length === 1 ? "rate" : "rates"}`, `${rates.length} أسعار غرف`)}</h2>
        {expired ? (
          <p className={styles.expiredBar} role="alert">
            {t("These rates have expired. Refresh them to see current availability.", "انتهت صلاحية هذه الأسعار. حدّثها لرؤية التوافر الحالي.")}
            <button type="button" className="button button--primary" onClick={onRefresh}>{t("Refresh rates", "تحديث الأسعار")}</button>
          </p>
        ) : (
          // The rooms_token expires; the API doesn't promise to hold rates or availability.
          <p className={styles.timer}><Icon name="clock" />{t("This rate list is valid for", "قائمة الأسعار صالحة لمدة")} <strong><Countdown seconds={remaining} /></strong></p>
        )}
      </div>
      <p className={styles.note}>{t("Prices are provisional until the price check.", "الأسعار مبدئية حتى التحقق من السعر.")}</p>
      <ul className={styles.rates}>
        {rates.map((rate) => (
          <li key={rate.rate_index}>
            <RateRow rate={rate} disabled={expired} onSelect={() => onSelect(rate)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RateRow({ rate, disabled, onSelect }: { rate: RoomRate; disabled: boolean; onSelect: () => void }) {
  const { t, locale } = useLocale();
  const reasonId = useId();
  const selectable = rateIsSelectable(rate);
  // The price state is already shown in the price block; the reason says why selection is off.
  const reason = disabled
    ? t("Rates expired", "انتهت صلاحية الأسعار")
    : !rate.selectable
      ? t("This rate can't be selected", "لا يمكن اختيار هذا السعر")
      : t("Selectable once the price is confirmed", "يمكن اختياره بعد تأكيد السعر");
  return (
    <article className={styles.rate} data-rate-index={rate.rate_index} data-selectable={selectable && !disabled}>
      <div className={styles.rateInfo}>
        <h3><bdi>{rate.room_name ?? t("Room type not provided", "لم يُذكر نوع الغرفة")}</bdi></h3>
        <ul className={styles.rateFacts}>
          {rate.meal_name && <li><Icon name="food" /><bdi>{mealLabel(rate.meal_name, locale === "ar" ? "ar" : "en")}</bdi></li>}
          {/* The meal plan already says whether breakfast is included; the flag is shown only without one. */}
          {!rate.meal_name && rate.has_breakfast === true && <li data-tone="positive"><Icon name="check" />{t("Breakfast included", "يشمل الإفطار")}</li>}
          {!rate.meal_name && rate.has_breakfast === false && <li>{t("No breakfast", "بدون إفطار")}</li>}
          {rate.bedding_type && <li><Icon name="bed" /><bdi>{rate.bedding_type}</bdi></li>}
        </ul>
      </div>
      <PriceBlock price={rate.price} provisional />
      <div className={styles.rateAction}>
        <button
          type="button"
          className="button button--primary"
          onClick={onSelect}
          disabled={!selectable || disabled}
          aria-describedby={!selectable || disabled ? reasonId : undefined}
        >
          {t("Select room", "اختيار الغرفة")}
        </button>
        {(!selectable || disabled) && <p id={reasonId} className={styles.reason}><Icon name="info" />{reason}</p>}
      </div>
    </article>
  );
}

function PriceBlock({ price, provisional = false, emphasis = false }: { price: RatePrice; provisional?: boolean; emphasis?: boolean }) {
  const { t } = useLocale();
  const confirmed = confirmedPrice(price);
  if (!confirmed) {
    return (
      <div className={styles.price} data-price="unavailable">
        <strong className={styles.priceMissing}>{price.price_on_request ? t("Price on request", "السعر عند الطلب") : t("Price unavailable", "السعر غير متاح")}</strong>
      </div>
    );
  }
  return (
    <div className={styles.price} data-price="confirmed" data-emphasis={emphasis || undefined}>
      <small>{provisional ? t("Customer price (provisional)", "سعر العميل (مبدئي)") : t("Customer price", "سعر العميل")}</small>
      <strong><Money amount={confirmed.amount} currency={confirmed.currency} /></strong>
      {confirmed.agencyAmount && (
        <small className={styles.agencyPrice}>{t("Agency price", "سعر الوكالة")}: <Money amount={confirmed.agencyAmount} currency={confirmed.currency} /></small>
      )}
      {confirmed.propertyTaxes.length > 0 && (
        <small className={styles.propertyTaxes} data-property-taxes>
          {t("Plus taxes paid at the property:", "بالإضافة إلى ضرائب تُدفع في الفندق:")}{" "}
          {confirmed.propertyTaxes.map((tax, index) => <span key={tax.currency}>{index > 0 && " + "}<Money amount={tax.amount} currency={tax.currency} /></span>)}
        </small>
      )}
    </div>
  );
}

/** The amount exactly as the backend sent it, with its own currency. */
function Money({ amount, currency }: { amount: string; currency: string }) {
  return <bdi dir="ltr" className={styles.money}>{currency} {amount}</bdi>;
}

function Countdown({ seconds }: { seconds: number }) {
  const minutes = Math.floor(seconds / 60);
  return <bdi dir="ltr">{minutes}:{String(seconds % 60).padStart(2, "0")}</bdi>;
}

/* ---------- Review ---------- */

function RateSummary({ rate, label, price, provisional = false }: { rate: RoomRate; label: string; price: RatePrice; provisional?: boolean }) {
  const { t, locale } = useLocale();
  return (
    <div className={styles.summary}>
      <div>
        <p className={styles.summaryLabel}>{label}</p>
        <p className={styles.summaryRoom}><bdi>{rate.room_name ?? t("Room type not provided", "لم يُذكر نوع الغرفة")}</bdi></p>
        {rate.meal_name && <p className={styles.summaryMeta}><bdi>{mealLabel(rate.meal_name, locale === "ar" ? "ar" : "en")}</bdi></p>}
      </div>
      <PriceBlock price={price} provisional={provisional} />
    </div>
  );
}

function Review({ headingRef, step, now, onAccept, onChooseAnother, onRefresh, searchHref, occupancy, residency }: {
  occupancy: RoomsRequest["guests"];
  residency: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  step: Extract<Step, { step: "review" }>;
  now: number;
  onAccept: () => void;
  onChooseAnother: () => void;
  onRefresh: () => void;
  searchHref: string;
}) {
  const { t, locale } = useLocale();
  const ackId = useId();
  const [ticked, setTicked] = useState(false);
  const review = step.review.value;
  const latest = confirmedPrice(review.price);
  const before = confirmedPrice(step.selection.value.price) ?? confirmedPrice(step.rate.price);
  const remaining = Math.max(0, Math.round((step.review.expiresAt - now) / 1000));
  const expired = remaining === 0;
  const changed = review.price_changed;
  const roomName = review.room_name ?? step.selection.value.room_name ?? step.rate.room_name;

  if (!latest) {
    // The recheck came back without a confirmed price: nothing can go forward.
    return (
      <section className={styles.panel} data-rooms-state="review-unverified">
        <h2 ref={headingRef} tabIndex={-1} className={styles.reviewTitle}>{t("This price can't be confirmed", "لا يمكن تأكيد هذا السعر")}</h2>
        <p>{t("The supplier didn't confirm a price for this room. Choose another room or refresh the rates.", "لم يؤكد المورد سعرًا لهذه الغرفة. اختر غرفة أخرى أو حدّث الأسعار.")}</p>
        <div className={styles.actions}>
          <button type="button" className="button button--primary" onClick={onRefresh}>{t("Refresh rates", "تحديث الأسعار")}</button>
          <button type="button" className="button button--outline" onClick={onChooseAnother}>{t("Choose another room", "اختيار غرفة أخرى")}</button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby="review-title" data-rooms-state={expired ? "review-expired" : changed && !step.accepted ? "review-price-changed" : "review"}>
      <h2 id="review-title" ref={headingRef} tabIndex={-1} className={styles.reviewTitle}>
        {changed && !step.accepted ? t("The price has changed", "تغيّر السعر") : t("Review your room", "راجع غرفتك")}
      </h2>

      {changed && (
        <div className={styles.changed} role="alert">
          <p className={styles.changedLead}><Icon name="info" />{t("The supplier returned a new price for this room.", "أعاد المورد سعرًا جديدًا لهذه الغرفة.")}</p>
          <dl className={styles.compare}>
            {before && <div><dt>{t("Previous price", "السعر السابق")}</dt><dd><s><Money amount={before.amount} currency={before.currency} /></s></dd></div>}
            <div data-new><dt>{t("New price", "السعر الجديد")}</dt><dd><Money amount={latest.amount} currency={latest.currency} /></dd></div>
          </dl>
          {!step.accepted && !expired && (
            <form className={styles.ack} onSubmit={(event) => { event.preventDefault(); if (ticked) onAccept(); }}>
              <label htmlFor={ackId}>
                <input id={ackId} type="checkbox" checked={ticked} onChange={(event) => setTicked(event.target.checked)} />
                <span>{t("I accept the new price of", "أوافق على السعر الجديد")} <Money amount={latest.amount} currency={latest.currency} /></span>
              </label>
              <button type="submit" className="button button--primary" disabled={!ticked}>{t("Accept new price", "قبول السعر الجديد")}</button>
            </form>
          )}
          {step.accepted && <p className={styles.accepted} role="status"><Icon name="check" />{t("New price accepted.", "تم قبول السعر الجديد.")}</p>}
        </div>
      )}

      <div className={styles.reviewBody} data-locale={locale}>
        <dl className={styles.reviewList}>
          <div><dt>{t("Room", "الغرفة")}</dt><dd><bdi>{roomName ?? t("Room type not provided", "لم يُذكر نوع الغرفة")}</bdi></dd></div>
          {step.rate.meal_name && <div><dt>{t("Meals", "الوجبات")}</dt><dd><bdi>{mealLabel(step.rate.meal_name, locale === "ar" ? "ar" : "en")}</bdi></dd></div>}
          {step.rate.bedding_type && <div><dt>{t("Bedding", "الأسرّة")}</dt><dd><bdi>{step.rate.bedding_type}</bdi></dd></div>}
          <div><dt>{t("Price check", "التحقق من السعر")}</dt><dd>{changed ? t("Price changed", "تغيّر السعر") : t("Price confirmed", "تم تأكيد السعر")}</dd></div>
        </dl>
        <PriceBlock price={review.price} emphasis />
      </div>

      {expired ? (
        <p className={styles.expiredBar} role="alert">
          {t("This price check has expired. Refresh the rates and choose the room again.", "انتهت صلاحية التحقق من السعر. حدّث الأسعار واختر الغرفة مرة أخرى.")}
          <button type="button" className="button button--primary" onClick={onRefresh}>{t("Refresh rates", "تحديث الأسعار")}</button>
        </p>
      ) : (
        // The review_token expires; this isn't a price hold or a reservation.
        <p className={styles.timer}><Icon name="clock" />{t("This price check is valid for", "التحقق من السعر صالح لمدة")} <strong><Countdown seconds={remaining} /></strong></p>
      )}

      {/* Kept mounted after expiry so a draft that was already created stays visible. */}
      {(!changed || step.accepted) && (
        <BookingDraftForm reviewToken={review.review_token} occupancy={occupancy} nationality={residency} expiresAt={step.review.expiresAt} expired={expired} onRefresh={onRefresh} />
      )}

      <p className={styles.bookingNotice} role="note">
        <Icon name="info" />
        <span>{t("This is a price check, not a reservation. You can save it as a booking draft.", "هذا تحقق من السعر وليس حجزًا. يمكنك حفظه كمسودة حجز.")}</span>
      </p>

      <div className={styles.actions}>
        <button type="button" className="button button--outline" onClick={onChooseAnother}>{t("Choose another room", "اختيار غرفة أخرى")}</button>
        <Link className="button button--ghost" to={searchHref}>{t("Back to search results", "العودة إلى نتائج البحث")}</Link>
      </div>
    </section>
  );
}

/* ---------- Notices ---------- */

function Notice({ title, text, action, tone = "info" }: { title: string; text: string; action?: React.ReactNode; tone?: "info" | "error" }) {
  return (
    <section className={styles.notice} data-tone={tone} role={tone === "error" ? "alert" : undefined}>
      <h2>{title}</h2>
      <p>{text}</p>
      {action && <div className={styles.actions}>{action}</div>}
    </section>
  );
}

const failureText: Record<RoomsFailure, { title: Text; text: Text }> = {
  signed_out: { title: ["Your session has ended", "انتهت جلستك"], text: ["Sign in again to see room rates.", "سجّل الدخول مرة أخرى لرؤية أسعار الغرف."] },
  forbidden: { title: ["Hotel rooms aren't enabled for your account", "غرف الفنادق غير مفعّلة لحسابك"], text: ["Your company account doesn't have access to hotel rooms. Contact us to enable it.", "لا يملك حساب شركتك صلاحية الوصول إلى غرف الفنادق. تواصل معنا لتفعيلها."] },
  token_invalid: { title: ["This room choice is no longer valid", "لم يعد هذا الاختيار صالحًا"], text: ["Refresh the rates and choose the room again.", "حدّث الأسعار واختر الغرفة مرة أخرى."] },
  unbookable: { title: ["This rate can't be booked anymore", "لم يعد بالإمكان حجز هذا السعر"], text: ["Refresh the rates or choose another room.", "حدّث الأسعار أو اختر غرفة أخرى."] },
  expired: { title: ["These rates have expired", "انتهت صلاحية هذه الأسعار"], text: ["Refresh the rates to see current availability.", "حدّث الأسعار لرؤية التوافر الحالي."] },
  validation: { title: ["Check your stay details", "راجع تفاصيل إقامتك"], text: ["The dates, nationality or guests weren't accepted. Change your search and try again.", "لم يتم قبول التواريخ أو الجنسية أو النزلاء. عدّل البحث وحاول مرة أخرى."] },
  supplier_unavailable: { title: ["The supplier isn't responding", "المورد لا يستجيب"], text: ["Please try again in a moment.", "يرجى المحاولة مرة أخرى بعد قليل."] },
  network: { title: ["Can't reach the hotel service", "تعذر الوصول إلى خدمة الفنادق"], text: ["Check your internet connection and try again.", "تحقق من اتصالك بالإنترنت وحاول مرة أخرى."] },
  rate_limited: { title: ["Too many requests", "طلبات كثيرة"], text: ["The hotel service is limiting requests. Please wait a moment before trying again.", "خدمة الفنادق تحدّ من الطلبات حاليًا. يرجى الانتظار قليلًا قبل المحاولة مرة أخرى."] },
  timeout: { title: ["The supplier took too long", "استغرق المورد وقتًا طويلًا"], text: ["Please try again.", "يرجى المحاولة مرة أخرى."] },
  unexpected: { title: ["Room rates can't be displayed", "تعذر عرض أسعار الغرف"], text: ["We received a response we couldn't read. Please try again.", "تلقينا ردًا لم نتمكن من قراءته. يرجى المحاولة مرة أخرى."] },
};

function FailureNotice({ failure, retryAt, context, onRefresh, onRetry, onChooseAnother, searchHref }: {
  failure: RoomsFailure;
  retryAt?: number;
  context: "rooms" | "select" | "prebook";
  onRefresh: () => void;
  onRetry?: () => void;
  onChooseAnother?: () => void;
  searchHref: string;
}) {
  const { t } = useLocale();
  // For the rooms list itself, a missing token can only mean the hotel's rooms weren't found.
  const copy = context === "rooms" && failure === "token_invalid"
    ? { title: ["Rooms for this hotel weren't found", "لم يتم العثور على غرف لهذا الفندق"] as Text, text: ["Choose another hotel from your search results.", "اختر فندقًا آخر من نتائج البحث."] as Text }
    : failureText[failure];
  const restart = failure === "token_invalid" || failure === "unbookable" || failure === "expired";
  const retryable = failure === "supplier_unavailable" || failure === "network" || failure === "timeout" || failure === "rate_limited" || failure === "unexpected";
  // While a rate limit is active, retrying would only be refused again: wait out Retry-After.
  const now = useNow(!!retryAt);
  const retryIn = retryAt ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0;
  const waiting = retryIn > 0;
  return (
    <section className={styles.notice} data-tone="error" role="alert">
      <h2>{t(...copy.title)}</h2>
      <p>{t(...copy.text)}</p>
      {waiting && <p role="status" data-retry-in={retryIn}>{t(`You can try again in ${retryIn} seconds.`, `يمكنك المحاولة مرة أخرى بعد ${retryIn} ثانية.`)}</p>}
      <div className={styles.actions}>
        {failure === "signed_out" && <Link className="button button--primary" to="/login">{t("Sign in", "تسجيل الدخول")}</Link>}
        {failure === "validation" && <Link className="button button--primary" to={searchHref}>{t("Change search", "تعديل البحث")}</Link>}
        {context !== "rooms" && restart && <button type="button" className="button button--primary" onClick={onRefresh}>{t("Refresh rates", "تحديث الأسعار")}</button>}
        {context === "rooms" && (restart && failure !== "token_invalid" || retryable) && <button type="button" className="button button--primary" disabled={waiting} onClick={onRefresh}>{t("Try again", "إعادة المحاولة")}</button>}
        {context !== "rooms" && retryable && onRetry && <button type="button" className="button button--primary" disabled={waiting} onClick={onRetry}>{t("Try again", "إعادة المحاولة")}</button>}
        {context !== "rooms" && retryable && !onRetry && <button type="button" className="button button--primary" disabled={waiting} onClick={onRefresh}>{t("Refresh rates", "تحديث الأسعار")}</button>}
        {onChooseAnother && failure !== "signed_out" && <button type="button" className="button button--outline" onClick={onChooseAnother}>{t("Choose another room", "اختيار غرفة أخرى")}</button>}
        {context === "rooms" && failure !== "validation" && <Link className="button button--ghost" to={searchHref}>{t("Back to search results", "العودة إلى نتائج البحث")}</Link>}
      </div>
    </section>
  );
}
