import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { BackLink } from "@/components/ui/back-link";
import { Icon, type IconName } from "@/components/ui/icon";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { useLocale } from "@/features/localization/locale-provider";
import { useTravelPreferences } from "@/features/preferences/travel-preferences";
import { isB2BSearchCurrency } from "../api/b2b-hotel-search";
import { isHotelHid, toRoomsRequest } from "../api/b2b-hotel-rooms";
import { findDestination } from "../data/destinations";
import { apiHotelSearchEnabled } from "../hotel-search-config";
import { hotelImageUrl } from "../lib/live-hotels";
import { readHotelSummary, roomsPath, type RoomsHotelSummary } from "../lib/rooms-route";
import { readStayQuery, stayQuery } from "../lib/stay-query";
import {
  REDUCE_PRICE_FILE_ACCEPT,
  reducePriceSchema,
  reducePriceSubmissionAvailable,
  type ReducePriceFormInput,
} from "../price-reduction-request";
import { CatalogShell } from "./catalog-shell";
import styles from "./reduce-price-page.module.css";

type Stay = NonNullable<ReturnType<typeof readStayQuery>>;

const messages: Record<string, [string, string]> = {
  "Enter the price you'd like.": ["Enter the price you'd like.", "أدخل السعر الذي تطلبه."],
  "Enter a valid amount, for example 120 or 120.50.": ["Enter a valid amount, for example 120 or 120.50.", "أدخل مبلغًا صحيحًا، مثل 120 أو 120.50."],
  "The amount must be greater than zero.": ["The amount must be greater than zero.", "يجب أن يكون المبلغ أكبر من صفر."],
  "Attach a JPG, PNG or PDF file.": ["Attach a JPG, PNG or PDF file.", "أرفق ملفًا بصيغة JPG أو PNG أو PDF."],
  "The file must be 5 MB or smaller.": ["The file must be 5 MB or smaller.", "يجب ألا يتجاوز حجم الملف 5 ميغابايت."],
  "Notes can be up to 1,000 characters.": ["Notes can be up to 1,000 characters.", "يمكن أن تصل الملاحظات إلى 1000 حرف."],
};

/** Router state from the rooms page: the hotel summary, and a room name when one was chosen. */
const readRoomName = (state: unknown): string | null => {
  const room = state && typeof state === "object" && "room" in state ? (state as { room: unknown }).room : null;
  return typeof room === "string" && room.trim() ? room.trim() : null;
};

/**
 * Reduce Price request for one hotel and stay. It reuses the stay from the URL and the hotel details
 * carried from the search; nothing is invented when they're missing. There is no approved endpoint,
 * so the details can be prepared and checked but not sent, and no document leaves the browser.
 */
export function ReducePricePage() {
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
  const roomName = readRoomName(location.state);
  const roomsHref = criteria && isHotelHid(hid) ? roomsPath(hid, stayQuery(criteria)) : "/search";
  const searchHref = criteria ? `/search?${stayQuery(criteria)}` : "/search";
  const backState = summary ? { hotel: summary } : undefined;

  if (!apiHotelSearchEnabled) return <Navigate to="/search" replace />;
  const valid = isHotelHid(hid) && criteria && request;

  return (
    <CatalogShell
      title={t("Request a Lower Price", "طلب سعر أقل")}
      trail={valid ? [{ to: searchHref, label: t("Search results", "نتائج البحث") }, { to: roomsHref, label: t("Rooms", "الغرف") }] : []}
    >
      <div className={styles.page} data-reduce-price-page>
        <BackLink to={roomsHref} state={backState}>{t("Back to rooms", "العودة إلى الغرف")}</BackLink>
        <header className={styles.hero}>
          <ResponsiveImage className={styles.heroImage} src="/images/home/cinematic/coastal-resort.png" alt="" width={1672} height={941} sizes="(max-width: 1320px) 100vw, 1280px" eager />
          <div className={styles.heroCopy}>
            <h1>{t("Request a Lower Price", "طلب سعر أقل")}</h1>
            <p>{t("Found a better rate for this stay? Prepare a request with the price you'd like and any supporting quote.", "وجدت سعرًا أفضل لهذه الإقامة؟ جهّز طلبًا بالسعر الذي تريده وأي عرض سعر داعم.")}</p>
          </div>
        </header>
        {!valid ? (
          <section className={`${styles.card} ${styles.invalid}`} role="alert">
            <h2>{t("This request can't be prepared", "لا يمكن تجهيز هذا الطلب")}</h2>
            <p>{t("The hotel or stay details in this link aren't valid. Open the hotel again from your search results.", "تفاصيل الفندق أو الإقامة في هذا الرابط غير صالحة. افتح الفندق مرة أخرى من نتائج البحث.")}</p>
            <Link className="button button--primary" to="/search">{t("Search hotels", "ابحث عن فنادق")}</Link>
          </section>
        ) : (
          <div className={styles.card}>
            <BookingDetails summary={summary} criteria={criteria} residency={request.residency} currency={request.currency} roomName={roomName} />
            <RequestForm currency={request.currency} roomsHref={roomsHref} backState={backState} />
          </div>
        )}
      </div>
    </CatalogShell>
  );
}

function BookingDetails({ summary, criteria, residency, currency, roomName }: { summary: RoomsHotelSummary | null; criteria: Stay; residency: string; currency: string; roomName: string | null }) {
  const { t, locale } = useLocale();
  const id = useId();
  const date = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const nights = Math.round((Date.parse(criteria.checkOut) - Date.parse(criteria.checkIn)) / 86_400_000);
  const adults = criteria.rooms.reduce((sum, room) => sum + room.adults, 0);
  const children = criteria.rooms.reduce((sum, room) => sum + room.childAges.length, 0);
  const place = findDestination(criteria.destination);
  const image = hotelImageUrl(summary?.image ?? null);
  const country = new Intl.DisplayNames([locale], { type: "region" }).of(residency.toUpperCase()) ?? residency.toUpperCase();
  const location = summary?.address ?? (place ? t(place.name.en, place.name.ar) : null);
  const rows: [IconName, string, ReactNode][] = [
    ["calendar", t("Check-in", "الوصول"), date(criteria.checkIn)],
    ["calendar", t("Check-out", "المغادرة"), <><bdi>{date(criteria.checkOut)}</bdi><small className={styles.nights}>{t(`${nights} ${nights === 1 ? "night" : "nights"}`, `${nights} ليالٍ`)}</small></>],
    ["people", t("Guests", "النزلاء"), t(`${adults} ${adults === 1 ? "adult" : "adults"}${children ? `, ${children} ${children === 1 ? "child" : "children"}` : ""}`, `${adults} بالغين${children ? `، ${children} أطفال` : ""}`)],
    ["building", t("Rooms", "الغرف"), t(`${criteria.rooms.length} ${criteria.rooms.length === 1 ? "room" : "rooms"}`, `${criteria.rooms.length} غرف`)],
    ...(roomName ? [["bed", t("Room", "الغرفة"), <bdi key="room">{roomName}</bdi>] as [IconName, string, ReactNode]] : []),
    ["globe", t("Nationality", "الجنسية"), country],
    ["tag", t("Currency", "العملة"), currency],
  ];
  return (
    <section className={styles.details} aria-labelledby={`${id}-details`}>
      <h2 id={`${id}-details`} className={styles.sectionTitle}><span aria-hidden="true"><Icon name="document" /></span>{t("Booking details", "تفاصيل الحجز")}</h2>
      <div className={styles.hotel}>
        {image ? (
          <img className={styles.hotelImage} src={image} alt="" referrerPolicy="no-referrer" />
        ) : (
          <div className={`${styles.hotelImage} ${styles.noPhoto}`} data-image-missing>
            <Icon name="building" aria-hidden="true" />
            <small>{t("No photo provided", "لم تُقدَّم صورة")}</small>
          </div>
        )}
        <div className={styles.hotelText}>
          <h3><bdi>{summary?.name ?? t("Selected hotel", "الفندق المختار")}</bdi></h3>
          {location && <p className={styles.location}><Icon name="pin" aria-hidden="true" /><bdi>{location}</bdi></p>}
          {summary?.stars ? <p className={styles.stars} aria-label={t(`${summary.stars}-star hotel`, `فندق ${summary.stars} نجوم`)}><span aria-hidden="true">{"★".repeat(Math.round(summary.stars))}</span></p> : null}
        </div>
      </div>
      <dl className={styles.facts} aria-label={t("Your stay", "إقامتك")}>
        {rows.map(([icon, label, value]) => (
          <div key={label}>
            <dt><Icon name={icon} aria-hidden="true" />{label}</dt>
            <dd>{typeof value === "string" ? <bdi>{value}</bdi> : value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const formatSize = (bytes: number, locale: string) =>
  bytes >= 1024 * 1024
    ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`
    : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.max(1, Math.round(bytes / 1024)))} KB`;

function RequestForm({ currency, roomsHref, backState }: { currency: string; roomsHref: string; backState: unknown }) {
  const { t, locale } = useLocale();
  const id = useId();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const { register, handleSubmit, control, setValue, trigger, formState: { errors } } = useForm<ReducePriceFormInput>({
    resolver: zodResolver(reducePriceSchema),
    mode: "onTouched",
    defaultValues: { requestedPrice: "", notes: "", document: undefined },
  });
  const documentFiles = useWatch({ control, name: "document" });
  const notes = useWatch({ control, name: "notes" }) ?? "";
  const file = documentFiles?.[0] ?? null;
  const message = (key?: string) => (key ? t(...(messages[key] ?? [key, key])) : undefined);
  const documentField = register("document", { onChange: () => { void trigger("document"); } });
  const priceError = message(errors.requestedPrice?.message);
  const fileError = message(errors.document?.message);
  const notesError = message(errors.notes?.message);

  const clearFile = () => {
    if (fileInput.current) fileInput.current.value = "";
    setValue("document", undefined, { shouldValidate: true });
    fileInput.current?.focus();
  };
  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) setValue("document", event.dataTransfer.files, { shouldValidate: true });
  };

  return (
    <section className={styles.request} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={styles.sectionTitle}><span aria-hidden="true"><Icon name="tag" /></span>{t("Your price request", "طلب السعر")}</h2>
      <form className={styles.form} noValidate onSubmit={handleSubmit(() => undefined)}>
        <div className={styles.field}>
          <label htmlFor={`${id}-price`}>{t(`Requested price (${currency})`, `السعر المطلوب (${currency})`)}<span className={styles.required} aria-hidden="true"> *</span></label>
          <div className={styles.money} data-invalid={!!priceError || undefined}>
            <span className={styles.currency} aria-hidden="true"><bdi>{currency}</bdi></span>
            <input
              id={`${id}-price`}
              inputMode="decimal"
              autoComplete="off"
              dir="ltr"
              placeholder="0.00"
              aria-required="true"
              aria-invalid={!!priceError}
              aria-describedby={`${id}-price-help${priceError ? ` ${id}-price-error` : ""}`}
              {...register("requestedPrice")}
            />
          </div>
          <small id={`${id}-price-help`} className={styles.help}>{t(`Total for the stay, in ${currency}.`, `الإجمالي للإقامة بعملة ${currency}.`)}</small>
          {priceError && <p id={`${id}-price-error`} className={styles.error} role="alert">{priceError}</p>}
        </div>

        <div className={styles.field}>
          <span className={styles.label} id={`${id}-document-label`}>{t("Supporting document", "مستند داعم")} <span className={styles.optional}>{t("(optional)", "(اختياري)")}</span></span>
          <input
            id={`${id}-document`}
            type="file"
            accept={REDUCE_PRICE_FILE_ACCEPT}
            className={styles.fileInput}
            aria-labelledby={`${id}-document-label`}
            aria-describedby={`${id}-document-help${fileError ? ` ${id}-document-error` : ""}`}
            aria-invalid={!!fileError}
            {...documentField}
            ref={(node) => { documentField.ref(node); fileInput.current = node; }}
          />
          {file ? (
            <div className={styles.fileCard} data-invalid={!!fileError || undefined}>
              <span className={styles.fileIcon} aria-hidden="true"><Icon name="document" /></span>
              <span className={styles.fileMeta}><bdi className={styles.fileName}>{file.name}</bdi><small><bdi dir="ltr">{formatSize(file.size, locale)}</bdi></small></span>
              <label htmlFor={`${id}-document`} className={styles.fileAction}>{t("Replace", "استبدال")}</label>
              <button type="button" className={styles.fileRemove} aria-label={t("Remove the file", "إزالة الملف")} onClick={clearFile}><Icon name="close" /></button>
            </div>
          ) : (
            <label
              htmlFor={`${id}-document`}
              className={styles.dropzone}
              data-dragging={dragging || undefined}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <span className={styles.dropIcon} aria-hidden="true"><Icon name="upload" /></span>
              <span><b>{t("Choose a file", "اختر ملفًا")}</b> {t("or drag it here", "أو اسحبه إلى هنا")}</span>
              <small id={`${id}-document-help`}>{t("A competitor quote or screenshot. JPG, PNG or PDF, up to 5 MB.", "عرض سعر منافس أو لقطة شاشة. JPG أو PNG أو PDF، حتى 5 ميغابايت.")}</small>
            </label>
          )}
          {file && <small id={`${id}-document-help`} className={styles.help}>{t("JPG, PNG or PDF, up to 5 MB. The file stays on this device.", "JPG أو PNG أو PDF، حتى 5 ميغابايت. يبقى الملف على هذا الجهاز.")}</small>}
          {fileError && <p id={`${id}-document-error`} className={styles.error} role="alert">{fileError}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${id}-notes`}>{t("Notes", "ملاحظات")} <span className={styles.optional}>{t("(optional)", "(اختياري)")}</span></label>
          <textarea id={`${id}-notes`} rows={4} maxLength={1000} placeholder={t("Add any details that support your request.", "أضف أي تفاصيل تدعم طلبك.")} aria-invalid={!!notesError} aria-describedby={`${id}-notes-count`} {...register("notes")} />
          <small id={`${id}-notes-count`} className={`${styles.help} ${styles.count}`}>{t(`${notes.length} of 1,000 characters`, `${notes.length} من 1000 حرف`)}</small>
          {notesError && <p className={styles.error} role="alert">{notesError}</p>}
        </div>

        <div className={styles.footer}>
          {!reducePriceSubmissionAvailable && (
            <p className={styles.notice} id={`${id}-unavailable`}>
              <Icon name="info" aria-hidden="true" />
              <span>{t("Requests can't be sent online yet. Contact your account manager with these details to request a lower price.", "لا يمكن إرسال الطلبات عبر الإنترنت حاليًا. تواصل مع مدير حسابك بهذه التفاصيل لطلب سعر أقل.")}</span>
            </p>
          )}
          <div className={styles.actions}>
            <Link className="button button--outline" to={roomsHref} state={backState}>{t("Cancel", "إلغاء")}</Link>
            <button type="submit" className="button button--primary" disabled={!reducePriceSubmissionAvailable} aria-describedby={reducePriceSubmissionAvailable ? undefined : `${id}-unavailable`}>
              <Icon name="send" aria-hidden="true" />{t("Send request", "إرسال الطلب")}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
