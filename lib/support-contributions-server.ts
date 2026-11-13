import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { SupportWallData } from "@/lib/support-contributions";

export async function getSupportWall(): Promise<SupportWallData | null> {
  const db = createSupabaseAdminClient();
  if (!db) return null;
  try {
    const { data, error } = await db.rpc("get_support_wall").abortSignal(AbortSignal.timeout(4000));
    if (error || !data || !Number.isSafeInteger(data.confirmedCount) || !Array.isArray(data.supporters)) return null;
    return { confirmedCount: data.confirmedCount, supporters: data.supporters.map((row: SupportWallData["supporters"][number]) => ({
      id: row.id, name: row.name, amount_cents: row.amount_cents, confirmed_at: row.confirmed_at,
    })) };
  } catch { return null; }
}
