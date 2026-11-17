# B2B account activation

After an admin approves a company, the owner verifies their email once before their first sign-in. This happens on `/activate-account`. It's separate from sign-in (`/login`), the old sign-in code step (`/login/verify-otp`) and password recovery (`/verify-otp`).

**Status (2026-11-17):** built to the backend handoff contract and tested with mocked replies only. It hasn't been tried against staging.

## Page

- **Access:** public, with no session needed. It exists only in real sign-in builds (`VITE_AUTH_MODE=api`); demo builds send visitors to `/login`.
- **Search engines:** the page tells them not to index it, like the other auth pages.
- **Fields:** email, Company ID and a six-digit code. Arabic and Persian digits are accepted and sent as 0–9.
- **Activation links:** may carry `email` and `company_id`. The page fills those fields from the link, checks them straight away, and lets the user correct them.
- **No secrets in the URL:** any other parameter, such as a code or token, is removed from the address bar and never used.
- **No session or token:** the page doesn't create a session, store a token or sign anyone in. It writes nothing to localStorage, sessionStorage or cookies.
- **After success:** the page says the account is active and moves to `/login` after 5 seconds, or straight away with **Go to Sign In**.
- **Duplicate requests:** a guard and disabled buttons mean one click sends one request.

## Requests

Both go through the shared API client, without an `Authorization` header and with `X-Locale`.

| Step | Request | Body | Success |
|---|---|---|---|
| Verify | `POST /api/v1/b2b/auth/verify-otp` | `{email, company_id, otp}` | 2xx with `status: "active"`. Any other 2xx is treated as an unexpected reply |
| Resend | `POST /api/v1/b2b/auth/resend-verification-otp` | `{email, company_id}` | Any 2xx |

- `company_id` is sent in lower case. `email` is trimmed.
- **After a resend:** the page shows a neutral message: "If these details match an account waiting for activation, a new code will be sent to that email." It never claims the email was delivered, and the server's own message isn't shown.
- **Resend cooldown:** after a resend, the button waits 60 seconds. This is the frontend's own setting.

## Errors

The server's own messages are never shown.

| Reply | Shown |
|---|---|
| 422 on `otp`, or 422 with no field errors (verify) | "That code is incorrect or has expired…"; the code is cleared |
| 422 on `email` or `company_id` | The matching field is marked |
| 429 | "Too many attempts…" or "Too many code requests…". The page waits for `Retry-After` when the browser can read it, otherwise 60 seconds. Nothing is retried automatically |
| Other 4xx (400, 401, 403, 404, 409, 410) | "We couldn't activate an account with these details… If your account is already active, sign in instead." |
| 5xx | "Account activation isn't available right now…" |
| Network failure, timeout | "We couldn't reach the activation service…" |

## To confirm with the backend

1. **Status codes for each case:** a wrong code, an expired code, an already-active account and an unknown email or company. The page assumes 422 for a wrong or expired code, and treats any other 4xx as "these details don't match".
2. **The resend reply body,** and whether resending can reveal that an account exists.
3. **CORS:** expose `Retry-After` (`Access-Control-Expose-Headers`) so the cooldown matches the server. Today, staging doesn't expose it.
4. **The activation email:** confirm the link format, `https://staging.royalis.tech/activate-account?email=…&company_id=…`, with no code in the link.
5. **`verify-otp` is shared:** the same path also serves the old sign-in code step (`{challenge_id, otp}`). The frontend sends only the activation body from this page.
