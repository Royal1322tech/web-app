# Reduce Price request integration

The frontend form is available for data entry and validation. Online delivery is disabled until `VITE_PRICE_REDUCTION_REQUESTS_ENDPOINT` is configured with a same-origin path on the configured `VITE_API_BASE_URL` and the backend route is ready. The endpoint is intentionally absent from the example environment. No recipient address or email credentials belong in Vite variables.

## Proposed request

`POST /api/price-reduction-requests` with `Content-Type: application/json`.

The frontend sends the typed `PriceReductionRequestPayload` from `src/features/hotels/price-reduction-request.ts`. Hotel/room identifiers and rates are client supplied hints and must be treated as untrusted. `currentPrice` and `requestedPrice` are expressed in `currency` and share the declared `priceBasis` (`per night`) when supplied.

Suggested response: HTTP 202 or 200 only after the backend has accepted and persisted the request, with an optional JSON body such as `{ "reference": "PRR-..." }`. Non-success HTTP responses and network errors are shown as submission failures. The frontend displays a received state only after a successful HTTP response.

## Backend responsibilities

- Authenticate the agent using the application's real session/token mechanism and derive identity from that authenticated principal where possible.
- Validate and normalize the payload, re-check hotel/rate information where available, and reject invalid or mismatched price bases.
- Apply rate limits, abuse protection, and request-size limits.
- Persist the request and issue a unique request reference.
- Queue a notification to the recipient configured on the server; record queue/delivery status and avoid exposing mail credentials or the recipient address to the browser.
- Return an accepted response only after the request is safely recorded (and queueing is handled according to the backend contract).

## Notification email specification

Subject: `New Reduce Price Request — [Hotel Name]`

Include the request reference when available, agency and agent names, agent email and phone, hotel and location, selected room/board when supplied, check-in/out dates, room and guest counts, current and requested prices with currency and pricing basis, competitor/supplier name, notes, and server-side submission timestamp. Never include payment card details or authentication credentials. The backend should escape user-provided text before rendering HTML email content.

There is currently no verified endpoint or email-delivery integration in this frontend repository. No `mailto:` fallback is configured because the feature must not imply delivery to an unverified recipient.
