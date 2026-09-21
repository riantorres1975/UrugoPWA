"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isAccurateEnoughForAutomaticOrigin,
  isWithinUruapanServiceArea,
} from "@/lib/geo";
import type { Coordinates } from "@/lib/types";

export type GeoStatus = "idle" | "locating" | "ok" | "outside" | "inaccurate" | "error";
export type UserLocationFix = {
  location: Coordinates;
  accuracyM: number;
};

export function useUruapanGeolocation(disabled = false) {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [liveLocation, setLiveLocation] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<GeoStatus>(disabled ? "idle" : "locating");
  const [accuracyWarning, setAccuracyWarning] = useState(false);
  const [locationAccuracyM, setLocationAccuracyM] = useState<number | null>(null);
  const liveLocationRef = useRef<Coordinates | null>(null);
  const liveLocationListenersRef = useRef(new Set<(location: Coordinates) => void>());

  const publishLiveLocation = useCallback((location: Coordinates) => {
    liveLocationRef.current = location;
    setLiveLocation(location);
    for (const listener of liveLocationListenersRef.current) listener(location);
  }, []);

  const subscribeToLiveLocation = useCallback((listener: (location: Coordinates) => void) => {
    liveLocationListenersRef.current.add(listener);
    if (liveLocationRef.current) listener(liveLocationRef.current);
    return () => {
      liveLocationListenersRef.current.delete(listener);
    };
  }, []);

  const markOutside = useCallback(() => {
    setUserLocation(null);
    setLiveLocation(null);
    liveLocationRef.current = null;
    setAccuracyWarning(false);
    setLocationAccuracyM(null);
    setStatus("outside");
  }, []);

  const clearAccuracyWarning = useCallback(() => setAccuracyWarning(false), []);

  const applyPosition = useCallback((position: GeolocationPosition, updateOrigin: boolean) => {
    const coords: Coordinates = [position.coords.longitude, position.coords.latitude];
    const accuracyM = position.coords.accuracy;

    if (!isAccurateEnoughForAutomaticOrigin(accuracyM)) {
      setAccuracyWarning(true);
      setLocationAccuracyM(accuracyM);
      setStatus("inaccurate");
      return null;
    }

    if (!isWithinUruapanServiceArea(coords)) {
      if (!updateOrigin && liveLocationRef.current) {
        setAccuracyWarning(false);
        setStatus("outside");
        return null;
      }
      markOutside();
      return null;
    }

    publishLiveLocation(coords);
    setAccuracyWarning(false);
    setLocationAccuracyM(accuracyM);
    setStatus("ok");
    if (updateOrigin) setUserLocation(coords);
    return { location: coords, accuracyM } satisfies UserLocationFix;
  }, [markOutside, publishLiveLocation]);

  const requestLocation = useCallback((fresh = false) => {
    if (!navigator.geolocation) {
      setStatus("error");
      return Promise.resolve<UserLocationFix | null>(null);
    }

    setStatus("locating");
    return new Promise<UserLocationFix | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(applyPosition(position, true)),
        () => {
          setStatus("error");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: fresh ? 0 : 15_000 },
      );
    });
  }, [applyPosition]);

  useEffect(() => {
    if (disabled) return;
    if (!navigator.geolocation) {
      const timer = window.setTimeout(() => setStatus("error"), 0);
      return () => window.clearTimeout(timer);
    }

    let firstFix: Coordinates | null = null;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const fix = applyPosition(position, firstFix === null);
        if (fix && !firstFix) firstFix = fix.location;
      },
      () => setStatus("error"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 15_000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [applyPosition, disabled]);

  return {
    userLocation,
    liveLocation,
    status,
    accuracyWarning,
    locationAccuracyM,
    markOutside,
    clearAccuracyWarning,
    requestLocation,
    subscribeToLiveLocation,
  };
}
