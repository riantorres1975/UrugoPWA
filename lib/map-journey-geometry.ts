import type { FeatureCollection } from "geojson";
import { haversineMeters } from "@/lib/geo";
import type { MapArrowSegment } from "@/lib/map-route-view";
import type { Coordinates } from "@/lib/types";

export function buildJourneyDetails(
  segments: MapArrowSegment[],
  origin: Coordinates | null,
  destination: Coordinates | null,
  active: boolean,
  transfer: boolean,
): FeatureCollection {
  const data: FeatureCollection = { type: "FeatureCollection", features: [] };
  const legs = segments.filter((segment) => segment.coords.length >= 2);
  if (!active || !legs.length) return data;
  const first = legs[0];
  const last = legs[legs.length - 1];
  const boarding = first.coords[0];
  const alighting = last.coords[last.coords.length - 1];
  const addPoint = (point: Coordinates, color: string, label: string, kind = "stop") => {
    data.features.push({ type: "Feature", properties: { kind, color, label }, geometry: { type: "Point", coordinates: point } });
  };
  const addWalk = (from: Coordinates | null, to: Coordinates | null) => {
    if (!from || !to || haversineMeters(from, to) < 5) return;
    // These are approximate links, not pedestrian directions along a street network.
    data.features.push({ type: "Feature", properties: { kind: "walk", label: "A pie · aprox." }, geometry: { type: "LineString", coordinates: [from, to] } });
  };
  addPoint(boarding, first.color, "Subida");
  addPoint(alighting, last.color, "Bajada");
  addWalk(origin, boarding);
  addWalk(alighting, destination);
  if (transfer && legs.length === 2) {
    const change = first.coords[first.coords.length - 1];
    addWalk(change, last.coords[0]);
    addPoint(change, "#d97706", "Transbordo", "transfer");
    if (haversineMeters(change, last.coords[0]) >= 5) addPoint(last.coords[0], last.color, "Segunda subida");
  }
  return data;
}
