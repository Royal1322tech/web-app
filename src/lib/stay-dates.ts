import { useEffect, useState } from "react";

/*
 * Hotel stay dates as local calendar days (YYYY-MM-DD), never UTC timestamps, so the day a user sees
 * is the day that's checked. Check-in: today or later. Check-out: at least one night after check-in.
 */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A Date's local calendar day as YYYY-MM-DD. */
export function toLocalDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** True for a real calendar day (rejects 2030-02-30 and 2031-02-29). */
export function isCalendarDay(value: string | null | undefined): value is string {
  if (!value || !ISO_DAY.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** The calendar day `days` after `day` (local, so month, year and DST changes are handled). */
export function addDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return toLocalDay(new Date(year, month - 1, date + days));
}

/** Nights between two calendar days (0 or negative when check-out isn't after check-in). */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const [y1, m1, d1] = checkIn.split("-").map(Number);
  const [y2, m2, d2] = checkOut.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** The earliest check-out for a check-in: the next day. */
export const minCheckOut = (checkIn: string) => addDays(checkIn, 1);

export type StayDateIssue = "check_in_missing" | "check_in_past" | "check_out_missing" | "check_out_not_after";

/** What's wrong with a stay, if anything, as of `today` (a local calendar day). */
export function stayDateIssue(checkIn: string | null | undefined, checkOut: string | null | undefined, today: string): StayDateIssue | null {
  if (!isCalendarDay(checkIn)) return "check_in_missing";
  if (checkIn < today) return "check_in_past";
  if (!isCalendarDay(checkOut)) return "check_out_missing";
  if (checkOut <= checkIn) return "check_out_not_after";
  return null;
}

/**
 * The check-out to keep after check-in changes: the current one while it's still after check-in,
 * otherwise the next valid day (the stay never becomes zero or negative nights).
 */
export function adjustedCheckOut(checkIn: string, checkOut: string | null | undefined): string {
  if (!isCalendarDay(checkIn)) return checkOut ?? "";
  return isCalendarDay(checkOut) && checkOut > checkIn ? checkOut : minCheckOut(checkIn);
}

/** Today's local calendar day, updated at local midnight while the page stays open. */
export function useLocalToday(): string {
  const [today, setToday] = useState(() => toLocalDay(new Date()));
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const timer = setTimeout(() => setToday(toLocalDay(new Date())), midnight.getTime() - now.getTime());
    return () => clearTimeout(timer);
  }, [today]);
  // A tab woken from sleep catches up when it becomes visible again.
  useEffect(() => {
    const refresh = () => setToday(toLocalDay(new Date()));
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);
  return today;
}
