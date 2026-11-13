import { useSyncExternalStore } from "react";
import { authConfig } from "./auth-config";
import { b2bSession } from "./b2b-session";
import { demoAuth, demoUserIds, subscribeDemoSession } from "./demo-auth";

/** The signed-in state the app uses, from the demo login or the real API depending on the build. */
export const appSession = {
  isActive: (): boolean => (authConfig.mode === "api" ? b2bSession.getSnapshot().status === "active" : demoAuth.isActive()),
  subscribe: (listener: () => void) => (authConfig.mode === "api" ? b2bSession.subscribe(listener) : subscribeDemoSession(listener)),
  /**
   * Owner of the sample records. Business pages still show labelled demo data after a real
   * sign-in, until their own APIs exist.
   */
  currentUserId: (): string | null => (appSession.isActive() ? demoUserIds.current : null),
  signOut: (): Promise<"confirmed" | "unconfirmed"> => {
    if (authConfig.mode === "api") return b2bSession.signOut();
    demoAuth.signOut();
    return Promise.resolve("confirmed");
  },
};

export function useAppSessionActive(): boolean {
  return useSyncExternalStore(appSession.subscribe, appSession.isActive, () => false);
}
