import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { Link, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { BackLink } from "@/components/ui/back-link";
import { Icon, type IconName } from "@/components/ui/icon";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { useLocale } from "@/features/localization/locale-provider";
import { b2bSession } from "@/features/auth/b2b-session";
import { ApiError } from "@/lib/api/client";
import { classifyPriceReductionError, requestStatusLabel, submitPriceReductionRequest, type PriceReductionCreated, type PriceReductionFailure } from "../api/b2b-price-reduction";
import { useTravelPreferences } from "@/features/preferences/travel-preferences";
import { isB2BSearchCurrency } from "../api/b2b-hotel-search";
import { isHotelHid, toRoomsRequest } from "../api/b2b-hotel-rooms";
import { findDestination } from "../data/destinations";
import { destinationName } from "../lib/destination-name";
import { apiHotelSearchEnabled } from "../hotel-search-config";
import { hotelImageUrl } from "../lib/live-hotels";
import { readHotelSummary, roomsPath, type RoomsHotelSummary } from "../lib/rooms-route";
import { readStayQuery, stayQuery } from "../lib/stay-query";
import {
  REDUCE_PRICE_FILE_ACCEPT,
  reducePriceSchema,
  reducePriceSubmissionAvailable,
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
  "Enter the hotel name.": ["Enter the hotel name.", "أدخل اسم الفندق."],
  "Choose the room.": ["Choose the room.", "اختر الغرفة."],
  "Use 255 characters or fewer.": ["Use 255 characters or fewer.", "استخدم 255 حرفًا أو أقل."],
};

/** Room names the rooms page loaded for this stay (real rooms reply), for choosing the room. */
const readRoomNames = (state: unknown): string[] => {
  const rooms = state && typeof state === "object" && "rooms" in state ? (state as { rooms: unknown }).rooms : null;
  return Array.isArray(rooms) ? [...new Set(rooms.filter((name): name is string => typeof name === "string" && !!name.trim()).map((name) => name.trim()))].slice(0, 100) : [];
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
  const roomNames = readRoomNames(location.state);
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
            <RequestForm hid={hid} summary={summary} criteria={criteria} currency={request.currency} roomName={roomName} roomNames={roomNames} roomsHref={roomsHref} backState={backState} />
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
  const location = summary?.address ?? (place ? t(place.name.en, place.name.ar) : destinationName(criteria.destination, locale) ?? null);
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

/** The request form. Hotel and room come from the stay; a field is asked for only when it's missing. */
const requestSchema = reducePriceSchema.extend({
  hotelName: z.string().trim().min(1, "Enter the hotel name.").max(255, "Use 255 characters or fewer."),
  roomName: z.string().trim().min(1, "Choose the room.").max(255, "Use 255 characters or fewer."),
});
type RequestInput = z.input<typeof requestSchema>;
type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "done"; created: PriceReductionCreated }
  | { status: "failed"; failure: PriceReductionFailure; retryAt?: number };

const failureText: Record<PriceReductionFailure, [string, string]> = {
  signed_out: ["Your session has ended. Sign in again to send this request.", "انتهت جلستك. سجّل الدخول مرة أخرى لإرسال هذا الطلب."],
  forbidden: ["Your account can't send price requests. Contact your account manager.", "لا يمكن لحسابك إرسال طلبات الأسعار. تواصل مع مدير حسابك."],
  validation: ["Some details weren't accepted. Check the highlighted fields and try again.", "لم تُقبل بعض التفاصيل. راجع الحقول المحددة وحاول مرة أخرى."],
  rate_limited: ["Too many requests. Please wait a moment and try again.", "طلبات كثيرة. يرجى الانتظار قليلًا ثم المحاولة مرة أخرى."],
  network: ["We couldn't reach the server. Check your connection and try again.", "تعذر الوصول إلى الخادم. تحقق من اتصالك وحاول مرة أخرى."],
  timeout: ["The request took too long. Please try again.", "استغرق الطلب وقتًا طويلًا. يرجى المحاولة مرة أخرى."],
  unavailable: ["Price requests are unavailable right now. Please try again later.", "طلبات الأسعار غير متاحة حاليًا. يرجى المحاولة لاحقًا."],
};
/** Server field names → form fields, for 422 messages shown next to the field. */
const serverFields: Record<string, keyof RequestInput> = { requested_price: "requestedPrice", attachment: "document", notes: "notes", hotel_name: "hotelName", room_name: "roomName" };

function RequestForm({ hid, summary, criteria, currency, roomName, roomNames, roomsHref, backState }: {
  hid: number; summary: RoomsHotelSummary | null; criteria: Stay; currency: "USD" | "EGP" | "SAR"; roomName: string | null; roomNames: string[]; roomsHref: string; backState: unknown;
}) {
  const { t, locale } = useLocale();
  const id = useId();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });
  const [now, setNow] = useState(() => Date.now());
  const sending = useRef(false);
  const { register, handleSubmit, control, setValue, setError, trigger, formState: { errors } } = useForm<RequestInput>({
    resolver: zodResolver(requestSchema),
    mode: "onTouched",
    defaultValues: { requestedPrice: "", notes: "", document: undefined, hotelName: summary?.name ?? "", roomName: roomName ?? (roomNames.length === 1 ? roomNames[0] : "") },
  });
  const documentFiles = useWatch({ control, name: "document" });
  const notes = useWatch({ control, name: "notes" }) ?? "";
  const file = documentFiles?.[0] ?? null;
  const message = (key?: string) => (key ? t(...(messages[key] ?? [key, key])) : undefined);
  const documentField = register("document", { onChange: () => { void trigger("document"); } });
  const priceError = message(errors.requestedPrice?.message);
  const fileError = message(errors.document?.message);
  const notesError = message(errors.notes?.message);
  const hotelError = message(errors.hotelName?.message);
  const roomError = message(errors.roomName?.message);
  const retryIn = submit.status === "failed" && submit.retryAt ? Math.max(0, Math.ceil((submit.retryAt - now) / 1000)) : 0;
  useEffect(() => {
    if (!retryIn) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [retryIn]);

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

  const onValid = async (values: RequestInput) => {
    if (sending.current) return; // one request at a time, even on a double click
    const token = b2bSession.token();
    if (!token) { setSubmit({ status: "failed", failure: "signed_out" }); return; }
    sending.current = true;
    setSubmit({ status: "submitting" });
    try {
      const created = await submitPriceReductionRequest({
        supplierHid: hid,
        hotelName: values.hotelName,
        roomName: values.roomName,
        checkin: criteria.checkIn,
        checkout: criteria.checkOut,
        adults: criteria.rooms.reduce((sum, room) => sum + room.adults, 0),
        children: criteria.rooms.reduce((sum, room) => sum + room.childAges.length, 0),
        currency,
        requestedPrice: values.requestedPrice,
        hotelAddress: summary?.address ?? null,
        notes: values.notes,
        attachment: values.document?.[0] ?? null,
      }, { token });
      setSubmit({ status: "done", created });
    } catch (error) {
      const failure = classifyPriceReductionError(error);
      if (error instanceof ApiError && failure === "validation") {
        for (const [field, problems] of Object.entries(error.fieldErrors)) {
          const target = serverFields[field];
          if (target && problems[0]) setError(target, { type: "server", message: problems[0] });
        }
      }
      const wait = error instanceof ApiError && failure === "rate_limited" ? error.retryAfterSeconds : undefined;
      setSubmit({ status: "failed", failure, retryAt: wait ? Date.now() + wait * 1000 : undefined });
    } finally {
      sending.current = false;
    }
  };

  if (submit.status === "done") {
    return (
      <section className={styles.request} aria-labelledby={`${id}-done`} data-request-state="submitted">
        <div className={styles.success} role="status">
          <span className={styles.successIcon} aria-hidden="true"><Icon name="check" /></span>
          <h2 id={`${id}-done`}>{t("Request submitted for review", "تم إرسال الطلب للمراجعة")}</h2>
          <p>{t("Our team will review your requested price for this stay.", "سيراجع فريقنا السعر الذي طلبته لهذه الإقامة.")}</p>
          <dl className={styles.reference}>
            <div><dt>{t("Request number", "رقم الطلب")}</dt><dd><bdi dir="ltr">{submit.created.request_no}</bdi></dd></div>
            <div><dt>{t("Status", "الحالة")}</dt><dd>{requestStatusLabel(submit.created.status, t)}</dd></div>
          </dl>
          <div className={styles.actions}>
            <Link className="button button--outline" to={roomsHref} state={backState}>{t("Back to rooms", "العودة إلى الغرف")}</Link>
            <Link className="button button--primary" to="/price-requests">{t("View my price requests", "عرض طلبات الأسعار")}</Link>
          </div>
        </div>
      </section>
    );
  }

  const submitting = submit.status === "submitting";
  return (
    <section className={styles.request} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={styles.sectionTitle}><span aria-hidden="true"><Icon name="tag" /></span>{t("Your price request", "طلب السعر")}</h2>
      <form className={styles.form} noValidate onSubmit={(event) => { void handleSubmit(onValid)(event); }} aria-busy={submitting || undefined}>
        {!summary?.name && (
          <div className={styles.field}>
            <label htmlFor={`${id}-hotel`}>{t("Hotel name", "اسم الفندق")}<span className={styles.required} aria-hidden="true"> *</span></label>
            <input id={`${id}-hotel`} className={styles.text} maxLength={255} autoComplete="off" aria-required="true" aria-invalid={!!hotelError} aria-describedby={hotelError ? `${id}-hotel-error` : undefined} {...register("hotelName")} />
            {hotelError && <p id={`${id}-hotel-error`} className={styles.error} role="alert">{hotelError}</p>}
          </div>
        )}
        {!roomName && (
          <div className={styles.field}>
            <label htmlFor={`${id}-room`}>{t("Room", "الغرفة")}<span className={styles.required} aria-hidden="true"> *</span></label>
            {roomNames.length ? (
              <select id={`${id}-room`} className={styles.text} aria-required="true" aria-invalid={!!roomError} aria-describedby={roomError ? `${id}-room-error` : undefined} {...register("roomName")}>
                <option value="">{t("Choose a room", "اختر غرفة")}</option>
                {roomNames.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            ) : (
              <input id={`${id}-room`} className={styles.text} maxLength={255} autoComplete="off" placeholder={t("The room type you were quoted", "نوع الغرفة الذي عُرض عليك")} aria-required="true" aria-invalid={!!roomError} aria-describedby={roomError ? `${id}-room-error` : undefined} {...register("roomName")} />
            )}
            {roomError && <p id={`${id}-room-error`} className={styles.error} role="alert">{roomError}</p>}
          </div>
        )}
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
          {file && <small id={`${id}-document-help`} className={styles.help}>{t("JPG, PNG or PDF, up to 5 MB. Sent with your request.", "JPG أو PNG أو PDF، حتى 5 ميغابايت. يُرسل مع طلبك.")}</small>}
          {fileError && <p id={`${id}-document-error`} className={styles.error} role="alert">{fileError}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${id}-notes`}>{t("Notes", "ملاحظات")} <span className={styles.optional}>{t("(optional)", "(اختياري)")}</span></label>
          <textarea id={`${id}-notes`} rows={4} maxLength={1000} placeholder={t("Add any details that support your request.", "أضف أي تفاصيل تدعم طلبك.")} aria-invalid={!!notesError} aria-describedby={`${id}-notes-count`} {...register("notes")} />
          <small id={`${id}-notes-count`} className={`${styles.help} ${styles.count}`}>{t(`${notes.length} of 1,000 characters`, `${notes.length} من 1000 حرف`)}</small>
          {notesError && <p className={styles.error} role="alert">{notesError}</p>}
        </div>

        <div className={styles.footer}>
          {submit.status === "failed" && (
            <p className={`${styles.notice} ${styles.failed}`} role="alert" data-request-state={submit.failure}>
              <Icon name="info" aria-hidden="true" />
              <span>{retryIn ? t(`Too many requests. You can try again in ${retryIn} seconds.`, `طلبات كثيرة. يمكنك المحاولة بعد ${retryIn} ثانية.`) : t(...failureText[submit.failure])}</span>
            </p>
          )}
          <div className={styles.actions}>
            <Link className="button button--outline" to={roomsHref} state={backState}>{t("Cancel", "إلغاء")}</Link>
            <button type="submit" className="button button--primary" disabled={!reducePriceSubmissionAvailable || submitting || retryIn > 0}>
              <Icon name="send" aria-hidden="true" />{submitting ? t("Sending…", "جارٍ الإرسال…") : t("Send request", "إرسال الطلب")}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
