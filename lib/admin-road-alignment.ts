import { parseRoutePath } from "@/lib/admin-route";
import { haversineMeters } from "@/lib/geo";
import type { Coordinates } from "@/lib/types";

export function parseRoadAlignment(value: unknown, from: Coordinates, to: Coordinates): Coordinates[] | null {
  const data = value as { code?: string; routes?: { geometry?: unknown }[] } | null;
  const path = data?.code === "Ok" ? parseRoutePath(JSON.stringify(data.routes?.[0]?.geometry)) : null;
  if (!path || haversineMeters(path[0], from) > 75 || haversineMeters(path.at(-1)!, to) > 75) return null;
  // Preserve the original connections; snapped street coordinates remain intermediate points.
  return path.filter((point, i) => !(i === 0 && haversineMeters(point, from) < 0.1)
    && !(i === path.length - 1 && haversineMeters(point, to) < 0.1));
}
