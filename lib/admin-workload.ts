import { cache } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// React's request cache shares these counts between the page and its header.
// Values are never reused across administrators or subsequent requests.
export const getAdminPendingCounts = cache(async () => {
  const db = createSupabaseAdminClient();
  if (!db) return { reports: null, signals: null, support: null };
  try {
    const [reports, signals, support] = await Promise.all([
      db.from("community_reports").select("id", { count: "exact", head: true }).eq("status", "pending").abortSignal(AbortSignal.timeout(5_000)),
      db.from("route_confirmations").select("id", { count: "exact", head: true }).eq("status", "pending").abortSignal(AbortSignal.timeout(5_000)),
      db.from("support_contributions").select("id", { count: "exact", head: true }).or("status.eq.pending,and(status.eq.confirmed,publication_status.eq.pending)").abortSignal(AbortSignal.timeout(5_000)),
    ]);
    return { reports: reports.error ? null : reports.count, signals: signals.error ? null : signals.count, support: support.error ? null : support.count };
  } catch { return { reports: null, signals: null, support: null }; }
});
