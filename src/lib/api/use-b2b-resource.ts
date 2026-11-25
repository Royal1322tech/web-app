import { useCallback, useEffect, useState } from "react";
import { b2bSession } from "@/features/auth/b2b-session";

export type ResourceState<T, F> = { status: "loading" } | { status: "done"; data: T } | { status: "error"; failure: F | "signed_out" };

/**
 * Loads one B2B resource with the signed-in company's token. A new `key` (for example a page or a
 * filter) starts a new request and cancels the previous one; `retry` repeats the current one.
 */
export function useB2BResource<T, F extends string>(
  key: string,
  load: (token: string, signal: AbortSignal) => Promise<T>,
  classify: (error: unknown) => F | "signed_out",
): { state: ResourceState<T, F>; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ id: string; state: ResourceState<T, F> } | null>(null);
  const id = `${key}#${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    // Deferred so a mount that is immediately undone (React Strict Mode) sends nothing.
    const timer = setTimeout(() => {
      const token = b2bSession.token();
      if (!token) { setSettled({ id, state: { status: "error", failure: "signed_out" } }); return; }
      load(token, controller.signal)
        .then((data) => { if (!controller.signal.aborted) setSettled({ id, state: { status: "done", data } }); })
        .catch((error: unknown) => { if (!controller.signal.aborted) setSettled({ id, state: { status: "error", failure: classify(error) } }); });
    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
    // `load` and `classify` are expected to depend only on `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { state: settled?.id === id ? settled.state : { status: "loading" }, retry };
}
