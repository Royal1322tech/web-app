import { useSyncExternalStore } from "react";
import { ApiError, setUnauthorizedHandler } from "@/lib/api/client";
import { authConfig } from "./auth-config";
import type { B2BIdentity, IssuedToken } from "./b2b-auth-api";

// The API contracts load with the first API call, so demo builds and public pages don't carry them.
const authApi = () => import("./b2b-auth-api");

/**
 * Real B2B session, used only when `VITE_AUTH_MODE=api`.
 *
 * The token lives in memory and in sessionStorage, so it survives a reload but not closing the
 * tab. sessionStorage is readable by any script on this origin, so an XSS flaw could expose the
 * token; keeping the content security policy strict and the token short-lived limits that. It is
 * never written to localStorage or logs. There is no refresh token: when it expires, the user
 * signs in again. Demo login state uses a different key and is never read in this mode.
 */
const STORAGE_KEY = "royal-travel.b2b-session.v1";
const MAX_TIMER_MS = 2_147_483_647;

export type SessionEndReason = "expired" | "access-revoked" | "company-mismatch" | "signed-out";
export type B2BSessionState =
  | { status: "signed-out"; reason?: SessionEndReason }
  | { status: "verifying" }
  | { status: "active"; identity: B2BIdentity }
  | { status: "unavailable" };

interface StoredSession {
  token: string;
  expiresAt: number;
  companyId: string;
}

let stored: StoredSession | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
let verifying: Promise<B2BSessionState> | null = null;
let state: B2BSessionState = { status: "signed-out" };
const listeners = new Set<() => void>();

function setState(next: B2BSessionState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function persist(session: StoredSession | null) {
  try {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: the session still works for this page, it just won't survive a reload.
  }
}

function readStored(): StoredSession | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
    if (!value || typeof value !== "object") return null;
    const { token, expiresAt, companyId } = value as Record<string, unknown>;
    return typeof token === "string" && typeof expiresAt === "number" && typeof companyId === "string" ? { token, expiresAt, companyId } : null;
  } catch {
    return null;
  }
}

function end(reason: SessionEndReason) {
  stored = null;
  verifying = null;
  clearTimeout(expiryTimer);
  persist(null);
  setState({ status: "signed-out", reason });
}

function scheduleExpiry(expiresAt: number) {
  clearTimeout(expiryTimer);
  expiryTimer = setTimeout(() => end("expired"), Math.min(Math.max(0, expiresAt - Date.now()), MAX_TIMER_MS));
}

async function verify(): Promise<B2BSessionState> {
  const session = stored;
  if (!session) return state;
  setState({ status: "verifying" });
  try {
    const identity = await (await authApi()).fetchCurrentUser(session.token);
    if (stored !== session) return state;
    // The token is scoped to one company; a profile for any other company is never accepted.
    if (identity.company.id !== session.companyId) end("company-mismatch");
    else setState({ status: "active", identity });
  } catch (error) {
    if (stored !== session) return state;
    if (error instanceof ApiError && error.kind === "unauthorized") end("expired");
    else if (error instanceof ApiError && error.kind === "forbidden") end("access-revoked");
    else setState({ status: "unavailable" });
  } finally {
    verifying = null;
  }
  return state;
}

export const b2bSession = {
  getSnapshot: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Confirms a session restored after a reload. Safe to call repeatedly. */
  start(): Promise<B2BSessionState> | undefined {
    if (state.status !== "verifying" || !stored) return undefined;
    return (verifying ??= verify());
  },
  retry: (): Promise<B2BSessionState> => (verifying ??= verify()),
  /** Stores a newly issued token, then loads the user and company it belongs to. */
  establish(issued: IssuedToken): Promise<B2BSessionState> {
    stored = { token: issued.token, expiresAt: Date.now() + issued.expiresInSeconds * 1000, companyId: issued.companyId };
    persist(stored);
    scheduleExpiry(stored.expiresAt);
    verifying = null;
    return (verifying = verify());
  },
  /** For authenticated API calls. */
  token: () => stored?.token,
  /**
   * Reloads the signed-in user's profile from GET /me without leaving the active state (no loading
   * screen), for example after the user edits their details. A 401 still ends the session through the
   * API client; other failures keep the current profile.
   */
  async reloadIdentity(): Promise<boolean> {
    const session = stored;
    if (!session || state.status !== "active") return false;
    try {
      const identity = await (await authApi()).fetchCurrentUser(session.token);
      if (stored !== session || identity.company.id !== session.companyId) return false;
      setState({ status: "active", identity });
      return true;
    } catch {
      return false;
    }
  },
  /**
   * Ends the session. Local state is always cleared; the result says whether the server confirmed
   * that the token was revoked.
   */
  async signOut(): Promise<"confirmed" | "unconfirmed"> {
    const token = stored?.token;
    let result: "confirmed" | "unconfirmed" = "confirmed";
    if (token) {
      try {
        await (await authApi()).revokeToken(token);
      } catch (error) {
        // An already-invalid token is as good as revoked.
        if (!(error instanceof ApiError && error.kind === "unauthorized")) result = "unconfirmed";
      }
    }
    end("signed-out");
    return result;
  },
};

if (authConfig.mode === "api") {
  setUnauthorizedHandler(() => end("expired"));
  const restored = readStored();
  if (restored && restored.expiresAt > Date.now()) {
    stored = restored;
    scheduleExpiry(restored.expiresAt);
    state = { status: "verifying" };
  } else if (restored) {
    persist(null);
    state = { status: "signed-out", reason: "expired" };
  }
}

export function useB2BSession(): B2BSessionState {
  return useSyncExternalStore(b2bSession.subscribe, b2bSession.getSnapshot, b2bSession.getSnapshot);
}
