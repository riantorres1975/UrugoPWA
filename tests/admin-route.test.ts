import { describe, expect, it } from "vitest";
import { getReportRouteEditorHref, insertRoutePoint, joinRouteSegment, parseRoutePath, parseRoutePublicationForm } from "@/lib/admin-route";
import type { Coordinates } from "@/lib/types";

describe("admin route publication validation", () => {
  it("acepta matrices y GeoJSON LineString dentro de la región", () => {
    const coordinates = [[-102.08, 19.41], [-102.06, 19.42]];
    expect(parseRoutePath(JSON.stringify(coordinates))).toEqual(coordinates);
    expect(parseRoutePath(JSON.stringify({ type: "LineString", coordinates }))).toEqual(coordinates);
  });

  it("acepta un Feature GeoJSON", () => {
    const coordinates = [[-102.08, 19.41], [-102.06, 19.42]];
    expect(parseRoutePath(JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates },
    }))).toEqual(coordinates);
  });

  it("rechaza coordenadas fuera de la región o recorridos incompletos", () => {
    expect(parseRoutePath("[[-99.1,19.4],[-99.2,19.5]]")).toBeNull();
    expect(parseRoutePath("[[-102.1,19.4]]")).toBeNull();
    expect(parseRoutePath("not-json")).toBeNull();
  });

  it("normaliza un formulario de publicación válido", () => {
    const form = new FormData();
    form.set("routeId", "26");
    form.set("expectedVersion", "3");
    form.set("name", "  Ruta 26  ");
    form.set("originalName", "Ruta 26 Ida");
    form.set("color", "#AABBCC");
    form.set("corridorWidthM", "500");
    form.set("operationalStatus", "active");
    form.set("path", "[[-102.08,19.41],[-102.06,19.42]]");
    form.set("changeSummary", "Confirmada directamente con usuarios frecuentes.");

    expect(parseRoutePublicationForm(form)).toMatchObject({
      routeId: 26,
      expectedVersion: 3,
      name: "Ruta 26",
      color: "#aabbcc",
      operationalStatus: "active",
    });
  });

  it("rechaza versiones, colores y resúmenes inválidos", () => {
    const form = new FormData();
    form.set("routeId", "26");
    form.set("expectedVersion", "0");
    form.set("name", "Ruta 26");
    form.set("originalName", "Ruta 26 Ida");
    form.set("color", "green");
    form.set("corridorWidthM", "500");
    form.set("operationalStatus", "active");
    form.set("path", "[[-102.08,19.41],[-102.06,19.42]]");
    form.set("changeSummary", "corto");
    expect(parseRoutePublicationForm(form)).toBeNull();
  });
});

describe("acceso al editor desde un reporte", () => {
  it("abre el sentido vinculado o busca entre todas las rutas", () => {
    const report = { id: "reporte", route_id: 26, route_name: "Ruta 26", route_key: "ruta-26" };
    expect(getReportRouteEditorHref(report)).toBe("/admin/routes/26?reporte=reporte");
    expect(getReportRouteEditorHref({ ...report, route_id: null })).toBe("/admin/routes?reporte=reporte&buscar=Ruta+26");
    expect(getReportRouteEditorHref({ ...report, route_id: null, route_name: null })).toBe("/admin/routes?reporte=reporte&buscar=ruta-26");
  });
});

describe("orden de puntos en el editor", () => {
  const path: Coordinates[] = [
    [-102.075, 19.41],
    [-102.07, 19.41],
    [-102.07, 19.412],
    [-102.075, 19.412],
  ];

  it("inserta en el tramo seleccionado incluso al tocar más cerca de otro tramo", () => {
    const point: Coordinates = [-102.073, 19.4119];
    const first = insertRoutePoint(path, 0, "after", point);
    expect(first).toEqual({ index: 1, path: [path[0], point, ...path.slice(1)] });
    const nextPoint: Coordinates = [-102.072, 19.4118];
    const next = insertRoutePoint(first.path, first.index, "after", nextPoint);
    expect(next.path).toEqual([path[0], point, nextPoint, ...path.slice(1)]);
  });

  it("puede extender ambos extremos sin alterar los puntos existentes", () => {
    const first: Coordinates = [-102.076, 19.4099];
    const last: Coordinates = [-102.076, 19.4121];
    expect(insertRoutePoint(path, 0, "before", first)).toEqual({ index: 0, path: [first, ...path] });
    expect(insertRoutePoint(path, path.length - 1, "after", last)).toEqual({ index: path.length, path: [...path, last] });
  });
});

describe("unir un tramo al recorrido", () => {
  const path: Coordinates[] = [
    [-102.075, 19.41], [-102.073, 19.41], [-102.071, 19.41],
    [-102.069, 19.41], [-102.067, 19.41],
  ];
  const north: Coordinates = [-102.073, 19.412];
  const east: Coordinates = [-102.069, 19.412];

  it("conserva las conexiones y reemplaza solo los puntos intermedios", () => {
    expect(joinRouteSegment(path, 1, 3, [north, east])).toEqual([path[0], path[1], north, east, path[3], path[4]]);
  });

  it("respeta el sentido cuando las conexiones se seleccionan al revés", () => {
    expect(joinRouteSegment(path, 3, 1, [east, north])).toEqual([path[0], path[1], north, east, path[3], path[4]]);
  });

  it("descarta conexiones inválidas y evita duplicar los extremos", () => {
    expect(joinRouteSegment(path, 1, 1, [north])).toBeNull();
    expect(joinRouteSegment(path, 1, 8, [north])).toBeNull();
    expect(joinRouteSegment(path, 1, 3, [])).toBeNull();
    expect(joinRouteSegment(path, 1, 3, [path[1], north, path[3]])).toEqual([path[0], path[1], north, path[3], path[4]]);
  });
});
