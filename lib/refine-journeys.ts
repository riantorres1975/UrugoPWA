import { journeyMinutes, journeyScore, rankJourneys, type JourneyCost, type JourneyPreference } from "@/lib/journey-ranking";
import { walkingLegs, type JourneyWalking } from "@/lib/journey-walking";
import { getWalkingDirections } from "@/lib/walking-directions";
import { findQualitySignal, QUALITY_MESSAGES, type JourneyQualitySignal } from "@/lib/journey-quality";
import { getJourneyQuality } from "@/lib/journey-quality-client";
import type { RouteCalculationResult, RouteOption } from "@/lib/route-calculation";
import type { TransferOption } from "@/lib/transfers";
import type { Coordinates } from "@/lib/types";

type Candidate = { direct?: RouteOption; transfer?: TransferOption; cost: JourneyCost };

export function refineJourneyCost(cost: JourneyCost, walking: JourneyWalking): JourneyCost {
  return { ...cost, originWalkM: walking.origin.distanceM, destinationWalkM: walking.destination.distanceM,
    transferWalkM: walking.transfer?.distanceM ?? 0, walkingMinutes: walkingLegs(walking).reduce((sum, leg) => sum + leg.minutes, 0) };
}

export function applyJourneyQuality(cost: JourneyCost, names: string[], signals: JourneyQualitySignal[]) {
  const quality = findQualitySignal(signals, names);
  return { cost: { ...cost, reliabilityPenalty: quality?.penalty ?? 0 }, communityConcern: quality ? QUALITY_MESSAGES[quality.concern] : undefined };
}

export async function refineJourneys(result: RouteCalculationResult, origin: Coordinates, destination: Coordinates, preference: JourneyPreference, signal: AbortSignal): Promise<RouteCalculationResult> {
  // Only the three finalists: at most nine directions requests, two running at once.
  const qualityPromise = getJourneyQuality(signal);
  const jobs = new Map<string, Promise<Awaited<ReturnType<typeof getWalkingDirections>>>>();
  const lanes = [Promise.resolve(), Promise.resolve()];
  let nextLane = 0;
  const walk = (from: Coordinates, to: Coordinates) => {
    const key = `${from.join(",")}>${to.join(",")}`;
    const previous = jobs.get(key);
    if (previous) return previous;
    const lane = nextLane++ % lanes.length;
    const job = lanes[lane].then(() => getWalkingDirections(from, to, signal));
    lanes[lane] = job.then(() => undefined, () => undefined);
    jobs.set(key, job);
    return job;
  };
  let unreachableCount = 0;
  const candidates = await Promise.all([...result.suggestions.map((direct) => ({ direct, transfer: undefined })), ...result.transfers.map((transfer) => ({ direct: undefined, transfer }))].slice(0, 3).map(async (item): Promise<Candidate | null> => {
    if (signal.aborted) throw signal.reason;
    const first = item.direct?.segment ?? item.transfer!.segmentA;
    const last = item.direct?.segment ?? item.transfer!.segmentB;
    const originalCost = (item.direct ?? item.transfer)!.cost;
    if (!originalCost || first.length < 2 || last.length < 2) return null;
    const [originLeg, destinationLeg, transferLeg] = await Promise.all([
      walk(origin, first[0]), walk(last[last.length - 1], destination),
      item.transfer ? walk(first[first.length - 1], last[0]) : Promise.resolve(undefined),
    ]);
    const walking: JourneyWalking = { origin: originLeg, destination: destinationLeg, transfer: transferLeg };
    if (walkingLegs(walking).some((leg) => leg.status === "unreachable")) { unreachableCount++; return null; }
    const names = item.direct ? [item.direct.ruta] : [item.transfer!.routeAName, item.transfer!.routeBName];
    const quality = applyJourneyQuality(refineJourneyCost(originalCost, walking), names, await qualityPromise);
    const shared = { ...quality, walking, estimatedMinutes: Math.max(1, Math.ceil(journeyMinutes(quality.cost))), score: journeyScore(quality.cost, preference) };
    if (item.direct) return { cost: quality.cost, direct: { ...item.direct, ...shared, distanciaA: walking.origin.distanceM, distanciaB: walking.destination.distanceM } };
    return { cost: quality.cost, transfer: { ...item.transfer!, ...shared, walkMeters: walking.transfer!.distanceM } };
  }));
  const ranked = rankJourneys(candidates.filter((item): item is Candidate => item !== null), preference);
  const suggestions = ranked.flatMap((item) => item.direct ? [item.direct] : []);
  const transfers = ranked.flatMap((item) => item.transfer ? [item.transfer] : []);
  return { suggestions, transfers, alternativeRouteIds: suggestions.slice(1).map((item) => item.routeId),
    recommendedTransfer: suggestions.length ? ranked[0]?.transfer : undefined, refinement: "complete", unreachableCount };
}
