"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";

// ── Sidebar resize constants ──────────────────────────────────────────────────
const SIDEBAR_DEFAULT_MD = 380; // px en breakpoint md (768–1023px)
const SIDEBAR_DEFAULT_LG = 420; // px en breakpoint lg (1024px+)
const SIDEBAR_MIN = 300;        // px mínimo al arrastrar
const SIDEBAR_MAX = 520;        // px máximo al arrastrar
import { track } from "@vercel/analytics";
import BottomSheet from "@/components/BottomSheet";
import ChatBotLauncher from "@/components/ChatBotLauncher";
import FareUpdateNotice from "@/components/FareUpdateNotice";
import ActiveRouteSummary from "@/components/ActiveRouteSummary";
import JourneyPreview from "@/components/JourneyPreview";
import JourneyFeedback from "@/components/JourneyFeedback";
import RouteFreshness from "@/components/RouteFreshness";
import NearbyToast from "@/components/NearbyToast";
import OnboardingGate from "@/components/OnboardingGate";
import { DesktopMapSidebar, MobileMapControls } from "@/components/MapResponsiveControls";
import RoutePlannerSearch from "@/components/RoutePlannerSearch";
import RoutePlannerPoints from "@/components/RoutePlannerPoints";
import {
  DirectRouteResult,
  EmptyRouteResult,
  SelectedTransferResult,
  TransferOptionsResult,
} from "@/components/RoutePlannerResults";
import TripOverlays from "@/components/TripOverlays";
import { geocodePlace, type PlaceResult } from "@/lib/geocode";
import { useFavoriteRoutes } from "@/hooks/useFavoriteRoutes";
import { useMapRouteSelection } from "@/hooks/useMapRouteSelection";
import { useMapRouteViewModel } from "@/hooks/useMapRouteViewModel";
import { useRouteData } from "@/hooks/useRouteData";
import { useRoutePlanner } from "@/hooks/useRoutePlanner";
import { useSharedMapState } from "@/hooks/useSharedMapState";
import { useTripSession } from "@/hooks/useTripSession";
import { addRecentTrip, getRecentTrips, RECENT_TRIPS_EVENT, type RecentTrip } from "@/lib/recent-trips";
import { formatRouteLabel, getRouteDestination } from "@/lib/route-names";
import { trackRouteConsultation } from "@/lib/route-consultation-client";
import type { Coordinates } from "@/lib/types";
import { findMatchingTransfer, getTransferSelectionKey } from "@/lib/transfer-selection";
import { buildSharedRouteSegment } from "@/lib/shared-route";
import { getSharedTransferIdentity } from "@/lib/shared-map-state";
import { haversineMeters } from "@/lib/geo";
import { findNearbyRouteIds } from "@/lib/nearby-routes";
import { consumeNearbyRoutesRequest, hasNearbyRoutesRequest } from "@/lib/nearby-request";
import {
  findNearestLandmark as findNearestRouteLandmark,
  findUpcomingLandmark,
} from "@/lib/landmark-guidance";
import {
  getMapAutoLoadDelay,
  shouldPreloadMap,
  type MapNetworkInformation,
} from "@/lib/map-load-policy";
import {
  getJourneyFareSummary,
  getTelefericoStationName,
  isTelefericoRouteName,
} from "@/lib/journey-guidance";
import {
  getTripJourneyKey,
  type TripJourney,
} from "@/lib/trip-mode";
const AVG_TRIP_SPEED_KMH = 18;
const loadMapView = () => import("@/components/Map");
const preloadMapView = () => {
  void loadMapView().catch(() => undefined);
};
const MapView = dynamic(loadMapView, {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-ink-900" />
});
const loadRouteList = () => import("@/components/RouteList");
let routeListPreloadPromise: Promise<boolean> | null = null;
const preloadRouteList = () => {
  routeListPreloadPromise ??= loadRouteList()
    .then(() => true)
    .catch(() => {
      routeListPreloadPromise = null;
      return false;
    });
  return routeListPreloadPromise;
};
const RouteListLoading = () => (
  <div className="py-8 text-center text-sm text-foreground/50" role="status">
    Cargando rutas...
  </div>
);
const RouteList = dynamic(loadRouteList, {
  loading: RouteListLoading,
});
const RoutePreviewSVG = dynamic(() => import("@/components/RoutePreviewSVG"));
const RouteSchedule = dynamic(() => import("@/components/RouteSchedule"));
const TripModePanel = dynamic(() => import("@/components/TripModePanel"));
const PendingJourneyReports = dynamic(() => import("@/components/PendingJourneyReports"), { ssr: false });

type RoutesMapMode = "all-visible" | "all-highlighted";
const MAP_MODE_KEY = "rutas-map-mode";
const MAP_MODE_EVENT = "urugo-map-mode-changed";
const DESKTOP_LAYOUT_QUERY = "(min-width: 1024px)";
const subscribeDesktopLayout = (callback: () => void) => {
  const media = window.matchMedia(DESKTOP_LAYOUT_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const getDesktopLayoutSnapshot = () => window.matchMedia(DESKTOP_LAYOUT_QUERY).matches;
const getNetworkInformation = () =>
  (navigator as Navigator & { connection?: MapNetworkInformation }).connection;
const subscribeOnline = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};
const subscribeMapMode = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener(MAP_MODE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(MAP_MODE_EVENT, callback);
  };
};
const getMapModeSnapshot = (): RoutesMapMode => {
  try {
    return window.localStorage.getItem(MAP_MODE_KEY) === "all-highlighted" ? "all-highlighted" : "all-visible";
  } catch {
    return "all-visible";
  }
};
const subscribeRecentTrips = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener(RECENT_TRIPS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(RECENT_TRIPS_EVENT, callback);
  };
};
const getRecentTripsSnapshot = () => JSON.stringify(getRecentTrips());
const subscribeLocationSearch = (callback: () => void) => {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
};
const getLocationSearchSnapshot = () => {
  const search = window.location.search;
  if (!hasNearbyRoutesRequest()) return search;

  const params = new URLSearchParams(search);
  params.set("cerca", "1");
  return `?${params.toString()}`;
};
function getSegmentLengthMeters(segment: Coordinates[]) {
  let total = 0;
  for (let index = 1; index < segment.length; index += 1) {
    total += haversineMeters(segment[index - 1], segment[index]);
  }
  return total;
}

function getEstimatedMinutes(segment: Coordinates[]) {
  const kilometers = getSegmentLengthMeters(segment) / 1000;
  const minutes = (kilometers / AVG_TRIP_SPEED_KMH) * 60;
  return Math.max(4, Math.round(minutes));
}

// Minutos caminando a paso urbano (~4.5 km/h ≈ 75 m/min).
function walkMinutes(meters: number) {
  return Math.max(1, Math.round(meters / 75));
}

export default function HomePage() {
  const initialSearch = useSyncExternalStore<string>(
    subscribeLocationSearch,
    getLocationSearchSnapshot,
    () => "",
  );
  return <MapPage key={initialSearch} initialSearch={initialSearch} />;
}

function MapPage({ initialSearch }: { initialSearch: string }) {
  const {
    buildShareUrl,
    initialUrlState,
    pendingSharedStateRef,
    selectedDirection,
    setSelectedDirection,
  } = useSharedMapState(initialSearch);

  // ── Sidebar resize state ────────────────────────────────────────────────────
  // null = usa el default por breakpoint (380/420px via CSS), number = ancho fijo tras drag
  const [sidebarWidth, setSidebarWidth] = useState<number | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(0);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Determinar ancho actual real del sidebar
    const isLg = window.innerWidth >= 1024;
    const currentWidth = sidebarWidth ?? (isLg ? SIDEBAR_DEFAULT_LG : SIDEBAR_DEFAULT_MD);
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = currentWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [sidebarWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = e.clientX - dragStartXRef.current;
      const newWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, dragStartWidthRef.current + delta));
      setSidebarWidth(newWidth);
    };
    const onMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [routeListReady, setRouteListReady] = useState(false);
  const [isResultSheetOpen, setIsResultSheetOpen] = useState(false);
  const [journeyFocus, setJourneyFocus] = useState<{ request: number; coordinates: Coordinates[]; label: string; tripKey: string | null } | null>(null);
  const [namedOrigin, setNamedOrigin] = useState<{ point: Coordinates; label: string } | null>(null);
  const {
    announceLandmark,
    cancelStop: cancelStopTrip,
    completeStop: completeStopTrip,
    dismissDropOffAlert,
    dropOffAlert,
    isStopDialogOpen: isStopTripDialogOpen,
    progress: tripProgress,
    requestStop: handleStopTrip,
    reset: resetTripSession,
    session: tripSession,
    start: startTripSession,
    updateLocation: updateTripLocation,
  } = useTripSession();
  const [feedbackTripKey, setFeedbackTripKey] = useState<string | null>(null);
  const [transferFocus, setTransferFocus] = useState<{ key: string; request: number; tripKey: string | null } | null>(null);
  const lastSavedTripKeyRef = useRef("");
  const {
    activePoint,
    activePointRef,
    destinationPoint,
    destinationPointRef,
    destinationSource,
    flowStep,
    liveLocation,
    manualOrigin,
    manualOriginSource,
    originPoint,
    originPointRef,
    requestedDestination,
    setActivePoint,
    setDestinationPoint,
    setDestinationSource,
    setManualOrigin,
    setManualOriginSource,
    setRequestedDestination,
    setSharedRouteSegment,
    setSharedSegmentColor,
    setShowHint,
    sharedRouteSegment,
    sharedSegmentColor,
    showHint,
    status: geoStatus,
    accuracyWarning: geoAccuracyWarn,
    locationAccuracyM,
    clearAccuracyWarning,
    requestLocation,
    subscribeToLiveLocation,
    userLocation,
  } = useRoutePlanner({ initialUrlState, tripSessionActive: tripSession !== null });
  const clearSharedRoute = useCallback(() => {
    setSharedRouteSegment(null);
    setSharedSegmentColor(null);
  }, [setSharedRouteSegment, setSharedSegmentColor]);
  // nearbyToast: null = hidden, number = route count (0 means none found)
  const [nearbyToast, setNearbyToast] = useState<number | null>(null);
  const [nearbyRouteIds, setNearbyRouteIds] = useState<number[]>([]);
  const routesMapMode = useSyncExternalStore<RoutesMapMode>(subscribeMapMode, getMapModeSnapshot, () => "all-visible");
  const isDesktopLayout = useSyncExternalStore(subscribeDesktopLayout, getDesktopLayoutSnapshot, () => false);
  const isOnline = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const {
    alternativeRouteIds: alternativeSuggestedRouteIds,
    calculationKey,
    currentCalculation,
    fetchError,
    isCalculating: isCalculatingSuggestions,
    isLoading: isLoadingData,
    isUsingCachedRoutes,
    polylineRoutes,
    promoteSuggestion,
    retry: retryRouteData,
    suggestions,
    transfers,
  } = useRouteData({ destination: destinationPoint, isOnline, origin: originPoint });
  const {
    clearSelection: handleClearSelection,
    hoveredRouteId,
    selectRoute: handleSelectRoute,
    selectedRouteId,
    selectedTransfer,
    setHoveredRouteId,
    setSelectedRouteId,
    setSelectedTransfer,
    setShowTeleferico,
    shareActiveSelection,
    shareDirectRoute,
    shareStatus,
    shareTransfer,
    showTeleferico,
  } = useMapRouteSelection({
    buildShareUrl,
    calculationKey,
    clearSharedRoute,
    destination: destinationPoint,
    hasCurrentCalculation: currentCalculation !== null,
    initialShowTeleferico: initialUrlState.sharedState?.showTeleferico ?? false,
    origin: originPoint,
    transfers,
  });
  const recentTripsSnapshot = useSyncExternalStore(subscribeRecentTrips, getRecentTripsSnapshot, () => "[]");
  const lastTrip = useMemo(() => (JSON.parse(recentTripsSnapshot) as RecentTrip[])[0] ?? null, [recentTripsSnapshot]);
  // Pantallas de poca altura (p. ej. iPhone SE / teclado abierto): la barra A→B
  // se colapsa tras un resumen para dejar más mapa visible.
  const [isShortScreen, setIsShortScreen] = useState(false);
  const [abExpanded, setAbExpanded] = useState(false);
  const { favorites: favoriteRouteNames, toggleFavorite } = useFavoriteRoutes();
  const nearbyRequested = initialUrlState.wantsNearby;
  // Conservamos la solicitud en una ref para ejecutar la búsqueda una sola vez.
  const wantsNearbyRef = useRef(initialUrlState.wantsNearby);

  useEffect(() => {
    if (!initialUrlState.wantsNearby) return;

    const url = new URL(window.location.href);
    if (url.searchParams.get("cerca") !== "1") {
      url.searchParams.set("cerca", "1");
      window.history.replaceState(window.history.state, "", url);
    }
    consumeNearbyRoutesRequest();
  }, [initialUrlState.wantsNearby]);

  const prepareRouteList = useCallback(() => {
    void preloadRouteList().then((loaded) => {
      if (!loaded) return;
      startTransition(() => setRouteListReady(true));
    });
  }, []);

  const openRouteList = useCallback(() => {
    prepareRouteList();
    setIsSheetOpen(true);
  }, [prepareRouteList]);

  useEffect(() => {
    if (isDesktopLayout || isLoadingData || routeListReady) return;
    if (getNetworkInformation()?.saveData) return;

    let idleCallback: number | undefined;
    const timer = window.setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") {
        idleCallback = window.requestIdleCallback(prepareRouteList, { timeout: 1800 });
      } else {
        prepareRouteList();
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
      if (idleCallback !== undefined) window.cancelIdleCallback(idleCallback);
    };
  }, [isDesktopLayout, isLoadingData, prepareRouteList, routeListReady]);

  useEffect(() => {
    const mq = window.matchMedia("(max-height: 740px)");
    const update = () => setIsShortScreen(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const toggleRoutesMapMode = useCallback(() => {
    const next = routesMapMode === "all-visible" ? "all-highlighted" : "all-visible";
    try {
      window.localStorage.setItem(MAP_MODE_KEY, next);
      window.dispatchEvent(new Event(MAP_MODE_EVENT));
    } catch {
      // El modo se mantiene en su valor actual si localStorage no está disponible.
    }
  }, [routesMapMode]);

  const activateMap = useCallback(() => {
    preloadMapView();
    setShouldLoadMap(true);
  }, []);

  useEffect(() => {
    if (isLoadingData || fetchError || shouldLoadMap) {
      return;
    }

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const hasSharedState = window.location.search.length > 0;
    const connection = getNetworkInformation();
    const policy = { connection, hasSharedState, isMobile, isOnline };
    const delay = getMapAutoLoadDelay(policy);
    const timer = delay === null ? undefined : window.setTimeout(activateMap, delay);
    let idleCallback: number | undefined;
    let preloadTimer: number | undefined;

    if (delay !== 0 && shouldPreloadMap(policy)) {
      if (typeof window.requestIdleCallback === "function") {
        idleCallback = window.requestIdleCallback(preloadMapView, { timeout: 1500 });
      } else {
        preloadTimer = window.setTimeout(preloadMapView, 500);
      }
    }

    window.addEventListener("pointerdown", activateMap, { once: true, passive: true });
    window.addEventListener("keydown", activateMap, { once: true });

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      if (idleCallback !== undefined) window.cancelIdleCallback(idleCallback);
      if (preloadTimer !== undefined) window.clearTimeout(preloadTimer);
      window.removeEventListener("pointerdown", activateMap);
      window.removeEventListener("keydown", activateMap);
    };
  }, [activateMap, fetchError, isLoadingData, isOnline, shouldLoadMap]);

  const resultSheetOpen = flowStep === 3 && isResultSheetOpen;

  const {
    arrowSegments,
    bestSuggestion,
    landmarksByRouteName,
    listRoutes,
    mapRoutes,
    routesById: polylineRoutesById,
    selectedMapSegment,
    selectedRoute,
    selectedSuggestion,
    suggestedRouteDirections,
    suggestedRouteIds,
    visibleRouteCount,
  } = useMapRouteViewModel({
    destination: destinationPoint,
    origin: originPoint,
    routes: polylineRoutes,
    selectedRouteId,
    selectedTransfer,
    sharedRouteSegment,
    sharedSegmentColor,
    suggestions,
  });
  const nearbyRouteNames = useMemo(() => {
    const canonicalNames = new Map(listRoutes.map((route) => [route.id, route.nombre]));
    return new Set(nearbyRouteIds.map((id) => canonicalNames.get(id)).filter(Boolean));
  }, [listRoutes, nearbyRouteIds]);
  const nearbyMapRouteIds = useMemo(
    () => polylineRoutes
      .filter((route) => nearbyRouteNames.has(route.name))
      .map((route) => route.id),
    [nearbyRouteNames, polylineRoutes],
  );
  const mapSuggestedRouteIds = suggestedRouteIds.length > 0
    ? suggestedRouteIds
    : nearbyMapRouteIds;
  const mapBestSuggestedRouteId = bestSuggestion?.routeId ?? nearbyMapRouteIds[0] ?? null;
  const isNearbyMode = nearbyRequested;
  const isNearbySearchPending = nearbyRequested
    && nearbyRouteIds.length === 0
    && (geoStatus === "idle" || geoStatus === "locating");
  const displayedRouteCount = isNearbyMode ? nearbyRouteIds.length : visibleRouteCount;

  useEffect(() => {
    if (!selectedRoute || isTelefericoRouteName(selectedRoute.name)) return;
    trackRouteConsultation({ routeName: selectedRoute.name, source: "map" });
  }, [selectedRoute]);

  const handleNearbyRoutesFound = useCallback((routeIds: number[]) => {
    setNearbyRouteIds(routeIds);
    setNearbyToast(routeIds.length);
    if (wantsNearbyRef.current) {
      wantsNearbyRef.current = false;
      // En móvil la lista vive en el BottomSheet; en desktop ya es visible.
      if (routeIds.length > 0 && window.matchMedia("(max-width: 1023px)").matches) {
        openRouteList();
      }
    }
  }, [openRouteList]);

  useEffect(() => {
    if (!wantsNearbyRef.current || !userLocation || polylineRoutes.length === 0) return;
    handleNearbyRoutesFound(findNearbyRouteIds(polylineRoutes, userLocation));
  }, [handleNearbyRoutesFound, polylineRoutes, userLocation]);

  const handleRequestMapLocation = useCallback(async () => {
    const fix = await requestLocation();
    if (fix) {
      setManualOrigin(null);
      setManualOriginSource(null);
      setShowHint(true);
    }
    return fix;
  }, [requestLocation, setManualOrigin, setManualOriginSource, setShowHint]);

  const handleMapPick = useCallback((point: Coordinates) => {
    setIsResultSheetOpen(false);
    setShowHint(false);
    setSharedRouteSegment(null);
    setSharedSegmentColor(null);

    const active = activePointRef.current;

    if (active === "origin") {
      setManualOrigin(point);
      setManualOriginSource(null);
      // If destination already exists, keep it and show results immediately
      if (destinationPointRef.current) {
        setActivePoint(null);
      } else {
        setActivePoint("destination");
      }
      return;
    }

    if (active === "destination") {
      setDestinationPoint(point);
      setDestinationSource(null);
      setActivePoint(null);
      return;
    }

    if (!originPointRef.current) {
      setManualOrigin(point);
      setManualOriginSource(null);
      setActivePoint("destination");
      return;
    }

    if (!destinationPointRef.current) {
      setDestinationPoint(point);
      setDestinationSource(null);
      setActivePoint(null);
      return;
    }

    // Both pins set, no active mode → move destination (most common action)
    setDestinationPoint(point);
    setDestinationSource(null);
    setActivePoint(null);
  }, [
    activePointRef,
    destinationPointRef,
    originPointRef,
    setActivePoint,
    setDestinationPoint,
    setDestinationSource,
    setManualOrigin,
    setManualOriginSource,
    setSharedRouteSegment,
    setSharedSegmentColor,
    setShowHint,
  ]);

  // El mismo buscador permite fijar origen o destino según el punto activo.
  const handlePlaceSearch = useCallback((result: PlaceResult) => {
    setIsResultSheetOpen(false);
    setSharedRouteSegment(null);
    setSharedSegmentColor(null);
    setSelectedTransfer(null);
    setShowTeleferico(false);
    setShowHint(false);

    if (activePointRef.current === "origin") {
      setNamedOrigin({ point: result.center, label: result.label });
      setManualOrigin(result.center);
      setManualOriginSource(result.source);
      clearAccuracyWarning();
      setActivePoint(destinationPointRef.current ? null : "destination");
      return;
    }

    setRequestedDestination(result.label);
    setDestinationPoint(result.center);
    setDestinationSource(result.source);
    // Si aún no hay origen, deja activo el origen para que el usuario lo fije
    // (o lo complete el GPS). Si ya hay origen, calcula la ruta de inmediato.
    setActivePoint(originPointRef.current ? null : "origin");
  }, [
    activePointRef,
    clearAccuracyWarning,
    destinationPointRef,
    originPointRef,
    setActivePoint,
    setDestinationPoint,
    setDestinationSource,
    setManualOrigin,
    setManualOriginSource,
    setRequestedDestination,
    setSelectedTransfer,
    setSharedRouteSegment,
    setSharedSegmentColor,
    setShowHint,
    setShowTeleferico,
  ]);

  // Chip de destino rápido: geocodifica (índice local) y coloca el destino.
  const handleChipSearch = useCallback((text: string) => {
    geocodePlace(text).then((result) => {
      if (result) handlePlaceSearch(result);
    }).catch(() => {/* noop */});
  }, [handlePlaceSearch]);

  useEffect(() => {
    const sharedState = pendingSharedStateRef.current;
    if (!sharedState || polylineRoutes.length === 0) return;
    const sharedTransferIdentity = getSharedTransferIdentity(sharedState);

    if (!sharedTransferIdentity && (sharedState.routeName || sharedState.routeId)) {
      const normalized = sharedState.routeName?.toLowerCase() ?? null;
      // Igualdad exacta primero: "Ruta 1" no debe resolver a "Ruta 1A".
      const route =
        (normalized
          ? polylineRoutes.find((r) => r.name.toLowerCase() === normalized) ??
            polylineRoutes.find((r) => r.name.toLowerCase().startsWith(`${normalized} `)) ??
            polylineRoutes.find((r) => r.name.toLowerCase().includes(normalized))
          : null) ??
        (sharedState.routeId
          ? polylineRoutes.find((r) => r.id === sharedState.routeId)
          : null);
      if (route) {
        setSelectedRouteId(route.id);
        const segment = buildSharedRouteSegment(
          route.path,
          sharedState.segmentStartIndex,
          sharedState.segmentEndIndex,
        );
        if (segment) {
          setSharedRouteSegment(segment);
        }
        pendingSharedStateRef.current = null;
        return;
      }
    }

    if (!sharedTransferIdentity && sharedState.showTeleferico) {
      const telefericoRoute = polylineRoutes.find((r) => isTelefericoRouteName(r.name));
      if (telefericoRoute) {
        setSelectedRouteId(telefericoRoute.id);
        setShowTeleferico(false);
      }
      pendingSharedStateRef.current = null;
      return;
    }

    if (!sharedTransferIdentity && (sharedState.origin || sharedState.destination)) {
      pendingSharedStateRef.current = null;
    }
  }, [
    pendingSharedStateRef,
    polylineRoutes,
    setSelectedRouteId,
    setSharedRouteSegment,
    setShowTeleferico,
  ]);

  useEffect(() => {
    const sharedState = pendingSharedStateRef.current;
    if (!sharedState || !calculationKey || currentCalculation === null) return;

    const identity = getSharedTransferIdentity(sharedState);
    if (!identity) return;

    const transfer = findMatchingTransfer(identity, transfers);
    if (transfer) {
      setSelectedTransfer(transfer);
    }
    pendingSharedStateRef.current = null;
  }, [calculationKey, currentCalculation, pendingSharedStateRef, setSelectedTransfer, transfers]);

  const bestSuggestionEta = useMemo(
    () => bestSuggestion?.rideMinutes ?? null,
    [bestSuggestion]
  );

  const plannedJourney = useMemo<TripJourney | null>(() => {
    if (!destinationPoint) return null;

    if (bestSuggestion) {
      const isTeleferico = isTelefericoRouteName(bestSuggestion.ruta);
      return {
        kind: "direct",
        routeId: bestSuggestion.routeId,
        routeName: bestSuggestion.ruta,
        segment: bestSuggestion.segment,
        destination: destinationPoint,
        landmarks: polylineRoutesById.get(bestSuggestion.routeId)?.landmarks,
        boardingStopLabel: isTeleferico
          ? getTelefericoStationName(bestSuggestion.indexA) ?? undefined
          : undefined,
        destinationStopLabel: isTeleferico
          ? getTelefericoStationName(bestSuggestion.indexB) ?? undefined
          : undefined,
      };
    }
    if (selectedTransfer) {
      const routeAIsTeleferico = isTelefericoRouteName(selectedTransfer.routeAName);
      const routeBIsTeleferico = isTelefericoRouteName(selectedTransfer.routeBName);
      return {
        kind: "transfer",
        routeAId: selectedTransfer.routeAId,
        routeBId: selectedTransfer.routeBId,
        routeAName: selectedTransfer.routeAName,
        routeBName: selectedTransfer.routeBName,
        routeAStartIndex: selectedTransfer.routeAStartIndex,
        routeATransferIndex: selectedTransfer.routeATransferIndex,
        routeBTransferIndex: selectedTransfer.routeBTransferIndex,
        routeBEndIndex: selectedTransfer.routeBEndIndex,
        segmentA: selectedTransfer.segmentA,
        segmentB: selectedTransfer.segmentB,
        transferPoint: selectedTransfer.transferPoint,
        walkMeters: selectedTransfer.walkMeters,
        destination: destinationPoint,
        routeALandmarks: polylineRoutesById.get(selectedTransfer.routeAId)?.landmarks,
        routeBLandmarks: polylineRoutesById.get(selectedTransfer.routeBId)?.landmarks,
        boardingStopLabel: routeAIsTeleferico
          ? getTelefericoStationName(selectedTransfer.routeAStartIndex) ?? undefined
          : undefined,
        transferArrivalStopLabel: routeAIsTeleferico
          ? getTelefericoStationName(selectedTransfer.routeATransferIndex) ?? undefined
          : undefined,
        transferBoardingStopLabel: routeBIsTeleferico
          ? getTelefericoStationName(selectedTransfer.routeBTransferIndex) ?? undefined
          : undefined,
        destinationStopLabel: routeBIsTeleferico
          ? getTelefericoStationName(selectedTransfer.routeBEndIndex) ?? undefined
          : undefined,
      };
    }
    return null;
  }, [bestSuggestion, destinationPoint, polylineRoutesById, selectedTransfer]);
  const plannedJourneyKey = plannedJourney
    ? getTripJourneyKey(plannedJourney)
    : null;
  const isTripActive = tripSession !== null && tripSession.key === plannedJourneyKey;
  const feedbackKey = plannedJourneyKey ?? (selectedRoute ? `route:${selectedRoute.id}` : showTeleferico ? "teleferico" : null);
  const feedbackGiven = feedbackKey !== null && feedbackTripKey === feedbackKey;
  const feedbackRoutes = bestSuggestion ? [bestSuggestion.ruta]
    : selectedTransfer ? [selectedTransfer.routeAName, selectedTransfer.routeBName]
      : selectedRoute ? [selectedRoute.name] : showTeleferico ? ["Teleférico Uruapan"] : [];
  const tripLocationStatus = geoStatus === "error" || geoStatus === "outside" || geoStatus === "inaccurate"
    ? "unavailable"
    : liveLocation
      ? "ready"
      : "locating";
  const tripLandmarkCue = useMemo(() => {
    if (!tripSession || !tripProgress || !liveLocation) return null;
    if (tripProgress.phase === "riding-direct" && tripSession.journey.kind === "direct") {
      return findUpcomingLandmark(
        liveLocation,
        tripSession.journey.segment,
        tripSession.journey.landmarks,
      );
    }
    if (tripSession.journey.kind !== "transfer") return null;
    if (tripProgress.phase === "riding-first") {
      return findUpcomingLandmark(
        liveLocation,
        tripSession.journey.segmentA,
        tripSession.journey.routeALandmarks,
      );
    }
    if (tripProgress.phase === "riding-second") {
      return findUpcomingLandmark(
        liveLocation,
        tripSession.journey.segmentB,
        tripSession.journey.routeBLandmarks,
      );
    }
    return null;
  }, [liveLocation, tripProgress, tripSession]);

  useEffect(() => {
    announceLandmark(tripLandmarkCue);
  }, [announceLandmark, tripLandmarkCue]);

  useEffect(() => {
    if (!tripSession || tripSession.key === plannedJourneyKey) return;
    const timer = window.setTimeout(resetTripSession, 0);
    return () => window.clearTimeout(timer);
  }, [plannedJourneyKey, resetTripSession, tripSession]);

  const handleStartTrip = useCallback(() => {
    if (!plannedJourney || !plannedJourneyKey) return;

    startTripSession(plannedJourney);
    setShowHint(false);
    setActivePoint(null);
    setIsResultSheetOpen(false);
    setIsSheetOpen(false);

    if (plannedJourney.kind === "direct") {
      setSharedRouteSegment(plannedJourney.segment);
      const routeColor = suggestions.find((item) => item.routeId === plannedJourney.routeId)?.routeColor;
      setSharedSegmentColor(routeColor ?? null);
      setSelectedRouteId(null);
    }

  }, [
    plannedJourney,
    plannedJourneyKey,
    setActivePoint,
    setSelectedRouteId,
    setSharedRouteSegment,
    setSharedSegmentColor,
    setShowHint,
    startTripSession,
    suggestions,
  ]);

  // ── Repetir viaje: guardar los nuevos viajes ──────────────────────────────
  useEffect(() => {
    if (!originPoint || !destinationPoint || !bestSuggestion || isCalculatingSuggestions) return;
    const key = `${originPoint.join(",")}>${destinationPoint.join(",")}`;
    if (lastSavedTripKeyRef.current === key) return;
    lastSavedTripKeyRef.current = key;
    addRecentTrip({
      origin: originPoint,
      destination: destinationPoint,
      destinationLabel: requestedDestination,
      routeName: bestSuggestion.ruta,
      temporaryProviderResult: manualOriginSource === "mapbox" || destinationSource === "mapbox",
    });
  }, [originPoint, destinationPoint, bestSuggestion, isCalculatingSuggestions, requestedDestination, manualOriginSource, destinationSource]);

  const repeatTrip = useCallback((trip: RecentTrip) => {
    setShowHint(false);
    setSharedRouteSegment(null);
    setSharedSegmentColor(null);
    setManualOrigin(trip.origin);
    setManualOriginSource(null);
    setDestinationPoint(trip.destination);
    setDestinationSource(null);
    setRequestedDestination(trip.destinationLabel);
    setActivePoint(null);
  }, [
    setActivePoint,
    setDestinationPoint,
    setDestinationSource,
    setManualOrigin,
    setManualOriginSource,
    setRequestedDestination,
    setSharedRouteSegment,
    setSharedSegmentColor,
    setShowHint,
  ]);

  const handleRouteFeedback = useCallback((util: "si" | "no") => {
    if (feedbackKey) setFeedbackTripKey(feedbackKey);
    try {
      track("ruta_feedback", {
        util,
        ruta: bestSuggestion?.ruta ?? selectedTransfer?.routeAName ?? selectedRoute?.name ?? "Teleférico Uruapan",
        tipo: selectedTransfer && !bestSuggestion ? "transbordo" : "directa",
        ...(selectedTransfer && !bestSuggestion ? { ruta_destino: selectedTransfer.routeBName } : {}),
        destino_tipo: requestedDestination ? "busqueda" : "punto_mapa",
      });
    } catch {
      // analytics no disponible: ignorar
    }
  }, [feedbackKey, bestSuggestion, selectedTransfer, selectedRoute, requestedDestination]);

  useEffect(() => {
    if (!isTripActive || !tripSession) return;

    return subscribeToLiveLocation(updateTripLocation);
  }, [isTripActive, subscribeToLiveLocation, tripSession, updateTripLocation]);

  const routeTextSummary = useMemo(() => {
    if (isCalculatingSuggestions || flowStep !== 3) {
      return null;
    }

    if (bestSuggestion) {
      const fare = getJourneyFareSummary([bestSuggestion.ruta]);

      if (isTelefericoRouteName(bestSuggestion.ruta)) {
        const originStation = getTelefericoStationName(bestSuggestion.indexA);
        const destinationStation = getTelefericoStationName(bestSuggestion.indexB);

        return {
          title: "Indicaciones",
          items: [
            `Camina hasta ${originStation ? `la estación ${originStation}` : "la estación de abordaje"} (~${Math.round(bestSuggestion.distanciaA)} m, ${walkMinutes(bestSuggestion.distanciaA)} min caminando) y valida tu tarjeta al entrar.`,
            `Viaja en el Teleférico y baja en ${destinationStation ? `la estación ${destinationStation}` : "la estación indicada"}. Desde ahí camina ~${Math.round(bestSuggestion.distanciaB)} m hasta tu destino.`,
            `Tiempo estimado en ruta: ${bestSuggestionEta ?? getEstimatedMinutes(bestSuggestion.segment)} min. ${fare.detail}`,
          ],
        };
      }

      const bestRoute = polylineRoutesById.get(bestSuggestion.routeId);
      const originLandmark = originPoint
        ? findNearestRouteLandmark(originPoint, [bestRoute?.landmarks], 150)?.name ?? null
        : null;
      const destLandmark = destinationPoint
        ? findNearestRouteLandmark(destinationPoint, [bestRoute?.landmarks], 150)?.name ?? null
        : null;

      return {
        title: "Indicaciones",
        items: [
          `Sube a ${formatRouteLabel(bestSuggestion.ruta)} cerca de ${originLandmark ?? "tu ubicación"} (~${Math.round(bestSuggestion.distanciaA)} m, ${walkMinutes(bestSuggestion.distanciaA)} min caminando). Los camiones paran casi en cualquier esquina: haz la parada con la mano.`,
          `Baja cerca de ${destLandmark ?? "tu destino"} (~${Math.round(bestSuggestion.distanciaB)} m, ${walkMinutes(bestSuggestion.distanciaB)} min caminando). Avisa al chofer o toca el timbre.`,
          `Tiempo estimado en ruta: ${bestSuggestionEta ?? getEstimatedMinutes(bestSuggestion.segment)} min. ${fare.detail}`
        ]
      };
    }

    if (selectedTransfer) {
      const routeAIsTeleferico = isTelefericoRouteName(selectedTransfer.routeAName);
      const routeBIsTeleferico = isTelefericoRouteName(selectedTransfer.routeBName);
      const fare = getJourneyFareSummary([
        selectedTransfer.routeAName,
        selectedTransfer.routeBName,
      ]);
      const transferLandmark = findNearestRouteLandmark(
        selectedTransfer.transferPoint,
        [
          polylineRoutesById.get(selectedTransfer.routeAId)?.landmarks,
          polylineRoutesById.get(selectedTransfer.routeBId)?.landmarks,
        ],
        300,
      )?.name;
      const firstInstruction = routeAIsTeleferico
        ? `Primero aborda el Teleférico en la estación ${getTelefericoStationName(selectedTransfer.routeAStartIndex) ?? "indicada"}.`
        : `Primero toma ${formatRouteLabel(selectedTransfer.routeAName)}.`;
      const transferInstruction = routeAIsTeleferico
        ? `Baja en la estación ${getTelefericoStationName(selectedTransfer.routeATransferIndex) ?? "indicada"} y camina aproximadamente ${Math.round(selectedTransfer.walkMeters)} m (${walkMinutes(selectedTransfer.walkMeters)} min) para transbordar.`
        : routeBIsTeleferico
          ? `Camina aproximadamente ${Math.round(selectedTransfer.walkMeters)} m (${walkMinutes(selectedTransfer.walkMeters)} min) hasta la estación ${getTelefericoStationName(selectedTransfer.routeBTransferIndex) ?? "indicada"}.`
          : `Camina aproximadamente ${Math.round(selectedTransfer.walkMeters)} m (${walkMinutes(selectedTransfer.walkMeters)} min) para transbordar${transferLandmark ? ` cerca de ${transferLandmark}` : ""}.`;
      const secondInstruction = routeBIsTeleferico
        ? `Continúa en el Teleférico hasta la estación ${getTelefericoStationName(selectedTransfer.routeBEndIndex) ?? "indicada"}.`
        : `Continúa en ${formatRouteLabel(selectedTransfer.routeBName)} hasta acercarte al destino.`;

      return {
        title: "Indicaciones con transbordo",
        items: [
          firstInstruction,
          transferInstruction,
          secondInstruction,
          fare.detail,
        ]
      };
    }

    if (transfers.length > 0) {
      return {
        title: "Opciones de transbordo disponibles",
        items: transfers.slice(0, 2).map((transfer) => {
          const landmark = findNearestRouteLandmark(
            transfer.transferPoint,
            [
              polylineRoutesById.get(transfer.routeAId)?.landmarks,
              polylineRoutesById.get(transfer.routeBId)?.landmarks,
            ],
            300,
          )?.name;
          return `${formatRouteLabel(transfer.routeAName)} a ${formatRouteLabel(transfer.routeBName)}, caminando ~${Math.round(transfer.walkMeters)} m (${walkMinutes(transfer.walkMeters)} min) para transbordar${landmark ? ` cerca de ${landmark}` : ""}.`;
        })
      };
    }

    return {
      title: "Sin ruta directa",
      items: ["Mueve el origen o destino a una avenida, colonia o punto conocido cercano para intentar de nuevo."]
    };
  }, [bestSuggestion, bestSuggestionEta, destinationPoint, flowStep, isCalculatingSuggestions, originPoint, polylineRoutesById, selectedTransfer, transfers]);
  const hintMessage = useMemo(() => {
    // Editing origin while destination already exists (step 3 re-edit)
    if (activePoint === "origin" && destinationPoint) {
      return "Toca el mapa para mover tu origen. El destino se mantiene.";
    }

    if (flowStep === 1) {
      if (geoStatus === "outside") {
        return requestedDestination
          ? `Estás fuera de Uruapan. El destino ${requestedDestination} se mantiene; busca o marca un origen dentro de la ciudad.`
          : "Estás fuera de Uruapan. Busca o marca manualmente un origen dentro de la ciudad.";
      }
      if (geoStatus === "locating") return "Obteniendo tu ubicación...";
      if (geoStatus === "inaccurate") {
        return "La ubicación no es suficientemente precisa. Busca tu origen o márcalo en el mapa.";
      }
      if (geoStatus === "error") {
        return requestedDestination
          ? `Destino: ${requestedDestination}. No pudimos obtener tu ubicación. Busca o marca tu origen.`
          : "No pudimos obtener tu ubicación. Busca o marca tu origen.";
      }
      // geoStatus === "ok" — origin is set automatically
      return requestedDestination
        ? `Destino: ${requestedDestination}. Usando tu ubicación actual como origen.`
        : "Usando tu ubicación actual. Toca el mapa para ajustar.";
    }

    if (flowStep === 2) {
      if (geoAccuracyWarn && !manualOrigin) {
        return "Tu GPS varía mucho. Toca el mapa para fijar tu origen manualmente.";
      }
      if (requestedDestination) {
        return `Toca la zona de ${requestedDestination} como destino.`;
      }
      return "Selecciona tu destino en el mapa.";
    }

    if (isCalculatingSuggestions) {
      return "Buscando la mejor ruta...";
    }

    if (bestSuggestion) {
      return `${formatRouteLabel(bestSuggestion.ruta)} es la mejor opción.`;
    }

    if (transfers.length > 0) {
      return "No hay ruta directa. Hay opciones con transbordo.";
    }

    return "No encontramos ruta directa. Ajusta origen o destino.";
  }, [activePoint, bestSuggestion, destinationPoint, flowStep, geoAccuracyWarn, geoStatus, isCalculatingSuggestions, manualOrigin, requestedDestination, transfers]);

  // Keep direct journeys on the map; open the sheet when the user needs to choose a transfer.
  // La ref evita re-aperturas causadas por refrescados del GPS.
  const resultSheetOpenedForDestRef = useRef<string | null>(null);
  useEffect(() => {
    if (flowStep !== 3 || isCalculatingSuggestions || !currentCalculation) return;
    const destKey = destinationPoint ? destinationPoint.join(",") : null;
    if (destKey && destKey !== resultSheetOpenedForDestRef.current) {
      if (bestSuggestion) {
        resultSheetOpenedForDestRef.current = destKey;
        return;
      }
      // Present choices after the map has rendered the calculation result.
      const frame = window.requestAnimationFrame(() => {
        resultSheetOpenedForDestRef.current = destKey;
        setIsResultSheetOpen(true);
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [bestSuggestion, currentCalculation, flowStep, isCalculatingSuggestions, destinationPoint]);

  useEffect(() => {
    if (!showHint) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowHint(false);
    }, flowStep === 3 ? 2600 : 3200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [flowStep, setShowHint, showHint]);

  const focusJourneyPoint = (coordinates: Coordinates[], label: string) => {
    activateMap();
    setJourneyFocus((previous) => ({ request: (previous?.request ?? 0) + 1, coordinates, label, tripKey: isTripActive ? tripSession?.key ?? null : null }));
    setIsResultSheetOpen(false);
    setShowHint(false);
  };
  const journeyInstructionActions = selectedTransfer ? [
    { label: "Sube aquí", onClick: () => focusJourneyPoint([selectedTransfer.segmentA[0]], "Subida") },
    { label: "Ver caminata del transbordo", onClick: () => focusJourneyPoint([selectedTransfer.transferPoint, selectedTransfer.segmentB[0]], "Transbordo") },
    { label: "Baja aquí", onClick: () => focusJourneyPoint([selectedTransfer.segmentB[selectedTransfer.segmentB.length - 1]], "Bajada") },
  ] : bestSuggestion ? [
    { label: "Sube aquí", onClick: () => focusJourneyPoint([bestSuggestion.segment[0]], "Subida") },
    { label: "Baja aquí", onClick: () => focusJourneyPoint([bestSuggestion.segment[bestSuggestion.segment.length - 1]], "Bajada") },
  ] : [];

  if (fetchError) {
    const offline = !isOnline;
    return (
      <main className="relative flex h-dvh w-full flex-col items-center justify-center gap-4 overflow-hidden bg-ink-900 px-6 text-center">
        <p className="font-display text-[18px] font-semibold text-white">No se pudieron cargar las rutas</p>
        <p className="max-w-sm text-[13px] leading-6 text-foreground/60">
          {offline
            ? "Estás sin conexión y no hay datos de rutas guardados para esta sesión. Conéctate una vez para que la PWA pueda guardar la información."
            : "La app no pudo obtener los datos de rutas. Puede ser un problema temporal del servidor o de la caché del navegador."}
        </p>
        <button
          type="button"
          onClick={retryRouteData}
          className="mt-2 inline-flex h-12 items-center rounded-xl bg-verde px-6 text-[13px] font-bold text-ink-900"
        >
          Reintentar
        </button>
      </main>
    );
  }

  // ── Bloque de JSX compartido: controles A/B + resultado de ruta ──────────────
  // Se renderiza tanto en el overlay mobile como en el sidebar desktop.
  // Extraido como funcion local para evitar duplicacion de JSX.
  const renderRouteControls = (context: "mobile" | "desktop", hideStep3 = false, onlyStep3 = false) => {
    const isMobile = context === "mobile";
    return (
      <>
        {!onlyStep3 && (
        <>
        <RoutePlannerSearch
          activePoint={activePoint}
          destinationSelected={destinationPoint !== null}
          isMobile={isMobile}
          lastTrip={lastTrip}
          usingAutomaticOrigin={userLocation !== null && manualOrigin === null}
          onChooseManualOrigin={() => {
            setAbExpanded(true);
            setActivePoint("origin");
            setShowHint(true);
          }}
          onDestinationSelect={handleChipSearch}
          onPlaceSelect={handlePlaceSearch}
          onRepeatTrip={repeatTrip}
        />

        <RoutePlannerPoints
          originPlaceLabel={namedOrigin && manualOrigin?.join(",") === namedOrigin.point.join(",") ? namedOrigin.label : originPoint ? findNearestRouteLandmark(originPoint, polylineRoutes.map((route) => route.landmarks), 100)?.name : undefined}
          destinationPlaceLabel={destinationSource && requestedDestination ? requestedDestination : destinationPoint ? findNearestRouteLandmark(destinationPoint, polylineRoutes.map((route) => route.landmarks), 100)?.name : undefined}
          abExpanded={abExpanded}
          activePoint={activePoint}
          destinationPoint={destinationPoint}
          flowStep={flowStep}
          geoAccuracyWarning={geoAccuracyWarn}
          geoStatus={geoStatus}
          isMobile={isMobile}
          isShortScreen={isShortScreen}
          manualOrigin={manualOrigin}
          originPoint={originPoint}
          requestedDestination={requestedDestination}
          userLocation={userLocation}
          onCollapse={() => setAbExpanded(false)}
          onDismissRequestedDestination={() => setRequestedDestination(null)}
          onExpand={() => setAbExpanded(true)}
          onReset={() => {
            setSharedRouteSegment(null);
            setManualOrigin(null);
            setManualOriginSource(null);
            setDestinationPoint(null);
            setDestinationSource(null);
            setActivePoint(userLocation ? "destination" : "origin");
            setShowHint(true);
          }}
          onSelectPoint={(point) => {
            setActivePoint(point);
            setShowHint(true);
          }}
        />
        </>
        )}

        {/* Resultado de ruta — paso 3 (en mobile va en el result sheet) */}
        {flowStep === 3 && !hideStep3 && (
          <div
            aria-live="polite"
            className="ov-panel-soft w-full overflow-hidden rounded-2xl border shadow-lg transition-all duration-300"
            style={{ borderLeftWidth: "3px", borderLeftColor: bestSuggestion?.routeColor ?? selectedRoute?.color ?? "#b8e840" }}
          >
            {isCalculatingSuggestions ? (
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-lima/60 border-t-transparent" />
                <span className="ov-text text-[13px] font-medium">Buscando mejor ruta...</span>
              </div>
            ) : bestSuggestion ? (
              <>
                <DirectRouteResult
                  showTitle={!isMobile}
                  alternatives={suggestions.slice(1)}
                  isTripActive={isTripActive}
                  route={bestSuggestion}
                  routeEta={bestSuggestionEta}
                  onEditDestination={() => {
                    setActivePoint("destination");
                    setShowHint(true);
                    if (isMobile) setIsResultSheetOpen(false);
                  }}
                  onEditOrigin={() => {
                    setActivePoint("origin");
                    setShowHint(true);
                    if (isMobile) setIsResultSheetOpen(false);
                  }}
                  onPromote={(routeId) => {
                    setSelectedRouteId(null);
                    setSharedRouteSegment(null);
                    setSharedSegmentColor(null);
                    promoteSuggestion(routeId);
                  }}
                  onShare={() => shareDirectRoute(bestSuggestion)}
                  onToggleTrip={isTripActive ? handleStopTrip : handleStartTrip}
                  onViewMap={() => {
                    setShowHint(false);
                    setSharedRouteSegment(bestSuggestion.segment);
                    setSharedSegmentColor(bestSuggestion.routeColor ?? null);
                    setSelectedRouteId(null);
                    if (isMobile) setIsResultSheetOpen(false);
                  }}
                />
                <RouteSchedule routeName={bestSuggestion.ruta} />
              </>
            ) : selectedTransfer ? (
              <SelectedTransferResult
                transferWalkMinutes={walkMinutes(selectedTransfer.walkMeters)}
                transferLandmark={findNearestRouteLandmark(selectedTransfer.transferPoint, [polylineRoutesById.get(selectedTransfer.routeAId)?.landmarks, polylineRoutesById.get(selectedTransfer.routeBId)?.landmarks], 300)?.name ?? null}
                onViewTransfer={() => {
                  activateMap();
                  setTransferFocus((previous) => ({ key: getTransferSelectionKey(selectedTransfer), request: (previous?.request ?? 0) + 1, tripKey: isTripActive ? tripSession?.key ?? null : null }));
                  if (isMobile) setIsResultSheetOpen(false);
                }}
                isTripActive={isTripActive}
                transfer={selectedTransfer}
                onClear={handleClearSelection}
                onShare={() => shareTransfer(selectedTransfer)}
                onToggleTrip={isTripActive ? handleStopTrip : handleStartTrip}
              />
            ) : transfers.length > 0 ? (
              <TransferOptionsResult
                transfers={transfers}
                onMoveDestination={() => {
                  setActivePoint("destination");
                  setShowHint(true);
                }}
                onSelect={setSelectedTransfer}
              />
            ) : (
              <EmptyRouteResult
                onMoveDestination={() => {
                  setActivePoint("destination");
                  setShowHint(true);
                }}
              />
            )}

            <ActiveRouteSummary
              showActions={!bestSuggestion && !selectedTransfer}
              instructions={routeTextSummary}
              instructionActions={journeyInstructionActions}
              routeColor={selectedRoute?.color ?? null}
              routeName={selectedRoute?.name ?? null}
              showTeleferico={showTeleferico}
              transfer={selectedTransfer}
              onClear={handleClearSelection}
              onShare={() => shareActiveSelection(selectedRoute, selectedSuggestion)}
            >
              {!bestSuggestion && !selectedTransfer && selectedRoute && <RouteSchedule routeName={selectedRoute.name} />}
              {!isCalculatingSuggestions && feedbackKey && feedbackRoutes.length > 0 && (
                <JourneyFeedback key={feedbackKey} routes={feedbackRoutes} feedbackGiven={feedbackGiven} onFeedback={handleRouteFeedback} />
              )}
            </ActiveRouteSummary>
            {!isCalculatingSuggestions && <RouteFreshness routes={(bestSuggestion ? [polylineRoutesById.get(bestSuggestion.routeId)] : selectedTransfer ? [polylineRoutesById.get(selectedTransfer.routeAId), polylineRoutesById.get(selectedTransfer.routeBId)] : selectedRoute ? [selectedRoute] : []).filter((route) => route !== undefined)} />}
          </div>
        )}
      </>
    );
  };

  return (
    <main className="relative flex h-dvh w-full overflow-hidden">
      <h1 className="sr-only">Mapa de rutas de transporte en Uruapan</h1>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP SIDEBAR (md+)
          Panel izquierdo redimensionable. Default: 380px en md, 420px en lg.
          El usuario puede arrastrar el handle derecho entre 300px y 520px.
          En mobile: oculto (los controles van en el overlay flotante y el BottomSheet).
      ══════════════════════════════════════════════════════════════════════ */}
      {isDesktopLayout && (
      <DesktopMapSidebar
        width={sidebarWidth}
        routeCount={displayedRouteCount}
        flowStep={flowStep}
        routesMapMode={routesMapMode}
        onToggleMode={toggleRoutesMapMode}
        hint={(
          <div className={`transition-all duration-300 ${showHint ? "opacity-100" : "opacity-0"}`}>
            <p className="text-[12px] leading-snug text-foreground/60">{hintMessage}</p>
          </div>
        )}
        controls={renderRouteControls("desktop")}
        nearbyNotice={nearbyToast !== null ? (
          <div className="shrink-0 px-5 pt-3">
            <NearbyToast
              count={nearbyToast}
              onView={() => undefined}
              onDismiss={() => setNearbyToast(null)}
            />
          </div>
        ) : null}
        routeList={(
          <RouteList
            routes={listRoutes}
            isLoading={isLoadingData}
            suggestedRouteIds={suggestedRouteIds}
            suggestedRouteDirections={suggestedRouteDirections}
            bestSuggestedRouteId={bestSuggestion?.routeId ?? null}
            alternativeSuggestedRouteIds={alternativeSuggestedRouteIds}
            nearbyRouteIds={nearbyRouteIds}
            selectedRouteId={selectedRouteId}
            landmarksByRouteName={landmarksByRouteName}
            favoriteRouteNames={favoriteRouteNames}
            onToggleFavorite={toggleFavorite}
            onClearSelection={handleClearSelection}
            onShowTeleferico={() => setShowTeleferico(true)}
            onSelectRoute={handleSelectRoute}
            onHoverRoute={setHoveredRouteId}
          />
        )}
      />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DRAG HANDLE — solo visible en md+
          Barra vertical de 4px entre sidebar y mapa. El usuario arrastra para
          redimensionar el sidebar entre 300px y 520px.
      ══════════════════════════════════════════════════════════════════════ */}
      {isDesktopLayout && (
      <div
        role="separator"
        aria-label="Redimensionar panel lateral"
        aria-orientation="vertical"
        aria-valuemin={300}
        aria-valuemax={520}
        aria-valuenow={sidebarWidth ?? (typeof window !== "undefined" && window.innerWidth >= 1024 ? 420 : 380)}
        tabIndex={0}
        className="group relative z-40 hidden w-1 shrink-0 cursor-col-resize lg:flex lg:flex-col lg:items-center lg:justify-center"
        onMouseDown={handleDragStart}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            setSidebarWidth((prev) => Math.max(300, (prev ?? 420) - 20));
          }
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            setSidebarWidth((prev) => Math.min(520, (prev ?? 420) + 20));
          }
        }}
      >
        {/* Track line */}
        <div className="absolute inset-y-0 left-0 w-1 bg-foreground/5 transition-colors duration-150 group-hover:bg-lima/30 group-active:bg-lima/50" />
        {/* Grip icon — centrado verticalmente */}
        <div className="relative z-10 flex flex-col items-center gap-[3px] rounded-full border border-foreground/10 bg-ink-900 px-0.5 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-all duration-150 group-hover:border-lima/30 group-hover:bg-ink-900 group-hover:shadow-[0_2px_12px_rgba(232,93,47,0.15)]">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="block h-[3px] w-[3px] rounded-full bg-foreground/25 transition-colors duration-150 group-hover:bg-lima/60"
            />
          ))}
        </div>
      </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MAPA — ocupa todo el espacio restante
          En mobile: ocupa 100% del ancho (el sidebar está oculto)
          En desktop: ocupa flex-1 (el resto del ancho tras el sidebar)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative flex-1">
        {isLoadingData || !shouldLoadMap ? (
          <div
            className="relative h-full w-full overflow-hidden bg-ink-900"
            role="button"
            tabIndex={0}
            aria-label={isLoadingData ? "Cargando rutas" : "Activar mapa interactivo"}
            onClick={activateMap}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activateMap();
              }
            }}
          >
            <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-ink-800 to-ink-900" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-30" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-1 animate-pulse rounded-full bg-slate-500"
                  style={{
                    width: `${55 + (i % 3) * 15}%`,
                    animationDelay: `${i * 120}ms`
                  }}
                />
              ))}
            </div>
            <div className="absolute inset-0 grid place-items-center">
              <div className="flex items-center gap-2 rounded-full border border-foreground/10 bg-ink-900/90 px-4 py-2 text-sm font-semibold text-foreground/75 shadow-soft backdrop-blur-xl">
                {isLoadingData ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-lima/60 border-t-transparent" aria-hidden="true" />
                ) : null}
                {isLoadingData ? "Cargando rutas..." : "Activar mapa interactivo"}
              </div>
            </div>
          </div>
        ) : (
          <MapView
            routes={mapRoutes}
            nearbyRoutePaths={polylineRoutes}
            nearbyFocusPoint={nearbyRequested ? userLocation : null}
            transferFocus={transferFocus}
            journeyFocus={journeyFocus}
            userLocationPoint={userLocation}
            userLocationAccuracyM={locationAccuracyM}
            selectedRouteId={selectedRouteId}
            suggestedRouteIds={mapSuggestedRouteIds}
            allRoutesMode={routesMapMode}
            bestSuggestedRouteId={mapBestSuggestedRouteId}
            selectedRouteSegment={selectedMapSegment}
            arrowSegments={arrowSegments}
            originPoint={originPoint}
            destinationPoint={destinationPoint}
            showTeleferico={showTeleferico}
            selectedTransfer={selectedTransfer}
            tripModeActive={isTripActive}
            tripSessionKey={isTripActive ? tripSession?.cameraKey ?? null : null}
            tripLocation={isTripActive ? liveLocation : null}
            tripJourney={isTripActive ? tripSession?.journey ?? null : null}
            tripProgress={isTripActive ? tripProgress : null}
            awaitingPick={flowStep === 3 ? null : activePoint}
            hoveredRouteId={hoveredRouteId}
            onMapPick={handleMapPick}
            onSelectRoute={handleSelectRoute}
            onNearbyRoutesFound={handleNearbyRoutesFound}
            onRequestLocation={handleRequestMapLocation}
          />
        )}

        {/* ── Fallback offline: los tiles de Mapbox necesitan red, pero los
            recorridos guardados sí se pueden dibujar como SVG ── */}
        {!isOnline && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-ink-900/95 px-6 text-center">
            <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-[13px] font-semibold text-amber-300">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M2 9.5C4.8 7 8.2 5.5 12 5.5c1.2 0 2.4.15 3.5.44M8.5 13a7.7 7.7 0 0 1 3.5-.9c1.9 0 3.6.65 5 1.75M5.2 11.2A11.4 11.4 0 0 1 9 9.3M12 17.5h.01M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Sin conexión
            </div>
            {selectedRoute ? (
              <>
                <p className="max-w-sm text-[13px] leading-6 text-foreground/70">
                  El mapa de fondo necesita internet, pero aquí tienes el recorrido guardado de la{" "}
                  <span className="font-bold text-white">{formatRouteLabel(selectedRoute.name)}</span>:
                </p>
                <div className="w-full max-w-md overflow-hidden rounded-2xl border border-foreground/10 bg-black/30">
                  <RoutePreviewSVG
                    paths={polylineRoutes
                      .filter((route) => route.name === selectedRoute.name)
                      .map((route) => route.path)}
                    color={selectedRoute.color}
                    width={400}
                    height={240}
                    strokeWidth={2.5}
                    className="h-auto w-full"
                  />
                </div>
              </>
            ) : (
              <p className="max-w-sm text-[13px] leading-6 text-foreground/70">
                El mapa de fondo necesita internet. La búsqueda y la lista de rutas siguen
                funcionando: selecciona una ruta para ver su recorrido guardado.
              </p>
            )}
          </div>
        )}

        {isUsingCachedRoutes && (
          <div
            role="status"
            aria-label="Estado de datos de rutas"
            aria-live="polite"
            className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-4 lg:bottom-4 lg:left-auto lg:right-4 lg:justify-end"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-slate-900/90 px-3 py-2 text-[12px] font-semibold text-amber-200 shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M6 7.5h12M6 12h12M6 16.5h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M4 3.5h16a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              {isOnline ? "Usando rutas guardadas" : "Rutas disponibles sin conexión"}
            </div>
          </div>
        )}

        {/* ── MOBILE: Top overlay (oculto en desktop) ── */}
        {!isDesktopLayout && (
        <MobileMapControls
          flowStep={flowStep}
          routeCount={displayedRouteCount}
          routesMapMode={routesMapMode}
          onToggleMode={toggleRoutesMapMode}
          nearbyNotice={!isTripActive ? (
            <div className="pointer-events-auto mt-2">
              <NearbyToast
                count={nearbyToast}
                onView={openRouteList}
                onDismiss={() => setNearbyToast(null)}
              />
            </div>
          ) : null}
        >
          {!isTripActive ? (
            <div className="pointer-events-auto mt-2 space-y-2">
              {renderRouteControls("mobile", true)}
            </div>
          ) : null}
        </MobileMapControls>
        )}

        {isTripActive && tripSession ? (
          <TripModePanel
            journey={tripSession.journey}
            progress={tripProgress}
            locationStatus={tripLocationStatus}
            landmarkCue={tripLandmarkCue}
            onStop={handleStopTrip}
          />
        ) : null}

        <TripOverlays
          alert={dropOffAlert}
          stopDialogOpen={isStopTripDialogOpen && isTripActive}
          onCancelStop={cancelStopTrip}
          onConfirmStop={completeStopTrip}
          onDismissAlert={dismissDropOffAlert}
        />

        {/* ── Share toast (mobile + desktop, posicion ajustada) ── */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className={`pointer-events-none absolute inset-x-0 bottom-24 z-50 flex justify-center transition-all duration-300 ${
            shareStatus !== "idle" ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl ${
              shareStatus === "error"
                ? "border-red-400/30 bg-slate-900/85 text-red-300"
                : "border-emerald-400/30 bg-slate-900/85 text-emerald-300"
            }`}
          >
            {shareStatus === "shared" && (
              <>
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M8.59 13.51l6.83 3.98m-.01-10.98-6.82 3.98M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm0 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM3 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Compartido!
              </>
            )}
            {shareStatus === "copied" && (
              <>
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M9 12l2 2 4-4M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Copiado al portapapeles!
              </>
            )}
            {shareStatus === "error" && "No se pudo copiar"}
          </div>
        </div>

        {/* ── MOBILE ONLY: FAB row — Resultado (izq) + Rutas (der) ── */}
        {!isDesktopLayout && (
        <div
          className={`absolute inset-x-4 z-20 items-end gap-2 lg:hidden ${isTripActive ? "hidden" : "flex"}`}
          style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {flowStep === 3 && !resultSheetOpen && !isSheetOpen && (
            <div className="absolute inset-x-0 bottom-16">
              <JourneyPreview route={bestSuggestion} transfer={selectedTransfer} pending={isCalculatingSuggestions} onOpen={() => setIsResultSheetOpen(true)} />
            </div>
          )}

          {/* Chat + Rutas apilados verticalmente — pegados a la esquina inferior derecha */}
          <div className="flex shrink-0 flex-row items-end gap-2 self-end ml-auto">
            {/* Botón chat — se oculta cuando el sheet está abierto */}
            <div className={`pointer-events-auto transition-all duration-200 ${isSheetOpen ? "pointer-events-none opacity-0 translate-y-1" : "opacity-100 translate-y-0"}`}>
              <ChatBotLauncher />
            </div>
            {/* Botón ver todas las rutas */}
            <button
              type="button"
              onPointerDown={() => { void preloadRouteList(); }}
              onClick={openRouteList}
              className={`ov-panel pointer-events-auto inline-flex h-12 items-center gap-2 rounded-2xl border pl-3.5 pr-4 text-[14px] font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl transition hover:border-lima/40 hover:shadow-[0_8px_32px_rgba(232,93,47,0.15)] active:scale-[0.97] ${isNearbyMode ? "border-lima/50 bg-lima/10" : ""}`}
              aria-label={selectedRoute
                ? `Ruta activa: ${formatRouteLabel(selectedRoute.name, selectedRoute.name)}`
                  : isNearbySearchPending
                    ? "Buscando rutas cerca de ti"
                    : isNearbyMode
                  ? `${nearbyRouteIds.length} rutas cerca de ti, ver rutas disponibles`
                  : `Rutas ${visibleRouteCount}, ver rutas disponibles`}
            >
              {selectedRoute ? (
                <>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: selectedRoute.color }} aria-hidden="true" />
                  <span className="flex min-w-0 flex-col">
                    <span className="ov-text-muted text-[10px] font-semibold leading-none">{selectedRoute.name}</span>
                    <span className="ov-text max-w-[120px] truncate text-[13px] leading-snug">
                      {getRouteDestination(selectedRoute.name) ?? selectedRoute.name}
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-lima" aria-hidden="true">
                    <path d="M4 7H20M4 12H20M4 17H14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                  <span className="ov-text">
                    {isNearbySearchPending ? "Buscando cerca" : isNearbyMode ? "Cerca de ti" : "Rutas"}
                  </span>
                  {isNearbySearchPending ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-lima/50 border-t-lima" aria-hidden="true" />
                  ) : (
                    <span className="ml-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-lima/20 px-1.5 text-[11px] font-bold text-lima">
                      {displayedRouteCount}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
        )}
      </div>

      {/* ── MOBILE ONLY: BottomSheet con lista de rutas ── */}
      {!isDesktopLayout && (
      <BottomSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        title="Selecciona una ruta"
        keepMounted
      >
        {routeListReady ? (
        <RouteList
          routes={listRoutes}
          isLoading={isLoadingData}
          suggestedRouteIds={suggestedRouteIds}
          suggestedRouteDirections={suggestedRouteDirections}
          bestSuggestedRouteId={bestSuggestion?.routeId ?? null}
          alternativeSuggestedRouteIds={alternativeSuggestedRouteIds}
          nearbyRouteIds={nearbyRouteIds}
          selectedRouteId={selectedRouteId}
          landmarksByRouteName={landmarksByRouteName}
          favoriteRouteNames={favoriteRouteNames}
          onToggleFavorite={toggleFavorite}
          onClearSelection={() => {
            handleClearSelection();
            setIsSheetOpen(false);
          }}
          onShowTeleferico={() => {
            setShowTeleferico(true);
            setIsSheetOpen(false);
          }}
          onSelectRoute={(routeId) => {
            handleSelectRoute(routeId);
            setIsSheetOpen(false);
          }}
        />
        ) : (
          <RouteListLoading />
        )}
      </BottomSheet>
      )}

      {/* ── MOBILE ONLY: Result sheet (full) ── */}
      {!isDesktopLayout && (
      <BottomSheet
        open={resultSheetOpen}
        onOpenChange={setIsResultSheetOpen}
        title={
          isCalculatingSuggestions
            ? "Buscando ruta..."
            : bestSuggestion
              ? formatRouteLabel(bestSuggestion.ruta)
              : selectedTransfer
                ? "Tu viaje con transbordo"
                : transfers.length > 0
                  ? `${transfers.length} opciones con transbordo`
                  : "Sin ruta directa"
        }
      >
        <div aria-live="polite" className="space-y-2.5">
          {renderRouteControls("mobile", false, true)}
        </div>
      </BottomSheet>
      )}

      <OnboardingGate />
      <PendingJourneyReports />
      <FareUpdateNotice deferUntilOnboarding />
    </main>
  );
}
