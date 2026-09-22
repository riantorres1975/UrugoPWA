import type { TripJourney, TripTrackingState } from "@/lib/trip-mode";


export const ACTIVE_TRIP_KEY = "urugo-active-trip-v1";
export const TRIP_ALERTS_KEY = "urugo-trip-alerts-v1";
export const TRIP_EXPIRY_MS = 6 * 60 * 60 * 1000;
export type TripActivityIdentity = { id: string; startedAt: string };
export type SavedTrip = { version: 1; savedAt: number; journey: TripJourney; tracking: TripTrackingState; activity?: TripActivityIdentity };
export type TripAlertSettings = { voice: boolean; vibration: boolean };
export const DEFAULT_TRIP_ALERTS: TripAlertSettings = { voice: false, vibration: false };
export async function readSavedTrip(): Promise<SavedTrip | null> {
  try {
    const raw = localStorage.getItem(ACTIVE_TRIP_KEY);
    if (!raw) return null;
    const { parseSavedTrip } = await import("@/lib/trip-storage-parser");
    const saved = parseSavedTrip(raw);
    if (!saved) localStorage.removeItem(ACTIVE_TRIP_KEY);
    return saved;
  } catch { return null; }
}

export function clearSavedTrip() {
  try { localStorage.removeItem(ACTIVE_TRIP_KEY); } catch { /* Storage can be unavailable. */ }
}

export function saveTrip(journey: TripJourney, tracking: TripTrackingState, activity?: TripActivityIdentity) {
  if (tracking.progress?.phase === "arrived") { clearSavedTrip(); return; }
  // Provider walking responses stay session-only; retain the transit itinerary.
  const storedJourney = { ...journey, walking: undefined };
  const identity = activity ? { id: activity.id, startedAt: activity.startedAt } : undefined;
  try { localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify({ version: 1, savedAt: Date.now(), journey: storedJourney, tracking, activity: identity })); }
  catch { /* A storage limit must not interrupt navigation. */ }
}

export function readTripAlerts(): TripAlertSettings {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(TRIP_ALERTS_KEY) ?? "null");
    if (v && typeof v === "object") return { voice: "voice" in v && v.voice === true, vibration: "vibration" in v && v.vibration === true };
  } catch { /* Use defaults. */ }
  return DEFAULT_TRIP_ALERTS;
}

