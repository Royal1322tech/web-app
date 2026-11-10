const tokenKey = "royal.b2b.access_token";
const sessionEvent = "royal-b2b-session-changed";

export const b2bSession = {
  getToken(): string | null {
    try {
      return sessionStorage.getItem(tokenKey);
    } catch {
      return null;
    }
  },

  hasToken(): boolean {
    return Boolean(this.getToken());
  },

  setToken(token: string): void {
    sessionStorage.setItem(tokenKey, token);
    window.dispatchEvent(new Event(sessionEvent));
  },

  clear(): void {
    try {
      sessionStorage.removeItem(tokenKey);
      sessionStorage.removeItem("royal.b2b.login.challenge");
    } finally {
      window.dispatchEvent(new Event(sessionEvent));
    }
  },
};

export function subscribeB2BSession(listener: () => void) {
  window.addEventListener(sessionEvent, listener);
  window.addEventListener("pageshow", listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(sessionEvent, listener);
    window.removeEventListener("pageshow", listener);
    window.removeEventListener("storage", listener);
  };
}
