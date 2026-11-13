import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { SupportWallData } from "@/lib/support-contributions";

export async function getSupportWall(): Promise<SupportWallData | null> {
  const db = createSupabaseAdminClient();
  if (!db) return null;
  try {
    const { data, error } = await db.rpc("get_support_wall").abortSignal(AbortSignal.timeout(4000));
    if (error || !data || !Number.isSafeInteger(data.confirmedCount) || !Array.isArray(data.supporters)) return null;
    const goal = data.goal;
    return { ...(goal && Number.isSafeInteger(goal.target_cents) && goal.target_cents > 0 && Number.isSafeInteger(goal.raised_cents) && goal.raised_cents >= 0 && typeof goal.description === "string" && /^20\d{2}-\d{2}-01$/.test(goal.month)
      ? { goal: { month: goal.month, target_cents: goal.target_cents, raised_cents: goal.raised_cents, description: goal.description } } : {}),
      confirmedCount: data.confirmedCount, supporters: data.supporters.map((row: SupportWallData["supporters"][number]) => ({
      id: row.id, name: row.name, amount_cents: row.amount_cents, confirmed_at: row.confirmed_at,
    })) };
  } catch { return null; }
}
