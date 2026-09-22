import { NextRequest } from "next/server";
import { parseTripActivity } from "@/lib/trip-activity";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { hasJsonContentType, isSameOriginRequest, readJsonBodyWithLimit, RequestBodyError } from "@/lib/request-security";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new Response(null, { status: 403 });
  if (!hasJsonContentType(request)) return new Response(null, { status: 415 });
  if (!(await rateLimit(`trip-activity:${getClientIp(request)}`, 60, 60 * 60_000))) return new Response(null, { status: 429 });
  let raw: unknown;
  try { raw = await readJsonBodyWithLimit(request, 1_000); }
  catch (error) {
    if (error instanceof RequestBodyError) return new Response(null, { status: error.status });
    throw error;
  }
  const event = parseTripActivity(raw);
  if (!event) return new Response(null, { status: 400 });
  const db = createSupabaseAdminClient();
  if (!db) return new Response(null, { status: 503 });
  try {
    const { error } = await db.rpc("record_trip_activity", {
      p_id: event.id, p_route_keys: event.routeKeys, p_started_at: event.startedAt, p_arrived: event.arrived,
    });
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
