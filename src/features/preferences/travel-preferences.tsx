import { useId, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/icon";
import { Popover } from "@/components/ui/popover";
import { useLocale } from "@/features/localization/locale-provider";

import styles from "./travel-preferences.module.css";

const currencies = ["AED", "EGP", "EUR", "KWD", "SAR", "USD"] as const;
const nationalities = ["Egypt", "Saudi Arabia", "Global"] as const;
type Preferences = { currency: typeof currencies[number]; nationality: typeof nationalities[number] };
const defaults: Preferences = { currency: "USD", nationality: "Global" };
const key = "royal-vacation.travel-preferences";
let fallback = JSON.stringify(defaults);
const subscribe = (listener: () => void) => {
  window.addEventListener("rv-preferences", listener); window.addEventListener("storage", listener);
  return () => { window.removeEventListener("rv-preferences", listener); window.removeEventListener("storage", listener); };
};
function snapshot() { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } }
export function useTravelPreferences() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => fallback);
  let preferences = defaults;
  try {
    const value = JSON.parse(raw) as Preferences;
    preferences = { currency: currencies.includes(value.currency) ? value.currency : "USD", nationality: nationalities.includes(value.nationality) ? value.nationality : "Global" };
  } catch { /* Corrupt or unavailable local storage uses safe non-sensitive defaults. */ }
  const update = (patch: Partial<Preferences>) => {
    fallback = JSON.stringify({ ...preferences, ...patch });
    try { localStorage.setItem(key, fallback); } catch { /* Session-only fallback. */ }
    window.dispatchEvent(new Event("rv-preferences"));
  };
  return { ...preferences, update };
}
const nationalityFlags = { Egypt: "eg", "Saudi Arabia": "sa", Global: null } as const;
const currencyFlags = { AED: "ae", EGP: "eg", EUR: "eu", KWD: "kw", SAR: "sa", USD: "us" } as const;
function Flag({ code }: { code: string | null }) {
  return <span className={styles.flag} aria-hidden="true">{code ? <img src={`/flags/${code}.svg`} alt="" width="22" height="22" /> : <Icon name="globe" />}</span>;
}
export function PreferenceFields() {
  const { t } = useLocale();
  const { currency, nationality, update } = useTravelPreferences();
  const id = useId();
  return <div className={styles.fields}>
    <fieldset className={styles.group}><legend>{t("Nationality", "الجنسية")}</legend>
      {nationalities.map((value, index) => <label className={styles.option} key={value}>
        <input type="radio" name={id + "-nationality"} value={value} checked={nationality === value} onChange={() => update({ nationality: value })} />
        <Flag code={nationalityFlags[value]} /><span>{t(value, ["مصر", "السعودية", "عالمي"][index])}</span>
        {nationality === value && <Icon name="check" className={styles.check} />}
      </label>)}
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
    <p className={styles.note}>{t("Preference only. Sample prices stay in USD; no conversion is applied. Nationality is independent of language.", "تفضيل فقط. الأسعار التجريبية بالدولار دون تحويل. الجنسية مستقلة عن اللغة.")}</p>
  </div>;
}
export function TravelPreferences() {
  const { t } = useLocale();
  const { currency, nationality } = useTravelPreferences();
  return <Popover panelClassName={styles.panel} label={t("Nationality and currency", "الجنسية والعملة")} trigger={<><Flag code={nationalityFlags[nationality]} /><bdi>{currency}</bdi><Icon name="chevron" /></>}><PreferenceFields /></Popover>;
}
