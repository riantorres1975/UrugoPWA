import { haversineMeters } from "@/lib/geo";
import { getClosestPointOnPath, getRouteMetrics } from "@/lib/routeMatcher";
import { getTransferSelectionKey } from "@/lib/transfer-selection";
import type { Coordinates, ProductionRouteLandmark } from "@/lib/types";
import type { JourneyWalking } from "@/lib/journey-walking";

const BUS_SPEED_M_PER_MIN = 300;
const WALK_SPEED_M_PER_MIN = 75;
const ARRIVAL_RADIUS_M = 90;
const ALIGHTING_RADIUS_M = 120;
const ROUTE_CORRIDOR_M = 300;
const TRANSFER_RADIUS_M = 120;
const BOARDED_ROUTE_B_PROGRESS_M = 100;
const OFF_ROUTE_CONFIRMATION_READINGS = 3;
const ARRIVAL_CONFIRMATION_READINGS = 2;

export type TripPhase =
  | "boarding"
  | "riding-direct"
  | "riding-first"
  | "walking-transfer"
  | "riding-second"
  | "walking-destination"
  | "off-route"
  | "arrived";

export type DirectTripJourney = {
  origin?: Coordinates;
  walking?: JourneyWalking;
  kind: "direct";
  routeId: number;
  routeName: string;
  segment: Coordinates[];
  destination: Coordinates;
  landmarks?: ProductionRouteLandmark[];
  boardingStopLabel?: string;
  destinationStopLabel?: string;
};

export type TransferTripJourney = {
  origin?: Coordinates;
  walking?: JourneyWalking;
  kind: "transfer";
  routeAId: number;
  routeBId: number;
  routeAName: string;
  routeBName: string;
  routeAStartIndex: number;
  routeATransferIndex: number;
  routeBTransferIndex: number;
  routeBEndIndex: number;
  segmentA: Coordinates[];
  segmentB: Coordinates[];
  transferPoint: Coordinates;
  walkMeters: number;
  destination: Coordinates;
  routeALandmarks?: ProductionRouteLandmark[];
  routeBLandmarks?: ProductionRouteLandmark[];
  boardingStopLabel?: string;
  transferArrivalStopLabel?: string;
  transferBoardingStopLabel?: string;
  destinationStopLabel?: string;
};

export type TripJourney = DirectTripJourney | TransferTripJourney;

export type TripProgress = {
  phase: TripPhase;
  progressRatio: number;
  remainingMinutes: number | null;
  distanceToMilestoneM: number | null;
  currentRouteName: string | null;
  nextRouteName: string | null;
};

export type TripTrackingState = {
  progress: TripProgress | null;
  lastOnRoutePhase: Exclude<TripPhase, "off-route"> | undefined;
  offRouteReadings: number;
  arrivalReadings: number;
  requireBoardingConfirmation?: boolean;
  boardingConfirmation?: "first" | "second";
};

export type TripConfirmation = "board" | "alight" | "wait";

function waitingProgress(journey: TripJourney, location: Coordinates, second: boolean, ratio: number): TripProgress {
  const point = journey.kind === "transfer" && second ? journey.segmentB[0]
    : journey.kind === "direct" ? journey.segment[0] : journey.segmentA[0];
  const distance = haversineMeters(location, point);
  return {
    phase: second ? "walking-transfer" : "boarding", progressRatio: ratio,
    remainingMinutes: minutesFor(distance, WALK_SPEED_M_PER_MIN), distanceToMilestoneM: distance,
    currentRouteName: second ? null : journey.kind === "direct" ? journey.routeName : journey.routeAName,
    nextRouteName: journey.kind === "transfer" ? journey.routeBName : null,
  };
}

export function confirmTripStage(journey: TripJourney, location: Coordinates, state: TripTrackingState, action: TripConfirmation): TripTrackingState {
  const phase = state.progress?.phase === "off-route" ? state.lastOnRoutePhase : state.progress?.phase;
  if (phase === "arrived") return state;
  const second = journey.kind === "transfer" && (state.boardingConfirmation === "second" || phase === "riding-second" || phase === "walking-transfer");
  if (action === "wait") {
    if (phase === "walking-destination") return state;
    const progress = waitingProgress(journey, location, second, state.progress?.progressRatio ?? 0);
    return { ...createTripTrackingState(progress), requireBoardingConfirmation: true, boardingConfirmation: second ? "second" : "first" };
  }
  if (action === "board") {
    if (phase === "walking-destination") return state;
    const path = journey.kind === "direct" ? journey.segment : second ? journey.segmentB : journey.segmentA;
    const distance = locateOnPath(location, path).remainingM;
    const progress: TripProgress = {
      phase: journey.kind === "direct" ? "riding-direct" : second ? "riding-second" : "riding-first",
      progressRatio: state.progress?.progressRatio ?? 0,
      remainingMinutes: minutesFor(distance, BUS_SPEED_M_PER_MIN), distanceToMilestoneM: distance,
      currentRouteName: journey.kind === "direct" ? journey.routeName : second ? journey.routeBName : journey.routeAName,
      nextRouteName: journey.kind === "transfer" && !second ? journey.routeBName : null,
    };
    return { ...createTripTrackingState(progress), requireBoardingConfirmation: true };
  }
  if (phase !== "riding-direct" && phase !== "riding-first" && phase !== "riding-second") return state;
  if (journey.kind === "transfer" && !second) {
    const progress = waitingProgress(journey, location, true, state.progress?.progressRatio ?? 0);
    return { ...createTripTrackingState(progress), requireBoardingConfirmation: true, boardingConfirmation: "second" };
  }
  const path = journey.kind === "direct" ? journey.segment : journey.segmentB;
  const total = journey.kind === "direct" ? getRouteMetrics(path).totalLengthM
    : getRouteMetrics(journey.segmentA).totalLengthM + journey.walkMeters + getRouteMetrics(path).totalLengthM;
  const progress = walkingDestinationProgress(haversineMeters(location, journey.destination), total, haversineMeters(path[path.length - 1], journey.destination));
  return { ...createTripTrackingState(progress), requireBoardingConfirmation: true };
}

export type TripMilestone = "transfer-near" | "destination-near" | "arrived";

type PathPosition = {
  distanceM: number;
  progressM: number;
  remainingM: number;
  totalM: number;
};

function clampRatio(value: number) {
  return Math.min(1, Math.max(0, value));
}

function minutesFor(distanceM: number, speedMPerMin: number) {
  if (distanceM <= 0) return 0;
  return Math.max(1, Math.ceil(distanceM / speedMPerMin));
}

function locateOnPath(location: Coordinates, path: Coordinates[]): PathPosition {
  if (path.length < 2) {
    const distanceM = path[0] ? haversineMeters(location, path[0]) : Infinity;
    return { distanceM, progressM: 0, remainingM: 0, totalM: 0 };
  }

  const closest = getClosestPointOnPath(location, path);
  const totalM = getRouteMetrics(path).totalLengthM;
  return {
    distanceM: closest.distM,
    progressM: closest.progressM,
    remainingM: Math.max(0, totalM - closest.progressM),
    totalM,
  };
}

function arrivedProgress(): TripProgress {
  return {
    phase: "arrived",
    progressRatio: 1,
    remainingMinutes: 0,
    distanceToMilestoneM: 0,
    currentRouteName: null,
    nextRouteName: null,
  };
}

function walkingDestinationProgress(
  distanceToDestinationM: number,
  completedTransitM: number,
  finalWalkM: number,
): TripProgress {
  const walkedM = Math.max(0, finalWalkM - distanceToDestinationM);
  const totalJourneyM = completedTransitM + finalWalkM;

  return {
    phase: "walking-destination",
    progressRatio: totalJourneyM > 0
      ? Math.min(0.99, clampRatio((completedTransitM + walkedM) / totalJourneyM))
      : 0,
    remainingMinutes: minutesFor(distanceToDestinationM, WALK_SPEED_M_PER_MIN),
    distanceToMilestoneM: distanceToDestinationM,
    currentRouteName: null,
    nextRouteName: null,
  };
}

export function getTripJourneyKey(journey: TripJourney): string {
  const destinationKey = journey.destination.map((value) => value.toFixed(6)).join(",");
  if (journey.kind === "direct") {
    return `direct:${journey.routeId}:${destinationKey}`;
  }

  return `transfer:${getTransferSelectionKey(journey)}:${destinationKey}`;
}

export function calculateTripProgress(
  journey: TripJourney,
  location: Coordinates,
  previousPhase?: TripPhase,
): TripProgress {
  if (journey.kind === "direct") {
    const distanceToDestinationM = haversineMeters(location, journey.destination);
    const position = locateOnPath(location, journey.segment);
    if (distanceToDestinationM <= ARRIVAL_RADIUS_M &&
      (previousPhase === "walking-destination" || position.remainingM <= ALIGHTING_RADIUS_M)) {
      return arrivedProgress();
    }

    const dropOffPoint = journey.segment[journey.segment.length - 1];
    const finalWalkM = dropOffPoint
      ? haversineMeters(dropOffPoint, journey.destination)
      : distanceToDestinationM;
    const routeTotalM = getRouteMetrics(journey.segment).totalLengthM;
    const distanceToDropOffM = dropOffPoint
      ? haversineMeters(location, dropOffPoint)
      : Infinity;
    if (
      previousPhase === "walking-destination" ||
      (previousPhase === "riding-direct" && distanceToDropOffM <= ALIGHTING_RADIUS_M && position.remainingM <= ALIGHTING_RADIUS_M)
    ) {
      return walkingDestinationProgress(distanceToDestinationM, routeTotalM, finalWalkM);
    }

    if (position.distanceM > ROUTE_CORRIDOR_M) {
      const boardingDistanceM = journey.segment[0]
        ? haversineMeters(location, journey.segment[0])
        : position.distanceM;
      const wasRiding = previousPhase === "riding-direct" || previousPhase === "off-route";
      return {
        phase: wasRiding ? "off-route" : "boarding",
        progressRatio: 0,
        remainingMinutes: wasRiding ? null : minutesFor(boardingDistanceM, WALK_SPEED_M_PER_MIN),
        distanceToMilestoneM: wasRiding ? position.distanceM : boardingDistanceM,
        currentRouteName: journey.routeName,
        nextRouteName: null,
      };
    }

    return {
      phase: "riding-direct",
      progressRatio: position.totalM + finalWalkM > 0
        ? clampRatio(position.progressM / (position.totalM + finalWalkM)) : 0,
      remainingMinutes: minutesFor(position.remainingM, BUS_SPEED_M_PER_MIN),
      distanceToMilestoneM: position.remainingM,
      currentRouteName: journey.routeName,
      nextRouteName: null,
    };
  }

  const distanceToDestinationM = haversineMeters(location, journey.destination);
  const routeA = locateOnPath(location, journey.segmentA);
  const routeB = locateOnPath(location, journey.segmentB);
  if (distanceToDestinationM <= ARRIVAL_RADIUS_M &&
    (previousPhase === "walking-destination" ||
      ((previousPhase === "riding-second" || !previousPhase) && routeB.remainingM <= ALIGHTING_RADIUS_M))) {
    return arrivedProgress();
  }
  const routeBStart = journey.segmentB[0] ?? journey.transferPoint;
  const dropOffPoint = journey.segmentB[journey.segmentB.length - 1];
  const distanceToDropOffM = dropOffPoint
    ? haversineMeters(location, dropOffPoint)
    : Infinity;
  const finalWalkM = dropOffPoint
    ? haversineMeters(dropOffPoint, journey.destination)
    : distanceToDestinationM;
  const distanceToTransferM = haversineMeters(location, journey.transferPoint);
  const distanceToRouteBStartM = haversineMeters(location, routeBStart);
  const completedTransitM = routeA.totalM + journey.walkMeters + routeB.totalM;
  const totalJourneyM = completedTransitM + finalWalkM;
  const wasWalkingTransfer = previousPhase === "walking-transfer";
  const wasRidingSecond = previousPhase === "riding-second";

  if (
    previousPhase === "walking-destination" ||
    (wasRidingSecond && distanceToDropOffM <= ALIGHTING_RADIUS_M && routeB.remainingM <= ALIGHTING_RADIUS_M)
  ) {
    return walkingDestinationProgress(distanceToDestinationM, completedTransitM, finalWalkM);
  }

  // Some routes cross again shortly after the official transfer point. Keep
  // the transfer phase until the rider has actually moved away from that point.
  if (distanceToTransferM <= TRANSFER_RADIUS_M && routeA.remainingM <= TRANSFER_RADIUS_M && !wasRidingSecond) {
    const walkedM = Math.max(0, journey.walkMeters - distanceToRouteBStartM);
    return {
      phase: "walking-transfer",
      progressRatio: totalJourneyM > 0
        ? clampRatio((routeA.totalM + walkedM) / totalJourneyM)
        : 0,
      remainingMinutes: minutesFor(distanceToRouteBStartM, WALK_SPEED_M_PER_MIN),
      distanceToMilestoneM: distanceToRouteBStartM,
      currentRouteName: null,
      nextRouteName: journey.routeBName,
    };
  }

  if (
    routeB.distanceM <= ROUTE_CORRIDOR_M &&
    (wasRidingSecond || (routeB.progressM >= BOARDED_ROUTE_B_PROGRESS_M &&
      (wasWalkingTransfer || (!previousPhase && routeA.distanceM > ROUTE_CORRIDOR_M) ||
        (routeA.remainingM <= TRANSFER_RADIUS_M && routeA.distanceM > ROUTE_CORRIDOR_M))))
  ) {
    return {
      phase: "riding-second",
      progressRatio: totalJourneyM > 0
        ? clampRatio((routeA.totalM + journey.walkMeters + routeB.progressM) / totalJourneyM)
        : 0,
      remainingMinutes: minutesFor(routeB.remainingM, BUS_SPEED_M_PER_MIN),
      distanceToMilestoneM: routeB.remainingM,
      currentRouteName: journey.routeBName,
      nextRouteName: null,
    };
  }

  if (
    wasWalkingTransfer &&
    distanceToTransferM > ROUTE_CORRIDOR_M &&
    routeB.distanceM > ROUTE_CORRIDOR_M
  ) {
    return {
      phase: "off-route",
      progressRatio: 0,
      remainingMinutes: null,
      distanceToMilestoneM: Math.min(distanceToTransferM, routeB.distanceM),
      currentRouteName: null,
      nextRouteName: journey.routeBName,
    };
  }

  if (wasWalkingTransfer) {
    const walkedM = Math.max(0, journey.walkMeters - distanceToRouteBStartM);
    return {
      phase: "walking-transfer",
      progressRatio: totalJourneyM > 0
        ? clampRatio((routeA.totalM + walkedM) / totalJourneyM)
        : 0,
      remainingMinutes: minutesFor(distanceToRouteBStartM, WALK_SPEED_M_PER_MIN),
      distanceToMilestoneM: distanceToRouteBStartM,
      currentRouteName: null,
      nextRouteName: journey.routeBName,
    };
  }

  if (wasRidingSecond) {
    return {
      phase: "off-route",
      progressRatio: 0,
      remainingMinutes: null,
      distanceToMilestoneM: routeB.distanceM,
      currentRouteName: journey.routeBName,
      nextRouteName: null,
    };
  }

  if (routeA.distanceM <= ROUTE_CORRIDOR_M) {
    return {
      phase: "riding-first",
      progressRatio: totalJourneyM > 0 ? clampRatio(routeA.progressM / totalJourneyM) : 0,
      remainingMinutes: minutesFor(routeA.remainingM, BUS_SPEED_M_PER_MIN),
      distanceToMilestoneM: routeA.remainingM,
      currentRouteName: journey.routeAName,
      nextRouteName: journey.routeBName,
    };
  }

  if (!previousPhase && routeB.distanceM <= ROUTE_CORRIDOR_M) {
    return {
      phase: "riding-second",
      progressRatio: totalJourneyM > 0
        ? clampRatio((routeA.totalM + journey.walkMeters + routeB.progressM) / totalJourneyM)
        : 0,
      remainingMinutes: minutesFor(routeB.remainingM, BUS_SPEED_M_PER_MIN),
      distanceToMilestoneM: routeB.remainingM,
      currentRouteName: journey.routeBName,
      nextRouteName: null,
    };
  }

  const boardingDistanceM = journey.segmentA[0]
    ? haversineMeters(location, journey.segmentA[0])
    : routeA.distanceM;
  return {
    phase: previousPhase && previousPhase !== "boarding" ? "off-route" : "boarding",
    progressRatio: 0,
    remainingMinutes: minutesFor(boardingDistanceM, WALK_SPEED_M_PER_MIN),
    distanceToMilestoneM: boardingDistanceM,
    currentRouteName: journey.routeAName,
    nextRouteName: journey.routeBName,
  };
}

export function createTripTrackingState(progress: TripProgress | null = null): TripTrackingState {
  return {
    progress,
    lastOnRoutePhase: progress?.phase === "off-route" ? undefined : progress?.phase,
    offRouteReadings: 0,
    arrivalReadings: progress?.phase === "arrived" ? ARRIVAL_CONFIRMATION_READINGS : 0,
  };
}

export function updateTripTrackingState(
  journey: TripJourney,
  location: Coordinates,
  state: TripTrackingState,
): TripTrackingState {
  const previous = state.progress;
  if (previous?.phase === "arrived") return state;

  if (state.boardingConfirmation) {
    const progress = waitingProgress(journey, location, state.boardingConfirmation === "second", previous?.progressRatio ?? 0);
    return { ...state, progress, lastOnRoutePhase: progress.phase as "boarding" | "walking-transfer", offRouteReadings: 0, arrivalReadings: 0 };
  }

  const previousPhase = previous?.phase === "off-route" ? state.lastOnRoutePhase : previous?.phase;
  let candidate = calculateTripProgress(journey, location, previousPhase);
  // A GPS gap can skip the transfer point entirely. Still ask before boarding
  // the second vehicle, just as when the walking stage was observed.
  if (state.requireBoardingConfirmation && journey.kind === "transfer" &&
    candidate.phase === "riding-second" && previousPhase !== "riding-second") {
    candidate = waitingProgress(journey, location, true, previous?.progressRatio ?? 0);
  }

  if (candidate.phase === "arrived") {
    const arrivalReadings = state.arrivalReadings + 1;
    if (arrivalReadings < ARRIVAL_CONFIRMATION_READINGS) {
      return {
        ...state,
        progress: previous,
        offRouteReadings: 0,
        arrivalReadings,
      };
    }

    return {
      ...state,
      progress: candidate,
      lastOnRoutePhase: "arrived",
      offRouteReadings: 0,
      arrivalReadings: ARRIVAL_CONFIRMATION_READINGS,
    };
  }

  if (candidate.phase === "off-route" && previous?.phase !== "off-route") {
    const offRouteReadings = state.offRouteReadings + 1;
    if (offRouteReadings < OFF_ROUTE_CONFIRMATION_READINGS) {
      return { ...state, progress: previous, offRouteReadings, arrivalReadings: 0 };
    }
  }

  const progress = previous
    ? {
        ...candidate,
        progressRatio: Math.max(previous.progressRatio, candidate.progressRatio),
      }
    : candidate;

  return {
    ...state,
    progress,
    boardingConfirmation: state.requireBoardingConfirmation && candidate.phase === "walking-transfer" ? "second" : undefined,
    lastOnRoutePhase: candidate.phase === "off-route" ? state.lastOnRoutePhase : candidate.phase,
    offRouteReadings: candidate.phase === "off-route"
      ? OFF_ROUTE_CONFIRMATION_READINGS
      : 0,
    arrivalReadings: 0,
  };
}

export function getTripMilestone(progress: TripProgress): TripMilestone | null {
  if (progress.phase === "arrived") return "arrived";
  if (
    progress.phase === "riding-first" &&
    progress.distanceToMilestoneM !== null &&
    progress.distanceToMilestoneM <= 400
  ) {
    return "transfer-near";
  }
  if (
    (progress.phase === "riding-direct" || progress.phase === "riding-second") &&
    progress.distanceToMilestoneM !== null &&
    progress.distanceToMilestoneM <= 400
  ) {
    return "destination-near";
  }
  return null;
}
