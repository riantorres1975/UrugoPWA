import type { Coordinates } from "@/lib/types";

export function tripHref(origin: Coordinates, destination: Coordinates, label?: string | null) {
  const params = new URLSearchParams({ a: origin.join(","), b: destination.join(",") });
  if (label) params.set("destino", label);
  // Only endpoints: the planner must recalculate direction, boarding and schedule.
  return `/mapa?${params}`;
}
