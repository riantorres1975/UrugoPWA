import { findBestRoutes, getRouteMetrics, type PolylineRoute } from "@/lib/routeMatcher";
import { diverseJourneys, rankJourneys, type JourneyCost, type JourneyPreference } from "@/lib/journey-ranking";
import { computeTransferOptionsFromPolylines, type TransferOption } from "@/lib/transfers";
import type { Coordinates, RouteDirection } from "@/lib/types";
import type { JourneyWalking } from "@/lib/journey-walking";
import { DEFAULT_JOURNEY_SETTINGS, parseJourneySettings, type JourneySettings } from "@/lib/journey-settings";

export type RouteOption = {
  routeId: number;
  ruta: string;
  direccion: RouteDirection;
  distanciaA: number;
  distanciaB: number;
  indexA: number;
  indexB: number;
  segment: Coordinates[];
  rideMinutes: number;
  expectedWaitMinutes: number;
  estimatedMinutes: number;
  score: number;
  routeColor?: string;
  cost?: JourneyCost;
  walking?: JourneyWalking;
  communityConcern?: string;
};

export type RouteCalculationResult = {
  suggestions: RouteOption[];
  alternativeRouteIds: number[];
  transfers: TransferOption[];
  recommendedTransfer?: TransferOption;
  refinement?: "pending" | "complete";
  unreachableCount?: number;
  reserveCandidates?: JourneyCandidate[];
  checkedReserveCount?: number;
};

export type JourneyCandidate = { direct?: RouteOption; transfer?: TransferOption; cost: JourneyCost };

export type RouteCalculationWorkerRequest =
  | { type: "initialize"; routes: PolylineRoute[] }
  | {
      type: "calculate";
      requestId: number;
      key: string;
      origin: Coordinates;
      destination: Coordinates;
      preference?: JourneyPreference;
      settings?: JourneySettings;
    };

export type RouteCalculationWorkerResponse =
  | {
      type: "result";
      requestId: number;
      key: string;
      result: RouteCalculationResult;
    }
  | { type: "error"; requestId: number; key: string };

export function prepareRouteCalculations(routes: PolylineRoute[]) {
  for (const route of routes) {
    getRouteMetrics(route.path);
  }
}

export function calculateRouteOptions(
  routes: PolylineRoute[],
  origin: Coordinates,
  destination: Coordinates,
  preference: JourneyPreference = "nearby",
  requestedSettings: JourneySettings = DEFAULT_JOURNEY_SETTINGS,
): RouteCalculationResult {
  const settings = parseJourneySettings(requestedSettings);
  const matches = findBestRoutes(origin, destination, routes, preference, Infinity, settings);

  const suggestions = matches.map<RouteOption>((match) => ({
        routeId: match.routeId,
        ruta: match.routeName,
        direccion: match.direccion,
        distanciaA: match.originDistM,
        distanciaB: match.destDistM,
        indexA: match.originSegIndex,
        indexB: match.destSegIndex,
        segment: match.segment,
        rideMinutes: match.rideMinutes,
        expectedWaitMinutes: match.expectedWaitMinutes,
        estimatedMinutes: match.estimatedMinutes,
        score: match.score,
        routeColor: match.routeColor,
        cost: match.cost,
      }));
  const transfers = computeTransferOptionsFromPolylines(routes, origin, destination, preference, Infinity, settings);
  const candidates: JourneyCandidate[] = [...suggestions.map((direct) => ({ direct, cost: direct.cost! })), ...transfers.map((transfer) => ({ transfer, cost: transfer.cost! }))];
  const ranked = rankJourneys(candidates, preference, settings);
  const selected = diverseJourneys(ranked, 3);
  const direct = ranked.find((item) => item.direct);
  if (direct && !selected.some((item) => item.direct)) selected[selected.length - 1] = direct;
  const selectedDirect = selected.flatMap((item) => item.direct ? [item.direct] : []);
  const selectedTransfers = selected.flatMap((item) => item.transfer ? [item.transfer] : []);

  return {
    suggestions: selectedDirect,
    alternativeRouteIds: selectedDirect.slice(1).map((match) => match.routeId),
    transfers: selectedTransfers,
    recommendedTransfer: selectedDirect.length ? ranked[0]?.transfer : undefined,
    reserveCandidates: diverseJourneys(ranked.filter((item) => !selected.includes(item)), 3),
  };
}
