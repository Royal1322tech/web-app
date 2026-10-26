import { useMemo } from "react";
import { useController, useFormContext } from "react-hook-form";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";
import { useLocale } from "@/features/localization/locale-provider";
import { countries } from "../data/countries";
import { citiesForCountry, locationCountries } from "../data/locations";
import type { RegistrationValues } from "../schemas/registration.schema";

/** Searchable Country and dependent City for Company Information. */
export function CompanyLocationFields() {
  const { t, locale } = useLocale();
  const { control, setValue, clearErrors, getValues } = useFormContext<RegistrationValues>();
  const {
    field: { value: countryCode, name: countryName, ref: countryRef, onBlur: countryBlur },
    fieldState: { error: countryFieldError },
  } = useController({ control, name: "company.country" });
  const {
    field: { value: cityValue, name: cityName, ref: cityRef, onBlur: cityBlur, onChange: cityChange },
    fieldState: { error: cityFieldError },
  } = useController({ control, name: "company.city" });
  const cities = citiesForCountry(countryCode);

  const countryOptions = useMemo<SearchableOption[]>(() => {
    const names = locale === "ar" ? new Intl.DisplayNames(["ar"], { type: "region" }) : null;
    return countries.map(({ value, label }) => {
      const arabic = locationCountries.find((item) => item.code === value)?.name.ar ?? names?.of(value);
      return {
        value,
        label: locale === "ar" && arabic ? arabic : label,
        keywords: `${value} ${label} ${arabic ?? ""}`,
      };
    });
  }, [locale]);

  const cityOptions = useMemo<SearchableOption[]>(
    () => cities.map(({ id, name }) => ({ value: id, label: name[locale], keywords: `${name.en} ${name.ar}` })),
    [cities, locale],
  );

  const message = (error?: { message?: string }) => (error?.message ? t(error.message) : undefined);
  const countryError = message(countryFieldError);
  const cityError = message(cityFieldError);
  const results = (count: number) => t(`${count} results available`, `${count} نتيجة متاحة`);

  return (
    <div className="registration-location" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <FormField id="company-country" label={t("Country", "الدولة")} required error={countryError}>
        <SearchableSelect
          id="company-country"
          label={t("Country", "الدولة")}
          name={countryName}
          inputRef={countryRef}
          value={countryCode}
          options={countryOptions}
          icon="globe"
          placeholder={t("Search or select country", "ابحث عن الدولة أو اخترها")}
          emptyMessage={t("No countries match your search.", "لا توجد دول مطابقة للبحث.")}
          resultsMessage={results}
          invalid={!!countryError}
          describedBy={countryError ? "company-country-error" : undefined}
          onBlur={countryBlur}
          onChange={(next) => {
            if (next === getValues("company.country")) return;
            setValue("company.country", next, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
            // A different country invalidates the previous city.
            setValue("company.city", "", { shouldDirty: true });
            clearErrors("company.city");
          }}
        />
      </FormField>
      <FormField id="company-city" label={t("City", "المدينة")} required error={cityError}>
        {countryCode && !cities.length ? (
          <>
            <Input
              id="company-city"
              icon="pin"
              placeholder={t("Enter city", "أدخل المدينة")}
              autoComplete="address-level2"
              required
              aria-invalid={!!cityError}
              aria-describedby={`company-city-note${cityError ? " company-city-error" : ""}`}
              name={cityName}
              ref={cityRef}
              value={cityValue}
              onBlur={cityBlur}
              onChange={(event) => cityChange(event.target.value)}
            />
            <p className="document-help" id="company-city-note">
              {t("A city list is not available for this country yet. Type the city name.", "لا تتوفر قائمة مدن لهذه الدولة بعد. اكتب اسم المدينة.")}
            </p>
          </>
        ) : (
          <SearchableSelect
            id="company-city"
            label={t("City", "المدينة")}
            name={cityName}
            inputRef={cityRef}
            value={cityValue}
            options={cityOptions}
            icon="pin"
            disabled={!countryCode}
            placeholder={countryCode ? t("Search or select city", "ابحث عن المدينة أو اخترها") : t("Select a country first", "اختر الدولة أولًا")}
            emptyMessage={t("No cities match your search.", "لا توجد مدن مطابقة للبحث.")}
            resultsMessage={results}
            invalid={!!cityError}
            describedBy={cityError ? "company-city-error" : undefined}
            onBlur={cityBlur}
            onChange={(next) => setValue("company.city", next, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
          />
        )}
      </FormField>
    </div>
  );
}
