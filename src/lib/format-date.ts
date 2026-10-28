type Locale = "en" | "ar";

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Formats a calendar date (`YYYY-MM-DD`, such as a check-in or posting date) for display.
 * The date is anchored to UTC so it never shifts a day in the viewer's time zone.
 * Values that are not calendar dates are returned unchanged.
 */
export function formatCalendarDate(value: string, locale: Locale): string {
  if (!CALENDAR_DATE.test(value)) return value;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

/** Formats an instant (ISO timestamp) as a medium date and short time in the viewer's time zone. */
export function formatDateTime(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
