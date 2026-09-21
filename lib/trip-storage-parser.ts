import { createTripTrackingState, type TripJourney, type TripPhase, type TripTrackingState } from "@/lib/trip-mode";
import type { Coordinates } from "@/lib/types";

import { TRIP_EXPIRY_MS, type SavedTrip } from "@/lib/trip-storage";
const phases: TripPhase[] = ["boarding", "riding-direct", "riding-first", "walking-transfer", "riding-second", "walking-destination", "off-route", "arrived"];
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const number = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const text = (v: unknown): v is string => typeof v === "string" && v.length <= 300;
const coordinate = (v: unknown): v is Coordinates => Array.isArray(v) && v.length === 2 &&
  v.every((n) => typeof n === "number" && Number.isFinite(n)) && Math.abs(v[0]) <= 180 && Math.abs(v[1]) <= 90;
const path = (v: unknown) => Array.isArray(v) && v.length >= 2 && v.length <= 20_000 && v.every(coordinate);

function validJourney(v: unknown): v is TripJourney {
  if (!record(v) || !coordinate(v.destination)) return false;
  if (v.origin !== undefined && !coordinate(v.origin)) return false;
  for (const key of ["boardingStopLabel", "destinationStopLabel", "transferArrivalStopLabel", "transferBoardingStopLabel"]) {
    if (v[key] !== undefined && !text(v[key])) return false;
  }
  for (const key of ["landmarks", "routeALandmarks", "routeBLandmarks"]) {
    const landmarks = v[key];
    if (landmarks !== undefined && (!Array.isArray(landmarks) || landmarks.length > 500 ||
      !landmarks.every((l) => record(l) && text(l.name) && coordinate(l.point)))) return false;
  }
  if (v.kind === "direct") return number(v.routeId) && text(v.routeName) && path(v.segment);
  return v.kind === "transfer" && number(v.routeAId) && number(v.routeBId) && text(v.routeAName) && text(v.routeBName) &&
    path(v.segmentA) && path(v.segmentB) && coordinate(v.transferPoint) && number(v.walkMeters) &&
    [v.routeAStartIndex, v.routeATransferIndex, v.routeBTransferIndex, v.routeBEndIndex].every(number);
}

export function parseSavedTrip(raw: string | null, now = Date.now()): SavedTrip | null {
  if (!raw || raw.length > 2_000_000) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (!record(v) || v.version !== 1 || !number(v.savedAt) || now - v.savedAt > TRIP_EXPIRY_MS || v.savedAt > now + 60_000 || !validJourney(v.journey)) return null;
    const tracking = v.tracking;
    if (!record(tracking)) return null;
    const p = tracking.progress;
    if (p !== null && (!record(p) || !phases.includes(p.phase as TripPhase) || p.phase === "arrived" ||
      !number(p.progressRatio) || p.progressRatio > 1 ||
      !(p.remainingMinutes === null || number(p.remainingMinutes)) || !(p.distanceToMilestoneM === null || number(p.distanceToMilestoneM)) ||
      !(p.currentRouteName === null || text(p.currentRouteName)) || !(p.nextRouteName === null || text(p.nextRouteName)))) return null;
    if (tracking.boardingConfirmation !== undefined && tracking.boardingConfirmation !== "first" && tracking.boardingConfirmation !== "second") return null;
    if (tracking.lastOnRoutePhase !== undefined && (!phases.includes(tracking.lastOnRoutePhase as TripPhase) || tracking.lastOnRoutePhase === "off-route")) return null;
    if (v.journey.kind === "direct" && (tracking.boardingConfirmation === "second" ||
      [record(p) ? p.phase : undefined, tracking.lastOnRoutePhase].some((phase) => ["riding-first", "riding-second", "walking-transfer"].includes(phase as string)))) return null;
    return { version: 1, savedAt: v.savedAt, journey: { ...v.journey, walking: undefined }, tracking: {
      ...createTripTrackingState(p as TripTrackingState["progress"]),
      lastOnRoutePhase: tracking.lastOnRoutePhase as TripTrackingState["lastOnRoutePhase"],
      requireBoardingConfirmation: true,
      boardingConfirmation: tracking.boardingConfirmation,
    } };
  } catch { return null; }
}


