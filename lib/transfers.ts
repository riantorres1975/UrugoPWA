import { haversineMeters } from "./geo";
import { buildSegmentBetween, getAccessCandidates, usesStationOnlyAccess, type ClosestOnPath, type PolylineRoute } from "./routeMatcher";
import { getRouteConnections } from "./route-connections";
import { BUS_SPEED, diverseJourneys, expectedWait, journeyMinutes, journeyScore, rankJourneys, type JourneyCost, type JourneyPreference } from "./journey-ranking";
import type { Coordinates } from "./types";
import type { JourneyWalking } from "./journey-walking";
import { DEFAULT_JOURNEY_SETTINGS, type JourneySettings } from "./journey-settings";
import { transferPointFinalists } from "./transfer-points";

export type TransferOption = {
  routeAId: number; routeBId: number; routeAName: string; routeBName: string;
  routeAStartIndex: number; routeATransferIndex: number; routeBTransferIndex: number; routeBEndIndex: number;
  transferPoint: Coordinates; segmentA: Coordinates[]; segmentB: Coordinates[];
  walkMeters: number; score: number;
  cost?: JourneyCost;
  estimatedMinutes?: number;
  walking?: JourneyWalking;
  communityConcern?: string;
  firstRideM?: number;
  alternativePoints?: TransferOption[];
  transferReason?: string;
};

type PointCandidate = {
  routeA: PolylineRoute; routeB: PolylineRoute;
  board: ClosestOnPath; exit: ClosestOnPath;
  connection: ReturnType<typeof getRouteConnections>[number];
  cost: JourneyCost; score: number; firstRideM: number;
};

function materialize(point: PointCandidate): TransferOption & { cost: JourneyCost } {
  const { routeA: a, routeB: b, board, exit, connection, cost, score, firstRideM } = point;
  return {
    routeAId: a.id, routeBId: b.id, routeAName: a.name, routeBName: b.name,
    routeAStartIndex: board.segmentIndex, routeATransferIndex: connection.a.segmentIndex,
    routeBTransferIndex: connection.b.segmentIndex, routeBEndIndex: exit.segmentIndex,
    segmentA: buildSegmentBetween(a, board, connection.a), segmentB: buildSegmentBetween(b, connection.b, exit),
    transferPoint: connection.a.projectedPoint, walkMeters: connection.walkM, score, cost, firstRideM,
    estimatedMinutes: Math.ceil(journeyMinutes(cost)),
  };
}

export function computeTransferOptionsFromPolylines(routes: PolylineRoute[], origin: Coordinates, destination: Coordinates, preference: JourneyPreference = "nearby", limit = 5, settings: JourneySettings = DEFAULT_JOURNEY_SETTINGS): TransferOption[] {
  const straightDistance = haversineMeters(origin, destination);
  if (straightDistance < 400) return [];
  const from = routes.map((route) => ({ route, accesses: getAccessCandidates(origin, route) })).filter((item) => item.accesses.length);
  const to = routes.map((route) => ({ route, accesses: getAccessCandidates(destination, route) })).filter((item) => item.accesses.length);
  const byNames = new Map<string, PointCandidate[]>();
  for (const a of from) for (const b of to) {
    if (a.route.name === b.route.name) continue;
    for (const connection of getRouteConnections(a.route, b.route)) {
      if (haversineMeters(connection.a.projectedPoint, destination) > straightDistance * 1.15) continue;
      let bestAccess: PointCandidate | undefined;
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
        if (bestAccess && (settings.maxWalkM === null ? bestAccess.score <= score : rankJourneys([bestAccess, { cost }], preference, settings)[0] === bestAccess)) continue;
        bestAccess = { routeA: a.route, routeB: b.route, board, exit, connection, cost, score, firstRideM: lenA };
      }
      if (bestAccess) {
        const key = `${a.route.name}|${b.route.name}`;
        const points = byNames.get(key) ?? [];
        points.push(bestAccess);
        byNames.set(key, points);
      }
    }
  }
  const options = [...byNames.values()].map((points) => {
    const [preferred, ...alternatives] = transferPointFinalists(points, preference, settings).map(materialize);
    return { ...preferred, alternativePoints: alternatives };
  });
  const ranked = rankJourneys(options, preference, settings);
  return limit === Infinity ? ranked : diverseJourneys(ranked, limit);
}
