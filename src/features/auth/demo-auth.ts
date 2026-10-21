/** Temporary UI gate only. Public demo credentials and storage are not security.
 * Replace this service with Laravel session authentication before handling real data.
 */
const sessionChanged = "royal-demo-session-changed";
const sessionKey = "royal-vacation.demo-auth.v1";
export const demoCredentials = { email: "demo@royalvacation.test", password: "Demo@12345" };
/** Demo identities for ownership checks. The colleague only describes fixture records marked as owned by another agency user. */
export const demoUserIds = { current: "demo-agent-001", colleague: "demo-agent-002" } as const;

export const demoAuth = {
  isActive(): boolean {
    try { return sessionStorage.getItem(sessionKey) === "active"; }
    catch { return false; }
  },
  signIn(email: string, password: string): boolean {
    if (email.trim().toLowerCase() !== demoCredentials.email || password !== demoCredentials.password) return false;
    // Persist only a non-sensitive marker, never credentials or personal data.
    sessionStorage.setItem(sessionKey, "active");
    window.dispatchEvent(new Event(sessionChanged));
    return true;
  },
  /** The signed-in demo user, or null. Not backend identity. */
  currentUserId(): string | null {
    return demoAuth.isActive() ? demoUserIds.current : null;
  },
  signOut(): void {
    try { sessionStorage.removeItem(sessionKey); } catch { /* No persisted session when storage is unavailable. */ }
    window.dispatchEvent(new Event(sessionChanged));
  },
};

export function safeDemoReturnTo(state: unknown): string {
  const from = state && typeof state === "object" && "from" in state ? state.from : undefined;
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//") || /[\\\s]/.test(from)) return "/";
  const url = new URL(from, "https://demo.invalid");
  if (url.origin !== "https://demo.invalid" || isPublicAuthPath(url.pathname)) return "/";
  return url.pathname + url.search + url.hash;
}

export function isPublicAuthPath(path: string): boolean {
  return /^\/(welcome|login|forgot-password|verify-otp|reset-password)\/?$/.test(path)
    || /^\/contact\/?$/.test(path)
    || /^\/register\/agency(?:\/(company|contact|documents|review))?\/?$/.test(path);
}

/** Recheck storage when a document is restored by browser Back/Forward cache. */
export function subscribeDemoSession(listener: () => void) {
  window.addEventListener(sessionChanged, listener);
  window.addEventListener("pageshow", listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(sessionChanged, listener);
    window.removeEventListener("pageshow", listener);
    window.removeEventListener("storage", listener);
  };
}
