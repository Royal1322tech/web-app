import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { addDays, isCalendarDay, toLocalDay } from "@/lib/stay-dates";
import { Icon } from "./icon";
import "./date-picker.css";

/*
 * Calendar date picker for hotel stays. It replaces the native date input, whose iOS picker lets
 * any date be chosen whatever `min` says: here every day before `min` is a disabled button, so a
 * past or otherwise invalid day can't be picked by touch, mouse or keyboard. Values are local
 * calendar days (YYYY-MM-DD).
 */
const parse = (day: string) => { const [y, m, d] = day.split("-").map(Number); return { y, m: m - 1, d }; };
const monthStart = (y: number, m: number) => toLocalDay(new Date(y, m, 1));
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

export function DatePicker({ id, value, min, onChange, locale, placeholder, invalid, describedBy, labelledBy, align = "start" }: {
  /** Which edge the calendar lines up with on wide screens ("end" for fields near the far edge). */
  align?: "start" | "end";
  id: string;
  value: string;
  /** The earliest day that can be chosen (local calendar day). */
  min: string;
  onChange: (day: string) => void;
  locale: "en" | "ar";
  placeholder: string;
  invalid?: boolean;
  describedBy?: string;
  /** The visible field label's id (the dialog is named after it). */
  labelledBy?: string;
}) {
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // Phones get a bottom sheet rendered on <body>: a transformed ancestor would otherwise trap a
  // fixed-position sheet inside the search card, off screen.
  const [sheet, setSheet] = useState(false);
  const selected = isCalendarDay(value) ? value : "";
  const start = selected && selected >= min ? selected : min;
  const [focusDay, setFocusDay] = useState(start);
  const view = parse(focusDay);
  const minParts = parse(min);
  const weekStart = locale === "ar" ? 6 : 0; // Saturday in Arabic (Egypt), Sunday in English

  const monthName = useMemo(() => new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { month: "long", year: "numeric" }), [locale]);
  const fullDate = useMemo(() => new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), [locale]);
  const shortDate = useMemo(() => new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }), [locale]);
  const weekday = useMemo(() => new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { weekday: "narrow" }), [locale]);
  const asDate = (day: string) => { const p = parse(day); return new Date(p.y, p.m, p.d); };
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);

  function show() {
    setFocusDay(selected && selected >= min ? selected : min);
    setSheet(typeof window !== "undefined" && window.matchMedia("(max-width: 599px)").matches);
    setOpen(true);
  }
  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  }
  function choose(day: string) {
    if (!isCalendarDay(day) || day < min) return; // a disabled day can never be chosen
    onChange(day);
    close();
  }

  // Focus the active day when the calendar opens or the active day moves.
  useLayoutEffect(() => {
    if (!open) return;
    // preventScroll: opening the phone sheet must not move the page underneath it.
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDay}"]`)?.focus({ preventScroll: true });
  }, [open, focusDay]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !panel.current?.contains(target)) close(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  });

  const move = (days: number) => { const next = addDays(focusDay, days); setFocusDay(next < min ? min : next); };
  const shiftMonth = (months: number) => {
    const target = new Date(view.y, view.m + months, 1);
    const day = Math.min(view.d, daysInMonth(target.getFullYear(), target.getMonth()));
    const next = toLocalDay(new Date(target.getFullYear(), target.getMonth(), day));
    setFocusDay(next < min ? min : next);
  };
  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const rtl = locale === "ar";
    const keys: Record<string, () => void> = {
      ArrowLeft: () => move(rtl ? 1 : -1), ArrowRight: () => move(rtl ? -1 : 1),
      ArrowUp: () => move(-7), ArrowDown: () => move(7),
      PageUp: () => shiftMonth(-1), PageDown: () => shiftMonth(1),
      Home: () => move(-((asDate(focusDay).getDay() - weekStart + 7) % 7)),
      End: () => move(6 - ((asDate(focusDay).getDay() - weekStart + 7) % 7)),
      Escape: () => close(),
    };
    const action = keys[event.key];
    if (action) { event.preventDefault(); action(); }
  }

  // The visible month: leading blanks to the week start, then every day.
  const first = new Date(view.y, view.m, 1);
  const lead = (first.getDay() - weekStart + 7) % 7;
  const total = daysInMonth(view.y, view.m);
  const cells: (string | null)[] = [...Array.from({ length: lead }, () => null), ...Array.from({ length: total }, (_, i) => toLocalDay(new Date(view.y, view.m, i + 1)))];
  const prevDisabled = monthStart(view.y, view.m) <= monthStart(minParts.y, minParts.m);
  const today = toLocalDay(new Date());
  const years = Array.from({ length: 6 }, (_, i) => minParts.y + i);
  if (!years.includes(view.y)) years.push(view.y);

  const calendar = (
        <div ref={panel} id={panelId} className="rv-date-picker__panel" data-align={align} data-sheet={sheet || undefined} role="dialog" aria-modal="false" aria-labelledby={labelledBy} data-date-panel>
          <div className="rv-date-picker__header">
            <button type="button" className="rv-date-picker__nav" aria-label={t("Previous month", "الشهر السابق")} disabled={prevDisabled} onClick={() => shiftMonth(-1)}>
              {/* Previous points back against the reading direction: left in English, right in Arabic. */}
              <Icon name="chevronEnd" aria-hidden="true" className={locale === "ar" ? undefined : "rv-date-picker__flip"} />
            </button>
            <div className="rv-date-picker__jump">
              <select aria-label={t("Month", "الشهر")} value={view.m} onChange={(event) => { const m = Number(event.target.value); const next = toLocalDay(new Date(view.y, m, Math.min(view.d, daysInMonth(view.y, m)))); setFocusDay(next < min ? min : next); }}>
                {Array.from({ length: 12 }, (_, m) => (
                  <option key={m} value={m} disabled={view.y === minParts.y && m < minParts.m}>{new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { month: "short" }).format(new Date(2000, m, 1))}</option>
                ))}
              </select>
              <select aria-label={t("Year", "السنة")} value={view.y} onChange={(event) => { const y = Number(event.target.value); const next = toLocalDay(new Date(y, view.m, Math.min(view.d, daysInMonth(y, view.m)))); setFocusDay(next < min ? min : next); }}>
                {years.map((y) => <option key={y} value={y}>{new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-GB", { useGrouping: false }).format(y)}</option>)}
              </select>
            </div>
            <button type="button" className="rv-date-picker__nav" aria-label={t("Next month", "الشهر التالي")} onClick={() => shiftMonth(1)}>
              <Icon name="chevronEnd" aria-hidden="true" className={locale === "ar" ? "rv-date-picker__flip" : undefined} />
            </button>
          </div>
          <p className="rv-date-picker__month" aria-live="polite">{monthName.format(first)}</p>
          <div className="rv-date-picker__weekdays" aria-hidden="true">
            {Array.from({ length: 7 }, (_, i) => <span key={i}>{weekday.format(new Date(2023, 0, 1 + ((weekStart + i) % 7)))}</span>)}
          </div>
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- arrow keys move between the day buttons inside. */}
          <div ref={grid} className="rv-date-picker__grid" onKeyDown={onKey}>
            {cells.map((day, index) => day === null ? <span key={`blank-${index}`} aria-hidden="true" /> : (
              <button
                key={day}
                type="button"
                className="rv-date-picker__day"
                data-date={day}
                data-today={day === today || undefined}
                aria-pressed={day === selected}
                aria-label={fullDate.format(asDate(day))}
                disabled={day < min}
                tabIndex={day === focusDay ? 0 : -1}
                onClick={() => choose(day)}
              >
                {new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-GB").format(parse(day).d)}
              </button>
            ))}
          </div>
          <div className="rv-date-picker__footer">
            <span>{t("Unavailable dates are greyed out.", "التواريخ غير المتاحة باللون الرمادي.")}</span>
            <button type="button" className="rv-date-picker__close" onClick={() => close()}>{t("Close", "إغلاق")}</button>
          </div>
        </div>
  );

  return (
    <div className="rv-date-picker" ref={root} data-date-picker={id}>
      <button
        ref={trigger}
        id={id}
        type="button"
        className="rv-date-picker__trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        data-invalid={invalid || undefined}
        aria-describedby={describedBy}
        data-value={selected || undefined}
        onClick={() => (open ? close() : show())}
      >
        <span className={selected ? "rv-date-picker__value" : "rv-date-picker__placeholder"}>
          {selected ? <bdi>{shortDate.format(asDate(selected))}</bdi> : placeholder}
        </span>
        <Icon name="calendar" aria-hidden="true" />
      </button>
      {open && !sheet && calendar}
      {open && sheet && createPortal(<div className="rv-date-picker__sheet" data-date-picker={id}>{calendar}</div>, document.body)}
    </div>
  );
}
