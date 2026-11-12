import { describe, expect, it } from "vitest";
import { isAgedReport, parseReportFilters, reportSearchExpression, reportsHref } from "@/lib/admin-report-filters";

describe("bandeja de reportes", () => {
  it("prioriza los pendientes antiguos y conserva filtros al cambiar de página", () => {
    const filters = parseReportFilters({ buscar: "Ruta 26", tipo: "route_changed", estado: "reviewing", pagina: "2" });
    expect(filters).toEqual({ search: "Ruta 26", type: "route_changed", status: "reviewing", page: 2, oldest: true });
    const next = new URL(reportsHref(filters, { page: 3 }), "https://urugo.app");
    expect(Object.fromEntries(next.searchParams)).toEqual({ estado: "reviewing", buscar: "Ruta 26", tipo: "route_changed", orden: "antiguos", pagina: "3" });
    expect(reportsHref(filters, { status: "approved", page: 1 })).not.toContain("pagina");
    const id = "46ed4c46-a5d7-4988-80d2-b9b5fdc96765";
    expect(parseReportFilters({ estado: "approved", reporte: id }).reportId).toBe(id);
    expect(parseReportFilters({ reporte: "invalid" }).reportId).toBeUndefined();
  });
  it("no introduce operadores, comodines ni filtros arbitrarios en PostgREST", () => {
    const filters = parseReportFilters({ buscar: '%,id.eq.1),or("x")', estado: "unknown", tipo: "__proto__", pagina: "1.5" });
    expect(filters).toMatchObject({ search: "id eq 1 or x", status: "pending", type: "", page: 1 });
    expect(reportSearchExpression(filters.search)).toBe("route_name.ilike.%id eq 1 or x%,place.ilike.%id eq 1 or x%,description.ilike.%id eq 1 or x%");
    expect(parseReportFilters({ buscar: "Clínica 76" }).search).toBe("Clínica 76");
    expect(parseReportFilters({ pagina: "100001" }).page).toBe(1);
  });
  it("solo marca como antiguos los avisos con más de siete días", () => {
    const now = new Date("2026-11-12T12:00:00Z");
    expect(isAgedReport("2026-11-01T00:00:00Z", now)).toBe(true);
    expect(isAgedReport("2026-11-11T23:59:00Z", now)).toBe(false);
    expect(isAgedReport("invalid", now)).toBe(false);
    expect(isAgedReport("2026-11-13T00:00:00Z", now)).toBe(false);
  });
});
