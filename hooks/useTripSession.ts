"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { enqueueTripActivity, flushTripActivity } from "@/lib/trip-activity-client";
import type { TripActivityEvent } from "@/lib/trip-activity";
import {
  createTripTrackingState,
  confirmTripStage,
  getTripJourneyKey,
  getTripMilestone,
  updateTripTrackingState,
  type TripJourney,
  type TripMilestone,
  type TripTrackingState,
  type TripConfirmation,
} from "@/lib/trip-mode";
import { clearSavedTrip, readSavedTrip, saveTrip, readTripAlerts, DEFAULT_TRIP_ALERTS, TRIP_ALERTS_KEY, type SavedTrip, type TripAlertSettings, type TripActivityIdentity } from "@/lib/trip-storage";
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
  const [recoverableTrip, setRecoverableTrip] = useState<SavedTrip | null>(null);
  const [alertSettings, setAlertSettings] = useState(DEFAULT_TRIP_ALERTS);
  const [alertSupport, setAlertSupport] = useState({ voice: false, vibration: false });
  const latestSaveRef = useRef<{ journey: TripJourney; tracking: TripTrackingState; activity?: TripActivityIdentity } | null>(null);
  const activityRef = useRef<{ key: string; event: TripActivityEvent } | null>(null);
  const lastLocationRef = useRef<Coordinates | null>(null);
  const silence = useCallback(() => {
    try { window.speechSynthesis?.cancel(); navigator.vibrate?.(0); } catch { /* Unsupported device. */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void readSavedTrip().then((saved) => {
        if (!cancelled && !latestSaveRef.current) setRecoverableTrip(saved);
      });
      setAlertSettings(readTripAlerts());
      setAlertSupport({ voice: "speechSynthesis" in window, vibration: "vibrate" in navigator });
    }, 0);
    const flush = () => {
      const latest = latestSaveRef.current;
      if (latest) saveTrip(latest.journey, latest.tracking, latest.activity);
    };
    const interval = window.setInterval(flush, 5000);
    const retryActivity = () => { if (document.visibilityState !== "hidden") void flushTripActivity(); };
    retryActivity();
    const activityInterval = window.setInterval(retryActivity, 60_000);
    window.addEventListener("online", retryActivity);
    document.addEventListener("visibilitychange", retryActivity);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      cancelled = true;
      window.clearInterval(activityInterval);
      window.removeEventListener("online", retryActivity);
      document.removeEventListener("visibilitychange", retryActivity);
      flush(); silence(); window.clearTimeout(timer); window.clearInterval(interval);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [silence]);

  useEffect(() => {
    const previousPhase = latestSaveRef.current?.tracking.progress?.phase;
    const activity = activityRef.current?.event;
    latestSaveRef.current = session ? { journey: session.journey, tracking, activity } : null;
    if (session && previousPhase !== tracking.progress?.phase) saveTrip(session.journey, tracking, activity);
  }, [session, tracking]);

  const updateAlertSettings = useCallback((next: TripAlertSettings) => {
    setAlertSettings(next);
    try { localStorage.setItem(TRIP_ALERTS_KEY, JSON.stringify(next)); } catch { /* Optional storage. */ }
    silence();
    if (next.voice && !alertSettings.voice) {
      try {
        const message = new SpeechSynthesisUtterance("Avisos de viaje activados");
        message.lang = "es-MX"; window.speechSynthesis.speak(message);
      } catch { /* The visual alerts remain available. */ }
    }
  }, [silence, alertSettings.voice]);

  const discardRecovery = useCallback(() => { setRecoverableTrip(null); clearSavedTrip(); }, []);

  const reset = useCallback(() => {
    activityRef.current = null;
    latestSaveRef.current = null;
    lastLocationRef.current = null;
    clearSavedTrip(); setRecoverableTrip(null); silence();
    setSession(null);
    setTracking(createTripTrackingState());
    setIsStopDialogOpen(false);
    setDropOffAlert(null);
    setLandmarkAlert(null);
    milestonesRef.current.clear();
    dismissedLandmarksRef.current.clear();
  }, [silence]);

  const start = useCallback((journey: TripJourney) => {
    const key = getTripJourneyKey(journey);
    if (activityRef.current?.key === key) return;
    const event: TripActivityEvent = {
      id: crypto.randomUUID(), startedAt: new Date().toISOString(), arrived: false,
      routes: journey.kind === "direct" ? [journey.routeName] : [journey.routeAName, journey.routeBName],
    };
    activityRef.current = { key, event };
    enqueueTripActivity(event);
    milestonesRef.current.clear();
    dismissedLandmarksRef.current.clear();
    setSession({ key, cameraKey: `${key}:${Date.now()}`, journey });
    const initial = { ...createTripTrackingState(), requireBoardingConfirmation: true, boardingConfirmation: "first" as const };
    setTracking(initial);
    saveTrip(journey, initial, event); setRecoverableTrip(null); silence();
    setIsStopDialogOpen(false);
    setDropOffAlert(null);
    setLandmarkAlert(null);
  }, [silence]);

  const resume = useCallback((location: Coordinates) => {
    if (!recoverableTrip) return;
    const { journey, tracking: previous } = recoverableTrip;
    const key = getTripJourneyKey(journey);
    const event = recoverableTrip.activity ? {
      ...recoverableTrip.activity, arrived: false,
      routes: journey.kind === "direct" ? [journey.routeName] : [journey.routeAName, journey.routeBName],
    } : undefined;
    activityRef.current = event ? { key, event } : null;
    if (event) enqueueTripActivity(event);
    milestonesRef.current.clear(); dismissedLandmarksRef.current.clear(); silence();
    lastLocationRef.current = location;
    setSession({ key, cameraKey: `${key}:${Date.now()}`, journey });
    const next = updateTripTrackingState(journey, location, previous);
    setTracking(next); saveTrip(journey, next, event); setRecoverableTrip(null);
    setDropOffAlert(null); setLandmarkAlert(null); setIsStopDialogOpen(false);
  }, [recoverableTrip, silence]);

  const confirmStage = useCallback((action: TripConfirmation) => {
    if (!session || !lastLocationRef.current) return;
    const location = lastLocationRef.current;
    setTracking((current) => confirmTripStage(session.journey, location, current, action));
    setDropOffAlert(null); setLandmarkAlert(null); silence();
  }, [session, silence]);

  const confirmArrival = useCallback(() => {
    const activity = activityRef.current;
    if (activity) enqueueTripActivity({ ...activity.event, arrived: true });
    reset();
  }, [reset]);

  const completeStop = useCallback(() => { reset(); }, [reset]);

  const requestStop = useCallback(() => {
    setIsStopDialogOpen(true);
  }, []);

  const cancelStop = useCallback(() => setIsStopDialogOpen(false), []);
  const dismissDropOffAlert = useCallback(() => {
    silence();
    if (landmarkAlert) dismissedLandmarksRef.current.add(landmarkAlert.name);
    setDropOffAlert(null);
    setLandmarkAlert(null);
  }, [landmarkAlert, silence]);

  const announceLandmark = useCallback((cue: LandmarkCue | null) => {
    if (!cue || !Number.isFinite(cue.distanceM) || cue.distanceM <= LANDMARK_REACHED_RADIUS_M || cue.distanceM > 250) {
      setLandmarkAlert(null);
      return;
    }
    // Temporary GPS loss must not count as dismissing the reference.
    setLandmarkAlert(dismissedLandmarksRef.current.has(cue.name) ? null : cue);
  }, []);

  const updateLocation = useCallback((location: Coordinates) => {
    lastLocationRef.current = location;
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
      if (alertSettings.vibration) navigator.vibrate?.(milestone === "arrived" ? [250, 120, 250] : [200, 100, 200]);
      if (alertSettings.voice && "speechSynthesis" in window) {
        const message = new SpeechSynthesisUtterance(milestone === "arrived" ? "Llegaste a tu destino."
          : milestone === "transfer-near" && session.journey.kind === "transfer"
            ? `Prepárate para bajar y cambiar a ${session.journey.routeBName}.`
            : "Prepárate para bajar. Tu parada está cerca.");
        message.lang = "es-MX";
        window.speechSynthesis.cancel(); window.speechSynthesis.speak(message);
      }
    } catch {
      // Vibration is not available on every device.
    }
    setDropOffAlert(milestone);
  }, [alertSettings, session, tracking.progress]);

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
    recoverableTrip, discardRecovery, resume, confirmStage, confirmArrival, alertSettings, alertSupport, updateAlertSettings, silence,
    awaitingBoarding: tracking.boardingConfirmation,
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
