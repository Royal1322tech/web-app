# B2B hotel rooms, room selection and price recheck

A signed-in company user can open a hotel from the search results, see its room rates, choose one, and get a fresh price from the supplier. The last step is **review only**: final booking, payment and vouchers don't exist yet.

**Status (2026-11-19, checked against staging):**

| Item | Status |
|---|---|
| Rooms, select and prebook routes | Deployed |
| `hid` in search results | Every hotel has one, so **View rooms** appears |
| Adults-only stays (`children: []`) | Accepted |
| Pricing | **No rate has a verified price yet** (`verified: false`, price on request). So select, prebook and booking drafts can't be reached with real data until pricing is configured on the backend |

## Flow

Search results → **View rooms** → `/hotels/rooms/:hid` → choose a room → price check → review → **booking draft**.

- **View rooms** appears only on hotels whose search result carries a positive integer `hid`. Other hotels say "Room rates aren't available for this hotel yet." and send nothing. `result_index` and list positions are never used as IDs.
- The URL carries only the stay (destination, nationality, dates, rooms). The hotel's name, address, stars and image travel in router state, for display only. **Tokens are never put in the URL.**
- The page sits behind the session gate and exists only in builds with `VITE_HOTEL_SEARCH_MODE=api`.

## Endpoints

All three send the company's Bearer token through the shared API client, with `Accept` and `Content-Type: application/json` and `X-Locale`. `company_id` is never sent. The code is in `src/features/hotels/api/b2b-hotel-rooms.ts`.

| Step | Request | Body |
|---|---|---|
| Rooms | `POST /api/v1/b2b/hotels/{hid}/rooms` | `{checkin, checkout, residency, language, currency, guests: [{adults, children: [ages]}]}`, from the search criteria; 1–8 rooms, 1–8 adults, up to 8 children aged 0–17 |
| Select | `POST /api/v1/b2b/hotels/rooms/select` | `{rooms_token, rate_index}` |
| Prebook | `POST /api/v1/b2b/hotels/rooms/prebook` | `{selection_token}` |

Every reply is schema-checked. A rooms reply for a different `hotel_hid` is rejected. An unreadable rate is left out rather than guessed.

## Prices

- **Shown only when confirmed:** a price shows as an amount only when `verified` is true, `price_on_request` isn't true, a `currency` is given and `selling_price` is a decimal string. Otherwise the rate shows "Price on request" or "Price unavailable", and it can't be selected.
- **Shown exactly as sent:** amounts appear as `USD 108.15`, never recalculated, rounded or converted, and left-to-right in Arabic too.
- **Customer and agency prices:** the customer price (`selling_price`) is the headline; the agency price (`agency_purchase_price`) is shown smaller. The page is visible only to the signed-in agency. The frontend never calculates a markup.
- **Room list prices are provisional;** the review always shows the latest price from prebook.
- **Selectable rates:** a rate can be selected when `selectable` is true and its price is confirmed. `booking_enabled: false` doesn't block selection; it governs final booking only.
- **Changed price:** when prebook returns `price_changed: true`, the review shows the old and new amounts. The user must tick "I accept the new price of …" and press **Accept new price**. It's never accepted silently.
- **Unconfirmed recheck:** if prebook returns a price that isn't confirmed, the flow stops with "This price can't be confirmed".

## Tokens

- **Memory only:** `rooms_token`, `selection_token` and `review_token` live in the page's memory. They are never written to localStorage, sessionStorage, cookies, the URL or logs, and are never shown.
- **Expiry:** each token's lifetime comes from its own `expires_in_seconds`. Countdowns say "This rate list is valid for" and "This price check is valid for". They describe the tokens' validity only: the API doesn't promise to hold rates, prices or availability. An expired rates list can't be selected; an expired review asks for fresh rates.
- **When they're dropped:**
  - changing the hotel, dates, guests, nationality, language or currency (the page rebuilds the flow)
  - leaving or reloading the page
  - signing out (the session gate unmounts the page)
- **Out-of-date replies:** every rooms load and selection gets a new generation number, and replies from an older one are ignored. Requests in flight are cancelled when the user moves on.
- **Double clicks:** a guard, plus disabled buttons, send one selection and one recheck per choice.

## Errors

| Status | Screen | Action |
|---|---|---|
| 401 | Session ends (shared API client) and returns to sign-in | Sign in |
| 403 | "Hotel rooms aren't enabled for your account" | None |
| 404 | Rooms: "Rooms for this hotel weren't found". Select or prebook: "This room choice is no longer valid" | Refresh rates |
| 409 | "This rate can't be booked anymore" | Refresh rates or choose another room |
| 410 | "These rates have expired" | Refresh rates (new rooms request) |
| 422 | "Check your stay details" | Change search |
| 503 | "The supplier isn't responding" | Try again (a recheck reuses the same selection while it's valid) |
| Network failure, timeout, unreadable reply | Their own messages | Try again |

Nothing ever claims a booking, reservation or payment. The review says: "This is a price check, not a reservation. Online booking and payment aren't available yet."

## Booking draft

On a confirmed, unexpired review, the guest details form saves a **booking draft**. It's sent with `POST /api/v1/b2b/bookings/draft`, and the code is in `src/features/hotels/api/b2b-booking-draft.ts`. A draft is not a reservation and takes no payment. The page never says "Booking Confirmed", "Payment Successful" or "Reservation Confirmed".

**Contract:** validated against the deployed API, because the success body isn't documented.
- **Body:** `{ review_token, guests: [{ first_name, last_name, guest_type: "adult" | "child", is_lead }] }`.
- **Guests:** one entry per guest from the stay's occupancy, adults first, then children, room by room. Exactly one lead, who must be an adult (the first adult by default).
- **No other guest fields:** room and age aren't part of the contract, so they aren't sent.
- **Header:** `Idempotency-Key`, `draft_` plus 32 random hex characters. Without a valid key the API answers 422.
- **Same key:** only for an unchanged retry after a network failure, a timeout, a 429 or a 5xx. Any change, or a failure that can't succeed on retry, gets a new key.
- **Success:** any JSON object counts as success. The page shows **Booking Draft Created** and nothing from the reply.

**Errors:**

| Status | Screen |
|---|---|
| 401 | Session ends |
| 403 | "Your account can't create booking drafts." |
| 409 | Can't be drafted any more; offers Refresh rates |
| 410 | The review expired; offers Refresh rates |
| 422 | Shown next to the guest concerned |
| 429 | The real `Retry-After` countdown when it's readable |
| 5xx, network | Retry, with the same key |

A guard and a disabled button send one request per click.

## Still needed from the backend

1. **Configure pricing on staging** (Royal and company rules). Until then every rate is price-on-request, so select, prebook and drafts can't be tested with real data.
2. **Document the booking draft success reply.** Until then, nothing from it is shown.
3. **Confirm the formats:** that `selling_price` and `agency_purchase_price` are decimal strings, and which currencies the rooms reply can contain.
4. **Rooms reply:** confirm whether it can include the hotel's name and address. The page currently relies on what the search result passed along, and shows "Hotel rooms" after a reload.
