import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { arabicMessages } from "./messages";

export type Locale = "en" | "ar";
const key = "royal-vacation.locale";
const event = "royal-locale-change";
function subscribe(callback: () => void) {
  window.addEventListener(event, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(event, callback);
    window.removeEventListener("storage", callback);
  };
}
let fallback: Locale = "en";
function snapshot(): Locale {
  try {
    const value = localStorage.getItem(key);
    return value === "ar" || value === "en" ? value : "en";
  } catch {
    return fallback;
  }
}
const LocaleContext = createContext<Locale>("en");
export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, snapshot, () => "en" as const);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}
export function useLocale() {
  const locale = useContext(LocaleContext);
  return {
    locale,
    t: (en: string, ar?: string) =>
      locale === "ar" ? (ar ?? arabicMessages[en] ?? en) : en,
    setLocale: (next: Locale) => {
      fallback = next;
      try {
        localStorage.setItem(key, next);
      } catch {
        /* Memory fallback when storage is unavailable. */
      }
      window.dispatchEvent(new Event(event));
    },
  };
}
export function Text({ en, ar }: { en: string; ar?: string }) {
  const { t } = useLocale();
  return t(en, ar);
}
