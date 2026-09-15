import { beforeEach, describe, expect, it, vi } from "vitest";
import { approximateWalk } from "@/lib/walking-directions";
import type { Coordinates } from "@/lib/types";
import { calculateRouteOptions } from "@/lib/route-calculation";
import type { TransferOption } from "@/lib/transfers";
import { buildJourneyDetails } from "@/lib/map-journey-geometry";

const mocks = vi.hoisted(() => ({ walk: vi.fn(), quality: vi.fn() }));
vi.mock("@/lib/walking-directions", async (actual) => ({ ...await actual<object>(), getWalkingDirections: mocks.walk }));
vi.mock("@/lib/journey-quality-client", () => ({ getJourneyQuality: mocks.quality }));
import { refineJourneys } from "@/lib/refine-journeys";

const origin: Coordinates = [-102.06, 19.42], destination: Coordinates = [-102.04, 19.42];
const result = () => calculateRouteOptions([
  { id: 1, name: "A", color: "red", corridor_width_m: 550, path: [[-102.06, 19.421], [-102.04, 19.421]] },
  { id: 2, name: "B", color: "blue", corridor_width_m: 550, path: [[-102.06, 19.422], [-102.04, 19.422]] },
], origin, destination);

describe("refining the finalists", () => {
  beforeEach(() => {
    mocks.walk.mockClear();
    mocks.quality.mockResolvedValue([]);
    mocks.walk.mockImplementation(async (from: Coordinates, to: Coordinates) => ({ ...approximateWalk(from, to), status: "street" }));
  });
  const withReserves = () => {
    const initial = result();
    initial.reserveCandidates = Array.from({ length: 5 }, (_, index) => {
      const lat = 19.423 + index * 0.001;
      const direct = { ...initial.suggestions[0], routeId: index + 10, ruta: `Reserva ${index}`, segment: [[-102.06, lat], [-102.04, lat]] as Coordinates[] };
      return { direct, cost: direct.cost! };
    });
    return initial;
  };
  it("no consulta las reservas cuando las finalistas tienen accesos adecuados", async () => {
    const refined = await refineJourneys(withReserves(), origin, destination, "nearby", new AbortController().signal);
    expect(refined.checkedReserveCount).toBe(0);
    expect(mocks.walk).toHaveBeenCalledTimes(4);
  });
  it("recupera opciones después de un NoRoute, con solo tres reservas y sin repetir accesos", async () => {
    mocks.walk.mockImplementation(async (from: Coordinates, to: Coordinates) => ({ ...approximateWalk(from, to), status: from[1] <= 19.422 && to[1] <= 19.422 ? "unreachable" : "street" }));
    const initial = withReserves();
    initial.reserveCandidates!.unshift({ direct: initial.suggestions[0], cost: initial.suggestions[0].cost! });
    const refined = await refineJourneys(initial, origin, destination, "nearby", new AbortController().signal);
    expect(refined.checkedReserveCount).toBe(3);
    expect(refined.unreachableCount).toBe(2);
    expect(refined.suggestions).toHaveLength(3);
    expect(refined.suggestions[0].ruta).toBe("Reserva 0");
    expect(mocks.walk).toHaveBeenCalledTimes(10);
  });
  it("revisa reservas por rodeos grandes y por un límite de caminata sin cumplir", async () => {
    mocks.walk.mockImplementation(async (from: Coordinates, to: Coordinates) => ({ ...approximateWalk(from, to), status: "street", distanceM: 900, minutes: 12 }));
    const detour = await refineJourneys(withReserves(), origin, destination, "nearby", new AbortController().signal);
    expect(detour.checkedReserveCount).toBe(3);
    mocks.walk.mockImplementation(async (from: Coordinates, to: Coordinates) => ({ ...approximateWalk(from, to), status: "street", distanceM: 180, minutes: 2.4 }));
    const limited = await refineJourneys(withReserves(), origin, destination, "nearby", new AbortController().signal, { extraMinutes: 5, maxWalkM: 300 });
    expect(limited.checkedReserveCount).toBe(3);
  });
  it("no comienza otra tanda después de cancelar la búsqueda", async () => {
    const controller = new AbortController();
    mocks.walk.mockImplementation(async (from: Coordinates, to: Coordinates) => {
      controller.abort(new Error("Nueva búsqueda"));
      return { ...approximateWalk(from, to), status: "unreachable" };
    });
    await expect(refineJourneys(withReserves(), origin, destination, "nearby", controller.signal)).rejects.toThrow("Nueva búsqueda");
    expect(mocks.walk.mock.calls.length).toBeLessThanOrEqual(4);
  });
  it("changes the recommendation when the nearest straight-line access requires a longer street walk", async () => {
    const initial = result();
    expect(initial.suggestions[0].ruta).toBe("A");
    mocks.walk.mockImplementation(async (from: Coordinates, to: Coordinates) => {
      const leg = approximateWalk(from, to);
      const longer = from[1] === 19.421 || to[1] === 19.421;
      return { ...leg, status: "street", distanceM: longer ? 700 : leg.distanceM, minutes: longer ? 10 : leg.minutes };
    });
    const refined = await refineJourneys(initial, origin, destination, "nearby", new AbortController().signal);
    expect(refined.suggestions[0].ruta).toBe("B");
    expect(refined.suggestions.find((item) => item.ruta === "A")!.distanciaA).toBe(700);
  });
  it("removes confirmed impossible connections but retains approximate options on provider failure", async () => {
    mocks.walk.mockImplementation(async (from: Coordinates, to: Coordinates) => ({ ...approximateWalk(from, to), status: from[1] === 19.421 || to[1] === 19.421 ? "unreachable" : "approximate" }));
    const refined = await refineJourneys(result(), origin, destination, "nearby", new AbortController().signal);
    expect(refined.suggestions.map((item) => item.ruta)).toEqual(["B"]);
    expect(refined.unreachableCount).toBe(1);
  });
  it("renders street geometry only when it belongs to the current endpoints", async () => {
    const refined = await refineJourneys(result(), origin, destination, "nearby", new AbortController().signal);
    const route = refined.suggestions[0];
    const walking = route.walking!;
    walking.origin.coordinates = [origin, [-102.061, 19.4205], route.segment[0]];
    const features = buildJourneyDetails([{ color: "red", coords: route.segment }], origin, destination, true, false, walking).features;
    expect(features.some((item) => item.properties?.label === "A pie · por calles" && item.geometry.type === "LineString" && item.geometry.coordinates.length === 3)).toBe(true);
    const moved = buildJourneyDetails([{ color: "red", coords: route.segment }], [-102.07, 19.42], destination, true, false, walking).features;
    expect(moved.filter((item) => item.properties?.label === "A pie · por calles")).toHaveLength(1);
  });

  it("replaces an unnecessary transfer after checking streets, but keeps a transfer that avoids a long walk", async () => {
    const direct = result().suggestions[0];
    direct.cost = { originWalkM: 28, destinationWalkM: 650, transferWalkM: 0, rideMinutes: 26, waitMinutes: 2, transfers: 0 };
    const change: Coordinates = [-102.044, 19.421];
    const transfer: TransferOption = {
      routeAId: direct.routeId, routeBId: 3, routeAName: direct.ruta, routeBName: "C",
      routeAStartIndex: 0, routeATransferIndex: 1, routeBTransferIndex: 0, routeBEndIndex: 1,
      transferPoint: change, segmentA: [direct.segment[0], change], segmentB: [change, [-102.04, 19.4205]],
      walkMeters: 0, score: 0,
      cost: { originWalkM: 28, destinationWalkM: 168, transferWalkM: 0, rideMinutes: 24, waitMinutes: 6, transfers: 1 },
    };
    const initial = { suggestions: [direct], transfers: [transfer], alternativeRouteIds: [], recommendedTransfer: transfer };
    let directExitWalk = 350;
    mocks.walk.mockImplementation(async (from: Coordinates, to: Coordinates) => {
      const distanceM = to === destination ? (from === direct.segment.at(-1) ? directExitWalk : 168) : from === origin ? 28 : 0;
      return { ...approximateWalk(from, to), status: "street", distanceM, minutes: distanceM / 75 };
    });
    const refined = await refineJourneys(initial, origin, destination, "nearby", new AbortController().signal);
    expect(refined.recommendedTransfer).toBeUndefined();
    expect(refined.suggestions[0].ruta).toBe(direct.ruta);
    expect(refined.transfers).toHaveLength(1);
    expect(refined.transfers[0].walking?.destination.distanceM).toBe(168);

    directExitWalk = 950;
    const detour = await refineJourneys(initial, origin, destination, "nearby", new AbortController().signal);
    expect(detour.recommendedTransfer?.routeBName).toBe("C");
  });
});
