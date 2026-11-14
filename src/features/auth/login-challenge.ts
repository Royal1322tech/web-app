/**
 * Hands the sign-in challenge from /login to /login/verify-otp.
 *
 * Only what the verification page needs is kept: the challenge ID returned by the login API, the
 * email the code was sent to (for display), and the absolute expiry time derived from the API's
 * `expires_in`. Never the password, the code or a token. It lives in sessionStorage, so it survives a
 * refresh of this tab but not closing it, and it is never put in a URL. On its own a challenge ID
 * cannot sign anyone in: the emailed code is still required. It is cleared when verification
 * succeeds, when the user goes back to sign in, and when it has been expired for a while.
 */
const STORAGE_KEY = "royal-travel.login-challenge.v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** An expired challenge is kept briefly so the page can say it expired, then forgotten. */
const EXPIRED_GRACE_MS = 30 * 60 * 1000;

export interface PendingLoginChallenge {
  challengeId: string;
  email: string;
  /** Epoch milliseconds. */
  expiresAt: number;
}

let memory: PendingLoginChallenge | null = null;

function valid(value: unknown): value is PendingLoginChallenge {
  if (!value || typeof value !== "object") return false;
  const { challengeId, email, expiresAt } = value as Record<string, unknown>;
  return typeof challengeId === "string" && UUID.test(challengeId)
    && typeof email === "string" && email.length > 0 && email.length <= 254
    && typeof expiresAt === "number" && Number.isFinite(expiresAt);
}

export const loginChallenge = {
  save(challenge: PendingLoginChallenge) {
    memory = challenge;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(challenge));
    } catch {
      // Storage blocked: the hand-over still works within this page load.
    }
  },
  read(now = Date.now()): PendingLoginChallenge | null {
    let stored: unknown = memory;
    if (!stored) {
      try {
        stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
      } catch {
        stored = null;
      }
    }
    if (!valid(stored) || now - stored.expiresAt > EXPIRED_GRACE_MS) {
      loginChallenge.clear();
      return null;
    }
    memory = stored;
    return stored;
  },
  clear() {
    memory = null;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing stored.
    }
  },
};
