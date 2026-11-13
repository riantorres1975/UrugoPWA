"use server";

import { revalidatePath } from "next/cache";
import { getAdminAccess } from "@/lib/admin-auth";
import { parseSupportAmount } from "@/lib/support-contributions";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type SupportReviewState = { error?: string; success?: string };

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
  revalidatePath("/"); revalidatePath("/apoyar"); revalidatePath("/admin/apoyos");
  return { success: status === "confirmed" ? "Aporte confirmado. Se respetará la privacidad elegida." : "Aviso rechazado. No aparecerá en la comunidad." };
}
