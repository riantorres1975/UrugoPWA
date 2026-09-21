"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
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
import { clearSavedTrip, readSavedTrip, saveTrip, readTripAlerts, DEFAULT_TRIP_ALERTS, TRIP_ALERTS_KEY, type SavedTrip, type TripAlertSettings } from "@/lib/trip-storage";
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
  const latestSaveRef = useRef<{ journey: TripJourney; tracking: TripTrackingState } | null>(null);
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
      if (latest) saveTrip(latest.journey, latest.tracking);
    };
    const interval = window.setInterval(flush, 5000);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      cancelled = true;
      flush(); silence(); window.clearTimeout(timer); window.clearInterval(interval);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [silence]);

  useEffect(() => {
    const previousPhase = latestSaveRef.current?.tracking.progress?.phase;
    latestSaveRef.current = session ? { journey: session.journey, tracking } : null;
    if (session && previousPhase !== tracking.progress?.phase) saveTrip(session.journey, tracking);
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
    milestonesRef.current.clear();
    dismissedLandmarksRef.current.clear();
    setSession({ key, cameraKey: `${key}:${Date.now()}`, journey });
    const initial = { ...createTripTrackingState(), requireBoardingConfirmation: true, boardingConfirmation: "first" as const };
    setTracking(initial);
    saveTrip(journey, initial); setRecoverableTrip(null); silence();
    setIsStopDialogOpen(false);
    setDropOffAlert(null);
    setLandmarkAlert(null);
    try {
      track("viaje_iniciado", { tipo: journey.kind });
    } catch {
      // Analytics is optional during a trip.
    }
  }, [silence]);

  const resume = useCallback((location: Coordinates) => {
    if (!recoverableTrip) return;
    const { journey, tracking: previous } = recoverableTrip;
    const key = getTripJourneyKey(journey);
    milestonesRef.current.clear(); dismissedLandmarksRef.current.clear(); silence();
    lastLocationRef.current = location;
    setSession({ key, cameraKey: `${key}:${Date.now()}`, journey });
    const next = updateTripTrackingState(journey, location, previous);
    setTracking(next); saveTrip(journey, next); setRecoverableTrip(null);
    setDropOffAlert(null); setLandmarkAlert(null); setIsStopDialogOpen(false);
  }, [recoverableTrip, silence]);

  const confirmStage = useCallback((action: TripConfirmation) => {
    if (!session || !lastLocationRef.current) return;
    const location = lastLocationRef.current;
    setTracking((current) => confirmTripStage(session.journey, location, current, action));
    setDropOffAlert(null); setLandmarkAlert(null); silence();
  }, [session, silence]);

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
    recoverableTrip, discardRecovery, resume, confirmStage, alertSettings, alertSupport, updateAlertSettings, silence,
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
