import { countries } from "@/features/agency-registration/data/countries";
import { isNationalityCode, useTravelPreferences } from "@/features/preferences/travel-preferences";
import type { NationalityCode } from "@/features/preferences/travel-preferences";
import { CarRentalOverview } from "@/features/car-rental/car-rental-overview";
import { useNavigate } from "react-router-dom";
import { useLocale } from "@/features/localization/locale-provider";
import { Suspense, useEffect, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
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
  onEdit,
  initialValues,
  fixedDestination = false,
}: {
  compact?: boolean;
  fixedDestination?: boolean;
  onEdit?: () => void;
  onSearch?: (criteria: HotelSearchCriteria) => void;
  initialValues?: Partial<HotelSearchFormValues>;
}) {
  const { t, locale } = useLocale();
  const preferences = useTravelPreferences();
  const countryNames = new Intl.DisplayNames([locale], { type: "region" });
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
      nationality: initialValues?.nationality ?? preferences.nationality,
    },
    shouldUnregister: false,
  });
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = form;
  const nationalityField = register("nationality");
  const currentNationality = useWatch({ control, name: "nationality" });
  const updateNationalityPreference = preferences.update;
  const hasInitializedNationality = useRef(false);
  useEffect(() => {
    if (!hasInitializedNationality.current) {
      hasInitializedNationality.current = true;
      if (initialValues?.nationality && isNationalityCode(initialValues.nationality) && initialValues.nationality !== preferences.nationality) {
        updateNationalityPreference({ nationality: initialValues.nationality });
      } else if (currentNationality !== preferences.nationality) {
        setValue("nationality", preferences.nationality, { shouldDirty: false });
      }
      return;
    }
    if (currentNationality !== preferences.nationality) {
      setValue("nationality", preferences.nationality, { shouldDirty: false });
    }
  }, [currentNationality, initialValues?.nationality, preferences.nationality, updateNationalityPreference, setValue]);

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
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
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
        role={compact ? undefined : "tabpanel"}
        id="hotels-panel"
        aria-label={compact ? t("Hotel search", "بحث الفنادق") : undefined}
        aria-labelledby={compact ? undefined : "hotels-tab"}
        hidden={!compact && tab !== "hotels"}
      >
        <FormProvider {...form}>
          <form
            className={styles.searchForm}
            noValidate
            onChange={onEdit}
            onSubmit={handleSubmit(
              (criteria) => {
                if (onSearch) onSearch(criteria);
                else {
                  const query = new URLSearchParams({
                    destination: criteria.destination,
                    nationality: criteria.nationality ?? preferences.nationality,
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
                        {
                          Alexandria: "الإسكندرية",
                          Cairo: "القاهرة",
                          Hurghada: "الغردقة",
                          "Sharm El Sheikh": "شرم الشيخ",
                        }[city],
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
            <div className={styles.searchField}>
              <label htmlFor="search-nationality"><Icon name="globe" />{t("Nationality", "الجنسية")}</label>
              <select id="search-nationality" {...nationalityField} onChange={event => { preferences.update({ nationality: event.target.value as NationalityCode }); nationalityField.onChange(event); }} aria-invalid={!!errors.nationality} aria-describedby={errors.nationality ? "nationality-error" : undefined}>
                {countries.map(country => <option key={country.value} value={country.value}>{countryNames.of(country.value) ?? country.label}</option>)}
              </select>
              {errors.nationality && <p id="nationality-error" role="alert" className={styles.error}>{t("Select a nationality.", "اختر الجنسية.")}</p>}
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
              "Illustrative listings · confirm availability with the supplier.",
              "فنادق توضيحية · يرجى تأكيد التوافر مع المورد.",
            )}
        </div>
      </div>
      {!compact && (
        <div
          role="tabpanel"
          id="cars-panel"
          aria-labelledby="cars-tab"
          hidden={tab !== "cars"}
        >
          <CarRentalOverview compact />
        </div>
      )}
    </section>
  );
}
