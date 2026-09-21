import { journeyMinutes, rankJourneys, totalWalk, type JourneyCost, type JourneyPreference } from "./journey-ranking";
import type { JourneySettings } from "./journey-settings";

type PointCost = { cost: JourneyCost; firstRideM: number };

/** Compare every point to one fixed baseline; fuzzy pairwise sorting is not transitive. */
export function chooseTransferPoint<T extends PointCost>(points: T[], preference: JourneyPreference, settings: JourneySettings): T {
  const ranked = rankJourneys(points, preference, settings);
  const best = ranked[0];
  const walkLimit = settings.maxWalkM ?? Infinity;
  const earliest = ranked.filter((point) =>
    journeyMinutes(point.cost) <= journeyMinutes(best.cost) + 1 + 1e-6
    && totalWalk(point.cost) <= Math.min(totalWalk(best.cost) + 50, Math.max(walkLimit, totalWalk(best.cost))) + 1e-6
  ).sort((a, b) => a.firstRideM - b.firstRideM);
  return earliest[0] ?? best;
}

/** Keep a small set of different trade-offs for street validation, including the winner. */
export function transferPointFinalists<T extends PointCost>(points: T[], preference: JourneyPreference, settings: JourneySettings): T[] {
  if (!points.length) return [];
  const preferred = chooseTransferPoint(points, preference, settings);
  const baseline = rankJourneys(points, preference, settings)[0];
  const earliest = [...points].sort((a, b) => a.firstRideM - b.firstRideM || journeyMinutes(a.cost) - journeyMinutes(b.cost))[0];
  const closest = [...points].sort((a, b) => totalWalk(a.cost) - totalWalk(b.cost) || journeyMinutes(a.cost) - journeyMinutes(b.cost))[0];
  const fastest = [...points].sort((a, b) => journeyMinutes(a.cost) - journeyMinutes(b.cost))[0];
  // Keep the baseline too: otherwise a second comparison could add another
  // minute to an already tolerated delay, even with unchanged walking costs.
  return [...new Set([preferred, baseline, earliest, closest, fastest])].slice(0, 3);
}

export function transferPointExplanation<T extends PointCost>(selected: T, points: T[]): string | undefined {
  const earlier = points.filter((point) => point.firstRideM < selected.firstRideM - 100)
    .sort((a, b) => journeyMinutes(a.cost) - journeyMinutes(b.cost))[0];
  if (!earlier) return undefined;
  if (totalWalk(earlier.cost) > totalWalk(selected.cost) + 50) return "Cambia aquí para caminar menos que en el cruce anterior.";
  if (journeyMinutes(earlier.cost) > journeyMinutes(selected.cost) + 1) return "Este punto reduce el tiempo total frente al cruce anterior.";
  return undefined;
}
