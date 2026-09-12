import { isTelefericoRouteName } from "@/lib/journey-guidance";
import type { TransferOption } from "@/lib/transfers";
import type {
  Coordinates,
  ProductionRoute,
  ProductionRouteLandmark,
  ResolvedRouteData,
} from "@/lib/types";

const BACKGROUND_SIMPLIFY_TOLERANCE = 0.00008;
const BACKGROUND_MAX_POINTS = 180;

export type MapArrowSegment = {
  coords: Coordinates[];
  color: string;
  showLine?: boolean;
};

function perpendicularDistanceSquared(
  point: Coordinates,
  start: Coordinates,
  end: Coordinates,
) {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    const ddx = x - x1;
    const ddy = y - y1;
    return ddx * ddx + ddy * ddy;
  }

  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  const projectedX = x1 + clamped * dx;
  const projectedY = y1 + clamped * dy;
  const ddx = x - projectedX;
  const ddy = y - projectedY;
  return ddx * ddx + ddy * ddy;
}

function simplifyCoordinates(points: Coordinates[], tolerance: number) {
  if (points.length <= 2) return points;

  const squaredTolerance = tolerance * tolerance;
  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop() as [number, number];
    let maxDistance = 0;
    let maxIndex = -1;

    for (let index = start + 1; index < end; index += 1) {
      const distance = perpendicularDistanceSquared(points[index], points[start], points[end]);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = index;
      }
    }

    if (maxIndex !== -1 && maxDistance > squaredTolerance) {
      keep[maxIndex] = true;
      stack.push([start, maxIndex], [maxIndex, end]);
    }
  }

  return points.filter((_, index) => keep[index]);
}

function decimateCoordinates(points: Coordinates[], maxPoints: number) {
  if (points.length <= maxPoints) return points;

  const step = Math.ceil(points.length / maxPoints);
  const reduced: Coordinates[] = [points[0]];

  for (let index = step; index < points.length - 1; index += step) {
    reduced.push(points[index]);
  }

  const lastPoint = points[points.length - 1];
  const previous = reduced[reduced.length - 1];
  if (!previous || previous[0] !== lastPoint[0] || previous[1] !== lastPoint[1]) {
    reduced.push(lastPoint);
  }

  return reduced;
}

export function simplifyBackgroundCoordinates(points: Coordinates[]) {
  if (points.length <= BACKGROUND_MAX_POINTS) return points;

  const simplified = simplifyCoordinates(points, BACKGROUND_SIMPLIFY_TOLERANCE);
  return decimateCoordinates(simplified, BACKGROUND_MAX_POINTS);
}

export function buildRouteList(routes: ProductionRoute[]) {
  const seen = new Map<string, ResolvedRouteData>();

  for (const route of routes) {
    const isVuelta = route.original_name.includes("Vuelta");
    const isTeleferico = route.name === "Teleférico Uruapan";
    const existing = seen.get(route.name);

    if (existing) {
      if (isTeleferico || isVuelta) existing.tieneVuelta = true;
      if (isTeleferico || !isVuelta) existing.tieneIda = true;
      continue;
    }

    seen.set(route.name, {
      id: route.id,
      ruta: route.name,
      nombre: route.name,
      color: route.color,
      coordenadas: route.path,
      direccion: isVuelta ? "vuelta" : "ida",
      tieneIda: isTeleferico || !isVuelta,
      tieneVuelta: isTeleferico || isVuelta,
    });
  }

  return Array.from(seen.values());
}

export function buildSimplifiedMapRoutes(routes: ProductionRoute[]) {
  return routes.map<ResolvedRouteData>((route) => ({
    id: route.id,
    ruta: route.name,
    nombre: route.name,
    color: route.color,
    coordenadas: simplifyBackgroundCoordinates(route.path),
    direccion: route.original_name.includes("Vuelta") ? "vuelta" : "ida",
    tieneIda: true,
    tieneVuelta: false,
  }));
}

export function buildLandmarksByRouteName(routes: ProductionRoute[]) {
  const landmarks = new Map<string, ProductionRouteLandmark[]>();
  for (const route of routes) {
    if (!route.landmarks?.length) continue;
    const current = landmarks.get(route.name) ?? [];
    const names = new Set(current.map((landmark) => landmark.name));
    landmarks.set(route.name, [
      ...current,
      ...route.landmarks.filter((landmark) => !names.has(landmark.name)),
    ]);
  }
  return landmarks;
}

export function buildArrowSegments({
  routes,
  selectedRoute,
  selectedSegment,
  selectedTransfer,
  selectedSegmentColor,
}: {
  destination: Coordinates | null;
  origin: Coordinates | null;
  routes: ProductionRoute[];
  selectedRoute: ProductionRoute | null;
  selectedSegment: Coordinates[] | null;
  selectedTransfer: TransferOption | null;
  selectedSegmentColor: string | null;
}): MapArrowSegment[] {
  if (selectedTransfer) {
    return [
      { coords: selectedTransfer.segmentA, color: "#60a5fa", showLine: false },
      { coords: selectedTransfer.segmentB, color: "#34d399", showLine: false },
    ];
  }

  if (selectedSegment && selectedSegmentColor && !selectedRoute) {
    return [{ coords: selectedSegment, color: selectedSegmentColor, showLine: true }];
  }

  if (selectedSegment && selectedRoute) {
    return [{ coords: selectedSegment, color: selectedRoute.color, showLine: false }];
  }

  // A GPS fix is not a planned journey. Keep both directions visible when
  // browsing the catalog; an actual journey segment takes precedence above.
  if (selectedRoute) {
    return routes
      .filter((route) => route.name === selectedRoute.name)
      .map((route) => ({ coords: route.path, color: selectedRoute.color, showLine: true }));
  }

  return [];
}

export function applySelectedRouteSegment({
  routes,
  selectedRoute,
  selectedRouteId,
  selectedSegment,
}: {
  routes: ResolvedRouteData[];
  selectedRoute: ProductionRoute | null;
  selectedRouteId: number | null;
  selectedSegment: Coordinates[] | null;
}) {
  if (selectedRouteId === null || !selectedRoute) return routes;

  const displayCoordinates = selectedSegment ?? selectedRoute.path;
  return routes.map((route) =>
    route.id === selectedRouteId
      ? { ...route, coordenadas: displayCoordinates }
      : route,
  );
}

export function countVisibleRoutes(routes: ResolvedRouteData[]) {
  return routes.filter((route) => !isTelefericoRouteName(route.ruta)).length;
}
