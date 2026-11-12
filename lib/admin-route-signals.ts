import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminRouteSignal } from "@/lib/admin-route-review";

export type RouteSignalRow = AdminRouteSignal & { id: string; route_name: string };

export async function loadAdminRouteSignals(db: SupabaseClient): Promise<{ data: RouteSignalRow[]; incomplete: boolean; failed: boolean }> {
  const rows = new Map<string, RouteSignalRow>();
  const maxRows = 5000;
  try {
    let offset = 0;
    for (let request = 0; request < 20 && offset < maxRows; request++) {
      const { data, error, count } = await db.from("route_confirmations")
        .select("id,route_name,confirmation_type,status,observed_at,submitted_by_hash", { count: "exact" })
        .order("observed_at", { ascending: false }).order("id", { ascending: false })
        .range(offset, Math.min(maxRows - 1, offset + 999)).abortSignal(AbortSignal.timeout(5_000));
      if (error || !data) return { data: [...rows.values()], incomplete: true, failed: true };
      for (const row of data as RouteSignalRow[]) rows.set(row.id, row);
      offset += data.length;
      if (count !== null && offset >= count) {
        return { data: [...rows.values()], incomplete: false, failed: false };
      }
      if (!data.length || (count === null && data.length < 1000)) {
        return { data: [...rows.values()], incomplete: count !== 0, failed: false };
      }
    }
    return { data: [...rows.values()], incomplete: true, failed: false };
  } catch { return { data: [...rows.values()], incomplete: true, failed: true }; }
}
