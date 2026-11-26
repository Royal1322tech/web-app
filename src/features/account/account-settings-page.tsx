import { flagEmoji } from "@/lib/flag-emoji";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";
import { countries } from "@/features/agency-registration/data/countries";
import { Workspace } from "@/features/demo/shared";
import { b2bSearchCurrencies } from "@/features/hotels/api/b2b-hotel-search";
import { useLocale } from "@/features/localization/locale-provider";
import { preferenceCurrencies, useTravelPreferences, type NationalityCode, type PreferenceCurrency } from "@/features/preferences/travel-preferences";
import styles from "./account.module.css";

export { flagEmoji };
const currencyRegion: Record<PreferenceCurrency, string> = { AED: "AE", EGP: "EG", EUR: "EU", KWD: "KW", SAR: "SA", USD: "US" };

function currencySymbol(code: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: code, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((part) => part.type === "currency")?.value ?? code;
  } catch { return code; }
}

/**
 * Account Settings: language, nationality and currency (the same device preferences the header
 * uses, so a change here shows there at once) and sign-in security. Preferences stay on this device:
 * there is no account preferences API.
 */
export function AccountSettingsPage() {
  const { t, locale, setLocale } = useLocale();
  const { currency, nationality, update } = useTravelPreferences();
  const [saved, setSaved] = useState<"language" | "nationality" | "currency" | null>(null);
  const lang = locale === "ar" ? "ar" : "en";

  const countryOptions = useMemo<SearchableOption[]>(() => {
    const names = new Intl.DisplayNames([lang], { type: "region" });
    const other = new Intl.DisplayNames([lang === "ar" ? "en" : "ar"], { type: "region" });
    return countries
      .map((country) => ({ value: country.value, name: names.of(country.value) ?? country.label, keywords: `${other.of(country.value) ?? ""} ${country.label} ${country.value}` }))
      .sort((a, b) => a.name.localeCompare(b.name, lang))
      .map((country) => ({ value: country.value, label: `${flagEmoji(country.value)} ${country.name}`, keywords: `${country.name} ${country.keywords}` }));
  }, [lang]);

  const currencyOptions = useMemo<SearchableOption[]>(() => {
    const names = new Intl.DisplayNames([lang], { type: "currency" });
    const other = new Intl.DisplayNames([lang === "ar" ? "en" : "ar"], { type: "currency" });
    return preferenceCurrencies.map((code) => ({
      value: code,
      label: `${flagEmoji(currencyRegion[code])} ${code} · ${names.of(code) ?? code} (${currencySymbol(code, lang)})`,
      keywords: `${code} ${names.of(code) ?? ""} ${other.of(code) ?? ""}`,
    }));
  }, [lang]);

  const searchable = (b2bSearchCurrencies as readonly string[]).includes(currency);
  const savedNote = (key: typeof saved) => saved === key && (
    <p className={styles.saved} role="status"><Icon name="check" aria-hidden="true" />{t("Saved on this device", "تم الحفظ على هذا الجهاز")}</p>
  );

  return (
    <Workspace title={t("Account Settings", "إعدادات الحساب")}>
      <div className={styles.settings} data-account-settings>
        <section className={`workspace-card ${styles.card}`} aria-labelledby="settings-language-title">
          <h2 id="settings-language-title" className={styles.cardTitle}><Icon name="language" aria-hidden="true" />{t("Language", "اللغة")}</h2>
          <p className={styles.cardIntro}>{t("Changes the website's language and reading direction straight away.", "يغيّر لغة الموقع واتجاه القراءة فورًا.")}</p>
          <div className={styles.segmented} role="radiogroup" aria-labelledby="settings-language-title">
            {([["en", "English", "Left to right", "EN"], ["ar", "العربية", "من اليمين إلى اليسار", "ع"]] as const).map(([value, name, detail, mark]) => (
              <label key={value} className={styles.choice} lang={value}>
                <input type="radio" name="settings-language" value={value} checked={locale === value} onChange={() => { setLocale(value); setSaved("language"); }} />
                <span className={styles.choiceMark} aria-hidden="true">{mark}</span>
                <span><b>{name}</b><small>{detail}</small></span>
                {locale === value && <Icon name="check" className={styles.tick} aria-hidden="true" />}
              </label>
            ))}
          </div>
          {savedNote("language")}
        </section>

        <section className={`workspace-card ${styles.card}`} aria-labelledby="settings-nationality-title">
          <h2 id="settings-nationality-title" className={styles.cardTitle}><Icon name="globe" aria-hidden="true" />{t("Nationality", "الجنسية")}</h2>
          <p className={styles.cardIntro}>{t("Hotel searches send it as the guests' residency. It doesn't change the language.", "يُرسل البحث عن الفنادق الجنسية كإقامة النزلاء، ولا تغيّر اللغة.")}</p>
          <SearchableSelect
            id="settings-nationality"
            label={t("Nationality", "الجنسية")}
            value={nationality}
            options={countryOptions}
            placeholder={t("Search countries", "ابحث عن الدول")}
            emptyMessage={t("No countries match your search.", "لا توجد دول مطابقة للبحث.")}
            resultsMessage={(count) => t(`${count} countries`, `${count} دولة`)}
            onChange={(value) => { if (value && value !== nationality) { update({ nationality: value as NationalityCode }); setSaved("nationality"); } }}
          />
          {savedNote("nationality")}
        </section>

        <section className={`workspace-card ${styles.card}`} aria-labelledby="settings-currency-title">
          <h2 id="settings-currency-title" className={styles.cardTitle}><Icon name="tag" aria-hidden="true" />{t("Currency", "العملة")}</h2>
          <p className={styles.cardIntro}>{t("Used for hotel search prices where the hotel service supports it (USD, EGP or SAR); other choices search in USD. Booking drafts and confirmations are always in USD.", "تُستخدم لأسعار البحث عن الفنادق عندما تدعمها خدمة الفنادق (USD أو EGP أو SAR)؛ وتُبحث الخيارات الأخرى بالدولار الأمريكي. مسودات الحجز وتأكيده دائمًا بالدولار الأمريكي.")}</p>
          <SearchableSelect
            id="settings-currency"
            label={t("Currency", "العملة")}
            value={currency}
            options={currencyOptions}
            placeholder={t("Search currencies", "ابحث عن العملات")}
            emptyMessage={t("No currencies match your search.", "لا توجد عملات مطابقة للبحث.")}
            resultsMessage={(count) => t(`${count} currencies`, `${count} عملات`)}
            onChange={(value) => { if (value && value !== currency) { update({ currency: value as PreferenceCurrency }); setSaved("currency"); } }}
          />
          {!searchable && <p className={styles.cardIntro} data-currency-fallback>{t(`Hotel search prices will be shown in USD: ${currency} isn't offered by the hotel service.`, `ستظهر أسعار البحث بالدولار الأمريكي: عملة ${currency} غير متاحة في خدمة الفنادق.`)}</p>}
          {savedNote("currency")}
        </section>

        <section className={`workspace-card ${styles.card}`} aria-labelledby="settings-security-title">
          <h2 id="settings-security-title" className={styles.cardTitle}><Icon name="lock" aria-hidden="true" />{t("Sign-in and security", "تسجيل الدخول والأمان")}</h2>
          <p className={styles.cardIntro}>{t("Online password reset isn't available yet. Royal Vacation support can reset your password for you.", "إعادة تعيين كلمة المرور عبر الإنترنت غير متاحة بعد. يمكن لدعم رويال فاكيشن إعادة تعيينها لك.")}</p>
          <div className={styles.securityLinks}>
            <Link className="button button--outline" to="/contact">{t("Contact Royal Vacation", "تواصل مع رويال فاكيشن")}</Link>
            <Link className="button button--outline" to="/profile">{t("My Profile", "ملفي الشخصي")}</Link>
          </div>
        </section>

        <p className={`${styles.cardIntro} ${styles.wide}`}>{t("Language, nationality and currency are saved on this device and apply across the website.", "تُحفظ اللغة والجنسية والعملة على هذا الجهاز وتُطبَّق في جميع أنحاء الموقع.")}</p>
      </div>
    </Workspace>
  );
}
