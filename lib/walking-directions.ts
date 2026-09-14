import { haversineMeters } from "@/lib/geo";
import type { WalkingLeg } from "@/lib/journey-walking";
import type { Coordinates } from "@/lib/types";

// Session-only cache: do not persist precise trip locations or provider responses.
const cache = new Map<string, { expires: number; leg: WalkingLeg }>();
const TTL = 15 * 60_000;
let pausedUntil = 0;
let requests: number[] = [];
const coordinate = (value: unknown): value is Coordinates => Array.isArray(value) && value.length === 2
  && value.every((item) => typeof item === "number" && Number.isFinite(item))
  && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;

export function approximateWalk(from: Coordinates, to: Coordinates): WalkingLeg {
  const distanceM = haversineMeters(from, to);
  return { from, to, coordinates: [from, to], distanceM, minutes: distanceM / 75, status: "approximate" };
}

export function parseWalkingDirections(data: unknown, from: Coordinates, to: Coordinates): WalkingLeg | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as { code?: string; routes?: { distance?: number; duration?: number; geometry?: { type?: string; coordinates?: unknown[] } }[] };
  if (raw.code === "NoRoute") return { ...approximateWalk(from, to), status: "unreachable" };
  const route = raw.code === "Ok" ? raw.routes?.[0] : undefined;
  const points = route?.geometry?.coordinates;
  if (!route || !Number.isFinite(route.distance) || !Number.isFinite(route.duration)
    || route.distance! < 0 || route.duration! < 0 || route.distance! > 20_000 || route.duration! > 24_000
    || route.geometry?.type !== "LineString" || !points || points.length < 2 || points.length > 10_000 || !points.every(coordinate)) return null;
  const startGap = haversineMeters(from, points[0]);
  const endGap = haversineMeters(to, points[points.length - 1]);
  // A provider may snap to another street. Do not invent long walkable connectors.
  if (startGap > 30 || endGap > 30) return null;
  return {
    from, to, coordinates: points, distanceM: Math.max(haversineMeters(from, to), route.distance! + startGap + endGap),
    minutes: route.duration! / 60 + (startGap + endGap) / 75, status: "street",
  };
}

export async function getWalkingDirections(from: Coordinates, to: Coordinates, signal: AbortSignal): Promise<WalkingLeg> {
  const fallback = approximateWalk(from, to);
  if (signal.aborted) throw signal.reason;
  if (fallback.distanceM < 5) return { ...fallback, status: "street" };
  const key = `${from.join(",")}>${to.join(",")}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.leg;
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const now = Date.now();
  requests = requests.filter((time) => time > now - 60_000);
  if (!token || now < pausedUntil || requests.length >= 24 || (typeof navigator !== "undefined" && navigator.onLine === false)) return fallback;
  requests.push(now);
  const params = new URLSearchParams({ access_token: token, geometries: "geojson", overview: "full", steps: "false", alternatives: "false", radiuses: "25;25", walking_speed: "1.25" });
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(), 3_000);
  try {
    const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/walking/${from.join(",")};${to.join(",")}?${params}`, { signal: controller.signal, cache: "no-store" });
    if (response.status === 401 || response.status === 403 || response.status === 429) pausedUntil = Date.now() + 60_000;
    if (!response.ok) return fallback;
    const result = parseWalkingDirections(await response.json(), from, to);
    if (!result) return fallback;
    if (cache.size >= 128) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + TTL, leg: result });
    return result;
  } catch {
    if (signal.aborted) throw signal.reason;
    return fallback;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}
