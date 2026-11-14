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

## Reply

The success reply was confirmed by the backend team on 2026-11-14:

```json
{
  "success": true,
  "code": "HOTEL_SEARCH_PREVIEW",
  "message": "Hotel availability preview. Prices are not yet verified.",
  "data": {
    "hotels": [{ "result_index": 0, "name": "…", "address": "…", "stars": 4, "image": null,
      "rooms": [{ "room_name": "…", "meal_name": "breakfast", "has_breakfast": true, "bedding_type": null, "selling_price": null, "booking_enabled": false }],
      "pricing_status": "unverified", "booking_enabled": false }],
    "total": 88, "page": 1, "per_page": 20, "currency": "USD", "supplier_currency": "USD",
    "pricing_verified": false, "booking_enabled": false
  }
}
```

`parseB2BHotelSearch` (`src/features/hotels/api/b2b-hotel-search.ts`) parses it:
- **Required:** `success: true`, `data.hotels`, `total`, `page` and `per_page`. Anything else is treated as an unreadable reply.
- **Per hotel:** each field is read on its own. A missing field, or one with an unexpected type, becomes `null` and is never filled in, so one odd record doesn't hide the others.
- **Not kept:** `supplier_currency`, and the server's `message`, which is never shown.
- **`result_index`:** a position in the result set, not a hotel ID.

## Hotel cards

`LiveHotelCard` (`src/features/hotels/components/live-hotel-card.tsx`) shows only what the reply contains:

| Field | Shown as |
|---|---|
| `image` | A 16:10 photo when it is an `https` URL. A supplier `{size}` placeholder is filled with `640x400`. A missing, non-https or broken image shows a branded "No photo available" panel. |
| `stars` | Gold stars and "4-star". This is the hotel's star classification, not a guest rating. Missing or 0 shows nothing. |
| `name`, `address` | As sent. A missing name reads "Hotel name not provided"; a missing address is left out. |
| `rooms` | The number of distinct room options (duplicates counted once), "Breakfast available" when any room has breakfast, and the first three rooms with meal and bedding. More rooms sit behind "Show N more". |
| Price | Shown only when `pricing_verified` is true, the hotel's `pricing_status` is `"verified"`, a selling `currency` is given and a room has a numeric `selling_price`. Then "From" the lowest price; otherwise "Price unavailable". |
| Booking | "Booking unavailable" unless both the search and the hotel set `booking_enabled`. Even then there is no booking button, only "Contact us to book", because no booking flow exists. |

There are no review scores, amenities, discounts or details links.

## Results page

- **Summary:** "88 hotels in Dubai · Page 1 of 5", plus an availability-preview note while prices are unverified.
- **States:** a skeleton grid while loading, an empty state, and the error states below.
- **Filters:** name or address, minimum stars, and breakfast. They filter the loaded page only, and say so. There is no price filter while prices are unverified.

| Reply | Screen | Retry |
|---|---|---|
| `total` 0 | "No hotels found" | No |
| 401 | The session ends and returns to sign-in | No |
| 403 | "Hotel search isn't enabled for your account" | No |
| 422 | "Check your search" | No |
| 429 | "Too many searches" | Yes |
| `code: HOTEL_SUPPLIER_UNAVAILABLE` | "Hotel search is unavailable" | Yes |
| `code: HOTEL_SEARCH_NOT_READY` | "Search results aren't ready" | Yes |
| Network failure or 60-second timeout | Its own message | Yes |
| 5xx or an unreadable reply | Its own message | Yes |

Sample hotels are never shown in this mode, including after a failure.

## Pagination

- **Page 1:** the confirmed search body exactly.
- **Later pages:** the same full body plus `page` and `per_page` (from the first reply).
- **Controls:** Previous and Next with "Page X of Y", from `ceil(total / per_page)`. Both buttons are disabled while a page loads, so replies can't arrive out of order.
- **Cache:** pages already loaded are kept, so going back sends nothing.
- **New criteria:** any change starts again at page 1.
- **Not yet verified on staging:** whether the backend honours `page`. The frontend checks every reply. If a later page comes back with a different `page`, or a 422 on `page`/`per_page`, it says "Only the first page of results can be shown for this search" and stays on page 1, so it never repeats hotels or claims more pages.

## Home page

In builds with this mode, the two home hotel sections use one default search, shared by both sections and sent once per visit:
- **Default search:** Dubai, check-in 30 days from today for 3 nights, 2 adults, the user's nationality, language and supported currency. It is kept apart from the user's own searches.
- **"A world of stays":** the first 10 hotels in the existing carousel. The caption states the destination, dates and guests, and links to "See all N hotels".
- **"Explore more stays":** this replaces "Stay At Best Hotels", because the default search is not a ranking. It shows the next 8 hotels, plus links that run a search for each destination.
- **Errors:** a failed default search shows its message with Retry, and no sample hotels.

**Signed-out visitors** see the public welcome screen with sign-in and registration choices. There is no public hotel endpoint (the API collection lists only auth, registration, B2C search and B2B search), so no hotel request is sent and no company token is ever embedded.

**Access:** the search and home pages sit behind the session gate.

## Confirmed and unconfirmed

Confirmed:
- **Endpoint and auth:** `POST` only, and a Sanctum Bearer token is required (401 without one).
- **CORS:** the staging site is allowed.
- **Reply shape:** as above.

Still to confirm with a signed-in account:
1. Whether `page` and `per_page` are accepted and honoured. The frontend detects either answer, as described above.
2. The B2B validation rules (residency case, radius range, currencies, room and guest limits).
3. The `selling_price` format once prices are verified. Only a plain number is read today.
4. The `pricing_status` value for verified prices. `"verified"` is assumed and needs confirming.
5. Error codes for supplier entitlement, and the status used for `HOTEL_SEARCH_NOT_READY`.

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
