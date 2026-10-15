import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { getCountryCallingCode, type CountryCode } from "libphonenumber-js/max";
import { FormField } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import { Popover } from "@/components/ui/popover";
import { useLocale } from "@/features/localization/locale-provider";
import { phoneCountries, validPhoneCountry } from "../lib/phone";
import type { RegistrationValues } from "../schemas/registration.schema";
import "./contact-phone-field.css";

const flags = import.meta.glob<string>("../../../../node_modules/flag-icons/flags/4x3/*.svg", { eager: true, query: "?url", import: "default" });
function Flag({ country }: { country: string }) {
  // Phone metadata uses territory codes; flag-icons namespaces these under SH.
  const flagCode = country === "AC" ? "sh-ac" : country === "TA" ? "sh-ta" : country.toLowerCase();
  return <img src={flags[`../../../../node_modules/flag-icons/flags/4x3/${flagCode}.svg`]} alt="" width="24" height="18" />;
}
function CountryOptions({ selected, onSelect }: { selected: string; onSelect: (country: CountryCode) => void }) {
  const { locale, t } = useLocale();
  const [query, setQuery] = useState("");
  const names = new Intl.DisplayNames([locale], { type: "region" });
  const english = new Intl.DisplayNames(["en"], { type: "region" });
  const options = phoneCountries.filter(code => `${names.of(code)} ${english.of(code)} ${code} +${getCountryCallingCode(code)}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <>
    <label className="phone-country-search">{t("Search country or code", "ابحث باسم الدولة أو رمز الاتصال")}
      <input type="search" value={query} onChange={event => setQuery(event.target.value)} autoComplete="off" />
    </label>
    <div className="phone-country-options" role="group" aria-label={t("Phone countries", "دول الهاتف")}>
      {options.map(country => <button key={country} type="button" aria-pressed={country === selected} onKeyDown={event => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const buttons = Array.from(event.currentTarget.parentElement!.querySelectorAll("button"));
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length;
      buttons[next]?.focus();
    }} onClick={event => { onSelect(country); event.currentTarget.closest(".rv-popover")?.querySelector("button")?.focus(); }}>
        <Flag country={country} /><span>{names.of(country)}</span><bdi>+{getCountryCallingCode(country)}</bdi>{country === selected && <Icon name="check" />}
      </button>)}
    </div>
    {!options.length && <p role="status">{t("No countries match your search.", "لا توجد دول مطابقة للبحث.")}</p>}
  </>;
}
export function ContactPhoneField() {
  const { register, control, setValue, trigger, formState: { errors } } = useFormContext<RegistrationValues>();
  const { t, locale } = useLocale();
  const selected = useWatch({ control, name: "contact.phoneCountry" });
  const country = validPhoneCountry(selected) ? selected : "EG";
  const phoneError = errors.contact?.phone ? t("Enter a valid phone number for the selected country.", "أدخل رقم هاتف صحيحًا للدولة المحددة.") : undefined;
  return <div lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}><FormField id="contact-phone" label={t("Phone Number", "رقم الهاتف")} required error={phoneError}>
    <div className="international-phone" dir="ltr">
      <Popover label={t("Phone country", "دولة الهاتف")} trigger={<><Flag country={country} /><bdi>+{getCountryCallingCode(country)}</bdi><Icon name="chevron" /></>} panelClassName="phone-country-panel">
        {close => <div dir={locale === "ar" ? "rtl" : "ltr"}><CountryOptions selected={country} onSelect={next => {
          setValue("contact.phoneCountry", next, { shouldDirty: true });
          setValue("contact.callingCode", `+${getCountryCallingCode(next)}`, { shouldDirty: true });
          if (errors.contact?.phone) void trigger("contact.phone");
          close();
        }} /></div>}
      </Popover>
      <input id="contact-phone" className="input" type="tel" autoComplete="tel-national" placeholder={t("Enter phone number", "أدخل رقم الهاتف")} required
        aria-invalid={!!phoneError} aria-describedby={phoneError ? "contact-phone-error" : undefined} {...register("contact.phone")} />
    </div>
  </FormField></div>;
}
