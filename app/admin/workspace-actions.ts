"use server";

import { getAdminAccess } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { parseEditorDraft, type EditorDraft } from "@/lib/admin-route-draft";
import { parseRouteCoordinate, parseRoutePath } from "@/lib/admin-route";
import { parseRoadAlignment } from "@/lib/admin-road-alignment";
import type { Coordinates } from "@/lib/types";
import { revalidatePath } from "next/cache";

async function context() {
  const access = await getAdminAccess();
  if (access.status !== "admin") throw new Error("Inicia sesión como administrador para continuar.");
  const db = createSupabaseAdminClient();
  if (!db) throw new Error("Supabase no está configurado.");
  return { access, db };
}
function validId(id: number) { if (!Number.isSafeInteger(id) || id < 1) throw new Error("Ruta inválida."); }

export async function loadCloudDraft(routeId: number, sessionId: string) {
  const { access, db } = await context(); validId(routeId);
  if (!/^[a-f0-9-]{36}$/.test(sessionId)) throw new Error("Sesión inválida.");
  await db.from("route_editor_presence").delete().eq("route_id", routeId).lt("seen_at", new Date(Date.now() - 5 * 60_000).toISOString());
  const { error: presenceError } = await db.from("route_editor_presence").upsert({ route_id: routeId, user_id: access.userId, session_id: sessionId, seen_at: new Date().toISOString() });
  const [draft, presence] = await Promise.all([
    db.from("route_editor_drafts").select("snapshot,revision,updated_at").eq("route_id", routeId).eq("user_id", access.userId).maybeSingle(),
    db.from("route_editor_presence").select("user_id,session_id").eq("route_id", routeId).gte("seen_at", new Date(Date.now() - 90_000).toISOString()).neq("session_id", sessionId).limit(20),
  ]);
  if (draft.error || presenceError || presence.error) return { error: "El guardado en la cuenta no está disponible. Tu borrador local sigue funcionando." };
  return { draft: draft.data, otherEditors: presence.data.length, serverNow: Date.now() };
}

export async function saveCloudDraft(snapshot: EditorDraft, expectedRevision: number) {
  const { access, db } = await context();
  const validated = snapshot && parseEditorDraft(JSON.stringify({ ...snapshot, savedAt: Date.now() }), snapshot.routeId, snapshot.reportId);
  if (!validated || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) return { error: "El borrador no es válido." };
  const { data, error } = await db.rpc("save_route_editor_draft", { p_route_id: validated.routeId, p_user_id: access.userId,
    p_base_version: validated.baseVersion, p_revision: expectedRevision, p_snapshot: validated });
  if (error) return { error: error.code === "40001" ? "La ruta o el borrador cambió en otro dispositivo. Carga la copia de la cuenta antes de seguir guardando." : "No se pudo guardar en la cuenta. Conservamos la copia local." };
  return { revision: Number(data) };
}

export async function resolveAdminReport(_previous: { message: string; ok: boolean }, form: FormData) {
  const { access, db } = await context();
  const id = String(form.get("reportId") ?? "");
  const note = String(form.get("resolution") ?? "").trim();
  if (!/^[a-f0-9-]{36}$/i.test(id) || note.length < 10 || note.length > 1000) return { ok: false, message: "Describe cómo se solucionó el reporte (entre 10 y 1000 caracteres)." };
  const now = new Date().toISOString();
  const { data, error } = await db.from("community_reports").update({ status: "approved", resolution_note: note, resolved_at: now, resolved_by: access.userId, reviewed_at: now, reviewed_by: access.userId })
    .eq("id", id).is("resolved_at", null).select("id").maybeSingle();
  if (error || !data) return { ok: false, message: "No se pudo cerrar. Puede que otro administrador ya lo haya resuelto; actualiza la página." };
  revalidatePath("/admin");
  return { ok: true, message: "Reporte resuelto. Guardamos el motivo, la fecha y el administrador responsable." };
}

export async function proposeRoadAlignment(points: Coordinates[]) {
  await context();
  if (!Array.isArray(points) || points.length < 2 || points.length > 25 || !points.every(parseRouteCoordinate)) return { error: "Elige entre 2 y 25 conexiones válidas." };
  // OSM-derived geometry can be retained with attribution; Mapbox temporary results are never persisted here.
  const base = process.env.ADMIN_OSRM_URL || "https://router.project-osrm.org";
  try {
    const url = `${base.replace(/\/$/, "")}/route/v1/driving/${points.map((p) => p.join(",")).join(";")}?overview=full&geometries=geojson&steps=false`;
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000), cache: "no-store" });
    if (!response.ok) return { error: "El servicio de calles no respondió. Puedes dibujar el tramo manualmente." };
    const path = parseRoadAlignment(await response.json(), points[0], points.at(-1)!);
    return path?.length ? { path } : { error: "No se encontró una conexión cercana. Revisa A y B o dibuja el tramo." };
  } catch { return { error: "No pudimos consultar las calles. Inténtalo más tarde o dibuja el tramo." }; }
}

export async function simulateDraftJourney(routeId: number, raw: string, origin: Coordinates, destination: Coordinates) {
  const { db } = await context(); validId(routeId);
  const path = parseRoutePath(raw);
  if (!path || !parseRouteCoordinate(origin) || !parseRouteCoordinate(destination)) return { error: "Marca un origen y un destino válidos." };
  const { data, error } = await db.from("routes").select("id,name,color,corridor_width_m,path").eq("publication_status", "published").in("operational_status", ["active", "under_review"]);
  if (error || !data?.some((row) => row.id === routeId)) return { error: "No se pudo cargar la red publicada para esta prueba." };
  const routes = data.flatMap((row) => { const points = row.id === routeId ? path : parseRoutePath(JSON.stringify(row.path)); return points ? [{ ...row, path: points }] : []; });
  const { calculateRouteOptions } = await import("@/lib/route-calculation");
  const result = calculateRouteOptions(routes, origin, destination);
  return { options: [
    ...result.suggestions.map((option) => ({ label: option.ruta, minutes: option.estimatedMinutes, walkM: option.distanciaA + option.distanciaB,
      paths: [option.segment], usesDraft: option.routeId === routeId })),
    ...result.transfers.map((option) => ({ label: `${option.routeAName} → ${option.routeBName}`, minutes: option.estimatedMinutes ?? 0,
      walkM: (option.cost?.originWalkM ?? 0) + option.walkMeters + (option.cost?.destinationWalkM ?? 0), paths: [option.segmentA, option.segmentB], usesDraft: option.routeAId === routeId || option.routeBId === routeId })),
  ] };
}
