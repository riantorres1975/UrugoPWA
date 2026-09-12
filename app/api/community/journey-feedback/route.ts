import { NextRequest } from "next/server";
import { parseJourneyFeedback } from "@/lib/journey-feedback";
import { hashSubmitter } from "@/lib/community-submission";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { getRouteSeoItems } from "@/lib/route-seo";
import { hasJsonContentType, isSameOriginRequest, readJsonBodyWithLimit, RequestBodyError } from "@/lib/request-security";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new Response(null, { status: 403 });
  if (!hasJsonContentType(request)) return new Response(null, { status: 415 });
  if (!(await rateLimit(`journey-feedback:${getClientIp(request)}`, 60, 60 * 60_000))) {
    return Response.json({ error: "Espera unos minutos antes de enviar otra opinión." }, { status: 429 });
  }
  let raw: unknown;
  try {
    raw = await readJsonBodyWithLimit(request, 1_500);
  } catch (error) {
    if (error instanceof RequestBodyError) return new Response(null, { status: error.status });
    throw error;
  }
  const feedback = parseJourneyFeedback(raw);
  if (!feedback) return new Response(null, { status: 400 });
  const catalog = getRouteSeoItems();
  const routes = feedback.routes.map((name) => catalog.find((route) => route.name.toLocaleLowerCase("es-MX") === name.toLocaleLowerCase("es-MX")));
  if (routes.some((route) => !route)) return new Response(null, { status: 400 });
  const supabase = createSupabaseAdminClient();
  const deviceHash = hashSubmitter(`journey-feedback:${feedback.deviceId}`);
  if (!supabase || !deviceHash) return Response.json({ error: "No pudimos guardar tu opinión. Intenta de nuevo." }, { status: 503 });
  const { error } = await supabase.rpc("record_journey_feedback", {
    p_route_keys: routes.map((route) => route!.slug),
    p_route_names: routes.map((route) => route!.name),
    p_device_hash: deviceHash,
    p_useful: feedback.useful,
    p_reason: feedback.reason,
  });
  if (error) {
    console.error("[journey-feedback] No se pudo guardar:", error.message);
    return Response.json({ error: "No pudimos guardar tu opinión. Intenta de nuevo." }, { status: 502 });
  }
  return Response.json({ ok: true });
}
