/**
 * Tour state is intentionally local-first and privacy-preserving.
 *
 * - "seen" lives in localStorage so a finished tour stays finished.
 * - "snooze" and step progress live in sessionStorage so skipping or reloading
 *   mid-tour behaves sensibly within the same tab.
 * - events are a capped, local audit log plus a CustomEvent other code can
 *   subscribe to. Nothing is sent to a third party.
 *
 * Every accessor falls back to memory when storage is blocked (private mode),
 * so the feature still works instead of disappearing.
 */

export type TourId = "studio" | "landing";
export type TourAction = "start" | "step" | "skip" | "dismiss" | "complete" | "replay" | "reset";

/**
 * Bump this when the tour stops change. A stored value from an older version
 * no longer counts as "seen", so hosts get the new tour once.
 */
export const TOUR_VERSION = "2";

export interface TourEvent {
  tour: TourId;
  action: TourAction;
  stepId?: string;
  at: number;
}

const SEEN_KEYS: Record<TourId, string> = {
  studio: "eventas.tour.seen.v1",
  landing: "eventas.tour.landing.v1",
};
const SNOOZE_PREFIX = "eventas.tour.snooze.";
const PROGRESS_PREFIX = "eventas.tour.progress.";
const EVENTS_KEY = "eventas.tour.events.v1";
const memory = new Map<string, string>();
const memoryEvents: TourEvent[] = [];

function storage(kind: "local" | "session"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function read(key: string, kind: "local" | "session" = "local") {
  try {
    return storage(kind)?.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string, kind: "local" | "session" = "local") {
  memory.set(key, value);
  try {
    storage(kind)?.setItem(key, value);
  } catch {
    // Memory keeps the current page consistent when storage is blocked.
  }
}

function remove(key: string, kind: "local" | "session" = "local") {
  memory.delete(key);
  try {
    storage(kind)?.removeItem(key);
  } catch {
    // Nothing else to clean up.
  }
}

export function hasSeenTour(id: TourId) {
  return read(SEEN_KEYS[id]) === TOUR_VERSION;
}

export function markTourSeen(id: TourId) {
  write(SEEN_KEYS[id], TOUR_VERSION);
  clearTourSnooze(id);
  clearTourProgress(id);
}

export function isTourSnoozed(id: TourId) {
  return read(`${SNOOZE_PREFIX}${id}`, "session") === "1";
}

export function snoozeTour(id: TourId) {
  write(`${SNOOZE_PREFIX}${id}`, "1", "session");
}

export function clearTourSnooze(id: TourId) {
  remove(`${SNOOZE_PREFIX}${id}`, "session");
}

export function getTourProgress(id: TourId) {
  return read(`${PROGRESS_PREFIX}${id}`, "session");
}

export function setTourProgress(id: TourId, stepId: string) {
  write(`${PROGRESS_PREFIX}${id}`, stepId, "session");
}

export function clearTourProgress(id: TourId) {
  remove(`${PROGRESS_PREFIX}${id}`, "session");
}

/** Should the first-run tour be offered on this page load? */
export function shouldAutoStartTour(id: TourId) {
  return !hasSeenTour(id) && !isTourSnoozed(id);
}

export function resetTour(id: TourId) {
  remove(SEEN_KEYS[id]);
  remove(`${SNOOZE_PREFIX}${id}`, "session");
  remove(`${PROGRESS_PREFIX}${id}`, "session");
}

export function resetTours() {
  for (const id of Object.keys(SEEN_KEYS) as TourId[]) resetTour(id);
}

export function trackTourEvent(tour: TourId, action: TourAction, stepId?: string) {
  const event: TourEvent = { tour, action, stepId, at: Date.now() };
  memoryEvents.push(event);
  if (memoryEvents.length > 100) memoryEvents.shift();
  try {
    const stored = storage("session")?.getItem(EVENTS_KEY);
    const previous = stored ? JSON.parse(stored) as TourEvent[] : [];
    const next = [...(Array.isArray(previous) ? previous : []), event].slice(-100);
    storage("session")?.setItem(EVENTS_KEY, JSON.stringify(next));
  } catch {
    // The in-memory log still works.
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("eventas:tour", { detail: event }));
  }
}

export function getTourEvents(): TourEvent[] {
  try {
    const stored = storage("session")?.getItem(EVENTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as TourEvent[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Fall through to memory.
  }
  return [...memoryEvents];
}

/** Test helper: clear the in-memory fallback between cases. */
export function resetTourMemory() {
  memory.clear();
  memoryEvents.length = 0;
}
