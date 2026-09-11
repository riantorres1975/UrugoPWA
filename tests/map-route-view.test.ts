import { describe, expect, it } from "vitest";
import {
  applySelectedRouteSegment,
  buildArrowSegments,
  buildLandmarksByRouteName,
  buildRouteList,
  buildSimplifiedMapRoutes,
  countVisibleRoutes,
  simplifyBackgroundCoordinates,
} from "@/lib/map-route-view";
import type { TransferOption } from "@/lib/transfers";
import type { Coordinates, ProductionRoute } from "@/lib/types";

function makeRoute(overrides: Partial<ProductionRoute> = {}): ProductionRoute {
  return {
    id: 1,
    name: "Ruta 1",
    original_name: "Ruta 1 Ida",
    color: "#22c55e",
    corridor_width_m: 100,
    verified: true,
    path: [[-102.07, 19.41], [-102.06, 19.42]],
    landmarks: [],
    ...overrides,
  };
}

describe("map route view model", () => {
  it("deduplica sentidos y conserva los indicadores de ida y vuelta", () => {
    const routes = [
      makeRoute(),
      makeRoute({ id: 2, original_name: "Ruta 1 Vuelta" }),
      makeRoute({
        id: 3,
        name: "Teleférico Uruapan",
        original_name: "Teleférico Uruapan",
      }),
    ];

    const list = buildRouteList(routes);

    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ ruta: "Ruta 1", tieneIda: true, tieneVuelta: true });
    expect(list[1]).toMatchObject({ tieneIda: true, tieneVuelta: true });
    expect(countVisibleRoutes(list)).toBe(1);
  });

  it("combina las referencias de ida y vuelta por nombre", () => {
    const firstLandmarks = [{ name: "Centro", point: [-102.07, 19.41] as Coordinates }];
    const landmarks = buildLandmarksByRouteName([
      makeRoute({ landmarks: firstLandmarks }),
      makeRoute({ id: 2, original_name: "Ruta 1 Vuelta", landmarks: [
        { name: "Mercado", point: [-102.06, 19.42] },
      ] }),
    ]);

    expect(landmarks.get("Ruta 1")?.map((landmark) => landmark.name)).toEqual([
      "Centro",
      "Mercado",
    ]);
  });

  it("reduce recorridos de fondo preservando sus extremos", () => {
    const path = Array.from({ length: 500 }, (_, index): Coordinates => [
      -102.1 + index * 0.0001,
      19.4 + Math.sin(index / 3) * 0.001,
    ]);

    const simplified = simplifyBackgroundCoordinates(path);
    const route = buildSimplifiedMapRoutes([makeRoute({ path })])[0];

    expect(simplified.length).toBeLessThanOrEqual(180);
    expect(simplified[0]).toEqual(path[0]);
    expect(simplified.at(-1)).toEqual(path.at(-1));
    expect(route.coordenadas).toEqual(simplified);
  });

  it("prioriza las flechas de un transbordo sobre otros segmentos", () => {
    const transfer: TransferOption = {
      routeAId: 1,
      routeBId: 2,
      routeAName: "Ruta 1",
      routeBName: "Ruta 2",
      routeAStartIndex: 0,
      routeATransferIndex: 1,
      routeBTransferIndex: 0,
      routeBEndIndex: 1,
      transferPoint: [-102.06, 19.42],
      segmentA: [[-102.07, 19.41], [-102.06, 19.42]],
      segmentB: [[-102.06, 19.42], [-102.05, 19.43]],
      walkMeters: 40,
      score: 100,
    };

    expect(buildArrowSegments({
      destination: [-102.05, 19.43],
      origin: [-102.07, 19.41],
      routes: [makeRoute()],
      selectedRoute: makeRoute(),
      selectedSegment: [[-102.07, 19.41]],
      selectedTransfer: transfer,
      selectedSegmentColor: "#ffffff",
    })).toEqual([
      { coords: transfer.segmentA, color: "#60a5fa", showLine: false },
      { coords: transfer.segmentB, color: "#34d399", showLine: false },
    ]);
  });

  it("aplica el segmento activo únicamente al recorrido seleccionado", () => {
    const selectedRoute = makeRoute();
    const otherRoute = makeRoute({ id: 2, name: "Ruta 2", original_name: "Ruta 2 Ida" });
    const routes = buildSimplifiedMapRoutes([selectedRoute, otherRoute]);
    const segment: Coordinates[] = [[-102.065, 19.415], [-102.06, 19.42]];

    const result = applySelectedRouteSegment({
      routes,
      selectedRoute,
      selectedRouteId: selectedRoute.id,
      selectedSegment: segment,
    });

    expect(result[0].coordenadas).toBe(segment);
    expect(result[1]).toBe(routes[1]);
  });
});
