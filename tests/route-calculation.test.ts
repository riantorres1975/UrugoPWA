import { describe, expect, it } from "vitest";
import { calculateRouteOptions } from "@/lib/route-calculation";
import type { PolylineRoute } from "@/lib/routeMatcher";

const directRoute: PolylineRoute = {
  id: 1,
  name: "Ruta Directa",
  color: "#22c55e",
  corridor_width_m: 200,
  direccion: "ida",
  path: [
    [-102.08, 19.4],
    [-102.07, 19.4],
    [-102.06, 19.41],
  ],
};

describe("calculateRouteOptions", () => {
  it("ofrece la ruta directa cuando no existe una combinación con otra ruta", () => {
    const result = calculateRouteOptions(
      [directRoute],
      [-102.078, 19.4],
      [-102.062, 19.408],
    );

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toMatchObject({ routeId: 1, ruta: "Ruta Directa" });
    expect(result.transfers).toEqual([]);
  });

  it("calcula transbordos cuando no existe una ruta directa", () => {
    const routeA: PolylineRoute = {
      id: 10,
      name: "Ruta A",
      color: "#60a5fa",
      corridor_width_m: 550,
      direccion: "ida",
      path: [
        [0, 0],
        [0.035, 0],
        [0.035, 0.025],
      ],
    };
    const routeB: PolylineRoute = {
      id: 20,
      name: "Ruta B",
      color: "#34d399",
      corridor_width_m: 550,
      direccion: "ida",
      path: [
        [0.035, 0.025],
        [0.045, 0.025],
        [0.03, 0.01],
      ],
    };

    const result = calculateRouteOptions([routeA, routeB], [0, 0], [0.03, 0.01]);

    expect(result.suggestions).toEqual([]);
    expect(result.transfers).toHaveLength(1);
    expect(result.transfers[0]).toMatchObject({ routeAId: 10, routeBId: 20 });
  });

  const teleferico: PolylineRoute = {
    id: 81,
    name: "Teleférico Uruapan",
    color: "#00d4aa",
    corridor_width_m: 500,
    path: [
      [0, 0],
      [0.01, 0],
      [0.02, 0],
    ],
  };

  it("usa el Teleférico de vuelta antes de un transbordo", () => {
    const bus: PolylineRoute = {
      id: 20,
      name: "Ruta B",
      color: "#34d399",
      corridor_width_m: 550,
      direccion: "ida",
      path: [
        [0.01, 0],
        [0.01, 0.01],
        [0.01, 0.02],
      ],
    };

    const result = calculateRouteOptions(
      [teleferico, bus],
      [0.02, 0],
      [0.01, 0.02],
    );

    expect(result.suggestions).toEqual([]);
    expect(result.transfers[0]).toMatchObject({ routeAId: 81, routeBId: 20 });
    expect(result.transfers[0].segmentA).toEqual([
      [0.02, 0],
      [0.01, 0],
    ]);
  });

  it("usa el Teleférico de vuelta después de un transbordo", () => {
    const bus: PolylineRoute = {
      id: 10,
      name: "Ruta A",
      color: "#60a5fa",
      corridor_width_m: 550,
      direccion: "ida",
      path: [
        [0.02, 0.02],
        [0.02, 0.01],
        [0.02, 0],
      ],
    };

    const result = calculateRouteOptions(
      [bus, teleferico],
      [0.02, 0.02],
      [0, 0],
    );

    expect(result.suggestions).toEqual([]);
    expect(result.transfers[0]).toMatchObject({ routeAId: 10, routeBId: 81 });
    expect(result.transfers[0].segmentB).toEqual([
      [0.02, 0],
      [0.01, 0],
      [0, 0],
    ]);
  });

  it("no propone un transbordo abordando debajo del cable", () => {
    const bus: PolylineRoute = {
      id: 20,
      name: "Ruta B",
      color: "#34d399",
      corridor_width_m: 550,
      direccion: "ida",
      path: [
        [0, 0],
        [0, 0.01],
        [0, 0.02],
      ],
    };

    const result = calculateRouteOptions(
      [teleferico, bus],
      [0.015, 0],
      [0, 0.02],
    );

    expect(result.suggestions).toEqual([]);
    expect(result.transfers).toEqual([]);
  });
});
