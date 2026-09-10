import { describe, expect, it } from "vitest";
import { parseRouteConsultation } from "@/lib/route-consultation";

describe("consultas anónimas de rutas", () => {
  it("resuelve una ficha por su slug canónico", () => {
    const result = parseRouteConsultation({
      routeKey: "ruta-176-quinta-clinica-76",
      source: "route_page",
    });

    expect(result?.route.name).toBe("Ruta 176");
    expect(result?.source).toBe("route_page");
  });

  it("resuelve una selección del mapa por nombre", () => {
    const result = parseRouteConsultation({ routeName: "ruta 17", source: "map" });

    expect(result?.route.name).toBe("Ruta 17");
    expect(result?.source).toBe("map");
  });

  it("rechaza rutas desconocidas, el Teleférico y fuentes inválidas", () => {
    expect(parseRouteConsultation({ routeName: "Ruta 999", source: "map" })).toBeNull();
    expect(parseRouteConsultation({ routeName: "Teleférico Uruapan", source: "map" })).toBeNull();
    expect(parseRouteConsultation({ routeName: "Ruta 17", source: "landing" })).toBeNull();
  });
});
