"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin-auth";
import {
  type RouteActionState,
  getReportRouteEditorHref,
  parseRoutePath,
  parseRoutePublicationForm,
} from "@/lib/admin-route";
import {
  parseRouteVerificationForm,
  type RouteVerificationActionState,
} from "@/lib/admin-route-verification";
import { generateCommunityApiKey, hashCommunityApiKey } from "@/lib/community-api-auth";
import { createSupabaseAdminClient, createSupabaseSessionClient } from "@/lib/supabase/server";

const REVIEW_STATUSES = new Set(["reviewing", "approved", "rejected"]);
const CONFIRMATION_STATUSES = new Set(["pending", "accepted", "dismissed"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ApiClientActionState = {
  apiKey?: string;
  message: string;
  status: "idle" | "success" | "error";
};

function refreshRouteViews(routeId: number) {
  revalidatePath("/admin");
  revalidatePath("/admin/routes");
  revalidatePath(`/admin/routes/${routeId}`);
  revalidatePath("/api/v1/routes");
  revalidatePath("/api/rutas-polyline");
  revalidatePath("/mapa");
}

export async function reviewCommunityReport(formData: FormData) {
  const access = await getAdminAccess();
  if (access.status !== "admin") throw new Error("No tienes permiso para moderar reportes.");

  const reportId = String(formData.get("reportId") ?? "").trim();
  const requestedAction = String(formData.get("status") ?? "").trim();
  const openEditor = requestedAction === "approve_edit";
  const status = openEditor ? "approved" : requestedAction;
  const note = String(formData.get("note") ?? "").trim().slice(0, 1_000);
  if (!UUID_PATTERN.test(reportId) || !REVIEW_STATUSES.has(status)) {
    throw new Error("La acción de moderación no es válida.");
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { data: report, error } = await supabase
    .from("community_reports")
    .update({
      status,
      moderator_note: note || null,
      reviewed_by: access.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .select("id,route_id,route_name,route_key")
    .single();

  if (error) throw new Error(`No se pudo actualizar el reporte: ${error.message}`);
  revalidatePath("/admin");
  if (openEditor) redirect(getReportRouteEditorHref(report));
}

export async function reviewRouteConfirmation(formData: FormData) {
  const access = await getAdminAccess();
  if (access.status !== "admin") throw new Error("No tienes permiso para moderar señales.");

  const confirmationId = String(formData.get("confirmationId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 1_000);
  if (!UUID_PATTERN.test(confirmationId) || !CONFIRMATION_STATUSES.has(status)) {
    throw new Error("La acción de moderación no es válida.");
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase no está configurado.");

  const pending = status === "pending";
  const { data: updatedConfirmation, error } = await supabase
    .from("route_confirmations")
    .update({
      status,
      moderator_note: note || null,
      reviewed_by: pending ? null : access.userId,
      reviewed_at: pending ? null : new Date().toISOString(),
    })
    .eq("id", confirmationId)
    .select("route_key")
    .maybeSingle();

  if (error) throw new Error(`No se pudo actualizar la señal: ${error.message}`);
  if (!updatedConfirmation) throw new Error("No se encontró la señal que intentas moderar.");
  revalidatePath("/admin/signals");
  revalidatePath("/admin/routes");
  revalidatePath(`/api/v1/routes/${updatedConfirmation.route_key}/community-status`);
}

export async function signOutAdmin() {
  const supabase = await createSupabaseSessionClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function createCommunityApiClient(
  _previousState: ApiClientActionState,
  formData: FormData,
): Promise<ApiClientActionState> {
  const access = await getAdminAccess();
  if (access.status !== "admin") return { status: "error", message: "Tu sesión no permite crear integraciones." };

  const name = String(formData.get("name") ?? "").trim();
  const hourlyLimit = Number(formData.get("hourlyLimit"));
  if (name.length < 2 || name.length > 120) {
    return { status: "error", message: "El nombre debe tener entre 2 y 120 caracteres." };
  }
  if (!Number.isSafeInteger(hourlyLimit) || hourlyLimit < 1 || hourlyLimit > 1000) {
    return { status: "error", message: "La cuota debe estar entre 1 y 1000 reportes por hora." };
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) return { status: "error", message: "Supabase no está configurado." };

  const apiKey = generateCommunityApiKey();
  const { error } = await supabase.from("community_api_clients").insert({
    created_by: access.userId,
    hourly_limit: hourlyLimit,
    key_hash: hashCommunityApiKey(apiKey),
    key_prefix: apiKey.slice(0, 20),
    name,
  });
  if (error) {
    console.error("[admin-integrations] No se pudo crear la integración:", error.code, error.message);
    return { status: "error", message: "No se pudo crear la integración. Comprueba que la migración esté aplicada." };
  }

  revalidatePath("/admin/integrations");
  return {
    apiKey,
    message: "Guarda esta clave ahora. No volverá a mostrarse.",
    status: "success",
  };
}

export async function updateCommunityApiClient(formData: FormData) {
  const access = await getAdminAccess();
  if (access.status !== "admin") throw new Error("No tienes permiso para modificar integraciones.");

  const clientId = String(formData.get("clientId") ?? "").trim();
  const hourlyLimit = Number(formData.get("hourlyLimit"));
  if (!UUID_PATTERN.test(clientId) || !Number.isSafeInteger(hourlyLimit) || hourlyLimit < 1 || hourlyLimit > 1000) {
    throw new Error("La integración o su cuota no son válidas.");
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { error } = await supabase
    .from("community_api_clients")
    .update({ hourly_limit: hourlyLimit })
    .eq("id", clientId)
    .eq("active", true);
  if (error) throw new Error("No se pudo actualizar la cuota de la integración.");
  revalidatePath("/admin/integrations");
}

export async function revokeCommunityApiClient(formData: FormData) {
  const access = await getAdminAccess();
  if (access.status !== "admin") throw new Error("No tienes permiso para revocar integraciones.");

  const clientId = String(formData.get("clientId") ?? "").trim();
  if (!UUID_PATTERN.test(clientId)) throw new Error("La integración no es válida.");

  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { error } = await supabase
    .from("community_api_clients")
    .update({ active: false, revoked_at: new Date().toISOString() })
    .eq("id", clientId)
    .eq("active", true);
  if (error) throw new Error("No se pudo revocar la integración.");
  revalidatePath("/admin/integrations");
}

export async function publishRouteRevision(
  _previousState: RouteActionState,
  formData: FormData,
): Promise<RouteActionState> {
  const access = await getAdminAccess();
  if (access.status !== "admin") return { status: "error", message: "Tu sesión no permite publicar rutas." };

  const input = parseRoutePublicationForm(formData);
  if (!input) {
    return { status: "error", message: "Revisa los campos, el resumen y las coordenadas antes de publicar." };
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) return { status: "error", message: "Supabase no está configurado." };

  const [routeResult, reportResult] = await Promise.all([
    supabase.from("routes").select("landmarks,path,verified").eq("id", input.routeId).single(),
    input.reportId
      ? supabase.from("community_reports").select("route_id,status").eq("id", input.reportId).maybeSingle()
      : null,
  ]);
  const currentRoute = routeResult.data;

  if (routeResult.error || !currentRoute) {
    return { status: "error", message: "No se encontró la ruta que intentas publicar." };
  }
  if (reportResult && (reportResult.error || reportResult.data?.status !== "approved"
    || (reportResult.data.route_id !== null && reportResult.data.route_id !== input.routeId))) {
    return { status: "error", message: "El reporte debe estar aprobado y corresponder a esta ruta." };
  }
  const previousPath = parseRoutePath(JSON.stringify(currentRoute.path));
  const pathChanged = JSON.stringify(previousPath) !== JSON.stringify(input.path);

  const { data: nextVersion, error } = await supabase.rpc("publish_route_revision", {
    p_route_id: input.routeId,
    p_expected_version: input.expectedVersion,
    p_name: input.name,
    p_original_name: input.originalName,
    p_color: input.color,
    p_corridor_width_m: input.corridorWidthM,
    p_verified: currentRoute.verified && !pathChanged,
    p_operational_status: input.operationalStatus,
    p_path: input.path,
    p_landmarks: currentRoute.landmarks ?? [],
    p_change_summary: input.changeSummary,
    p_report_id: input.reportId,
    p_actor_id: access.userId,
  });

  if (error) {
    console.error("[admin-routes] No se pudo publicar la revisión:", error.code, error.message);
    const stale = error.code === "40001";
    return {
      status: "error",
      message: stale
        ? "Alguien publicó otra versión mientras editabas. Recarga la página y revisa los cambios."
        : "No se pudo publicar la revisión. Comprueba que el reporte esté aprobado e intenta de nuevo.",
    };
  }

  refreshRouteViews(input.routeId);
  const query = new URLSearchParams({ publicada: String(Number(nextVersion)) });
  if (input.reportId) query.set("reporte", input.reportId);
  redirect(`/admin/routes/${input.routeId}?${query}`);
}

export async function restoreRouteRevision(formData: FormData) {
  const access = await getAdminAccess();
  if (access.status !== "admin") throw new Error("No tienes permiso para restaurar rutas.");

  const routeId = Number(formData.get("routeId"));
  const expectedVersion = Number(formData.get("expectedVersion"));
  const revisionId = String(formData.get("revisionId") ?? "").trim();
  if (!Number.isSafeInteger(routeId) || routeId <= 0 || !Number.isSafeInteger(expectedVersion) || !UUID_PATTERN.test(revisionId)) {
    throw new Error("La revisión seleccionada no es válida.");
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase no está configurado.");

  const { data: revision, error: revisionError } = await supabase
    .from("route_revisions")
    .select("version,name,original_name,color,corridor_width_m,verified,path,landmarks,operational_status")
    .eq("id", revisionId)
    .eq("route_id", routeId)
    .single();

  if (revisionError || !revision) throw new Error("No se encontró la revisión que intentas restaurar.");

  const { data: nextVersion, error } = await supabase.rpc("publish_route_revision", {
    p_route_id: routeId,
    p_expected_version: expectedVersion,
    p_name: revision.name,
    p_original_name: revision.original_name,
    p_color: revision.color,
    p_corridor_width_m: revision.corridor_width_m,
    p_verified: revision.verified,
    p_operational_status: revision.operational_status,
    p_path: revision.path,
    p_landmarks: revision.landmarks ?? [],
    p_change_summary: `Restauración de la versión ${revision.version}`,
    p_report_id: null,
    p_actor_id: access.userId,
  });

  if (error) {
    console.error("[admin-routes] No se pudo restaurar la revisión:", error.code, error.message);
    throw new Error("No se pudo restaurar la revisión. Recarga la página e intenta de nuevo.");
  }
  refreshRouteViews(routeId);
  redirect(`/admin/routes/${routeId}?publicada=${Number(nextVersion)}&restaurada=${revision.version}`);
}

export async function recordRouteFieldVerification(
  _previousState: RouteVerificationActionState,
  formData: FormData,
): Promise<RouteVerificationActionState> {
  const access = await getAdminAccess();
  if (access.status !== "admin") {
    return { status: "error", message: "Tu sesión no permite verificar rutas." };
  }

  const input = parseRouteVerificationForm(formData);
  if (!input) {
    return { status: "error", message: "Describe qué comprobaste con al menos 10 caracteres." };
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) return { status: "error", message: "Supabase no está configurado." };

  const { error } = await supabase.rpc("record_route_field_verification", {
    p_route_id: input.routeId,
    p_expected_version: input.expectedVersion,
    p_note: input.note,
    p_actor_id: access.userId,
  });

  if (error) {
    console.error("[admin-routes] No se pudo registrar la verificación:", error.code, error.message);
    return {
      status: "error",
      message: error.code === "40001"
        ? "La ruta cambió mientras la comprobabas. Recarga la página antes de registrarla."
        : "No se pudo registrar la verificación. Comprueba que la migración esté aplicada.",
    };
  }

  refreshRouteViews(input.routeId);
  redirect(`/admin/routes/${input.routeId}?verificada=1`);
}
