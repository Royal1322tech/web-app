# B2B hotel search integration

The hotel search form sends real searches to `POST /api/v1/b2b/hotels/search` with the signed-in company's Bearer token. It is off by default and is turned on at build time.

## Configuration

| Variable | Effect |
|---|---|
| `VITE_HOTEL_SEARCH_MODE=api` | Search uses the B2B API and never shows sample hotels. It requires `VITE_AUTH_MODE=api`. |
| Unset or any other value | The labelled sample catalogue, unchanged. Local development and the demo test build use this mode. |

The staging image enables it through `.env.production` (`VITE_AUTH_MODE=api`, `VITE_AUTH_COMPANY_ID_ENTRY=true`, `VITE_HOTEL_SEARCH_MODE=api`, `VITE_API_BASE_URL=https://staging-api.royalis.tech`).

## Destinations

`src/features/hotels/data/destinations.ts` lists every destination with a stable ID, English and Arabic names, and coordinates. The selector shows the city name. The request sends only `latitude` and `longitude`.

| ID | City | Latitude | Longitude |
|---|---|---|---|
| `Alexandria` | Alexandria | 31.2001 | 29.9187 |
| `Cairo` | Cairo | 30.0444 | 31.2357 |
| `Hurghada` | Hurghada | 27.2579 | 33.8116 |
| `Sharm El Sheikh` | Sharm El Sheikh | 27.9158 | 34.33 |
| `dubai` | Dubai | 25.2048 | 55.2708 |
| `paris` | Paris | 48.8566 | 2.3522 |
| `los-angeles` | Los Angeles | 34.0522 | -118.2437 |

The Egyptian IDs keep their original values, so existing links and the sample catalogue still work. The Egyptian coordinates are city centres; the three new cities use the coordinates supplied for this work.

## Request

The Geo Search payload named in the B2B specification. For example, Dubai, 2 adults, English, USD:

```json
{
  "checkin": "2026-12-06",
  "checkout": "2026-12-09",
  "latitude": 25.2048,
  "longitude": 55.2708,
  "radius": 10000,
  "residency": "eg",
  "language": "en",
  "currency": "USD",
  "guests": [{ "adults": 2, "children": [] }]
}
```

How each field is filled:

| Field | Source |
|---|---|
| `checkin`, `checkout` | The form's dates, `YYYY-MM-DD`. Check-in can't be in the past, and check-out must be after check-in. |
| `latitude`, `longitude` | The selected destination's coordinates. |
| `radius` | A fixed 10000 metres, from the example payload. The form has no radius field. |
| `residency` | The form's Nationality, lower case. It is independent of the destination. |
| `language` | The interface language, `en` or `ar`. It is also sent as `X-Locale`. |
| `currency` | The header currency preference when it is USD, EGP or SAR. Otherwise USD, and the page says so. |
| `guests` | One entry per room: `adults` (1–6) and `children` as ages (0–17, at most 4). From 1 to 9 rooms are accepted; the room picker still offers up to 4. |

The mapper returns nothing, and no request is sent, when a value is missing or out of range.

## Reply handling

| Reply | Screen | Retry |
|---|---|---|
| Waiting | "Searching hotels…" with a loading placeholder | n/a |
| `{success: true, data: {hotels, total}}` with `total` 0 | "No hotels found" | No |
| The same envelope with `total` > 0 | "N hotels found". Hotel details aren't shown yet (see below). | No |
| 401 | The API client ends the session and returns to sign-in | No |
| 403 | "Hotel search isn't enabled for your account" | No |
| 422 | "Check your search" | No |
| 429 | "Too many searches" | Yes |
| `code: HOTEL_SUPPLIER_UNAVAILABLE` | "Hotel search is unavailable" | Yes |
| `code: HOTEL_SEARCH_NOT_READY` | "Search results aren't ready" | Yes |
| Network failure or 60-second timeout | Its own message | Yes |
| Any other reply, including a 2xx in an unknown shape | "Results can't be displayed" | Yes |

Server wording is never shown. Sample hotels are never shown in this mode, including after a failure.

**Hotel cards are not rendered yet.** The fields of each hotel in a successful B2B reply are unknown, so no name, image, price, availability or booking button is read or invented. This also means no price is shown unless pricing is verified, and no booking is offered unless booking is enabled: nothing priced or bookable is displayed at all until the reply format is confirmed.

**Access:** the search page sits behind the session gate. Signed-out visitors go to sign-in and no search is sent. There is no public (B2C) search page.

## Confirmed and unconfirmed

Confirmed on staging (2026-11-14, without credentials):
- The endpoint accepts POST only. GET returns 405.
- Without a token, or with an invalid one, it returns 401 `{"message":"Unauthenticated."}`, before any validation.
- CORS allows `https://staging.royalis.tech` with the `Authorization`, `Content-Type` and `X-Locale` headers. Local origins are not allowed.

Needs a signed-in company account or the backend team:
1. **Request validation:** the B2B rules. Does it use the same fields, formats and limits as above (residency case, radius range, currencies, rooms 1–9, adults 1–6, children 0–17 and at most 4)?
2. **Success reply:** a real example. Each hotel's fields (ID, name, address, coordinates, images, rating), the price fields and currency, pagination, and where `pricing_verified` and `booking_enabled` appear.
3. **Error codes:** supplier entitlement errors (status and `code`), plus the status used for `HOTEL_SEARCH_NOT_READY`.
4. **Rate limit:** the B2B search limit per window.
5. **Permission:** whether a company needs a specific permission (for example `hotels.view`), and what is returned without it.

## Testing with a real staging account (local only)

Staging CORS blocks local origins, so the local preview uses a dev-only Vite proxy. The browser calls `http://127.0.0.1:5192/api/...` and Vite forwards each request to `https://staging-api.royalis.tech` with the same Bearer token. The proxy config lives in `node_modules/.local-preview/staging-proxy.config.ts`, outside version control:

```bash
VITE_AUTH_MODE=api VITE_AUTH_COMPANY_ID_ENTRY=true VITE_HOTEL_SEARCH_MODE=api \
VITE_API_BASE_URL=http://127.0.0.1:5192 \
  npx vite --config node_modules/.local-preview/staging-proxy.config.ts
```

The backend allows about 5 sign-in requests per minute across login and code verification.

1. Open `http://127.0.0.1:5192/login`. Enter the company ID, email and password, then the emailed code at `/login/verify-otp`.
2. On the home page, choose Dubai, future dates, a nationality and guests, then select **Search**.
3. In DevTools, open **Network** and select the `search` request:
   - **Headers:** `Authorization: Bearer …` and `X-Locale`.
   - **Payload:** the body above, with Dubai's coordinates.
   - **Response:** the status and body. Copy the JSON, but never the token.
4. Repeat for Paris, Los Angeles and one Egyptian city, then switch to Arabic and search again.
5. To read the B2B validation rules, run this in the same tab's DevTools console. It prints the status and the server's field rules, never the token:

```js
const { token } = JSON.parse(sessionStorage.getItem("royal-travel.b2b-session.v1"));
const probe = async (body) => {
  const r = await fetch("/api/v1/b2b/hotels/search", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  console.log(r.status, JSON.stringify(await r.json(), null, 2));
};
await probe({});
await probe({ checkin: "x", checkout: "x", latitude: 999, longitude: 999, radius: 0, residency: "xyz", language: "fr", currency: "XYZ", guests: [{ adults: 0, children: [99, 1, 2, 3, 4] }] });
```

Both probes fail validation before any supplier call. Share the printed output and the search response bodies, and the hotel cards can then be mapped to the real fields.
