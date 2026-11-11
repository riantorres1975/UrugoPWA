import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { feedbackPeriod } from "@/lib/journey-feedback-admin";

export type JourneyUsage = { started: number; arrived: number; days: { day: string; started: number; arrived: number }[] };

export async function getJourneyUsage(period: ReturnType<typeof feedbackPeriod>): Promise<JourneyUsage | null> {
  const db = createSupabaseAdminClient();
  if (!db) return null;
  try {
    // At most 366 calendar rows, independent of PostgREST's default row limit.
    const { data, error } = await db.from("trip_activity_daily")
      .select("activity_day,started,arrived")
      .gte("activity_day", period.from).lte("activity_day", period.to)
      .order("activity_day", { ascending: true }).limit(366)
      .abortSignal(AbortSignal.timeout(5_000));
    if (error || !data) return null;
    const days = data.map((row) => ({ day: String(row.activity_day), started: Number(row.started), arrived: Number(row.arrived) }));
    if (days.some((day) => !Number.isSafeInteger(day.started) || !Number.isSafeInteger(day.arrived) || day.started < 0 || day.arrived < 0)) return null;
    return { started: days.reduce((sum, day) => sum + day.started, 0),
      arrived: days.reduce((sum, day) => sum + day.arrived, 0), days };
  } catch { return null; }
}
