/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_PRICE_REDUCTION_REQUESTS_ENDPOINT?: string;
  readonly VITE_COMPLAINTS_ENDPOINT?: string;
  readonly VITE_ENABLE_STATE_PREVIEW?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
