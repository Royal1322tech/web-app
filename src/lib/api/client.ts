/**
 * The one HTTP client for the Laravel API. It never logs request bodies, passwords, codes or
 * tokens, and its errors carry a category and field names instead of raw server text.
 */
const DEFAULT_TIMEOUT_MS = 15000;

export type ApiErrorKind =
  | "configuration"
  | "network"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "validation"
  | "rate_limited"
  | "unavailable"
  | "server"
  | "invalid_response";

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    public readonly status?: number,
    /** Laravel 422 `errors`, by field. Server wording, so map it before showing it. */
    public readonly fieldErrors: Readonly<Record<string, readonly string[]>> = {},
    /** Machine-readable `code` from the error body, such as HOTEL_SUPPLIER_UNAVAILABLE. */
    public readonly code?: string,
    /**
     * For a 429: seconds until the server accepts requests again, from its Retry-After header. Only
     * set when the browser can read the header (cross-origin, the API must expose it); otherwise
     * undefined, and the wait is unknown.
     */
    public readonly retryAfterSeconds?: number,
  ) {
    super(`API request failed: ${kind}${status ? ` (${status})` : ""}.`);
    this.name = "ApiError";
  }
}

export function apiBaseUrl(): URL {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!configured) throw new ApiError("configuration");
  try {
    return new URL(configured);
  } catch {
    throw new ApiError("configuration");
  }
}

let unauthorizedHandler: (() => void) | undefined;
/** One place decides what an expired or revoked token means for the app. */
export function setUnauthorizedHandler(handler: (() => void) | undefined) {
  unauthorizedHandler = handler;
}

export interface ApiRequestOptions<T> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Sent as JSON. */
  body?: unknown;
  /** Sanctum personal access token, sent as a Bearer credential. */
  token?: string;
  locale?: "en" | "ar";
  timeoutMs?: number;
  signal?: AbortSignal;
  parse: (data: unknown) => T;
}

function currentLocale(): "en" | "ar" {
  return typeof document !== "undefined" && document.documentElement.lang === "ar" ? "ar" : "en";
}

function fieldErrorsOf(data: unknown): Record<string, string[]> {
  if (!data || typeof data !== "object" || !("errors" in data)) return {};
  const errors = (data as { errors: unknown }).errors;
  if (!errors || typeof errors !== "object") return {};
  return Object.fromEntries(
    Object.entries(errors as Record<string, unknown>)
      .map(([field, messages]) => [field, Array.isArray(messages) ? messages.filter((message): message is string => typeof message === "string") : []]),
  );
}

function errorCodeOf(data: unknown): string | undefined {
  if (!data || typeof data !== "object" || !("code" in data)) return undefined;
  const code = (data as { code: unknown }).code;
  return typeof code === "string" && /^[A-Z0-9_]{1,64}$/.test(code) ? code : undefined;
}

/** Retry-After as delay-seconds or an HTTP date; undefined when missing, unreadable or unreasonable. */
export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const seconds = /^\d+$/.test(trimmed) ? Number(trimmed) : Math.ceil((Date.parse(trimmed) - now) / 1000);
  return Number.isFinite(seconds) && seconds > 0 && seconds <= 3600 ? seconds : undefined;
}

function errorKindFor(status: number): ApiErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 422) return "validation";
  if (status === 429) return "rate_limited";
  if (status === 503) return "unavailable";
  return "server";
}

/**
 * Sends a request to a path under `VITE_API_BASE_URL` and returns the parsed body. A body that
 * doesn't match `parse` is an error even with a 2xx status, so a malformed reply is never mistaken
 * for success.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions<T>): Promise<T> {
  const base = apiBaseUrl();
  const url = new URL(path.replace(/^\/+/, ""), base.href.endsWith("/") ? base : new URL(`${base.href}/`));
  if (url.origin !== base.origin) throw new ApiError("configuration");

  const headers = new Headers({ Accept: "application/json", "X-Locale": options.locale ?? currentLocale() });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout.signal]) : timeout.signal;

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "omit",
      signal,
    });
  } catch {
    throw new ApiError(timeout.signal.aborted ? "timeout" : "network");
  } finally {
    clearTimeout(timer);
  }

  let data: unknown = null;
  try {
    const text = await response.text();
    data = text.trim() ? JSON.parse(text) : null;
  } catch {
    data = undefined;
  }

  if (!response.ok) {
    if (response.status === 401 && options.token) unauthorizedHandler?.();
    throw new ApiError(
      errorKindFor(response.status),
      response.status,
      response.status === 422 ? fieldErrorsOf(data) : {},
      errorCodeOf(data),
      response.status === 429 ? parseRetryAfter(response.headers.get("Retry-After")) : undefined,
    );
  }
  if (data === undefined) throw new ApiError("invalid_response", response.status);
  try {
    return options.parse(data);
  } catch {
    throw new ApiError("invalid_response", response.status);
  }
}

/** Unauthenticated GET, kept for existing callers. Supply a runtime parser for the confirmed contract. */
export function requestJson<T>(path: string, parse: (data: unknown) => T, options: Pick<ApiRequestOptions<T>, "signal" | "timeoutMs"> = {}): Promise<T> {
  return apiRequest(path, { ...options, parse });
}
