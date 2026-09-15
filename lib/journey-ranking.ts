import { getSchedule } from "@/lib/schedules";
import { DEFAULT_JOURNEY_SETTINGS, type JourneySettings } from "@/lib/journey-settings";

export type JourneyPreference = "nearby" | "balanced" | "fastest";
export const WALK_SPEED = 75;
export const BUS_SPEED = 300;
const MIN_TRANSFER_WALK_SAVING_M = 300;
const MIN_TRANSFER_TIME_SAVING_MIN = 5;
export function expectedWait(routeName: string) {
  const schedule = getSchedule(routeName);
  return schedule?.continuous ? 2.5 : schedule ? (schedule.freqMin + schedule.freqMax) / 4 : 7.5;
}
export type JourneyCost = {
  originWalkM: number;
  destinationWalkM: number;
  transferWalkM: number;
  rideMinutes: number;
  waitMinutes: number;
  transfers: number;
  walkingMinutes?: number;
  reliabilityPenalty?: number;
};
export function totalWalk(cost: JourneyCost) {
  return cost.originWalkM + cost.destinationWalkM + cost.transferWalkM;
}
export function journeyMinutes(cost: JourneyCost) {
  return (cost.walkingMinutes ?? totalWalk(cost) / WALK_SPEED) + cost.rideMinutes + cost.waitMinutes;
}
export function journeyScore(cost: JourneyCost, preference: JourneyPreference) {
  const weight = preference === "nearby" ? 3 : preference === "balanced" ? 2 : 1;
  return journeyMinutes(cost) + (weight - 1) * (cost.walkingMinutes ?? totalWalk(cost) / WALK_SPEED)
    + (preference === "fastest" ? 0 : 4 * cost.transfers + Math.max(0, Math.min(2, cost.reliabilityPenalty ?? 0)));
}

// Preserve distinct trade-offs instead of dropping the closest option at the first cut.
export function rankJourneys<T extends { cost: JourneyCost }>(items: T[], preference: JourneyPreference, settings: JourneySettings = DEFAULT_JOURNEY_SETTINGS): T[] {
  const withinLimit = (item: T) => settings.maxWalkM === null || totalWalk(item.cost) <= settings.maxWalkM;
  const eligible = items.filter(withinLimit);
  const fastest = Math.min(...(eligible.length ? eligible : items).map((item) => journeyMinutes(item.cost)));
  const ranked = [...items].sort((a, b) => {
    if (settings.maxWalkM !== null) {
      const aFits = withinLimit(a), bFits = withinLimit(b);
      if (aFits !== bFits) return aFits ? -1 : 1;
      // No matching trip: show the closest available option with an explicit warning.
      if (!eligible.length && totalWalk(a.cost) !== totalWalk(b.cost)) return totalWalk(a.cost) - totalWalk(b.cost);
    }
    if (preference === "nearby") {
      const aSlow = journeyMinutes(a.cost) > fastest + settings.extraMinutes;
      const bSlow = journeyMinutes(b.cost) > fastest + settings.extraMinutes;
      if (aSlow !== bSlow) return aSlow ? 1 : -1;
    }
    return journeyScore(a.cost, preference) - journeyScore(b.cost, preference)
      || totalWalk(a.cost) - totalWalk(b.cost);
  });

  // A second fare and wait need a meaningful benefit. Keep small walking
  // savings available as alternatives without making them the default trip.
  // Compare costs again after street walking is refined; do not infer that a
  // short bus segment can be walked (it could cross a barrier).
  if (preference === "fastest" || !ranked[0]?.cost.transfers || !eligible.length) return ranked;
  const directIndex = ranked.findIndex((item) => item.cost.transfers === 0
    && withinLimit(item) && journeyMinutes(item.cost) <= fastest + settings.extraMinutes);
  if (directIndex < 0) return ranked;
  const direct = ranked[directIndex];
  const transfer = ranked[0];
  const walkingSaved = totalWalk(direct.cost) - totalWalk(transfer.cost);
  const timeSaved = journeyMinutes(direct.cost) - journeyMinutes(transfer.cost);
  if (walkingSaved >= MIN_TRANSFER_WALK_SAVING_M || timeSaved >= MIN_TRANSFER_TIME_SAVING_MIN) return ranked;
  return [direct, ...ranked.slice(0, directIndex), ...ranked.slice(directIndex + 1)];
}

export function diverseJourneys<T extends { cost: JourneyCost }>(ranked: T[], limit: number): T[] {
  if (!ranked.length) return [];
  const fastest = [...ranked].sort((a, b) => journeyMinutes(a.cost) - journeyMinutes(b.cost))[0];
  const closest = [...ranked].sort((a, b) => totalWalk(a.cost) - totalWalk(b.cost))[0];
  return [...new Set([ranked[0], closest, fastest, ...ranked])].slice(0, limit);
}
