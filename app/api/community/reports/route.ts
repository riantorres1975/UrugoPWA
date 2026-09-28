import { randomUUID } from "node:crypto";
import { createReportReceipt } from "@/lib/report-receipt";
import { NextRequest } from "next/server";
import { parseCommunityReport } from "@/lib/community-report";
import { getSafeSourcePath, hashSubmitter } from "@/lib/community-submission";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { findRouteSeoItem } from "@/lib/route-seo";
import {
  hasJsonContentType,
  isSameOriginRequest,
  readJsonBodyWithLimit,
  RequestBodyError,
} from "@/lib/request-security";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const MAX_BODY_BYTES = 24_000;

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new Response(null, { status: 403 });
  if (!hasJsonContentType(request)) return new Response(null, { status: 415 });

  const ip = getClientIp(request);
  if (!(await rateLimit(`community-report:${ip}`, 5, 10 * 60_000))) {
    return Response.json({ error: "Espera unos minutos antes de enviar otro reporte." }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await readJsonBodyWithLimit(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const report = parseCommunityReport(raw);
  if (!report) {
    return Response.json({ error: "Revisa los datos del reporte e intenta de nuevo." }, { status: 400 });
  }

  // Honeypot: respondemos como si se hubiera guardado para no enseñar el filtro al bot.
  if (report.website) return Response.json({ ok: true }, { status: 201 });

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return Response.json(
      { error: "Los reportes comunitarios todavía no están configurados. Usa correo o GitHub por ahora." },
      { status: 503 },
    );
  }

  const linkedRoute = report.routeKey ? findRouteSeoItem(report.routeKey) : null;

  const reportId = randomUUID();
  const { error } = await supabase.from("community_reports").insert({
    id: reportId,
    report_type: report.reportType,
    route_key: linkedRoute?.slug ?? null,
    route_name: linkedRoute?.name ?? report.routeName,
    place: report.place,
    description: report.description,
    expected_result: report.expectedResult,
    contact: report.contact,
    evidence_url: report.evidenceUrl,
    proposed_path: report.proposedPath,
    source_path: getSafeSourcePath(request, report.sourcePath),
    user_agent: request.headers.get("user-agent")?.slice(0, 400) ?? null,
    submitted_by_hash: hashSubmitter(ip),
  });

  if (error) {
    console.error("[community-report] No se pudo guardar:", error.message);
    return Response.json({ error: "No pudimos guardar el reporte. Intenta nuevamente." }, { status: 502 });
  }

  return Response.json({ ok: true, receipt: createReportReceipt(reportId) }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
