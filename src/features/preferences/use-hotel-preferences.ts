import { useSyncExternalStore } from "react";
import { savedHotelCatalog } from "./saved-hotel-catalog";
const event = "royal-hotel-preferences";
function subscribe(callback: () => void) {
  window.addEventListener(event, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(event, callback);
    window.removeEventListener("storage", callback);
  };
}
const memory: Record<string, string> = {};
function read(key: string) {
  try {
    return localStorage.getItem(key) || "[]";
  } catch {
    return memory[key] || "[]";
  }
}
export function useHotelPreferences(kind: "favourites" | "comparison") {
  const key = `royal-vacation.${kind}.v1`;
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => "[]",
  );
  let ids: string[] = [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed))
      ids = [
        ...new Set(
          parsed.filter(
            (id): id is string =>
              typeof id === "string" &&
              savedHotelCatalog.some((h) => h.id === id),
          ),
        ),
      ];
  } catch {
    /* Ignore malformed local data. */
  }
  function save(next: string[]) {
    memory[key] = JSON.stringify(next);
    try {
      localStorage.setItem(key, memory[key]);
    } catch {
      /* Usable in memory if storage is blocked. */
    }
    window.dispatchEvent(new Event(event));
  }
  return {
    ids,
    toggle: (id: string) =>
      save(
        ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
      ),
    clear: () => save([]),
  };
}
