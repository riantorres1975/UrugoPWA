import { haversineMeters } from "./geo";
import { buildSegmentBetween, getAccessCandidates, usesStationOnlyAccess, type PolylineRoute } from "./routeMatcher";
import { getRouteConnections } from "./route-connections";
import { BUS_SPEED, diverseJourneys, expectedWait, journeyMinutes, journeyScore, rankJourneys, type JourneyCost, type JourneyPreference } from "./journey-ranking";
import type { Coordinates } from "./types";
import type { JourneyWalking } from "./journey-walking";

export type TransferOption = {
  routeAId: number; routeBId: number; routeAName: string; routeBName: string;
  routeAStartIndex: number; routeATransferIndex: number; routeBTransferIndex: number; routeBEndIndex: number;
  transferPoint: Coordinates; segmentA: Coordinates[]; segmentB: Coordinates[];
  walkMeters: number; score: number;
  cost?: JourneyCost;
  estimatedMinutes?: number;
  walking?: JourneyWalking;
  communityConcern?: string;
};

export function computeTransferOptionsFromPolylines(routes: PolylineRoute[], origin: Coordinates, destination: Coordinates, preference: JourneyPreference = "nearby", limit = 5): TransferOption[] {
  const straightDistance = haversineMeters(origin, destination);
  if (straightDistance < 400) return [];
  const from = routes.map((route) => ({ route, accesses: getAccessCandidates(origin, route) })).filter((item) => item.accesses.length);
  const to = routes.map((route) => ({ route, accesses: getAccessCandidates(destination, route) })).filter((item) => item.accesses.length);
  const byNames = new Map<string, TransferOption & { cost: JourneyCost }>();
  for (const a of from) for (const b of to) {
    if (a.route.name === b.route.name) continue;
    for (const connection of getRouteConnections(a.route, b.route)) {
      if (haversineMeters(connection.a.projectedPoint, destination) > straightDistance * 1.15) continue;
      for (const board of a.accesses) for (const exit of b.accesses) {
        const signedA = connection.a.progressM - board.progressM;
        const signedB = exit.progressM - connection.b.progressM;
        const lenA = usesStationOnlyAccess(a.route) ? Math.abs(signedA) : signedA;
        const lenB = usesStationOnlyAccess(b.route) ? Math.abs(signedB) : signedB;
        if (lenA < 200 || lenB < 200 || lenA + lenB > straightDistance * 3.5) continue;
        const cost: JourneyCost = {
          originWalkM: board.distM, destinationWalkM: exit.distM, transferWalkM: connection.walkM,
          rideMinutes: (lenA + lenB) / BUS_SPEED, waitMinutes: expectedWait(a.route.name) + expectedWait(b.route.name), transfers: 1,
        };
        const score = journeyScore(cost, preference);
        const key = `${a.route.name}|${b.route.name}`;
        if (byNames.has(key) && byNames.get(key)!.score <= score) continue;
        byNames.set(key, {
          routeAId: a.route.id, routeBId: b.route.id, routeAName: a.route.name, routeBName: b.route.name,
          routeAStartIndex: board.segmentIndex, routeATransferIndex: connection.a.segmentIndex,
          routeBTransferIndex: connection.b.segmentIndex, routeBEndIndex: exit.segmentIndex,
          segmentA: buildSegmentBetween(a.route, board, connection.a), segmentB: buildSegmentBetween(b.route, connection.b, exit),
          transferPoint: connection.a.projectedPoint, walkMeters: connection.walkM, score, cost,
          estimatedMinutes: Math.ceil(journeyMinutes(cost)),
        });
      }
    }
  }
  const ranked = rankJourneys([...byNames.values()], preference);
  return limit === Infinity ? ranked : diverseJourneys(ranked, limit);
}
