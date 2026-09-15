"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { fetchRouteDataResponse, ROUTE_DATA_SOURCE_HEADER } from "@/lib/route-data-client";
import type {
  RouteCalculationResult,
  RouteCalculationWorkerRequest,
  RouteCalculationWorkerResponse,
  RouteOption,
} from "@/lib/route-calculation";
import {
  buildRouteCalculationPerformance,
  type RouteCalculationEngine,
} from "@/lib/route-performance";
import type { PolylineRoute } from "@/lib/routeMatcher";
import type { Coordinates, ProductionRoute } from "@/lib/types";
import type { TransferOption } from "@/lib/transfers";
import type { JourneyPreference } from "@/lib/journey-ranking";
import { DEFAULT_JOURNEY_SETTINGS, type JourneySettings } from "@/lib/journey-settings";

type RouteCalculation = RouteCalculationResult & { key: string };

const EMPTY_ROUTE_OPTIONS: RouteOption[] = [];
const EMPTY_ROUTE_IDS: number[] = [];
const EMPTY_TRANSFERS: TransferOption[] = [];

function formatCoordinate(point: Coordinates) {
  return `${point[0].toFixed(6)},${point[1].toFixed(6)}`;
}

export function useRouteData({
  destination,
  isOnline,
  origin,
  preference = "nearby",
  settings = DEFAULT_JOURNEY_SETTINGS,
  freezeRecommendation = false,
}: {
  destination: Coordinates | null;
  isOnline: boolean;
  origin: Coordinates | null;
  preference?: JourneyPreference;
  settings?: JourneySettings;
  freezeRecommendation?: boolean;
}) {
  const [polylineRoutes, setPolylineRoutes] = useState<ProductionRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [isUsingCachedRoutes, setIsUsingCachedRoutes] = useState(false);
  const [fetchAttempt, setFetchAttempt] = useState(0);
  const wasOnlineRef = useRef(isOnline);
  const routeWorkerRef = useRef<Worker | null>(null);
  const routeCalculationRequestRef = useRef(0);
  const [routeWorkerFailed, setRouteWorkerFailed] = useState(false);
  const [routeCalculation, setRouteCalculation] = useState<RouteCalculation | null>(null);
  const preferredRouteRef = useRef<{ key: string; id: number } | null>(null);

  useEffect(() => {
    const connectionWasRestored = isOnline && !wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (connectionWasRestored && isUsingCachedRoutes) {
      setFetchAttempt((attempt) => attempt + 1);
    }
  }, [isOnline, isUsingCachedRoutes]);

  useEffect(() => {
    if (polylineRoutes.length > 0 && fetchAttempt === 0) return;
    let cancelled = false;
    const controller = new AbortController();

    fetchRouteDataResponse({ signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!cancelled) {
          setIsUsingCachedRoutes(response.headers.get(ROUTE_DATA_SOURCE_HEADER) === "cache");
        }
        return response.json();
      })
      .then((data: ProductionRoute[]) => {
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          setPolylineRoutes(data);
          setFetchError(false);
        } else {
          console.error("[rutas-polyline] returned empty or invalid data");
          setFetchError(true);
        }
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error(
          "[rutas-polyline] Failed to load:",
          error instanceof Error ? error.message : error,
        );
        if (polylineRoutes.length === 0) setFetchError(true);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [fetchAttempt, polylineRoutes.length]);

  const retry = useCallback(() => {
    setFetchError(false);
    setIsLoading(true);
    setFetchAttempt((attempt) => attempt + 1);
  }, []);

  const routesForMatching = useMemo<PolylineRoute[]>(
    () => polylineRoutes.map((route) => ({
      id: route.id,
      name: route.name,
      color: route.color,
      corridor_width_m: route.corridor_width_m,
      path: route.path,
      direccion: route.original_name.includes("Vuelta") ? "vuelta" : "ida",
      landmarks: route.landmarks,
    })),
    [polylineRoutes],
  );

  useEffect(() => {
    if (routesForMatching.length === 0 || routeWorkerFailed) return;

    let worker: Worker;
    try {
      worker = new Worker(new URL("../app/mapa/route-calculation.worker.ts", import.meta.url), {
        name: "urugo-route-calculation",
        type: "module",
      });
    } catch {
      const fallbackTimer = window.setTimeout(() => setRouteWorkerFailed(true), 0);
      return () => window.clearTimeout(fallbackTimer);
    }

    const handleWorkerError = (event: ErrorEvent) => {
      event.preventDefault();
      if (routeWorkerRef.current === worker) {
        routeWorkerRef.current = null;
        worker.terminate();
        setRouteWorkerFailed(true);
      }
    };

    routeWorkerRef.current = worker;
    worker.addEventListener("error", handleWorkerError);
    const initializeMessage: RouteCalculationWorkerRequest = {
      type: "initialize",
      routes: routesForMatching,
    };
    try {
      worker.postMessage(initializeMessage);
    } catch {
      worker.removeEventListener("error", handleWorkerError);
      worker.terminate();
      routeWorkerRef.current = null;
      const fallbackTimer = window.setTimeout(() => setRouteWorkerFailed(true), 0);
      return () => window.clearTimeout(fallbackTimer);
    }

    return () => {
      worker.removeEventListener("error", handleWorkerError);
      worker.terminate();
      if (routeWorkerRef.current === worker) routeWorkerRef.current = null;
    };
  }, [routeWorkerFailed, routesForMatching]);

  const calculationKey = origin && destination
    ? `${formatCoordinate(origin)}>${formatCoordinate(destination)}@${polylineRoutes.length}:${preference}:${settings.extraMinutes}:${settings.maxWalkM}`
    : null;
  const currentCalculation = routeCalculation?.key === calculationKey ? routeCalculation : null;
  const suggestions = currentCalculation?.suggestions ?? EMPTY_ROUTE_OPTIONS;
  const alternativeRouteIds = currentCalculation?.alternativeRouteIds ?? EMPTY_ROUTE_IDS;
  const transfers = currentCalculation?.transfers ?? EMPTY_TRANSFERS;
  const isCalculating = calculationKey !== null && currentCalculation === null;

  useEffect(() => {
    if (!origin || !destination || !calculationKey || routesForMatching.length === 0) return;

    const requestId = ++routeCalculationRequestRef.current;
    const worker = routeWorkerRef.current;
    let calculationStartedAt: number | null = null;
    let cancelled = false;

    const applyResult = (result: RouteCalculationResult, engine: RouteCalculationEngine) => {
      if (cancelled || routeCalculationRequestRef.current !== requestId) return;
      setRouteCalculation({ key: calculationKey, ...result, refinement: "pending" });
      const durationMs = calculationStartedAt === null
        ? Number.NaN
        : performance.now() - calculationStartedAt;
      try {
        track(
          "route_calculation_performance",
          buildRouteCalculationPerformance(result, durationMs, engine),
        );
      } catch {
        // Analytics must never affect route results.
      }
    };

    const handleMessage = (event: MessageEvent<RouteCalculationWorkerResponse>) => {
      const message = event.data;
      if (message.requestId !== requestId || message.key !== calculationKey) return;
      if (message.type === "error") {
        setRouteWorkerFailed(true);
        return;
      }
      applyResult(message.result, "worker");
    };

    if (worker) worker.addEventListener("message", handleMessage);

    const timer = window.setTimeout(() => {
      calculationStartedAt = performance.now();
      if (worker) {
        const message: RouteCalculationWorkerRequest = {
          type: "calculate",
          requestId,
          key: calculationKey,
          origin,
          destination,
          preference,
          settings,
        };
        try {
          worker.postMessage(message);
        } catch {
          setRouteWorkerFailed(true);
        }
        return;
      }

      void import("@/lib/route-calculation")
        .then(({ calculateRouteOptions }) => {
          applyResult(calculateRouteOptions(routesForMatching, origin, destination, preference, settings), "fallback");
        })
        .catch(() => {
          applyResult({ suggestions: [], alternativeRouteIds: [], transfers: [] }, "fallback");
        });
    }, 80);

    return () => {
      window.clearTimeout(timer);
      cancelled = true;
      if (worker) worker.removeEventListener("message", handleMessage);
    };
  }, [calculationKey, destination, origin, preference, settings, routeWorkerFailed, routesForMatching]);

  useEffect(() => {
    if (!origin || !destination || !routeCalculation || routeCalculation.key !== calculationKey
      || routeCalculation.refinement !== "pending" || freezeRecommendation) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void import("@/lib/refine-journeys").then(({ refineJourneys }) =>
        refineJourneys(routeCalculation, origin, destination, preference, controller.signal, settings)
      ).then((result) => {
        if (controller.signal.aborted) return;
        setRouteCalculation((current) => {
          if (!current || current.key !== calculationKey) return current;
          const preferred = preferredRouteRef.current;
          if (preferred?.key === calculationKey) {
            result.suggestions.sort((a, b) => Number(b.routeId === preferred.id) - Number(a.routeId === preferred.id));
            result.recommendedTransfer = undefined;
          }
          return { ...result, key: current.key, alternativeRouteIds: result.suggestions.slice(1).map((route) => route.routeId) };
        });
      }).catch(() => {
        if (!controller.signal.aborted) setRouteCalculation((current) => current?.key === calculationKey ? { ...current, refinement: "complete" } : current);
      });
    }, 400);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [calculationKey, destination, freezeRecommendation, origin, preference, settings, routeCalculation]);

  const promoteSuggestion = useCallback((routeId: number) => {
    if (calculationKey) preferredRouteRef.current = { key: calculationKey, id: routeId };
    setRouteCalculation((current) => {
      if (!current || current.key !== calculationKey) return current;
      const index = current.suggestions.findIndex((suggestion) => suggestion.routeId === routeId);
      if (index <= 0) return current;
      const suggestions = [...current.suggestions];
      const [picked] = suggestions.splice(index, 1);
      suggestions.unshift(picked);
      return { ...current, suggestions };
    });
  }, [calculationKey]);

  return {
    alternativeRouteIds,
    calculationKey,
    currentCalculation,
    fetchError,
    isCalculating,
    isLoading,
    isUsingCachedRoutes,
    polylineRoutes,
    promoteSuggestion,
    retry,
    suggestions,
    transfers,
  };
}
