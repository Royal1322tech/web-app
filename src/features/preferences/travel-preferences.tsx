import { useCallback, useId, useMemo, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/icon";
import { Popover } from "@/components/ui/popover";
import { useLocale } from "@/features/localization/locale-provider";
import { countries } from "@/features/agency-registration/data/countries";

import styles from "./travel-preferences.module.css";

const currencies = ["AED", "EGP", "EUR", "KWD", "SAR", "USD"] as const;
export type NationalityCode = (typeof countries)[number]["value"];
type Preferences = { currency: typeof currencies[number]; nationality: NationalityCode };
const defaults: Preferences = { currency: "USD", nationality: "EG" };
const key = "royal-vacation.travel-preferences";
let fallback = JSON.stringify(defaults);
const subscribe = (listener: () => void) => {
  window.addEventListener("rv-preferences", listener); window.addEventListener("storage", listener);
  return () => { window.removeEventListener("rv-preferences", listener); window.removeEventListener("storage", listener); };
};
function snapshot() { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } }
function parsePreferences(raw: string): Preferences {
  try {
    const value = JSON.parse(raw) as { currency?: string; nationality?: string };
    const legacyNationality = value.nationality === "Egypt" ? "EG" : value.nationality === "Saudi Arabia" ? "SA" : value.nationality;
    return {
      currency: currencies.includes(value.currency as Preferences["currency"]) ? value.currency as Preferences["currency"] : "USD",
      nationality: countries.some(country => country.value === legacyNationality) ? legacyNationality as NationalityCode : defaults.nationality,
    };
  } catch { return defaults; }
}
export function useTravelPreferences() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => fallback);
  const preferences = useMemo(() => parsePreferences(raw), [raw]);
  const update = useCallback((patch: Partial<Preferences>) => {
    fallback = JSON.stringify({ ...preferences, ...patch });
    try { localStorage.setItem(key, fallback); } catch { /* Session-only fallback. */ }
    window.dispatchEvent(new Event("rv-preferences"));
  }, [preferences]);
  return { ...preferences, update };
}
export function isNationalityCode(value: string): value is NationalityCode {
  return countries.some(country => country.value === value);
}
const currencyFlags = { AED: "ae", EGP: "eg", EUR: "eu", KWD: "kw", SAR: "sa", USD: "us" } as const;
function Flag({ code }: { code: string | null }) {
  return <span className={styles.flag} aria-hidden="true">{code ? <img src={`/flags/${code}.svg`} alt="" width="22" height="22" /> : <Icon name="globe" />}</span>;
}
export function PreferenceFields() {
  const { t, locale } = useLocale();
  const { currency, nationality, update } = useTravelPreferences();
  const id = useId();
  const countryNames = new Intl.DisplayNames([locale], { type: "region" });
  return <div className={styles.fields}>
    <fieldset className={styles.group}><legend>{t("Nationality", "الجنسية")}</legend>
      <label className={styles.selectLabel} htmlFor={`${id}-nationality`}>{t("Select nationality", "اختر الجنسية")}</label>
      <select id={`${id}-nationality`} value={nationality} onChange={event => update({ nationality: event.target.value as NationalityCode })}>
        {countries.map(country => <option key={country.value} value={country.value}>{countryNames.of(country.value) ?? country.label}</option>)}
      </select>
    </fieldset>
    <fieldset className={styles.group}><legend>{t("Currency", "العملة")}</legend>
      <div className={styles.currencies}>
        {currencies.map(value => <label className={styles.option} key={value}>
          <input type="radio" name={id + "-currency"} value={value} checked={currency === value} onChange={() => update({ currency: value })} />
          <Flag code={currencyFlags[value]} /><bdi>{value}</bdi>
          {currency === value && <Icon name="check" className={styles.check} />}
        </label>)}
      </div>
    </fieldset>
    <p className={styles.note}>{t("Hotel searches use your nationality and currency. Nationality is independent of language.", "يستخدم البحث عن الفنادق جنسيتك وعملتك. الجنسية مستقلة عن اللغة.")}</p>
  </div>;
}
export function TravelPreferences() {
  const { t } = useLocale();
  const { currency, nationality } = useTravelPreferences();
  const { locale } = useLocale();
  const country = countries.find(option => option.value === nationality);
  const name = country ? new Intl.DisplayNames([locale], { type: "region" }).of(country.value) ?? country.label : nationality;
  return <Popover panelClassName={styles.panel} label={t("Nationality and currency", "الجنسية والعملة")} trigger={<><span aria-hidden="true"><Icon name="globe" /></span><bdi>{name}</bdi><bdi>{currency}</bdi><Icon name="chevron" /></>}><PreferenceFields /></Popover>;
}
