import { getSchedule } from "@/lib/schedules";

export type JourneyPreference = "nearby" | "balanced" | "fastest";
export const WALK_SPEED = 75;
export const BUS_SPEED = 300;
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
export function rankJourneys<T extends { cost: JourneyCost }>(items: T[], preference: JourneyPreference): T[] {
  const fastest = Math.min(...items.map((item) => journeyMinutes(item.cost)));
  return [...items].sort((a, b) => {
    if (preference === "nearby") {
      const aSlow = journeyMinutes(a.cost) > fastest + 5;
      const bSlow = journeyMinutes(b.cost) > fastest + 5;
      if (aSlow !== bSlow) return aSlow ? 1 : -1;
    }
    return journeyScore(a.cost, preference) - journeyScore(b.cost, preference)
      || totalWalk(a.cost) - totalWalk(b.cost);
  });
}

export function diverseJourneys<T extends { cost: JourneyCost }>(ranked: T[], limit: number): T[] {
  if (!ranked.length) return [];
  const fastest = [...ranked].sort((a, b) => journeyMinutes(a.cost) - journeyMinutes(b.cost))[0];
  const closest = [...ranked].sort((a, b) => totalWalk(a.cost) - totalWalk(b.cost))[0];
  return [...new Set([ranked[0], closest, fastest, ...ranked])].slice(0, limit);
}
