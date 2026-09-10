import { NextRequest } from "next/server";
import { parseRouteConsultation } from "@/lib/route-consultation";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import {
  hasJsonContentType,
  isSameOriginRequest,
  readJsonBodyWithLimit,
  RequestBodyError,
} from "@/lib/request-security";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const MAX_BODY_BYTES = 500;

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new Response(null, { status: 403 });
  if (!hasJsonContentType(request)) return new Response(null, { status: 415 });

  const ip = getClientIp(request);
  if (!(await rateLimit(`route-consultation:${ip}`, 80, 24 * 60 * 60_000))) {
    return new Response(null, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await readJsonBodyWithLimit(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyError) return new Response(null, { status: error.status });
    throw error;
  }

  const consultation = parseRouteConsultation(raw);
  if (!consultation) return new Response(null, { status: 400 });

  const supabase = createSupabaseAdminClient();
  if (!supabase) return new Response(null, { status: 204 });

  const { error } = await supabase.rpc("record_route_consultation", {
    p_route_key: consultation.route.slug,
    p_source: consultation.source,
  });

  if (error) {
    console.warn("[route-consultation] No se pudo guardar:", error.message);
  }

  return new Response(null, { status: 204 });
}
