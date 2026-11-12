import { NextRequest } from "next/server";
import { verifyReportReceipt } from "@/lib/report-receipt";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { hasJsonContentType, isSameOriginRequest, readJsonBodyWithLimit, RequestBodyError } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isSameOriginRequest(request)) return new Response(null, { status: 403, headers });
  if (!hasJsonContentType(request)) return new Response(null, { status: 415, headers });
  if (!(await rateLimit(`report-status:${getClientIp(request)}`, 60, 3600_000))) return new Response(null, { status: 429, headers });
  let body: unknown;
  try { body = await readJsonBodyWithLimit(request, 2500); }
  catch (error) { if (error instanceof RequestBodyError) return new Response(null, { status: error.status, headers }); throw error; }
  if (!Array.isArray(body) || body.length > 20) return new Response(null, { status: 400, headers });
  const ids = body.map(verifyReportReceipt);
  if (ids.some((id) => !id)) return new Response(null, { status: 403, headers });
  if (!ids.length) return Response.json([], { headers });
  const supabase = createSupabaseAdminClient();
  if (!supabase) return new Response(null, { status: 503, headers });
  // Possession of a signed receipt authorizes status only, never private report content.
  const { data, error } = await supabase.from("community_reports").select("id,status,updated_at,resolved_at").in("id", ids as string[]);
  if (error) return new Response(null, { status: 503, headers });
  return Response.json((data ?? []).map(({ resolved_at, ...report }) => ({ ...report, status: resolved_at ? "resolved" : report.status })), { headers });
}
