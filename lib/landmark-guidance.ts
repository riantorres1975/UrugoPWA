import { haversineMeters } from "@/lib/geo";
import { getClosestPointOnPath } from "@/lib/routeMatcher";
import type { Coordinates, ProductionRouteLandmark } from "@/lib/types";

export type LandmarkCue = {
  name: string;
  distanceM: number;
};

// Treat nearby references as reached, allowing for normal GPS drift.
export const LANDMARK_REACHED_RADIUS_M = 40;

type LandmarkPosition = {
  landmark: ProductionRouteLandmark;
  distanceFromPathM: number;
  progressM: number;
};

const landmarkPositionCache = new WeakMap<
  Coordinates[],
  WeakMap<ProductionRouteLandmark[], LandmarkPosition[]>
>();

function getLandmarkPositions(
  path: Coordinates[],
  landmarks: ProductionRouteLandmark[],
): LandmarkPosition[] {
  let byLandmarkList = landmarkPositionCache.get(path);
  if (!byLandmarkList) {
    byLandmarkList = new WeakMap();
    landmarkPositionCache.set(path, byLandmarkList);
  }

  const cached = byLandmarkList.get(landmarks);
  if (cached) return cached;

  const positions = landmarks.map((landmark) => {
    const position = getClosestPointOnPath(landmark.point, path);
    return {
      landmark,
      distanceFromPathM: position.distM,
      progressM: position.progressM,
    };
  });
  byLandmarkList.set(landmarks, positions);
  return positions;
}

export function findNearestLandmark(
  point: Coordinates,
  landmarkGroups: Array<ProductionRouteLandmark[] | undefined>,
  maxDistanceM: number,
): LandmarkCue | null {
  let closest: LandmarkCue | null = null;

  for (const landmarks of landmarkGroups) {
    for (const landmark of landmarks ?? []) {
      const distanceM = haversineMeters(point, landmark.point);
      if (distanceM <= maxDistanceM && (!closest || distanceM < closest.distanceM)) {
        closest = { name: landmark.name, distanceM };
      }
    }
  }

  return closest;
}

export function findUpcomingLandmark(
  location: Coordinates,
  path: Coordinates[],
  landmarks: ProductionRouteLandmark[] | undefined,
  options: { maxAheadM?: number; maxCorridorM?: number } = {},
): LandmarkCue | null {
  if (path.length < 2 || !landmarks?.length) return null;

  const maxAheadM = options.maxAheadM ?? 1_800;
  const maxCorridorM = options.maxCorridorM ?? 350;
  const current = getClosestPointOnPath(location, path);
  if (current.distM > maxCorridorM) return null;

  let upcoming: LandmarkCue | null = null;
  for (const position of getLandmarkPositions(path, landmarks)) {
    if (position.distanceFromPathM > maxCorridorM) continue;

    const distanceM = position.progressM - current.progressM;
    if (distanceM <= LANDMARK_REACHED_RADIUS_M || distanceM > maxAheadM) continue;
    if (!upcoming || distanceM < upcoming.distanceM) {
      upcoming = { name: position.landmark.name, distanceM };
    }
  }

  return upcoming;
}
