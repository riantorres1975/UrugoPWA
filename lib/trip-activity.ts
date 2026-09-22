import { getRouteSeoItems } from "@/lib/route-seo";

export const TRIP_ACTIVITY_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export type TripActivityEvent = { id: string; routes: string[]; startedAt: string; arrived: boolean };
export const isTripActivityId = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export function parseTripActivity(value: unknown, now = Date.now()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!isTripActivityId(v.id) || typeof v.arrived !== "boolean" || typeof v.startedAt !== "string") return null;
  const started = Date.parse(v.startedAt);
  if (!Number.isFinite(started) || started > now + 60_000 || started < now - TRIP_ACTIVITY_MAX_AGE_MS) return null;
  if (!Array.isArray(v.routes) || v.routes.length < 1 || v.routes.length > 2) return null;
  const catalog = getRouteSeoItems();
  const routes = v.routes.map((name) => typeof name === "string" && name.length <= 140
    ? catalog.find((route) => route.name.toLocaleLowerCase("es-MX") === name.trim().toLocaleLowerCase("es-MX")) : undefined);
  if (routes.some((route) => !route)) return null;
  const keys = routes.map((route) => route!.slug);
  if (new Set(keys).size !== keys.length) return null;
  return { id: v.id, routeKeys: keys, startedAt: new Date(started).toISOString(), arrived: v.arrived };
}

export type ActivityRoute = { slug: string; name: string; destination: string | null; started: number; previous: number };
export type TripActivitySummary = {
  updatedAt: string;
  day: string;
  today: { started: number; arrived: number; routes: number };
  weeklyTrips: number;
  routes: ActivityRoute[];
  transfers: { names: string[]; positive: number; total: number }[];
};
