"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ACTIVE_TRIP_EVENT, ACTIVE_TRIP_KEY, isTripSessionInProgress, readSavedTrip } from "@/lib/trip-storage";

const SERVICE_WORKER_URL = "/sw.js";
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const UPDATE_CHECK_THROTTLE_MS = 60 * 1000;

export default function PWARegistrar() {
  const [pendingWorker, setPendingWorker] = useState<ServiceWorker | null>(null);
  const pendingWorkerRef = useRef<ServiceWorker | null>(null);
  const isReloadingRef = useRef(false);
  const reloadWhenVisibleRef = useRef(false);
  const reloadAfterControllerChangeRef = useRef(false);
  const [tripActive, setTripActive] = useState(false);
  const [updateScheduled, setUpdateScheduled] = useState(false);
  const scheduledRef = useRef(false);

  const activateWorker = useCallback(async (worker: ServiceWorker) => {
    const trip = isTripSessionInProgress() || await readSavedTrip();
    setTripActive(!!trip);
    if (trip) {
      pendingWorkerRef.current = worker;
      setPendingWorker(worker);
      scheduledRef.current = true;
      setUpdateScheduled(true);
      return;
    }
    pendingWorkerRef.current = null;
    setPendingWorker(null);
    reloadAfterControllerChangeRef.current = true;
    worker.postMessage({ type: "SKIP_WAITING" });
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;
    let lastUpdateCheckAt = 0;
    let disposed = false;

    const reloadWithNewWorker = async () => {
      if (isReloadingRef.current) return;
      if (isTripSessionInProgress() || await readSavedTrip()) {
        reloadWhenVisibleRef.current = true;
        return;
      }
      if (document.visibilityState !== "visible") {
        reloadWhenVisibleRef.current = true;
        return;
      }
      isReloadingRef.current = true;
      window.location.reload();
    };

    const checkForUpdate = async (force = false) => {
      if (!registration || navigator.onLine === false) return;
      const now = Date.now();
      if (!force && now - lastUpdateCheckAt < UPDATE_CHECK_THROTTLE_MS) return;
      lastUpdateCheckAt = now;
      await registration.update().catch(() => undefined);
    };

    const queueUpdate = async (worker: ServiceWorker) => {
      if (
        worker.state !== "installed" ||
        !navigator.serviceWorker.controller ||
        disposed
      ) {
        return;
      }

      pendingWorkerRef.current = worker;
      setTripActive(isTripSessionInProgress() || !!await readSavedTrip());
      if (disposed) return;
      if (document.visibilityState === "hidden") {
        activateWorker(worker);
      } else {
        setPendingWorker(worker);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (pendingWorkerRef.current) activateWorker(pendingWorkerRef.current);
        return;
      }
      if (reloadWhenVisibleRef.current) {
        reloadWhenVisibleRef.current = false;
        reloadWithNewWorker();
        return;
      }
      void checkForUpdate();
    };

    const handleFocus = () => void checkForUpdate();
    const handleOnline = () => void checkForUpdate(true);
    const handleControllerChange = () => {
      if (!reloadAfterControllerChangeRef.current) return;
      reloadAfterControllerChangeRef.current = false;
      reloadWithNewWorker();
    };
    const handleTripChange = async () => {
      if (!pendingWorkerRef.current && !reloadWhenVisibleRef.current) return;
      const trip = isTripSessionInProgress() || await readSavedTrip();
      setTripActive(!!trip);
      if (trip) return;
      if (pendingWorkerRef.current && scheduledRef.current) {
        void activateWorker(pendingWorkerRef.current);
      } else if (reloadWhenVisibleRef.current) {
        reloadWhenVisibleRef.current = false;
        void reloadWithNewWorker();
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ACTIVE_TRIP_KEY || event.key === null) void handleTripChange();
    };

    window.addEventListener(ACTIVE_TRIP_EVENT, handleTripChange);
    window.addEventListener("storage", handleStorage);
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    const registerServiceWorker = async () => {
      try {
        registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
          scope: "/",
          updateViaCache: "none",
        });
        if (disposed) return;

        if (registration.waiting) {
          // Es una actualización descargada en una sesión anterior. Activarla
          // al abrir evita que la PWA siga usando el build antiguo.
          pendingWorkerRef.current = registration.waiting;
          void activateWorker(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration?.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => queueUpdate(worker));
        });

        await checkForUpdate(true);
      } catch (error) {
        console.error("Service worker registration failed", error);
      }
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker);
    }

    const updateTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") void checkForUpdate();
    }, UPDATE_CHECK_INTERVAL_MS);

    return () => {
      disposed = true;
      window.clearInterval(updateTimer);
      window.removeEventListener("load", registerServiceWorker);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener(ACTIVE_TRIP_EVENT, handleTripChange);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, [activateWorker]);

  const handleUpdate = () => {
    if (!pendingWorker) return;
    activateWorker(pendingWorker);
  };

  if (!pendingWorker) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-4 right-4 z-[80] grid grid-cols-[minmax(0,1fr)_auto] animate-fade-up gap-3 rounded-2xl border border-avocado-400/30 bg-ink-900/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl md:left-auto md:right-6 md:w-80 ${tripActive ? "top-3 md:top-6" : "bottom-24 md:bottom-6"}`}
    >
      <div className="min-w-0">
        <p className="font-serif-display text-sm font-black text-cream-50">Nueva versión disponible</p>
        <p className="mt-0.5 text-sm text-cream-100/80">{updateScheduled
          ? "La actualización se aplicará al terminar tu viaje."
          : tripActive ? "Puedes programar la actualización para cuando termine tu viaje." : "Actualiza para obtener los últimos cambios"}</p>
      </div>
      <button
        onClick={handleUpdate}
        disabled={updateScheduled}
        className="col-span-2 row-start-2 min-h-11 rounded-xl bg-verde px-4 py-2 text-sm font-black text-ink-900 hover:opacity-90 disabled:opacity-75"
      >
        {updateScheduled ? "Programada" : tripActive ? "Actualizar al terminar" : "Actualizar"}
      </button>
      <button
        onClick={() => setPendingWorker(null)}
        aria-label="Cerrar"
        className="col-start-2 row-start-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-cream-100/75 transition hover:bg-white/5 hover:text-cream-100"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
