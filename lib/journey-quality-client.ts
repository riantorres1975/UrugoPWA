import type { JourneyQualitySignal } from "@/lib/journey-quality";
let cached: { expires: number; signals: JourneyQualitySignal[] } | null = null;

export async function getJourneyQuality(signal: AbortSignal): Promise<JourneyQualitySignal[]> {
  if (cached && cached.expires > Date.now()) return cached.signals;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return [];
  try {
    const response = await fetch("/api/community/journey-quality", { signal: AbortSignal.any([signal, AbortSignal.timeout(2_000)]) });
    if (!response.ok) return [];
    const payload = await response.json();
    if (!Array.isArray(payload.signals)) return [];
    const signals = payload.signals.filter((entry: JourneyQualitySignal) => entry && Array.isArray(entry.routeNames)
      && entry.routeNames.length >= 1 && entry.routeNames.length <= 2 && entry.routeNames.every((name) => typeof name === "string")
      && ["bus_missing", "route_incorrect", "transfer_far", "boarding_far", "alighting_far", "walking_blocked"].includes(entry.concern)
      && Number.isFinite(entry.penalty) && entry.penalty >= 0 && entry.penalty <= 2).slice(0, 500);
    cached = { expires: Date.now() + 5 * 60_000, signals };
    return signals;
  } catch { return []; }
}
