"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import {
  createTripTrackingState,
  getTripJourneyKey,
  getTripMilestone,
  updateTripTrackingState,
  type TripJourney,
  type TripMilestone,
  type TripTrackingState,
} from "@/lib/trip-mode";
import type { Coordinates } from "@/lib/types";
import { LANDMARK_REACHED_RADIUS_M, type LandmarkCue } from "@/lib/landmark-guidance";

export type TripSession = {
  key: string;
  cameraKey: string;
  journey: TripJourney;
};

export function useTripSession() {
  const [session, setSession] = useState<TripSession | null>(null);
  const [tracking, setTracking] = useState<TripTrackingState>(() => createTripTrackingState());
  const [isStopDialogOpen, setIsStopDialogOpen] = useState(false);
  const [dropOffAlert, setDropOffAlert] = useState<TripMilestone | null>(null);
  const [landmarkAlert, setLandmarkAlert] = useState<LandmarkCue | null>(null);
  const milestonesRef = useRef(new Set<string>());
  const dismissedLandmarksRef = useRef(new Set<string>());

  const reset = useCallback(() => {
    setSession(null);
    setTracking(createTripTrackingState());
    setIsStopDialogOpen(false);
    setDropOffAlert(null);
    setLandmarkAlert(null);
    milestonesRef.current.clear();
    dismissedLandmarksRef.current.clear();
  }, []);

  const start = useCallback((journey: TripJourney) => {
    const key = getTripJourneyKey(journey);
    milestonesRef.current.clear();
    dismissedLandmarksRef.current.clear();
    setSession({ key, cameraKey: `${key}:${Date.now()}`, journey });
    setTracking(createTripTrackingState());
    setIsStopDialogOpen(false);
    setDropOffAlert(null);
    setLandmarkAlert(null);
    try {
      track("viaje_iniciado", { tipo: journey.kind });
    } catch {
      // Analytics is optional during a trip.
    }
  }, []);

  const completeStop = useCallback(() => {
    const journeyKind = session?.journey.kind;
    reset();
    try {
      track("viaje_finalizado", { tipo: journeyKind ?? "desconocido" });
    } catch {
      // Analytics is optional during a trip.
    }
  }, [reset, session]);

  const requestStop = useCallback(() => {
    if (tracking.progress?.phase === "arrived") {
      completeStop();
      return;
    }
    setIsStopDialogOpen(true);
  }, [completeStop, tracking.progress?.phase]);

  const cancelStop = useCallback(() => setIsStopDialogOpen(false), []);
  const dismissDropOffAlert = useCallback(() => {
    if (landmarkAlert) dismissedLandmarksRef.current.add(landmarkAlert.name);
    setDropOffAlert(null);
    setLandmarkAlert(null);
  }, [landmarkAlert]);

  const announceLandmark = useCallback((cue: LandmarkCue | null) => {
    if (!cue || !Number.isFinite(cue.distanceM) || cue.distanceM <= LANDMARK_REACHED_RADIUS_M || cue.distanceM > 250) {
      setLandmarkAlert(null);
      return;
    }
    // Temporary GPS loss must not count as dismissing the reference.
    setLandmarkAlert(dismissedLandmarksRef.current.has(cue.name) ? null : cue);
  }, []);

  const updateLocation = useCallback((location: Coordinates) => {
    setTracking((current) => {
      if (!session) return current;
      return updateTripTrackingState(session.journey, location, current);
    });
  }, [session]);

  useEffect(() => {
    const progress = tracking.progress;
    if (!progress || !session) return;
    const milestone = getTripMilestone(progress);
    if (!milestone || milestonesRef.current.has(milestone)) return;

    milestonesRef.current.add(milestone);
    try {
      navigator.vibrate?.(milestone === "arrived" ? [250, 120, 250] : [200, 100, 200]);
    } catch {
      // Vibration is not available on every device.
    }
    setDropOffAlert(milestone);
  }, [session, tracking.progress]);

  // Derive the text from live progress so alerts cannot outlive their trip phase.
  let milestoneMessage: string | null = null;
  if (session && tracking.progress && dropOffAlert && getTripMilestone(tracking.progress) === dropOffAlert) {
    const distance = Math.round(tracking.progress.distanceToMilestoneM ?? 0);
    const transferStopLabel = session.journey.kind === "transfer"
      ? session.journey.transferArrivalStopLabel
      : null;
    const destinationStopLabel = session.journey.destinationStopLabel;
    milestoneMessage = dropOffAlert === "transfer-near"
      ? transferStopLabel
        ? `Prepárate para bajar en la estación ${transferStopLabel} y transbordar: faltan aproximadamente ${distance} m.`
        : `Prepárate para transbordar: faltan aproximadamente ${distance} m.`
      : dropOffAlert === "destination-near"
        ? destinationStopLabel
          ? `Prepárate para bajar en la estación ${destinationStopLabel}: faltan aproximadamente ${distance} m.`
          : `Prepárate para bajar: faltan aproximadamente ${distance} m para tu parada.`
        : "Llegaste a tu destino.";
  }

  return {
    cancelStop,
    announceLandmark,
    completeStop,
    dismissDropOffAlert,
    dropOffAlert: milestoneMessage ?? (landmarkAlert
      ? `Próxima referencia: ${landmarkAlert.name}, a aproximadamente ${Math.round(landmarkAlert.distanceM)} m.`
      : null),
    isStopDialogOpen,
    progress: tracking.progress,
    requestStop,
    reset,
    session,
    start,
    updateLocation,
  };
}
