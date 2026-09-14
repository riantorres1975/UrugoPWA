import { describe, expect, it } from "vitest";
import { journeyMinutes, journeyScore, rankJourneys, type JourneyCost } from "@/lib/journey-ranking";
import { calculateRouteOptions } from "@/lib/route-calculation";
import { findBestRoutes, type PolylineRoute } from "@/lib/routeMatcher";

function cost(walk: number, minutes: number, transfers = 0): JourneyCost {
  return { originWalkM: walk / 2, destinationWalkM: walk / 2, transferWalkM: 0,
    rideMinutes: minutes - walk / 75 - 7.5, waitMinutes: 7.5, transfers };
}
const route = (id: number, path: PolylineRoute["path"], corridor = 550): PolylineRoute => ({
  id, path, corridor_width_m: corridor, name: `Test ${id}`, color: "#00aa00", direccion: "ida",
});

describe("preferencias de viaje", () => {
  it.each(["nearby", "balanced"] as const)("%s prefiere un camión por un ahorro pequeño y conserva el cambio como alternativa", (preference) => {
    const direct = { cost: cost(400, 34) };
    const transfer = { cost: cost(196, 31, 1) };
    expect(journeyScore(transfer.cost, preference)).toBeLessThan(journeyScore(direct.cost, preference));
    expect(rankJourneys([transfer, direct], preference)).toEqual([direct, transfer]);
    expect(rankJourneys([direct, transfer], preference)).toEqual([direct, transfer]);
    expect(journeyMinutes(direct.cost)).toBe(34);
  });

  it("conserva un transbordo que ahorra al menos 300 metros", () => {
    const direct = { cost: cost(496, 34) };
    const transfer = { cost: cost(196, 33, 1) };
    expect(rankJourneys([direct, transfer], "nearby")[0]).toBe(transfer);
  });

  it("conserva un transbordo que ahorra cinco minutos aunque la caminata sea similar", () => {
    const direct = { cost: cost(250, 36) };
    const transfer = { cost: cost(196, 31, 1) };
    expect(rankJourneys([direct, transfer], "nearby")[0]).toBe(transfer);
  });

  it("no promueve una directa fuera de la tolerancia de tiempo ni cambia Más rápida", () => {
    const direct = { cost: cost(400, 37) };
    const transfer = { cost: cost(196, 31, 1) };
    expect(rankJourneys([direct, transfer], "nearby")[0]).toBe(transfer);
    expect(rankJourneys([{ cost: cost(400, 34) }, transfer], "fastest")[0]).toBe(transfer);
    expect(rankJourneys([transfer], "nearby")).toEqual([transfer]);
    expect(rankJourneys([], "nearby")).toEqual([]);
  });

  it("ahorra 300 m de caminata aunque el viaje tarde un minuto más", () => {
    const fast = { id: "fast", cost: cost(520, 20) };
    const close = { id: "close", cost: cost(210, 21) };
    expect(rankJourneys([fast, close], "nearby")[0]).toBe(close);
    expect(rankJourneys([close, fast], "fastest")[0]).toBe(fast);
    expect(journeyMinutes(close.cost)).toBe(21);
    expect(journeyScore(close.cost, "nearby")).toBeGreaterThan(21);
  });

  it("no recomienda un rodeo de más de cinco minutos por caminar menos", () => {
    const fast = { cost: cost(700, 20) };
    const detour = { cost: cost(0, 26) };
    expect(rankJourneys([detour, fast], "nearby")[0]).toBe(fast);
  });

  it("considera la incomodidad del transbordo sin inflar la duración mostrada", () => {
    const direct = { cost: cost(200, 22) };
    const transfer = { cost: cost(200, 20, 1) };
    expect(rankJourneys([transfer, direct], "balanced")[0]).toBe(direct);
    expect(rankJourneys([direct, transfer], "fastest")[0]).toBe(transfer);
    expect(journeyMinutes(transfer.cost)).toBe(20);
  });

  it("encuentra otro punto de subida válido cuando el más cercano queda después de la bajada", () => {
    const loop = route(1, [[0, 0], [0.01, 0], [0.01, 0.001], [0, 0.001]], 150);
    const result = findBestRoutes([0.002, 0.001], [0.008, 0], [loop]);
    expect(result).toHaveLength(1);
    expect(result[0].segment[0][1]).toBe(0);
    expect(result[0].segment.at(-1)![0]).toBeCloseTo(0.008);
    expect(result[0].originDistM).toBeGreaterThan(100);
  });

  it("encuentra un cambio entre segmentos aunque no compartan vértices y cuenta ambas esperas", () => {
    const a = route(1, [[0, 0], [0.02, 0]], 300);
    const b = route(2, [[0.01, -0.01], [0.01, 0.02]], 300);
    const result = calculateRouteOptions([a, b], [0, -0.001], [0.011, 0.019]);
    const transfer = result.transfers[0];
    expect(transfer).toBeDefined();
    expect(transfer.transferPoint[0]).toBeCloseTo(0.01);
    expect(transfer.transferPoint[1]).toBeCloseTo(0);
    expect(transfer.walkMeters).toBeLessThan(1);
    expect(transfer.cost!.originWalkM).toBeGreaterThan(100);
    expect(transfer.cost!.destinationWalkM).toBeGreaterThan(100);
    expect(transfer.cost!.waitMinutes).toBe(15);
    expect(transfer.estimatedMinutes).toBe(Math.ceil(journeyMinutes(transfer.cost!)));
  });

  it("ofrece un transbordo cercano aunque exista una ruta directa y conserva ambas opciones", () => {
    const a = route(1, [[0, 0], [0.02, 0]], 550);
    const b = route(2, [[0.01, -0.01], [0.01, 0.02]], 550);
    const direct = route(3, [[0, -0.004], [0.014, -0.004], [0.014, 0.02]], 550);
    const result = calculateRouteOptions([a, b, direct], [0, 0], [0.01, 0.019]);
    expect(result.suggestions.some((option) => option.routeId === 3)).toBe(true);
    expect(result.transfers.some((option) => option.routeAId === 1 && option.routeBId === 2)).toBe(true);
    expect(result.recommendedTransfer).toMatchObject({ routeAId: 1, routeBId: 2 });
  });
});
