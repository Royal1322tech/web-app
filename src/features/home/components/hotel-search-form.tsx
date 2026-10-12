import { useNavigate } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { Suspense, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "@/components/ui/icon";
import {
  hotelSearchSchema,
  createRoom,
  type HotelSearchCriteria,
  type HotelSearchFormValues,
} from "../schemas/hotel-search.schema";
import { sampleDestinations } from "../data/hotels.fixture";
import { RoomSelector } from "./room-selector";
import styles from "../home.module.css";

export function HotelSearchForm({
  compact = false,
  onSearch,
  initialValues,
  fixedDestination = false,
}: {
  compact?: boolean;
  fixedDestination?: boolean;
  onSearch?: (criteria: HotelSearchCriteria) => void;
  initialValues?: Partial<HotelSearchFormValues>;
}) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"hotels" | "cars">("hotels");
  const [notice, setNotice] = useState(false);
  const form = useForm<HotelSearchFormValues, unknown, HotelSearchCriteria>({
    resolver: zodResolver(hotelSearchSchema),
    defaultValues: {
      destination: "",
      checkIn: "",
      checkOut: "",
      rooms: [createRoom()],
      ...initialValues,
    },
    shouldUnregister: false,
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <section
      id="hotel-search"
      className={compact ? styles.compactSearch : styles.searchSection}
      aria-label={t("Find your stay", "ابحث عن إقامتك")}
    >
      {!compact && (
        <div
          className={styles.tabs}
          role="tablist"
          tabIndex={-1}
          aria-label={t("Travel service", "خدمات السفر")}
          onKeyDown={(event) => {
            if (
              ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
            ) {
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? "hotels"
                  : event.key === "End"
                    ? "cars"
                    : tab === "hotels"
                      ? "cars"
                      : "hotels";
              setTab(next);
              document.getElementById(`${next}-tab`)?.focus();
            }
          }}
        >
          <button
            type="button"
            role="tab"
            id="hotels-tab"
            aria-selected={tab === "hotels"}
            aria-controls="hotels-panel"
            tabIndex={tab === "hotels" ? 0 : -1}
            onClick={() => setTab("hotels")}
          >
            <Icon name="buildingFilled" />
            {t("Hotels", "فنادق")}
          </button>
          <button
            type="button"
            role="tab"
            id="cars-tab"
            aria-selected={tab === "cars"}
            aria-controls="cars-panel"
            tabIndex={tab === "cars" ? 0 : -1}
            onClick={() => setTab("cars")}
          >
            <Icon name="car" />
            {t("Car Rental", "تأجير السيارات")}
          </button>
        </div>
      )}
      <div
        role="tabpanel"
        id="hotels-panel"
        aria-label={compact ? t("Hotel search", "بحث الفنادق") : undefined}
        aria-labelledby={compact ? undefined : "hotels-tab"}
        hidden={tab !== "hotels"}
      >
        <FormProvider {...form}>
          <form
            className={styles.searchForm}
            noValidate
            onSubmit={handleSubmit(
              (criteria) => {
                if (onSearch) onSearch(criteria);
                else {
                  const query = new URLSearchParams({
                    destination: criteria.destination,
                    checkIn: criteria.checkIn,
                    checkOut: criteria.checkOut,
                    rooms: JSON.stringify(criteria.rooms),
                  });
                  navigate(`/search?${query}`);
                }
                setNotice(true);
              },
              () => setNotice(false),
            )}
          >
            {fixedDestination ? (
              <input type="hidden" {...register("destination")} />
            ) : (
              <div className={styles.searchField}>
                <label htmlFor="destination">
                  <Icon name="pin" />
                  {t("Destination", "الوجهة")}
                </label>
                <select
                  id="destination"
                  aria-invalid={!!errors.destination}
                  aria-describedby={
                    errors.destination ? "destination-error" : undefined
                  }
                  {...register("destination")}
                >
                  <option value="">
                    {t("Select destination", "اختر الوجهة")}{" "}
                  </option>
                  {sampleDestinations.map((city) => (
                    <option key={city} value={city}>
                      {t(
                        city,
                        city === "Alexandria"
                          ? "الإسكندرية"
                          : city === "Cairo"
                            ? "القاهرة"
                            : "الغردقة",
                      )}
                    </option>
                  ))}
                </select>
                {errors.destination && (
                  <p
                    id="destination-error"
                    className={styles.error}
                    role="alert"
                  >
                    {t(errors.destination.message || "Check this field.")}
                  </p>
                )}
              </div>
            )}

            <div className={styles.searchField}>
              <label htmlFor="check-in">
                <Icon name="calendar" />
                {t("Check In", "تسجيل الوصول")}{" "}
              </label>
              <input
                id="check-in"
                type="date"
                aria-invalid={!!errors.checkIn}
                aria-describedby={errors.checkIn ? "check-in-error" : undefined}
                {...register("checkIn")}
              />
              {errors.checkIn && (
                <p id="check-in-error" className={styles.error} role="alert">
                  {t(errors.checkIn.message || "Check this field.")}
                </p>
              )}
            </div>
            <div className={styles.searchField}>
              <label htmlFor="check-out">
                <Icon name="calendar" />
                {t("Check Out", "تسجيل المغادرة")}{" "}
              </label>
              <input
                id="check-out"
                type="date"
                aria-invalid={!!errors.checkOut}
                aria-describedby={
                  errors.checkOut ? "check-out-error" : undefined
                }
                {...register("checkOut")}
              />
              {errors.checkOut && (
                <p id="check-out-error" className={styles.error} role="alert">
                  {t(errors.checkOut.message || "Check this field.")}
                </p>
              )}
            </div>
            <Suspense
              fallback={
                <div className={styles.guestField}>
                  <span className={styles.fieldLabel}>
                    {t("Rooms & Guests", "الغرف والنزلاء")}
                  </span>
                  <button
                    type="button"
                    disabled
                    className={styles.guestTrigger}
                  >
                    Loading rooms…
                  </button>
                </div>
              }
            >
              <RoomSelector />
            </Suspense>
            <button type="submit" className={styles.primaryButton}>
              <Icon name="search" />
              {t("Search", "بحث")}
            </button>
          </form>
        </FormProvider>
        <div role="status" className={styles.searchNotice}>
          {notice &&
            t(
              "Sample results only — live availability is unavailable.",
              "نتائج تجريبية فقط — التوافر المباشر غير متاح.",
            )}
        </div>
      </div>
      <div
        role="tabpanel"
        id="cars-panel"
        aria-labelledby="cars-tab"
        hidden={tab !== "cars"}
        className={styles.pendingPanel}
      >
        <Icon name="car" />
        <h2>{t("Car rental is coming soon", "تأجير السيارات قريباً")} </h2>
        <p>
          {t(
            "The car rental search is awaiting its design and booking service.",
            "خدمة البحث عن السيارات في انتظار التصميم وخدمة الحجز.",
          )}{" "}
        </p>
      </div>
    </section>
  );
}
