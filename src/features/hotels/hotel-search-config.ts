import { apiAuthEnabled } from "@/features/auth/auth-config";

/**
 * Hotel search mode, fixed at build time.
 *
 * `VITE_HOTEL_SEARCH_MODE=api` sends searches to the company (B2B) hotel search,
 * `POST /api/v1/b2b/hotels/search`, with the signed-in company's token, and never shows sample
 * hotels. It needs real sign-in (`VITE_AUTH_MODE=api`). Any other value, or none, keeps the
 * labelled sample catalogue.
 */
export const apiHotelSearchEnabled = import.meta.env.VITE_HOTEL_SEARCH_MODE === "api" && apiAuthEnabled;
