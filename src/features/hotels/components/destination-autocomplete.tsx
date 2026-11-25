import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { b2bSession } from "@/features/auth/b2b-session";
import { useLocale } from "@/features/localization/locale-provider";
import {
  DESTINATION_QUERY_MAX,
  DESTINATION_QUERY_MIN,
  classifyDestinationError,
  fetchDestinations,
  rememberDestination,
  type ApiDestination,
  type DestinationFailure,
} from "../api/b2b-destinations";
import { destinationName } from "../lib/destination-name";
import styles from "./destination-autocomplete.module.css";

const DEBOUNCE_MS = 400;
type Lookup = { query: string; items?: ApiDestination[]; failure?: DestinationFailure };

const failureText: Record<DestinationFailure, [string, string]> = {
  signed_out: ["Sign in to search destinations.", "سجّل الدخول للبحث عن الوجهات."],
  forbidden: ["Your account can't search hotels.", "لا يمكن لحسابك البحث عن الفنادق."],
  rate_limited: ["Too many searches. Wait a moment, then keep typing.", "عمليات بحث كثيرة. انتظر قليلًا ثم تابع الكتابة."],
  unavailable: ["Destination search isn't available right now. Try again shortly.", "البحث عن الوجهات غير متاح حاليًا. حاول مرة أخرى بعد قليل."],
  network: ["We couldn't reach the server. Check your connection.", "تعذر الوصول إلى الخادم. تحقق من اتصالك."],
};

/**
 * Destination field backed by GET /b2b/destinations (API builds). Typing waits 400 ms before one
 * request; a newer query cancels the older request and late replies are ignored. Choosing a result
 * stores its ID (never the display name) through `onChange`.
 */
export function DestinationAutocomplete({ value, onChange, error, inputId = "destination" }: {
  value: string;
  onChange: (id: string) => void;
  error?: string;
  inputId?: string;
}) {
  const { t, locale } = useLocale();
  const language = locale === "ar" ? "ar" : "en";
  const listId = useId();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [settled, setSettled] = useState("");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The visible text follows the chosen destination until the user types something else.
  const shown = label ?? (text || (value ? destinationName(value, locale) ?? "" : ""));
  const query = text.trim();
  const tooShort = query.length < DESTINATION_QUERY_MIN;

  useEffect(() => {
    const timer = setTimeout(() => setSettled(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (settled.length < DESTINATION_QUERY_MIN) return;
    const controller = new AbortController();
    const token = b2bSession.token();
    const key = `${language}:${settled}`;
    if (!token) { queueMicrotask(() => setLookup({ query: key, failure: "signed_out" })); return; }
    fetchDestinations(settled, language, { token, signal: controller.signal })
      .then((items) => { if (!controller.signal.aborted) setLookup({ query: key, items }); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setLookup({ query: key, failure: classifyDestinationError(reason) }); });
    return () => controller.abort();
  }, [settled, language]);

  const current = lookup?.query === `${language}:${query}` && settled === query ? lookup : null;
  const items = current?.items ?? [];
  const loading = !tooShort && !current;
  const expanded = open && !tooShort && label === null;

  function choose(destination: ApiDestination) {
    rememberDestination(destination, language);
    setLabel(destination.country ? `${destination.name}, ${destination.country}` : destination.name);
    setText("");
    setOpen(false);
    setActive(-1);
    onChange(destination.id);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && items.length) { event.preventDefault(); setOpen(true); setActive((index) => (index + 1) % items.length); }
    else if (event.key === "ArrowUp" && items.length) { event.preventDefault(); setActive((index) => (index <= 0 ? items.length - 1 : index - 1)); }
    else if (event.key === "Enter" && expanded && active >= 0 && items[active]) { event.preventDefault(); choose(items[active]); }
    else if (event.key === "Escape" && expanded) { event.preventDefault(); setOpen(false); }
  }

  const optionId = (index: number) => `${listId}-option-${index}`;
  return (
    <div className={styles.box} data-destination-autocomplete data-value={value || undefined}>
      <input
        id={inputId}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        maxLength={DESTINATION_QUERY_MAX}
        placeholder={t("City or region", "مدينة أو منطقة")}
        value={shown}
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        onChange={(event) => {
          setText(event.target.value);
          setLabel(null);
          setOpen(true);
          setActive(-1);
          if (value) onChange("");
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 150); }}
        onKeyDown={onKeyDown}
      />
      {expanded && (
        // Keeps focus in the input while an option is clicked (keyboard users stay in the input).
        <div className={styles.panel} role="presentation" onMouseDown={(event) => { event.preventDefault(); clearTimeout(blurTimer.current); }}>
          {loading && <p className={styles.state} role="status">{t("Searching destinations…", "جارٍ البحث عن الوجهات…")}</p>}
          {current?.failure && <p className={styles.error} role="alert" data-destination-state={current.failure}>{t(...failureText[current.failure])}</p>}
          {current?.items && items.length === 0 && <p className={styles.state} role="status" data-destination-state="empty">{t("No destinations match. Check the spelling or try another city.", "لا توجد وجهات مطابقة. تحقق من الكتابة أو جرّب مدينة أخرى.")}</p>}
          <ul id={listId} role="listbox" aria-label={t("Destinations", "الوجهات")} className={styles.list} hidden={items.length === 0}>
            {items.map((destination, index) => (
              <li
                key={destination.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                data-destination-id={destination.id}
                className={styles.option}
                onClick={() => choose(destination)}
                onKeyDown={(event) => { if (event.key === "Enter") choose(destination); }}
              >
                <b><bdi>{destination.name}</bdi></b>
                <small><bdi>{[destination.parent, destination.country].filter(Boolean).join(" · ")}</bdi></small>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!expanded && !value && !error && query.length > 0 && tooShort && <p className={styles.hint}>{t("Type at least 2 letters.", "اكتب حرفين على الأقل.")}</p>}
    </div>
  );
}
