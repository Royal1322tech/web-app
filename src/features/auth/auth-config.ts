/**
 * Authentication mode, fixed at build time.
 *
 * - `VITE_AUTH_MODE=api` uses the Laravel B2B API. Any other value, or none, keeps the demo login.
 * - `VITE_AUTH_COMPANY_ID_ENTRY=true` shows a Company ID field, because the login API requires the
 *   company's ID and how users should supply it is not decided yet. Without it, real sign-in stays
 *   unavailable rather than guessing.
 */
export const authConfig = {
  mode: import.meta.env.VITE_AUTH_MODE === "api" ? "api" : "demo",
  companyIdEntry: import.meta.env.VITE_AUTH_COMPANY_ID_ENTRY === "true",
} as const;

export const apiAuthEnabled = authConfig.mode === "api";
