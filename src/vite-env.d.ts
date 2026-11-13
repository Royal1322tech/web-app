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
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
