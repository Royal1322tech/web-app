import { Icon } from "@/components/ui/icon";
import { Popover } from "@/components/ui/popover";
import { useLocale } from "./locale-provider";
import "./language-selector.css";

export function LanguageSelector() {
  const { locale, setLocale, t } = useLocale();
  return <Popover label={t("Language", "اللغة")} triggerClassName="language-trigger" panelClassName="language-panel"
    trigger={<><Icon name="globe" /><span>{locale === "en" ? "English" : "العربية"}</span><Icon name="chevron" /></>}>
    {close => <div role="group" aria-label={t("Choose language", "اختر اللغة")}>
      {(["en", "ar"] as const).map(code => <button type="button" key={code} lang={code} dir={code === "ar" ? "rtl" : "ltr"}
        aria-pressed={locale === code} onKeyDown={event => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      const buttons = Array.from(event.currentTarget.parentElement!.querySelectorAll("button"));
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[(index + (event.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length]?.focus();
    }} onClick={event => { setLocale(code); close(); event.currentTarget.closest(".rv-popover")?.querySelector("button")?.focus(); }}>
        <span>{code === "en" ? "English" : "العربية"}</span>{locale === code && <Icon name="check" />}
      </button>)}
    </div>}
  </Popover>;
}
