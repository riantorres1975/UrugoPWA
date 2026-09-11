"use client";

import { useMemo } from "react";
import {
  applySelectedRouteSegment,
  buildArrowSegments,
  buildLandmarksByRouteName,
  buildRouteList,
  buildSimplifiedMapRoutes,
  countVisibleRoutes,
} from "@/lib/map-route-view";
import type { RouteOption } from "@/lib/route-calculation";
import type { TransferOption } from "@/lib/transfers";
import type { Coordinates, ProductionRoute } from "@/lib/types";

type UseMapRouteViewModelOptions = {
  destination: Coordinates | null;
  origin: Coordinates | null;
  routes: ProductionRoute[];
  selectedRouteId: number | null;
  selectedTransfer: TransferOption | null;
  sharedRouteSegment: Coordinates[] | null;
  sharedSegmentColor: string | null;
  suggestions: RouteOption[];
};

export function useMapRouteViewModel({
  destination,
  origin,
  routes,
  selectedRouteId,
  selectedTransfer,
  sharedRouteSegment,
  sharedSegmentColor,
  suggestions,
}: UseMapRouteViewModelOptions) {
  const listRoutes = useMemo(() => buildRouteList(routes), [routes]);
  const visibleRouteCount = useMemo(() => countVisibleRoutes(listRoutes), [listRoutes]);
  const simplifiedMapRoutes = useMemo(() => buildSimplifiedMapRoutes(routes), [routes]);
  const routesById = useMemo(
    () => new Map(routes.map((route) => [route.id, route])),
    [routes],
  );
  const landmarksByRouteName = useMemo(() => buildLandmarksByRouteName(routes), [routes]);
  const selectedRoute = useMemo(
    () => selectedRouteId === null ? null : routesById.get(selectedRouteId) ?? null,
    [routesById, selectedRouteId],
  );
  const suggestedRouteIds = useMemo(
    () => suggestions.map((suggestion) => suggestion.routeId),
    [suggestions],
  );
  const suggestedRouteDirections = useMemo(
    () => new Map(suggestions.map((suggestion) => [suggestion.routeId, suggestion.direccion])),
    [suggestions],
  );
  const bestSuggestion = suggestions[0] ?? null;
  const selectedSuggestion = useMemo(
    () => suggestions.find((suggestion) => suggestion.routeId === selectedRouteId) ?? null,
    [selectedRouteId, suggestions],
  );
  // A recommended journey is active even before a route is selected from the catalog.
  const activeSuggestion = selectedTransfer
    ? null
    : selectedSuggestion ?? (selectedRoute ? null : bestSuggestion);
  const selectedMapSegment = selectedTransfer
    ? null
    : activeSuggestion?.segment ?? sharedRouteSegment ?? null;
  const selectedSegmentColor = activeSuggestion
    ? activeSuggestion.routeColor ?? routesById.get(activeSuggestion.routeId)?.color ?? "#22c55e"
    : sharedSegmentColor;
  const arrowSegments = useMemo(() => buildArrowSegments({
    destination,
    origin,
    routes,
    selectedRoute,
    selectedSegment: selectedMapSegment,
    selectedTransfer,
    selectedSegmentColor,
  }), [
    destination,
    origin,
    routes,
    selectedMapSegment,
    selectedRoute,
    selectedTransfer,
    selectedSegmentColor,
  ]);
  const mapRoutes = useMemo(() => applySelectedRouteSegment({
    routes: simplifiedMapRoutes,
    selectedRoute,
    selectedRouteId,
    selectedSegment: selectedMapSegment,
  }), [simplifiedMapRoutes, selectedMapSegment, selectedRoute, selectedRouteId]);

  return {
    arrowSegments,
    bestSuggestion,
    landmarksByRouteName,
    listRoutes,
    mapRoutes,
    routesById,
    selectedMapSegment,
    selectedRoute,
    selectedSuggestion,
    suggestedRouteDirections,
    suggestedRouteIds,
    visibleRouteCount,
  };
}
