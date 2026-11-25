import { z } from "zod";
import { ApiError, apiRequest } from "@/lib/api/client";

/*
 * GET /api/v1/b2b/destinations?q=&language=&limit= (backend 4fddcfe, API release 2026-11-25).
 * Permission hotels.view, 30 requests a minute. q: 2–100 characters; language en | ar; limit 1–20.
 * 200 { success, code: "OK", scope, data: [{ id, type, name, country, country_code, parent }] }.
 * 503 DESTINATION_SEARCH_UNAVAILABLE when the supplier lookup is down.
 * The selected `id` (a city slug or "region:<id>") is what hotel search takes as `destination`;
 * the display name is never sent in its place. Staging's scope ("sandbox_known") limits the
 * results, but the UI doesn't assume any particular list.
 */
const destinationSchema = z.object({
  id: z.string().trim().min(1).max(120),
  type: z.string().nullable().optional().catch(null).transform((value) => value ?? null),
  name: z.string().trim().min(1),
  country: z.string().nullable().optional().catch(null).transform((value) => value ?? null),
  country_code: z.string().nullable().optional().catch(null).transform((value) => value ?? null),
  parent: z.string().nullable().optional().catch(null).transform((value) => value ?? null),
});
export type ApiDestination = z.infer<typeof destinationSchema>;

export const DESTINATION_QUERY_MIN = 2;
export const DESTINATION_QUERY_MAX = 100;
/** IDs the hotel search accepts as `destination`: city slugs and region:<id>. */
export const isDestinationId = (value: string) => /^[A-Za-z0-9][A-Za-z0-9 :_.'-]{0,119}$/.test(value);

export function fetchDestinations(query: string, language: "en" | "ar", options: { token: string; signal?: AbortSignal; limit?: number }): Promise<ApiDestination[]> {
  const q = query.trim().slice(0, DESTINATION_QUERY_MAX);
  const params = new URLSearchParams({ q, language, limit: String(Math.min(20, Math.max(1, options.limit ?? 10))) });
  return apiRequest(`api/v1/b2b/destinations?${params}`, {
    token: options.token,
    signal: options.signal,
    locale: language,
    parse: (value) => {
      const data = z.object({ data: z.array(z.unknown()) }).parse(value).data;
      return data.flatMap((item) => { const parsed = destinationSchema.safeParse(item); return parsed.success && isDestinationId(parsed.data.id) ? [parsed.data] : []; });
    },
  });
}

export type DestinationFailure = "signed_out" | "forbidden" | "rate_limited" | "unavailable" | "network";
export function classifyDestinationError(error: unknown): DestinationFailure {
  if (!(error instanceof ApiError)) return "unavailable";
  if (error.kind === "unauthorized") return "signed_out";
  if (error.kind === "forbidden") return "forbidden";
  if (error.kind === "rate_limited") return "rate_limited";
  if (error.kind === "network" || error.kind === "timeout") return "network";
  return "unavailable";
}

/*
 * Names of destinations chosen from the API, by ID and language, so result pages can show "Hotels in
 * Dubai" for an ID that isn't in the built-in list. Display only; kept for the browser session.
 */
const NAMES_KEY = "royal-travel.destination-names.v1";
type Names = Record<string, { en?: string; ar?: string }>;
function readNames(): Names {
  try { return JSON.parse(sessionStorage.getItem(NAMES_KEY) || "{}") as Names; } catch { return {}; }
}
export function rememberDestination(destination: ApiDestination, language: "en" | "ar") {
  try {
    const names = readNames();
    const label = destination.country && destination.type !== "country" ? `${destination.name}, ${destination.country}` : destination.name;
    names[destination.id] = { ...names[destination.id], [language]: label.slice(0, 160) };
    const entries = Object.entries(names).slice(-50);
    sessionStorage.setItem(NAMES_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch { /* storage unavailable: names fall back to the ID */ }
}
export function rememberedDestinationName(id: string | undefined | null, language: "en" | "ar"): string | undefined {
  if (!id) return undefined;
  const entry = readNames()[id];
  return entry?.[language] ?? entry?.en ?? entry?.ar;
}
