# Complaint form API contract

This is a proposed integration contract. The frontend contains the form and submission handling, but no confirmed complaint endpoint or Admin Dashboard integration was found in the current project.

## Proposed endpoint

`POST {VITE_API_BASE_URL}{VITE_COMPLAINTS_ENDPOINT}`

Configure `VITE_COMPLAINTS_ENDPOINT` only after the Laravel route is implemented and accepted by the backend team. It must resolve to the configured API origin. The frontend intentionally makes no request when this setting is absent. Do not place credentials, mail-provider keys, or recipient addresses in Vite variables.

## Request

Send `multipart/form-data` with these fields:

| Field | Required | Format |
|---|---|---|
| `service_type` | Yes | `hotel_booking`, `car_rental`, `payment`, `invoice`, `technical_issue`, or `other` |
| `booking_id` | No | Text, up to 100 characters |
| `title` | Yes | Text, 4–160 characters |
| `description` | Yes | Text, 10–5000 characters |
| `attachment` | No | JPG/JPEG, PNG, or PDF, maximum 5 MiB |

The browser validates these constraints for usability. Laravel must validate all fields and inspect uploaded content independently; filename and browser MIME type are not trustworthy.

## Success response

Return `200`, `201`, or `202` only after the service has accepted the complaint. A JSON response may include a non-sensitive `reference` string or numeric identifier. The UI displays success only for one of these responses. A `202` means accepted for processing, not that a human has reviewed the complaint.

## Validation and errors

For invalid requests, return `422` JSON with an `errors` object keyed by request field, whose values are arrays or strings. The frontend maps recognized field errors into the form and leaves the entered values available for correction. Other non-success statuses and network errors produce a retry message.

## Security and operations requirements

- Define the actual authentication requirements before enabling the endpoint. Public visitors can access Contact Us, and this frontend currently has no production authentication token integration.
- Authorize access to any referenced booking on the server; never trust a submitted booking ID as proof of ownership.
- Apply request-size limits, rate limiting, abuse protection, and server-side input validation.
- Validate file extension, detected content type, file signature, and size; scan uploads and store them outside executable web paths.
- Restrict complaint data and attachments to authorized support staff and administrators.
- Avoid exposing sensitive complaint content in application logs or error responses.
- Save the complaint and provide an appropriate reference before returning acceptance; deliver internal notifications through server-side mail configuration and record queue/delivery status.
- Configure CORS, CSRF, and credential behavior according to the chosen authentication model and deployment topology.

No Laravel endpoint, email delivery, ticket system, or Admin Dashboard behavior is implemented by this frontend change.
