import { journeyMinutes, journeyScore, rankJourneys, totalWalk, type JourneyCost, type JourneyPreference } from "@/lib/journey-ranking";
import { DEFAULT_JOURNEY_SETTINGS, type JourneySettings } from "@/lib/journey-settings";
import { walkingLegs, type JourneyWalking } from "@/lib/journey-walking";
import { getWalkingDirections } from "@/lib/walking-directions";
import { findQualitySignal, QUALITY_MESSAGES, type JourneyQualitySignal } from "@/lib/journey-quality";
import { getJourneyQuality } from "@/lib/journey-quality-client";
import type { RouteCalculationResult, RouteOption } from "@/lib/route-calculation";
import type { TransferOption } from "@/lib/transfers";
import type { Coordinates } from "@/lib/types";
import { haversineMeters } from "@/lib/geo";
import { chooseTransferPoint, transferPointExplanation } from "@/lib/transfer-points";

type Candidate = { direct?: RouteOption; transfer?: TransferOption; cost: JourneyCost };

export function refineJourneyCost(cost: JourneyCost, walking: JourneyWalking): JourneyCost {
  return { ...cost, originWalkM: walking.origin.distanceM, destinationWalkM: walking.destination.distanceM,
    transferWalkM: walking.transfer?.distanceM ?? 0, walkingMinutes: walkingLegs(walking).reduce((sum, leg) => sum + leg.minutes, 0) };
}

export function applyJourneyQuality(cost: JourneyCost, names: string[], signals: JourneyQualitySignal[]) {
  const quality = findQualitySignal(signals, names);
  return { cost: { ...cost, reliabilityPenalty: quality?.penalty ?? 0 }, communityConcern: quality ? QUALITY_MESSAGES[quality.concern] : undefined };
}

export async function refineJourneys(result: RouteCalculationResult, origin: Coordinates, destination: Coordinates, preference: JourneyPreference, signal: AbortSignal, settings: JourneySettings = DEFAULT_JOURNEY_SETTINGS): Promise<RouteCalculationResult> {
  // Compare up to three points per pair, sharing access requests. Hard cap of
  // 24 unique walking legs per search, two concurrent, including reserves.
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
  let largeDetour = false;
  const refine = async (item: { direct?: RouteOption; transfer?: TransferOption }): Promise<Candidate | null> => {
    if (signal.aborted) throw signal.reason;
    const first = item.direct?.segment ?? item.transfer!.segmentA;
    const last = item.direct?.segment ?? item.transfer!.segmentB;
    const originalCost = (item.direct ?? item.transfer)!.cost;
    if (!originalCost || first.length < 2 || last.length < 2) return null;
    const legs = [[origin, first[0]], [last[last.length - 1], destination],
      ...(item.transfer ? [[first[first.length - 1], last[0]]] : [])];
    const missing = new Set(legs.map(([from, to]) => `${from.join(",")}>${to.join(",")}`).filter((key) => !jobs.has(key)));
    if (jobs.size + missing.size > 24) return null;
    const [originLeg, destinationLeg, transferLeg] = await Promise.all([
      walk(origin, first[0]), walk(last[last.length - 1], destination),
      item.transfer ? walk(first[first.length - 1], last[0]) : Promise.resolve(undefined),
    ]);
    const walking: JourneyWalking = { origin: originLeg, destination: destinationLeg, transfer: transferLeg };
    if (walkingLegs(walking).some((leg) => leg.status === "unreachable")) { unreachableCount++; return null; }
    const names = item.direct ? [item.direct.ruta] : [item.transfer!.routeAName, item.transfer!.routeBName];
    const quality = applyJourneyQuality(refineJourneyCost(originalCost, walking), names, await qualityPromise);
    const extraWalk = totalWalk(quality.cost) - totalWalk(originalCost);
    if (extraWalk >= 200 && totalWalk(quality.cost) >= totalWalk(originalCost) * 1.5) largeDetour = true;
    const shared = { ...quality, walking, estimatedMinutes: Math.max(1, Math.ceil(journeyMinutes(quality.cost))), score: journeyScore(quality.cost, preference) };
    if (item.direct) return { cost: quality.cost, direct: { ...item.direct, ...shared, distanciaA: walking.origin.distanceM, distanciaB: walking.destination.distanceM } };
    return { cost: quality.cost, transfer: { ...item.transfer!, ...shared, alternativePoints: undefined,
      firstRideM: item.transfer!.firstRideM ?? first.slice(1).reduce((sum, point, index) => sum + haversineMeters(first[index], point), 0),
      walkMeters: walking.transfer!.distanceM } };
  };
  const initial = [...result.suggestions.map((direct) => ({ direct })), ...result.transfers.map((transfer) => ({ transfer }))].slice(0, 3);
  // Validate the primary choices first so extra points cannot exhaust their budget.
  const primaries = await Promise.all(initial.map(refine));
  const refinePoints = async (item: { direct?: RouteOption; transfer?: TransferOption }, primary: Candidate | null): Promise<Candidate | null> => {
    if (!item.transfer) return primary;
    const others = await Promise.all((item.transfer.alternativePoints ?? []).slice(0, 2).map((transfer) => refine({ transfer })));
    const options = [primary, ...others].flatMap((candidate) => candidate?.transfer
      ? [{ ...candidate.transfer, cost: candidate.cost, firstRideM: candidate.transfer.firstRideM! }] : []);
    if (!options.length) return null;
    const selected = chooseTransferPoint(options, preference, settings);
    return { cost: selected.cost, transfer: { ...selected, transferReason: transferPointExplanation(selected, options) } };
  };
  const candidates = (await Promise.all(initial.map((item, index) => refinePoints(item, primaries[index]))))
    .filter((item): item is Candidate => item !== null);
  const noMatchForWalkLimit = settings.maxWalkM !== null && !candidates.some((item) => totalWalk(item.cost) <= settings.maxWalkM!);
  let checkedReserveCount = 0;
  if (unreachableCount || largeDetour || noMatchForWalkLimit) {
    if (signal.aborted) throw signal.reason;
    const key = (item: { direct?: RouteOption; transfer?: TransferOption }) => item.direct
      ? `r${item.direct.routeId}` : `t${item.transfer!.routeAId}:${item.transfer!.routeBId}`;
    const seen = new Set(initial.map(key));
    const reserves = (result.reserveCandidates ?? []).filter((item) => {
      const identity = key(item);
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    }).slice(0, 3);
    checkedReserveCount = reserves.length;
    const reservePrimaries = await Promise.all(reserves.map(refine));
    candidates.push(...(await Promise.all(reserves.map((item, index) => refinePoints(item, reservePrimaries[index]))))
      .filter((item): item is Candidate => item !== null));
  }
  if (signal.aborted) throw signal.reason;
  // One validated point per pair; do not fill the visible list with the same buses.
  const ranked = rankJourneys(candidates, preference, settings);
  const suggestions = ranked.flatMap((item) => item.direct ? [item.direct] : []);
  const transfers = ranked.flatMap((item) => item.transfer ? [item.transfer] : []);
  return { suggestions, transfers, alternativeRouteIds: suggestions.slice(1).map((item) => item.routeId),
    recommendedTransfer: suggestions.length ? ranked[0]?.transfer : undefined, refinement: "complete", unreachableCount, checkedReserveCount };
}
