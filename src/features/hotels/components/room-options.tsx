import { roomIsUnavailable } from "@/features/demo/room-policy";
import { ResponsiveImage as Image } from "@/components/ui/responsive-image";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useLocale } from "@/features/localization/locale-provider";
import {
  roomsForHotel,
  type SampleRoom,
  type SampleRoomRate,
} from "../data/rooms.fixture";
import { samplePriceBreakdown, type StayDates } from "../lib/sample-stay";
import type { HotelSummary } from "../types";
import { SelectRoomButton } from "@/features/demo/select-room";
import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import { PriceChart } from "./price-chart";
import styles from "../hotels.module.css";

type Selection =
  | { kind: "room"; room: SampleRoom }
  | { kind: "price"; room: SampleRoom; rate: SampleRoomRate };

export function RoomOptions({
  hotel,
  dates,
}: {
  hotel: HotelSummary;
  dates?: StayDates & Partial<Pick<HotelSearchCriteria, "rooms">>;
}) {
  const { locale, t } = useLocale();
  const id = useId();
  const rooms = roomsForHotel(hotel.id);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (selection) dialog.current?.showModal();
  }, [selection]);
  const allExpanded = rooms.length > 0 && expanded.length === rooms.length;
  const money = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  function open(next: Selection, button: HTMLButtonElement) {
    trigger.current = button;
    setPhotoIndex(0);
    setSelection(next);
  }
  function toggle(roomId: string) {
    setExpanded((current) =>
      current.includes(roomId)
        ? current.filter((value) => value !== roomId)
        : [...current, roomId],
    );
  }
  const breakdown =
    selection?.kind === "price"
      ? samplePriceBreakdown(selection.rate.nightlyRate, dates)
      : null;
  return (
    <div className={styles.roomOptions}>
      <p className={styles.muted}>
        {t(
          "Sample room options — not live availability. Policies and remaining places below are design examples.",
          "خيارات غرف تجريبية وليست توافراً مباشراً. السياسات والأماكن المتبقية أدناه أمثلة تصميمية.",
        )}
      </p>
      <details className={styles.alternativeDates}>
        <summary>
          <Icon name="calendar" />
          <strong>{t("Alternative Date", "تاريخ بديل")}</strong>
          <span>
            {t(
              "Check prices on nearby dates",
              "تحقق من أسعار التواريخ القريبة",
            )}
          </span>
          <Icon name="chevron" />
        </summary>
        <PriceChart compact />
      </details>
      {rooms.length ? (
        <>
          <div className={styles.expandRooms}>
            <button
              type="button"
              className={styles.textAction}
              aria-expanded={allExpanded}
              onClick={() =>
                setExpanded(allExpanded ? [] : rooms.map((room) => room.id))
              }
            >
              {allExpanded
                ? t("Collapse All Rooms", "طي كل الغرف")
                : t("Expand All Rooms", "عرض كل الغرف")}
            </button>
          </div>
          {rooms.map((room) => {
            const isOpen = expanded.includes(room.id);
            const panelId = `${id}-${room.id}`;
            const total = samplePriceBreakdown(
              room.rates[0].nightlyRate,
              dates,
            );
            return (
              <section key={room.id} className={styles.roomOption}>
                <h3>
                  <button
                    type="button"
                    className={styles.roomToggle}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(room.id)}
                  >
                    <span>{room.name[locale]}</span>
                    <span className={styles.roomAmount}>
                      <bdi>{money(total.total)}</bdi>
                      <small>
                        {t(`${total.nights} nights`, `${total.nights} ليالٍ`)}
                      </small>
                      <Icon name="chevron" />
                    </span>
                  </button>
                </h3>
                <div className={styles.roomMetadata}>
                  <span>
                    <Icon name="size" />
                    <bdi>{room.size} m²</bdi>
                  </span>
                  <span>
                    <Icon name="bed" />
                    {room.bed[locale]}
                  </span>
                  <button
                    type="button"
                    className={styles.textAction}
                    onClick={(event) =>
                      open({ kind: "room", room }, event.currentTarget)
                    }
                  >
                    {t("Room Details", "تفاصيل الغرفة")}
                  </button>
                </div>
                <div id={panelId} hidden={!isOpen}>
                  {room.rates.map((rate, index) => (
                    <div key={rate.id} className={styles.roomRate}>
                      <strong className={styles.boardName}>
                        {index === 1 ? (
                          <span className="sr-only">{rate.board[locale]}</span>
                        ) : (
                          rate.board[locale]
                        )}
                      </strong>
                      <div className={styles.ratePolicy}>
                        <span>
                          <Icon name="info" />
                          {t(
                            "Non refundable (sample)",
                            "غير قابل للاسترداد (نموذج)",
                          )}
                        </span>
                        {rate.packaging && (
                          <span>
                            <Icon name="cart" />
                            {t("Product for packaging", "منتج ضمن باقة")}
                          </span>
                        )}
                      </div>
                      <span className={styles.samplePlaces}>
                        {roomIsUnavailable(room.id)
                          ? t("Unavailable — demo", "غير متاح — تجريبي")
                          : t("Available — demo", "متاح — تجريبي")}
                      </span>
                      <div className={styles.rateDetails}>
                        <bdi>
                          {money(
                            samplePriceBreakdown(rate.nightlyRate, dates).total,
                          )}
                        </bdi>
                        <button
                          type="button"
                          className={styles.textAction}
                          onClick={(event) =>
                            open(
                              { kind: "price", room, rate },
                              event.currentTarget,
                            )
                          }
                        >
                          {t("Price Details", "تفاصيل السعر")}
                        </button>
                      </div>
                      <SelectRoomButton
                        hotel={hotel}
                        room={room}
                        rate={rate}
                        dates={dates}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </>
      ) : (
        <p className={styles.empty}>
          {t(
            "Room details have not been supplied for this sample property.",
            "لم تُقدّم تفاصيل غرف لهذا الفندق التجريبي.",
          )}
        </p>
      )}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Native dialog delegates Tab handling to its focusable controls. */}
      <dialog
        ref={dialog}
        className={`${styles.dialog} ${selection?.kind === "room" ? styles.roomDetailDialog : styles.priceDetailDialog}`}
        aria-labelledby={`${id}-dialog-title`}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls =
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            );
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onClose={() => {
          setSelection(null);
          trigger.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < rect.left ||
              event.clientX > rect.right ||
              event.clientY < rect.top ||
              event.clientY > rect.bottom
            )
              dialog.current?.close();
          }
        }}
      >
        <div className={styles.dialogTitle}>
          <h2 id={`${id}-dialog-title`}>
            {selection?.kind === "room"
              ? t("Room Details", "تفاصيل الغرفة")
              : hotel.name[locale]}
          </h2>
          <button
            type="button"
            className={styles.closeDialog}
            aria-label={t("Close", "إغلاق")}
            onClick={() => dialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        {selection?.kind === "room" && (
          <>
            <Image
              className={styles.roomDetailPhoto}
              src={selection.room.photos[photoIndex].src}
              alt={selection.room.photos[photoIndex].label[locale]}
              width={selection.room.photos[photoIndex].width}
              height={selection.room.photos[photoIndex].height}
              sizes="288px"
            />
            <div className={styles.roomDetailThumbs}>
              {selection.room.photos.map((photo, index) => (
                <button
                  type="button"
                  key={photo.src}
                  aria-label={photo.label[locale]}
                  aria-pressed={index === photoIndex}
                  onClick={() => setPhotoIndex(index)}
                >
                  <Image
                    src={photo.src}
                    alt=""
                    width={photo.width}
                    height={photo.height}
                    sizes="72px"
                  />
                </button>
              ))}
            </div>
            <h3>{t("Bed Options", "خيارات الأسرّة")}</h3>
            <p>{selection.room.bed[locale]}</p>
            <h3>{t("Included", "المرافق المشمولة")}</h3>
            <ul className={styles.roomIncluded}>
              {selection.room.included.map((item) => (
                <li key={item.en}>
                  <Icon name="check" />
                  {item[locale]}
                </li>
              ))}
            </ul>
            <p className={styles.muted}>
              {t(
                "Amenities shown in the design reference; not verified property information.",
                "مرافق واردة في مرجع التصميم وليست معلومات موثقة عن الفندق.",
              )}
            </p>
          </>
        )}
        {selection?.kind === "price" && breakdown && (
          <>
            <h3>
              {t(
                `Price per night (${breakdown.nights} nights)`,
                `السعر لليلة (${breakdown.nights} ليالٍ)`,
              )}{" "}
              <small>
                {t("Average", "المتوسط")}{" "}
                <bdi>{money(selection.rate.nightlyRate)}</bdi>
              </small>
            </h3>
            <div className={styles.nightlyPrices}>
              {breakdown.visibleNights.map((night) => (
                <div key={night.date}>
                  <time dateTime={night.date}>
                    {new Date(`${night.date}T00:00:00Z`).toLocaleDateString(
                      locale,
                      {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        timeZone: "UTC",
                      },
                    )}
                  </time>
                  <strong>
                    <bdi>{money(night.amount)}</bdi>
                  </strong>
                </div>
              ))}
            </div>
            {breakdown.remainingNights > 0 && (
              <p>
                {t(
                  `${breakdown.remainingNights} additional nights at the same nightly price.`,
                  `${breakdown.remainingNights} ليالٍ إضافية بنفس سعر الليلة.`,
                )}
              </p>
            )}
            <h3>{t("Price Details", "تفاصيل السعر")}</h3>
            <dl className={styles.priceBreakdown}>
              <div>
                <dt>
                  {t("1x Double", "١ × غرفة مزدوجة")},{" "}
                  {selection.rate.board[locale]} (
                  {t(`${breakdown.nights} nights`, `${breakdown.nights} ليالٍ`)}
                  )
                </dt>
                <dd>
                  <bdi>{money(breakdown.total)}</bdi>
                </dd>
              </div>
              <div>
                <dt>{t("Total room price", "إجمالي سعر الغرفة")}</dt>
                <dd>
                  <bdi>{money(breakdown.total)}</bdi>
                </dd>
              </div>
            </dl>
            <p className={styles.muted}>
              {breakdown.isReference
                ? t(
                    "Reference stay: 11–14 Oct 2026. Select stay dates in Search to preview another duration.",
                    "إقامة مرجعية: ١١–١٤ أكتوبر ٢٠٢٦. اختر تواريخ الإقامة في البحث لمعاينة مدة أخرى.",
                  )
                : t(
                    "Calculated from your selected dates for one sample room.",
                    "محسوب من التواريخ المختارة لغرفة تجريبية واحدة.",
                  )}
            </p>
            <p className={styles.muted}>
              {t(
                "Sample calculation only. Taxes and booking terms have not been supplied; this is not a quote.",
                "حساب تجريبي فقط. لم تُقدّم الضرائب أو شروط الحجز؛ هذا ليس عرض سعر.",
              )}
            </p>
          </>
        )}
      </dialog>
    </div>
  );
}
