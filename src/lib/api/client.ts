const configuredBase = import.meta.env.VITE_API_BASE_URL;
if (!configuredBase) throw new Error("VITE_API_BASE_URL is required.");
export const apiBaseUrl = new URL(configuredBase);

export class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`API request failed (${status}).`);
    this.name = "ApiError";
  }
}

/** Supply a real endpoint and a runtime parser only once the backend contract exists. */
export async function requestJson<T>(
  path: string,
  parse: (data: unknown) => T,
  options: RequestInit = {},
): Promise<T> {
  const url = new URL(path, apiBaseUrl);
  if (url.origin !== apiBaseUrl.origin)
    throw new Error("API requests must use the configured origin.");
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "omit",
  });
  if (!response.ok) throw new ApiError(response.status);
  const data: unknown = await response.json();
  return parse(data);
}
