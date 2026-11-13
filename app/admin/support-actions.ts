"use server";

import { revalidatePath } from "next/cache";
import { getAdminAccess } from "@/lib/admin-auth";
import { parseSupportAmount, parseSupportClaim } from "@/lib/support-contributions";
import { hashPaymentReference, hashSupportCode, newSupportCode } from "@/lib/support-access-server";
import { normalizeSupportCode, validSupportMonth } from "@/lib/support-management";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type SupportReviewState = { error?: string; success?: string; accessCode?: string };
const validId = (id: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);
function refreshSupportPages() { revalidatePath("/"); revalidatePath("/apoyar"); revalidatePath("/admin/apoyos"); }

export async function reviewSupportContribution(_previous: SupportReviewState, form: FormData): Promise<SupportReviewState> {
  const access = await getAdminAccess();
  if (access.status !== "admin") return { error: "Tu sesión no permite revisar aportaciones. Vuelve a iniciar sesión." };
  const id = String(form.get("id") ?? "");
  const revision = Number(form.get("revision"));
  const status = form.get("status");
  const amount = parseSupportAmount(form.get("amount"));
  const note = String(form.get("note") ?? "").trim();
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id) || !Number.isSafeInteger(revision) || revision < 1
    || !["confirmed", "rejected"].includes(String(status)) || amount === null || note.length > 1000) return { error: "Revisa el monto y la información del aviso." };
  if (status === "confirmed" && form.get("verified") !== "on") return { error: "Comprueba el pago en la cuenta receptora antes de confirmar." };
  if (status === "rejected" && !note) return { error: "Indica el motivo del rechazo en la nota privada." };
  const db = createSupabaseAdminClient();
  if (!db) return { error: "El registro de apoyos no está disponible." };
  const { error } = await db.rpc("review_support_contribution", {
    p_id: id, p_revision: revision, p_status: status, p_amount_cents: amount, p_note: note, p_actor_id: access.userId,
  }).abortSignal(AbortSignal.timeout(8000));
  if (error) return { error: error.code === "40001" ? "Otra persona actualizó este aviso. Recarga la página antes de revisarlo." : "No se pudo guardar la revisión. Vuelve a intentarlo." };
  refreshSupportPages();
  return { success: status === "confirmed" ? "Aporte confirmado. Se respetará la privacidad elegida." : "Aviso rechazado. No aparecerá en la comunidad." };
}

export async function registerVerifiedSupport(_previous: SupportReviewState, form: FormData): Promise<SupportReviewState> {
  const access = await getAdminAccess();
  if (access.status !== "admin") return { error: "Inicia sesión como administrador." };
  if (form.get("verified") !== "on") return { error: "Comprueba el pago recibido antes de registrarlo." };
  const claim = parseSupportClaim({ method: form.get("method"), amount: form.get("amount"), reference: form.get("reference"), visibility: form.get("visibility"),
    name: form.get("name"), showAmount: form.get("showAmount") === "on", paid: true });
  const accessCode = normalizeSupportCode(form.get("accessCode"));
  const note = String(form.get("note") ?? "").trim();
  if (!claim || !accessCode || note.length < 8 || note.length > 1000) return { error: "Revisa el comprobante, el monto y la nota de verificación." };
  if (claim.visibility === "named" && form.get("nameConsent") !== "on") return { error: "Necesitas autorización de la persona para publicar su nombre." };
  const db = createSupabaseAdminClient(); if (!db) return { error: "El registro no está disponible." };
  const managementHash = hashSupportCode(accessCode), referenceHash = hashPaymentReference(claim.reference);
  const { error } = await db.rpc("register_verified_support", { p_actor_id: access.userId, p_input: {
    method: claim.method, amount_cents: claim.amount_cents, reference: claim.reference, reference_hash: referenceHash,
    management_hash: managementHash, visibility: claim.visibility, name: claim.display_name, show_amount: claim.show_amount, note,
  } }).abortSignal(AbortSignal.timeout(8000));
  if (error?.code === "23505") {
    const own = await db.from("support_contributions").select("id").eq("method", claim.method).eq("reference_hash", referenceHash).eq("management_hash", managementHash).maybeSingle();
    if (!own.data || own.error) return { error: "Ese comprobante ya está registrado. Revisa el aviso existente en la bandeja." };
  } else if (error) return { error: "No se pudo registrar el apoyo. Conserva el comprobante y vuelve a intentarlo." };
  refreshSupportPages();
  return { success: "Aporte registrado y confirmado. Se respetará la privacidad indicada.", accessCode };
}

export async function saveSupportGoal(_previous: SupportReviewState, form: FormData): Promise<SupportReviewState> {
  const access = await getAdminAccess();
  if (access.status !== "admin") return { error: "Inicia sesión como administrador." };
  const month = form.get("month"), target = parseSupportAmount(form.get("target"));
  const revision = Number(form.get("revision"));
  const description = String(form.get("description") ?? "").trim();
  if (!validSupportMonth(month) || target === null || description.length < 12 || description.length > 300 || !Number.isSafeInteger(revision) || revision < 0) return { error: "Indica el mes, un importe real y qué gastos cubrirá." };
  const db = createSupabaseAdminClient(); if (!db) return { error: "La configuración no está disponible." };
  const { error } = await db.rpc("save_support_monthly_goal", { p_month: `${month}-01`, p_target: target, p_description: description,
    p_enabled: form.get("enabled") === "on", p_revision: revision, p_actor_id: access.userId }).abortSignal(AbortSignal.timeout(8000));
  if (error) return { error: error.code === "40001" ? "La meta cambió. Recarga la página antes de editarla." : "No se pudo guardar la meta." };
  refreshSupportPages(); return { success: form.get("enabled") === "on" ? "Meta mensual guardada y publicada." : "Meta guardada sin publicación pública." };
}

export async function rotateSupportAccess(_previous: SupportReviewState, form: FormData): Promise<SupportReviewState> {
  const access = await getAdminAccess();
  if (access.status !== "admin") return { error: "Inicia sesión como administrador." };
  const id = String(form.get("id") ?? ""), revision = Number(form.get("revision"));
  if (!validId(id) || !Number.isSafeInteger(revision) || revision < 1 || form.get("acknowledged") !== "on") return { error: "Confirma que entregarás el acceso solo a la persona que realizó el aporte." };
  const db = createSupabaseAdminClient(); if (!db) return { error: "No se pudo crear el acceso." };
  const accessCode = newSupportCode();
  const { error } = await db.rpc("rotate_support_access", { p_id: id, p_revision: revision, p_hash: hashSupportCode(accessCode), p_actor_id: access.userId }).abortSignal(AbortSignal.timeout(8000));
  if (error) return { error: error.code === "40001" ? "El aviso cambió. Recarga antes de crear un acceso nuevo." : "No se pudo crear el acceso privado." };
  // Keep the receipt visible in the client action state; rotating doesn't change public data.
  return { success: "Acceso creado. El código anterior dejó de funcionar. Guarda este código antes de cerrar.", accessCode };
}
