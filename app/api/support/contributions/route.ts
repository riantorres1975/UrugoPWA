import { NextRequest } from "next/server";
import { parseSupportClaim } from "@/lib/support-contributions";
import { getSupportOptions } from "@/lib/support";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { hashPaymentReference, hashSupportCode, newSupportCode } from "@/lib/support-access-server";
import { normalizeSupportCode } from "@/lib/support-management";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { hasJsonContentType, isSameOriginRequest, readJsonBodyWithLimit, RequestBodyError } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!isSameOriginRequest(request)) return new Response(null, { status: 403, headers });
  if (!hasJsonContentType(request)) return new Response(null, { status: 415, headers });
  if (!(await rateLimit(`support-claim:${getClientIp(request)}`, 4, 3600_000))) return Response.json({ error: "Espera un momento antes de enviar otro aviso." }, { status: 429, headers });
  let raw: unknown;
  try { raw = await readJsonBodyWithLimit(request, 3000); }
  catch (error) { if (error instanceof RequestBodyError) return Response.json({ error: error.message }, { status: error.status, headers }); throw error; }
  const claim = parseSupportClaim(raw);
  if (!claim) return Response.json({ error: "Revisa el monto, el identificador del pago y cómo quieres aparecer." }, { status: 400, headers });
  const input = raw as Record<string, unknown>;
  const accessCode = input.accessCode === undefined ? newSupportCode() : normalizeSupportCode(input.accessCode);
  if (!accessCode) return Response.json({ error: "El código privado no es válido. Recarga el formulario." }, { status: 400, headers });
  if (claim.website) return Response.json({ ok: true }, { status: 201, headers });
  const options = getSupportOptions();
  if ((claim.method === "mercadopago" && !options.mercadoPagoUrl) || (claim.method === "spei" && !options.spei)) return Response.json({ error: "Ese medio de apoyo no está disponible." }, { status: 400, headers });
  const db = createSupabaseAdminClient();
  if (!db) return Response.json({ error: "El registro no está disponible. Tu pago se realiza directamente en el proveedor; puedes avisarnos más tarde." }, { status: 503, headers });
  const referenceHash = hashPaymentReference(claim.reference);
  const managementHash = hashSupportCode(accessCode);
  const { error } = await db.from("support_contributions").insert({ method: claim.method, amount_cents: claim.amount_cents,
    payment_reference: claim.reference, reference_hash: referenceHash, management_hash: managementHash, visibility: claim.visibility, display_name: claim.display_name, show_amount: claim.show_amount });
  if (error && error.code !== "23505") return Response.json({ error: "No pudimos guardar el aviso. Conserva tu comprobante e intenta más tarde." }, { status: 502, headers });
  if (error) {
    // Recover an interrupted submission only when the caller already has its secret.
    // Knowing a transaction reference must never grant access to someone else's notice.
    const own = await db.from("support_contributions").select("id").eq("method", claim.method).eq("reference_hash", referenceHash).eq("management_hash", managementHash).maybeSingle();
    return Response.json(own.data && !own.error ? { ok: true, accessCode } : { ok: true }, { status: 201, headers });
  }
  return Response.json({ ok: true, accessCode }, { status: 201, headers });
}
