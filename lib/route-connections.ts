import { projectAccess, usesStationOnlyAccess, type ClosestOnPath, type PolylineRoute } from "@/lib/routeMatcher";
import type { Coordinates } from "@/lib/types";

type Connection = { a: ClosestOnPath; b: ClosestOnPath; walkM: number };
const cache = new WeakMap<Coordinates[], WeakMap<Coordinates[], Connection[]>>();
const gridCache = new WeakMap<Coordinates[], Map<string, number[]>>();
const X = 104_000, Y = 111_000, CELL = 250;
function cells(a: Coordinates, b: Coordinates, margin = 0) {
  const keys: string[] = [];
  for (let x = Math.floor((Math.min(a[0], b[0]) * X - margin) / CELL); x <= Math.floor((Math.max(a[0], b[0]) * X + margin) / CELL); x++) {
    for (let y = Math.floor((Math.min(a[1], b[1]) * Y - margin) / CELL); y <= Math.floor((Math.max(a[1], b[1]) * Y + margin) / CELL); y++) keys.push(`${x},${y}`);
  }
  return keys;
}
function indices(route: PolylineRoute) {
  return route.path.map((_, i) => i).slice(0, usesStationOnlyAccess(route) ? undefined : -1);
}
function end(route: PolylineRoute, i: number) { return usesStationOnlyAccess(route) ? route.path[i] : route.path[i + 1]; }
function access(point: Coordinates, route: PolylineRoute, i: number) {
  return projectAccess(usesStationOnlyAccess(route) ? route.path[i] : point, route, i);
}

/** Nearby segments are indexed by cell; intersections never require matching vertices. */
export function getRouteConnections(a: PolylineRoute, b: PolylineRoute): Connection[] {
  let pairCache = cache.get(a.path);
  if (!pairCache) { pairCache = new WeakMap(); cache.set(a.path, pairCache); }
  const cached = pairCache.get(b.path);
  if (cached) return cached;
  let grid = gridCache.get(b.path);
  if (!grid) {
    grid = new Map();
    for (const j of indices(b)) for (const key of cells(b.path[j], end(b, j))) {
      const bucket = grid.get(key) ?? []; bucket.push(j); grid.set(key, bucket);
    }
    gridCache.set(b.path, grid);
  }
  const unique = new Map<string, Connection>();
  for (const i of indices(a)) {
    const p = a.path[i], q = end(a, i);
    const candidates = new Set(cells(p, q, 210).flatMap((key) => grid!.get(key) ?? []));
    for (const j of candidates) {
      const r = b.path[j], s = end(b, j);
      const pairs = [
        [access(p, a, i), access(p, b, j)], [access(q, a, i), access(q, b, j)],
        [access(r, a, i), access(r, b, j)], [access(s, a, i), access(s, b, j)],
      ];
      const dx = q[0] - p[0], dy = q[1] - p[1], ex = s[0] - r[0], ey = s[1] - r[1];
      const cross = dx * ey - dy * ex;
      if (cross && !usesStationOnlyAccess(a) && !usesStationOnlyAccess(b)) {
        const t = ((r[0] - p[0]) * ey - (r[1] - p[1]) * ex) / cross;
        const u = ((r[0] - p[0]) * dy - (r[1] - p[1]) * dx) / cross;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
          const point: Coordinates = [p[0] + t * dx, p[1] + t * dy];
          pairs.push([access(point, a, i), access(point, b, j)]);
        }
      }
      for (const [pa, pb] of pairs) {
        const walkM = Math.hypot((pa.projectedPoint[0] - pb.projectedPoint[0]) * X, (pa.projectedPoint[1] - pb.projectedPoint[1]) * Y);
        if (walkM > 200) continue;
        const key = `${Math.round(pa.progressM / 50)}:${Math.round(pb.progressM / 50)}`;
        if (!unique.has(key) || unique.get(key)!.walkM > walkM) unique.set(key, { a: pa, b: pb, walkM });
      }
    }
  }
  const result = [...unique.values()]; pairCache.set(b.path, result); return result;
}
