import { haversineMeters } from "@/lib/geo";
import type { Coordinates } from "@/lib/types";

export const routeLength = (path: Coordinates[]) => path.reduce((sum, point, i) => sum + (i ? haversineMeters(path[i - 1], point) : 0), 0);

// Compare directed edges, preserving multiplicity for routes that revisit a street.
export function routeDiff(before: Coordinates[], after: Coordinates[]) {
  const edges = (path: Coordinates[]) => path.slice(1).map((point, i) => [path[i], point] as Coordinates[]);
  const unmatched = (a: Coordinates[][], b: Coordinates[][]) => {
    const counts = new Map<string, number>();
    for (const edge of b) { const key = JSON.stringify(edge); counts.set(key, (counts.get(key) ?? 0) + 1); }
    return a.filter((edge) => { const key = JSON.stringify(edge); const count = counts.get(key) ?? 0;
      if (count) { counts.set(key, count - 1); return false; } return true; });
  };
  const oldEdges = edges(before), newEdges = edges(after);
  return { removed: unmatched(oldEdges, newEdges), added: unmatched(newEdges, oldEdges), deltaM: routeLength(after) - routeLength(before) };
}
