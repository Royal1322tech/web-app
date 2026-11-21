/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_PRICE_REDUCTION_REQUESTS_ENDPOINT?: string;
  readonly VITE_COMPLAINTS_ENDPOINT?: string;
  readonly VITE_ENABLE_STATE_PREVIEW?: string;
  /** "api" uses the Laravel B2B login; anything else keeps the demo login. */
  readonly VITE_AUTH_MODE?: string;
  /** "true" shows a Company ID field at sign-in (API mode only). */
  readonly VITE_AUTH_COMPANY_ID_ENTRY?: string;
  /** "api" sends hotel searches to the B2C search API; anything else keeps the sample catalogue. */
  readonly VITE_HOTEL_SEARCH_MODE?: string;
  /** "page" filters only the loaded page; otherwise the sidebar filters and sorting are sent with the search. */
  readonly VITE_HOTEL_SEARCH_FILTERS?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
