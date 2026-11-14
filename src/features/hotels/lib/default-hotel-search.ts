import { useEffect, useState } from "react";
import { b2bSession } from "@/features/auth/b2b-session";
import type { HotelSearchCriteria } from "@/features/home/schemas/hotel-search.schema";
import { useLocale } from "@/features/localization/locale-provider";
import { useTravelPreferences } from "@/features/preferences/travel-preferences";
import {
  classifyB2BSearchError,
  isB2BSearchCurrency,
  searchB2BHotels,
  toB2BHotelSearchRequest,
  type B2BHotelSearchResult,
  type B2BSearchFailure,
} from "../api/b2b-hotel-search";
import { findDestination, type SearchDestination } from "../data/destinations";

/**
 * The home page's automatic search, kept apart from anything the user searches. It is an ordinary
 * search with stated defaults, not a curated or ranked list.
 */
export const DEFAULT_SEARCH_DESTINATION_ID = "dubai";
export const DEFAULT_SEARCH_LEAD_DAYS = 30;
export const DEFAULT_SEARCH_NIGHTS = 3;

const isoDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Criteria for the default search: future dates from today, two adults, the user's nationality. */
export function defaultSearchCriteria(nationality: string, today = new Date()): HotelSearchCriteria {
  const checkIn = new Date(today.getFullYear(), today.getMonth(), today.getDate() + DEFAULT_SEARCH_LEAD_DAYS);
  const checkOut = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate() + DEFAULT_SEARCH_NIGHTS);
  return { destination: DEFAULT_SEARCH_DESTINATION_ID, nationality, checkIn: isoDay(checkIn), checkOut: isoDay(checkOut), rooms: [{ adults: 2, childAges: [] }] };
}

export type DefaultSearchState =
  | { status: "loading" }
  | { status: "error"; failure: B2BSearchFailure }
  | { status: "done"; result: B2BHotelSearchResult };

// One request per distinct search body for this page visit, shared by every section that shows it.
const cache = new Map<string, Promise<B2BHotelSearchResult>>();

/** Runs the default search once and shares the reply. A failed attempt is forgotten so Retry can send it again. */
export function useDefaultHotelSearch(): { state: DefaultSearchState; criteria: HotelSearchCriteria; destination: SearchDestination; retry: () => void } {
  const { locale } = useLocale();
  const preferences = useTravelPreferences();
  const [criteria] = useState(() => defaultSearchCriteria(preferences.nationality));
  const destination = findDestination(DEFAULT_SEARCH_DESTINATION_ID)!;
  const currency = isB2BSearchCurrency(preferences.currency) ? preferences.currency : "USD";
  const request = toB2BHotelSearchRequest({ ...criteria, nationality: preferences.nationality }, destination.point, { language: locale === "ar" ? "ar" : "en", currency });
  const key = request ? JSON.stringify(request) : "";
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ key: string; attempt: number; state: DefaultSearchState } | null>(null);
  const state: DefaultSearchState = !request
    ? { status: "error", failure: "validation" }
    : settled && settled.key === key && settled.attempt === attempt ? settled.state : { status: "loading" };

  useEffect(() => {
    if (!request) return;
    let active = true;
    const settle = (next: DefaultSearchState) => { if (active) setSettled({ key, attempt, state: next }); };
    // Deferred so a mount that is immediately undone (React Strict Mode in development) sends nothing.
    const timer = setTimeout(() => {
      const token = b2bSession.token();
      if (!token) { settle({ status: "error", failure: "signed_out" }); return; }
      let pending = cache.get(key);
      if (!pending) {
        pending = searchB2BHotels(request, { token, locale: request.language });
        cache.set(key, pending);
        pending.catch(() => cache.delete(key));
      }
      pending
        .then((result) => settle({ status: "done", result }))
        .catch((error: unknown) => settle({ status: "error", failure: classifyB2BSearchError(error) }));
    }, 0);
    return () => { active = false; clearTimeout(timer); };
    // `request` is fully described by `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  return { state, criteria: { ...criteria, nationality: preferences.nationality }, destination, retry: () => setAttempt((value) => value + 1) };
}

/** For tests: forget cached default searches. */
export const resetDefaultHotelSearchCache = () => cache.clear();
