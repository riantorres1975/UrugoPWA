import type { Coordinates, ProductionRouteLandmark } from "@/lib/types";
import { DEFAULT_JOURNEY_SETTINGS, type JourneySettings } from "@/lib/journey-settings";
import { diverseJourneys, rankJourneys, journeyMinutes, journeyScore, expectedWait, type JourneyCost, type JourneyPreference } from "@/lib/journey-ranking";

// ─── Public types ─────────────────────────────────────────────────────────────

export type PolylineRoute = {
  id: number;
  name: string;
  color: string;
  corridor_width_m: number;
  path: Coordinates[];               // [lng, lat][]
  direccion?: "ida" | "vuelta";
  landmarks?: ProductionRouteLandmark[];
};

export type ClosestOnPath = {
  distM: number;
  segmentIndex: number;              // index of the segment's first point
  segmentT: number;                  // 0..1 projected position within the segment
  projectedPoint: Coordinates;
  progressM: number;                 // meters from path start to projectedPoint
};

export type PolylineRouteMatch = {
  routeId: number;
  routeName: string;
  routeColor: string;
  direccion: "ida" | "vuelta";
  originDistM: number;
  destDistM: number;
  originSegIndex: number;
  destSegIndex: number;
  segment: Coordinates[];
  routeLengthM: number;
  rideMinutes: number;
  expectedWaitMinutes: number;
  estimatedMinutes: number;
  score: number;
  cost?: JourneyCost;
};

export type RankedRoutes = {
  best: PolylineRouteMatch;
  alternatives: PolylineRouteMatch[];
};

export type RouteMetrics = {
  cumulativeLengthsM: number[];
  segmentLengthsM: number[];
  totalLengthM: number;
  bounds: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  };
};

// ─── Internal geometry ────────────────────────────────────────────────────────

const EARTH_R = 6_371_000;
const toRad = (d: number) => (d * Math.PI) / 180;
const BUS_SPEED_M_PER_MIN = 300;
const TELEFERICO_ROUTE_NAME = "Teleférico Uruapan";
const routeMetricsCache = new WeakMap<Coordinates[], RouteMetrics>();

// Equirectangular projection to metric XY, accurate within ~0.1% for city-scale areas.
function toMetricXY(coord: Coordinates, refLat: number): [number, number] {
  return [
    toRad(coord[0]) * EARTH_R * Math.cos(toRad(refLat)),
    toRad(coord[1]) * EARTH_R,
  ];
}

function haversineDistanceM(a: Coordinates, b: Coordinates): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(h));
}

function interpolateCoord(a: Coordinates, b: Coordinates, t: number): Coordinates {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
  ];
}

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Precomputed distances for a route path. The WeakMap keeps repeated searches
 * cheap without retaining route arrays after they are replaced.
 */
export function getRouteMetrics(path: Coordinates[]): RouteMetrics {
  const cached = routeMetricsCache.get(path);
  if (cached) return cached;

  const cumulativeLengthsM = new Array<number>(path.length);
  const segmentLengthsM = new Array<number>(Math.max(0, path.length - 1));
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (let i = 0; i < path.length; i++) {
    const [lng, lat] = path[i];
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);

    if (i === 0) {
      cumulativeLengthsM[0] = 0;
      continue;
    }

    const segmentLengthM = haversineDistanceM(path[i - 1], path[i]);
    segmentLengthsM[i - 1] = segmentLengthM;
    cumulativeLengthsM[i] = cumulativeLengthsM[i - 1] + segmentLengthM;
  }

  const metrics = {
    cumulativeLengthsM,
    segmentLengthsM,
    totalLengthM: cumulativeLengthsM[path.length - 1] ?? 0,
    bounds: { minLng, minLat, maxLng, maxLat },
  };
  routeMetricsCache.set(path, metrics);
  return metrics;
}

/**
 * Sum of haversine distances between consecutive path points, in meters.
 */
export function getRouteLength(path: Coordinates[]): number {
  return getRouteMetrics(path).totalLengthM;
}

export function isPointWithinRouteBounds(
  point: Coordinates,
  metrics: RouteMetrics,
  marginM: number,
): boolean {
  const latMargin = marginM / 111_000;
  const metersPerLngDegree = 111_000 * Math.max(0.01, Math.cos(toRad(point[1])));
  const lngMargin = marginM / metersPerLngDegree;
  const { minLng, minLat, maxLng, maxLat } = metrics.bounds;

  return (
    point[0] >= minLng - lngMargin &&
    point[0] <= maxLng + lngMargin &&
    point[1] >= minLat - latMargin &&
    point[1] <= maxLat + latMargin
  );
}

/**
 * Distance in meters from point p to segment a→b via perpendicular projection.
 * Uses equirectangular approximation centred at the three-point midlat —
 * more accurate than vertex-only haversine for long segments.
 */
export function getDistancePointToSegmentM(
  p: Coordinates,
  a: Coordinates,
  b: Coordinates
): number {
  const refLat = (p[1] + a[1] + b[1]) / 3;
  const [px, py] = toMetricXY(p, refLat);
  const [ax, ay] = toMetricXY(a, refLat);
  const [bx, by] = toMetricXY(b, refLat);

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return Math.hypot(px - ax, py - ay);

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Scans every segment of path and returns the perpendicular distance (meters)
 * to the closest segment and that segment's index.
 */
export function getClosestPointOnPath(
  point: Coordinates,
  path: Coordinates[]
): ClosestOnPath {
  let bestDist = Infinity;
  let bestIndex = 0;
  let bestT = 0;
  let bestProjectedPoint: Coordinates = path[0] ?? point;
  let bestProgressM = 0;
  const metrics = getRouteMetrics(path);

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const refLat = (point[1] + a[1] + b[1]) / 3;
    const [px, py] = toMetricXY(point, refLat);
    const [ax, ay] = toMetricXY(a, refLat);
    const [bx, by] = toMetricXY(b, refLat);
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    const projectedPoint = interpolateCoord(a, b, t);
    const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    const segmentLengthM = metrics.segmentLengthsM[i];

    if (d < bestDist) {
      bestDist = d;
      bestIndex = i;
      bestT = t;
      bestProjectedPoint = projectedPoint;
      bestProgressM = metrics.cumulativeLengthsM[i] + segmentLengthM * t;
    }
  }

  return {
    distM: bestDist,
    segmentIndex: bestIndex,
    segmentT: bestT,
    projectedPoint: bestProjectedPoint,
    progressM: bestProgressM,
  };
}

export function usesStationOnlyAccess(route: PolylineRoute): boolean {
  return route.name === TELEFERICO_ROUTE_NAME;
}

function getClosestStationOnPath(point: Coordinates, path: Coordinates[]): ClosestOnPath {
  const metrics = getRouteMetrics(path);
  let bestIndex = 0;
  let bestDistanceM = Infinity;

  for (let index = 0; index < path.length; index += 1) {
    const distanceM = haversineDistanceM(point, path[index]);
    if (distanceM < bestDistanceM) {
      bestDistanceM = distanceM;
      bestIndex = index;
    }
  }

  return {
    distM: bestDistanceM,
    segmentIndex: bestIndex,
    segmentT: 0,
    projectedPoint: path[bestIndex] ?? point,
    progressM: metrics.cumulativeLengthsM[bestIndex] ?? 0,
  };
}

/**
 * Returns false when the route cannot serve the trip; otherwise returns the
 * closest-segment results so the caller can compute a score without repeating work.
 *
 * Rules enforced:
 *   1. origin must be within corridor_width_m of the path.
 *   2. destination must be within corridor_width_m of the path.
 *   3. destination must be farther along the route than origin (forward direction).
 * Station-only systems use their nearest stations and may travel in either direction.
 */
export function isRouteValid(
  origin: Coordinates,
  destination: Coordinates,
  route: PolylineRoute
): false | { originSeg: ClosestOnPath; destSeg: ClosestOnPath } {
  if (route.path.length < 2) return false;

  const threshold = route.corridor_width_m;
  const metrics = getRouteMetrics(route.path);
  if (
    !isPointWithinRouteBounds(origin, metrics, threshold) ||
    !isPointWithinRouteBounds(destination, metrics, threshold)
  ) {
    return false;
  }

  const stationOnlyAccess = usesStationOnlyAccess(route);
  const originSeg = stationOnlyAccess
    ? getClosestStationOnPath(origin, route.path)
    : getClosestPointOnPath(origin, route.path);
  if (originSeg.distM > threshold) return false;

  const destSeg = stationOnlyAccess
    ? getClosestStationOnPath(destination, route.path)
    : getClosestPointOnPath(destination, route.path);
  if (destSeg.distM > threshold) return false;

  if (stationOnlyAccess) {
    if (destSeg.segmentIndex === originSeg.segmentIndex) return false;
  } else if (destSeg.progressM <= originSeg.progressM) {
    return false;
  }

  return { originSeg, destSeg };
}

export function buildSegmentBetween(route: PolylineRoute, originSeg: ClosestOnPath, destSeg: ClosestOnPath): Coordinates[] {
  if (usesStationOnlyAccess(route)) {
    const startIndex = originSeg.segmentIndex;
    const endIndex = destSeg.segmentIndex;
    return startIndex < endIndex
      ? route.path.slice(startIndex, endIndex + 1)
      : route.path.slice(endIndex, startIndex + 1).reverse();
  }

  const segment: Coordinates[] = [originSeg.projectedPoint];

  for (let i = originSeg.segmentIndex + 1; i <= destSeg.segmentIndex; i++) {
    segment.push(route.path[i]);
  }

  segment.push(destSeg.projectedPoint);
  return segment;
}

/**
 * Evaluates all routes, discards invalid ones, deduplicates by route name keeping
 * a suitable direction, then preserves the recommended, closest and fastest options.
 * Preference scores include walking and transfer penalties; ETA is kept separate.
 */
export function findBestRoutes(
  origin: Coordinates,
  destination: Coordinates,
  routes: PolylineRoute[],
  preference: JourneyPreference = "nearby",
  limit = 3,
  settings: JourneySettings = DEFAULT_JOURNEY_SETTINGS,
): PolylineRouteMatch[] {
  const byRouteName = new Map<string, PolylineRouteMatch>();

  for (const route of routes) {
    const accesses = getAccessCandidates(origin, route);
    const exits = getAccessCandidates(destination, route);
    const pairs = accesses.flatMap((originSeg) => exits
      .filter((destSeg) => usesStationOnlyAccess(route) ? destSeg.segmentIndex !== originSeg.segmentIndex : destSeg.progressM > originSeg.progressM + 1)
      .map((destSeg) => ({ originSeg, destSeg, cost: {
        originWalkM: originSeg.distM, destinationWalkM: destSeg.distM, transferWalkM: 0,
        rideMinutes: Math.abs(destSeg.progressM - originSeg.progressM) / BUS_SPEED_M_PER_MIN,
        waitMinutes: expectedWait(route.name), transfers: 0,
      } })));
    const result = rankJourneys(pairs, preference, settings)[0];
    if (!result) continue;
    const { originSeg, destSeg, cost } = result;
    const segment = buildSegmentBetween(route, originSeg, destSeg);
    const routeLengthM = getRouteLength(segment);
    const rideMinutes = routeLengthM / BUS_SPEED_M_PER_MIN;
    const waitMinutes = cost.waitMinutes;
    const score = journeyScore(cost, preference);
    const routeKey = route.name.trim().toLocaleLowerCase("es-MX");

    const existing = byRouteName.get(routeKey);
    if (existing?.cost && rankJourneys([{ cost: existing.cost }, { cost }], preference, settings)[0].cost === existing.cost) continue;

    byRouteName.set(routeKey, {
      routeId: route.id,
      routeName: route.name,
      routeColor: route.color,
      direccion: usesStationOnlyAccess(route)
        ? destSeg.progressM > originSeg.progressM ? "ida" : "vuelta"
        : route.direccion ?? "ida",
      originDistM: originSeg.distM,
      destDistM: destSeg.distM,
      originSegIndex: originSeg.segmentIndex,
      destSegIndex: destSeg.segmentIndex,
      segment,
      routeLengthM,
      rideMinutes: Math.max(1, Math.ceil(rideMinutes)),
      expectedWaitMinutes: Math.ceil(waitMinutes),
      estimatedMinutes: Math.max(1, Math.ceil(journeyMinutes(cost))),
      score,
      cost,
    });
  }

  const ranked = rankJourneys(Array.from(byRouteName.values()) as (PolylineRouteMatch & { cost: JourneyCost })[], preference, settings);
  return limit === Infinity ? ranked : diverseJourneys(ranked, limit);
}

/** Distinct nearby access points, preserving different passes through the same area. */
export function getAccessCandidates(point: Coordinates, route: PolylineRoute, limit = 8): ClosestOnPath[] {
  if (route.path.length < 2 || !isPointWithinRouteBounds(point, getRouteMetrics(route.path), route.corridor_width_m)) return [];
  const metrics = getRouteMetrics(route.path);
  const candidates: ClosestOnPath[] = [];
  if (usesStationOnlyAccess(route)) {
    route.path.forEach((station, index) => {
      const distM = haversineDistanceM(point, station);
      if (distM <= route.corridor_width_m) candidates.push({ distM, segmentIndex: index, segmentT: 0, projectedPoint: station, progressM: metrics.cumulativeLengthsM[index] });
    });
  } else {
    for (let index = 0; index < route.path.length - 1; index++) {
      const projection = projectAccess(point, route, index);
      if (projection.distM <= route.corridor_width_m) candidates.push(projection);
    }
  }
  candidates.sort((a, b) => a.distM - b.distM);
  const distinct: ClosestOnPath[] = [];
  for (const candidate of candidates) {
    if (distinct.every((existing) => Math.abs(existing.progressM - candidate.progressM) > 100)) distinct.push(candidate);
    if (distinct.length === limit) break;
  }
  return distinct;
}

export function projectAccess(point: Coordinates, route: PolylineRoute, index: number): ClosestOnPath {
  const a = route.path[index], b = route.path[index + 1] ?? a;
  const refLat = (point[1] + a[1] + b[1]) / 3;
  const [px, py] = toMetricXY(point, refLat), [ax, ay] = toMetricXY(a, refLat), [bx, by] = toMetricXY(b, refLat);
  const dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length)) : 0;
  const metrics = getRouteMetrics(route.path);
  return { distM: Math.hypot(px - ax - t * dx, py - ay - t * dy), segmentIndex: index, segmentT: t,
    projectedPoint: interpolateCoord(a, b, t), progressM: metrics.cumulativeLengthsM[index] + (metrics.segmentLengthsM[index] ?? 0) * t };
}

/**
 * Wraps findBestRoutes results into a ranked structure.
 * The lowest-score match becomes `best`; the rest are `alternatives`.
 * Returns null when no routes match.
 */
export function getRankedRoutes(matches: PolylineRouteMatch[]): RankedRoutes | null {
  if (matches.length === 0) return null;
  const [best, ...alternatives] = matches;
  return { best, alternatives };
}
