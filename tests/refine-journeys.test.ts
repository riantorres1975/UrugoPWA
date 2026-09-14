import { beforeEach, describe, expect, it, vi } from "vitest";
import { approximateWalk } from "@/lib/walking-directions";
import type { Coordinates } from "@/lib/types";
import { calculateRouteOptions } from "@/lib/route-calculation";
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
    mocks.quality.mockResolvedValue([]);
    mocks.walk.mockImplementation(async (from: Coordinates, to: Coordinates) => ({ ...approximateWalk(from, to), status: "street" }));
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
});
