export const REPORT_PAGE_SIZE = 20;
export const REPORT_LABELS: Record<string, string> = {
  route_incorrect: "Ruta incorrecta", route_missing: "Ruta faltante", route_inactive: "Posiblemente inactiva",
  route_changed: "Cambio de recorrido", schedule_changed: "Cambio de horario", landmark_changed: "Referencia incorrecta",
  map_error: "Error de mapa", location_problem: "Problema de ubicación", usability_problem: "Error de uso", other: "Otro",
};
export type ReportFilters = { status: "pending" | "reviewing" | "approved" | "rejected"; search: string; type: string; oldest: boolean; page: number; reportId?: string };
export type ReportFilterParams = { estado?: string; buscar?: string; tipo?: string; orden?: string; pagina?: string; reporte?: string };

export function parseReportFilters(params: ReportFilterParams): ReportFilters {
  const status = ["reviewing", "approved", "rejected"].includes(params.estado ?? "") ? params.estado as ReportFilters["status"] : "pending";
  const page = Number(params.pagina);
  return { status,
    ...(/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(params.reporte ?? "") ? { reportId: params.reporte } : {}),
    // The text is embedded in PostgREST's OR grammar. Only literal words and
    // spaces are accepted; commas, wildcards and operators never reach it.
    search: (params.buscar ?? "").replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 120),
    type: Object.hasOwn(REPORT_LABELS, params.tipo ?? "") ? params.tipo! : "",
    oldest: params.orden === "antiguos" || (params.orden !== "recientes" && (status === "pending" || status === "reviewing")),
    page: Number.isSafeInteger(page) && page > 0 && page <= 100_000 ? page : 1,
  };
}

export function reportSearchExpression(search: string) {
  return ["route_name", "place", "description"].map((field) => `${field}.ilike.%${search}%`).join(",");
}

export function isAgedReport(createdAt: string, now = new Date()) {
  const created = Date.parse(createdAt);
  return Number.isFinite(created) && now.getTime() - created > 7 * 86_400_000;
}

export function reportsHref(filters: ReportFilters, patch: Partial<ReportFilters> = {}) {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams({ estado: next.status });
  if (next.search) params.set("buscar", next.search);
  if (next.type) params.set("tipo", next.type);
  if (next.reportId) params.set("reporte", next.reportId);
  params.set("orden", next.oldest ? "antiguos" : "recientes");
  if (next.page > 1) params.set("pagina", String(next.page));
  return `/admin?${params}`;
}
