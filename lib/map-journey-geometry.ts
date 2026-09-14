import type { FeatureCollection } from "geojson";
import { haversineMeters } from "@/lib/geo";
import type { MapArrowSegment } from "@/lib/map-route-view";
import type { Coordinates } from "@/lib/types";
import type { JourneyWalking, WalkingLeg } from "@/lib/journey-walking";

export function buildJourneyDetails(
  segments: MapArrowSegment[],
  origin: Coordinates | null,
  destination: Coordinates | null,
  active: boolean,
  transfer: boolean,
  walking?: JourneyWalking,
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
  const addWalk = (from: Coordinates | null, to: Coordinates | null, leg?: WalkingLeg) => {
    if (!from || !to || haversineMeters(from, to) < 5) return;
    if (leg?.status === "street" && haversineMeters(from, leg.from) < 5 && haversineMeters(to, leg.to) < 5) {
      data.features.push({ type: "Feature", properties: { kind: "walk", label: "A pie · por calles" }, geometry: { type: "LineString", coordinates: leg.coordinates } });
      // Snapped endpoints may have a short unmapped access; label it separately.
      if (haversineMeters(from, leg.coordinates[0]) >= 5) addWalk(from, leg.coordinates[0]);
      if (haversineMeters(leg.coordinates[leg.coordinates.length - 1], to) >= 5) addWalk(leg.coordinates[leg.coordinates.length - 1], to);
      return;
    }
    data.features.push({ type: "Feature", properties: { kind: "walk", label: "A pie · aprox." }, geometry: { type: "LineString", coordinates: [from, to] } });
  };
  addPoint(boarding, first.color, "Subida");
  addPoint(alighting, last.color, "Bajada");
  addWalk(origin, boarding, walking?.origin);
  addWalk(alighting, destination, walking?.destination);
  if (transfer && legs.length === 2) {
    const change = first.coords[first.coords.length - 1];
    addWalk(change, last.coords[0], walking?.transfer);
    addPoint(change, "#d97706", "Transbordo", "transfer");
    if (haversineMeters(change, last.coords[0]) >= 5) addPoint(last.coords[0], last.color, "Segunda subida");
  }
  return data;
}
