import { useEffect, useState } from "react";
import { b2bSession } from "@/features/auth/b2b-session";
import { classifyLoyaltyError, fetchLoyalty, type Loyalty, type LoyaltyFailure } from "./b2b-loyalty";

export type LoyaltyState = { status: "loading" } | { status: "done"; loyalty: Loyalty } | { status: "error"; failure: LoyaltyFailure };

/** The company's loyalty points, loaded once per mount (and again on retry). */
export function useLoyalty(): { state: LoyaltyState; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ attempt: number; state: LoyaltyState } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const token = b2bSession.token();
      if (!token) { setSettled({ attempt, state: { status: "error", failure: "signed_out" } }); return; }
      fetchLoyalty({ token, signal: controller.signal })
        .then((loyalty) => { if (!controller.signal.aborted) setSettled({ attempt, state: { status: "done", loyalty } }); })
        .catch((error: unknown) => { if (!controller.signal.aborted) setSettled({ attempt, state: { status: "error", failure: classifyLoyaltyError(error) } }); });
    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [attempt]);
  return { state: settled && settled.attempt === attempt ? settled.state : { status: "loading" }, retry: () => setAttempt((value) => value + 1) };
}
