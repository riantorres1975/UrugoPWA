import { describe, expect, it } from "vitest";
import { buildJourneyDetails } from "@/lib/map-journey-geometry";
import type { MapArrowSegment } from "@/lib/map-route-view";
import type { Coordinates } from "@/lib/types";

const origin: Coordinates = [-102.06, 19.42];
const destination: Coordinates = [-102.04, 19.43];
const leg: MapArrowSegment = { color: "#60a5fa", coords: [[-102.059, 19.42], [-102.041, 19.43]] };

describe("journey access geometry", () => {
  it("connects the user endpoints to boarding and alighting, not to the full route", () => {
    const data = buildJourneyDetails([leg], origin, destination, true, false);
    const stops = data.features.filter((feature) => feature.geometry.type === "Point");
    const walks = data.features.filter((feature) => feature.geometry.type === "LineString");
    expect(stops.map((feature) => feature.geometry)).toEqual(leg.coords.map((coordinates) => ({ type: "Point", coordinates })));
    expect(stops.map((feature) => feature.properties?.label)).toEqual(["Subida", "Bajada"]);
    expect(walks.map((feature) => feature.geometry)).toEqual([
      { type: "LineString", coordinates: [origin, leg.coords[0]] },
      { type: "LineString", coordinates: [leg.coords[1], destination] },
    ]);
    expect(walks.every((feature) => feature.properties?.label === "A pie · aprox.")).toBe(true);
  });

  it("marks the change between two legs and keeps the final alighting point", () => {
    const second: MapArrowSegment = { color: "#34d399", coords: [[-102.0408, 19.43], destination] };
    const data = buildJourneyDetails([leg, second], origin, destination, true, true);
    expect(data.features.find((feature) => feature.properties?.kind === "transfer")?.geometry)
      .toEqual({ type: "Point", coordinates: leg.coords[1] });
    expect(data.features.find((feature) => feature.properties?.label === "Bajada")?.geometry)
      .toEqual({ type: "Point", coordinates: destination });
    expect(data.features.some((feature) => feature.geometry.type === "LineString"
      && JSON.stringify(feature.geometry.coordinates) === JSON.stringify([leg.coords[1], second.coords[0]]))).toBe(true);
  });

  it("avoids zero-length walking links and handles missing user locations", () => {
    const atStops = buildJourneyDetails([leg], leg.coords[0], leg.coords[1], true, false);
    const noLocations = buildJourneyDetails([leg], null, null, true, false);
    for (const data of [atStops, noLocations]) {
      expect(data.features).toHaveLength(2);
      expect(data.features.every((feature) => feature.geometry.type === "Point")).toBe(true);
    }
  });

  it("clears journey details when browsing the catalog or receiving empty segments", () => {
    expect(buildJourneyDetails([leg], origin, destination, false, false).features).toEqual([]);
    expect(buildJourneyDetails([{ ...leg, coords: [] }], origin, destination, true, false).features).toEqual([]);
  });
});
