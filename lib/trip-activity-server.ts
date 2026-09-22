import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRouteSeoItems } from "@/lib/route-seo";
import type { TripActivitySummary } from "@/lib/trip-activity";

export async function getTripActivity(): Promise<TripActivitySummary | null> {
  const db = createSupabaseAdminClient();
  if (!db) return null;
  try {
    const { data, error } = await db.rpc("get_trip_activity_summary").abortSignal(AbortSignal.timeout(5_000));
    if (error || !data) return null;
    const catalog = new Map(getRouteSeoItems().map((route) => [route.slug, route]));
    const rows = data.routes as { route_key: string; started: number; previous: number }[];
    return {
      updatedAt: data.updatedAt, day: data.day, today: data.today, weeklyTrips: data.weeklyTrips,
      routes: rows.flatMap((row) => {
        const route = catalog.get(row.route_key);
        return route ? [{ slug: route.slug, name: route.name, destination: route.destination,
          started: Number(row.started), previous: Number(row.previous) }] : [];
      }),
      transfers: data.transfers.map((row: { route_keys: string[]; positive: number; total: number }) => ({
        names: row.route_keys.map((key) => catalog.get(key)?.name ?? key),
        positive: Number(row.positive), total: Number(row.total),
      })),
    };
  } catch { return null; }
}
