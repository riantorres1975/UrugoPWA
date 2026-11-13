import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { hashSupportCode } from "@/lib/support-access-server";
import { normalizeSupportCode, parseSupportPrivacy, type SupportReceipt } from "@/lib/support-management";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { hasJsonContentType, isSameOriginRequest, readJsonBodyWithLimit, RequestBodyError } from "@/lib/request-security";

const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new Response(null, { status: 403, headers });
  if (!hasJsonContentType(request)) return new Response(null, { status: 415, headers });
  if (!(await rateLimit(`support-access:${getClientIp(request)}`, 30, 900_000))) return Response.json({ error: "Espera unos minutos antes de volver a consultar." }, { status: 429, headers });
  let raw: unknown;
  try { raw = await readJsonBodyWithLimit(request, 2000); }
  catch (error) { if (error instanceof RequestBodyError) return Response.json({ error: error.message }, { status: error.status, headers }); throw error; }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return Response.json({ error: "Solicitud inválida." }, { status: 400, headers });
  const input = raw as Record<string, unknown>;
  const code = normalizeSupportCode(input.code);
  if (!code || !["status", "privacy"].includes(String(input.action))) return Response.json({ error: "Revisa tu código privado." }, { status: 400, headers });
  const db = createSupabaseAdminClient();
  if (!db) return Response.json({ error: "La consulta no está disponible por el momento." }, { status: 503, headers });
  const hash = hashSupportCode(code);
  if (input.action === "privacy") {
    const privacy = parseSupportPrivacy(input);
    if (!privacy) return Response.json({ error: "Revisa el nombre y la opción de privacidad." }, { status: 400, headers });
    const { error } = await db.rpc("update_support_privacy", { p_hash: hash, p_revision: privacy.revision, p_visibility: privacy.visibility, p_name: privacy.name, p_show_amount: privacy.showAmount }).abortSignal(AbortSignal.timeout(8000));
    if (error) return Response.json({ error: error.code === "40001" ? "El aviso cambió. Actualiza el estado antes de guardar." : "No se pudo actualizar el aporte con ese código." }, { status: error.code === "40001" ? 409 : error.code === "P0002" ? 404 : 502, headers });
    revalidatePath("/"); revalidatePath("/apoyar"); revalidatePath("/admin/apoyos");
  }
  const { data, error } = await db.from("support_contributions")
    .select("status,publication_status,visibility,display_name,show_amount,amount_cents,revision,created_at,confirmed_at")
    .eq("management_hash", hash).abortSignal(AbortSignal.timeout(8000)).maybeSingle();
  if (error) return Response.json({ error: "No pudimos consultar el aporte. Intenta más tarde." }, { status: 502, headers });
  if (!data) return Response.json({ error: "No encontramos un aviso con ese código. Revisa que esté completo o utiliza tu código más reciente." }, { status: 404, headers });
  // Explicit projection: no payment reference, secret hash, provider or moderation notes.
  const receipt: SupportReceipt = { status: data.status, publication_status: data.publication_status, visibility: data.visibility,
    display_name: data.display_name, show_amount: data.show_amount, amount_cents: data.amount_cents, revision: data.revision,
    created_at: data.created_at, confirmed_at: data.confirmed_at };
  return Response.json({ receipt }, { headers });
}
