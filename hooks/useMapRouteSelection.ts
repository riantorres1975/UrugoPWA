"use client";

import { useCallback, useMemo, useState } from "react";
import { useShareRoute } from "@/hooks/useShareRoute";
import type { MapShareOptions } from "@/lib/shared-map-state";
import type { RouteOption } from "@/lib/route-calculation";
import { formatRouteLabel } from "@/lib/route-names";
import {
  resolveTransferSelection,
  type TransferSelection,
} from "@/lib/transfer-selection";
import type { TransferOption } from "@/lib/transfers";
import type { Coordinates, ProductionRoute } from "@/lib/types";

type UseMapRouteSelectionOptions = {
  buildShareUrl: (options: MapShareOptions) => string;
  calculationKey: string | null;
  clearSharedRoute: () => void;
  destination: Coordinates | null;
  hasCurrentCalculation: boolean;
  initialShowTeleferico: boolean;
  origin: Coordinates | null;
  transfers: TransferOption[];
  recommendedTransfer?: TransferOption;
};

export function useMapRouteSelection({
  buildShareUrl,
  calculationKey,
  clearSharedRoute,
  destination,
  hasCurrentCalculation,
  initialShowTeleferico,
  origin,
  transfers,
  recommendedTransfer,
}: UseMapRouteSelectionOptions) {
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [hoveredRouteId, setHoveredRouteId] = useState<number | null>(null);
  const [showTeleferico, setShowTeleferico] = useState(initialShowTeleferico);
  const [transferSelection, setTransferSelection] = useState<TransferSelection | null>(null);
  const [dismissedRecommendation, setDismissedRecommendation] = useState<string | null>(null);
  const { share, status: shareStatus } = useShareRoute();

  const selectedTransfer = useMemo(
    () => resolveTransferSelection(
      transferSelection,
      calculationKey,
      hasCurrentCalculation,
      transfers,
    ) ?? (selectedRouteId === null && dismissedRecommendation !== calculationKey ? recommendedTransfer ?? null : null),
    [calculationKey, hasCurrentCalculation, transferSelection, transfers, recommendedTransfer, selectedRouteId, dismissedRecommendation],
  );

  const setSelectedTransfer = useCallback((transfer: TransferOption | null) => {
    setDismissedRecommendation(calculationKey);
    setTransferSelection(transfer && calculationKey ? { calculationKey, transfer } : null);
  }, [calculationKey]);

  const selectRoute = useCallback((routeId: number) => {
    clearSharedRoute();
    setSelectedTransfer(null);
    setShowTeleferico(false);
    setSelectedRouteId((current) => (current === routeId ? null : routeId));
  }, [clearSharedRoute, setSelectedTransfer]);

  const clearSelection = useCallback(() => {
    clearSharedRoute();
    setSelectedRouteId(null);
    setSelectedTransfer(null);
    setShowTeleferico(false);
  }, [clearSharedRoute, setSelectedTransfer]);

  const shareDirectRoute = useCallback((route: RouteOption) => share(
    formatRouteLabel(route.ruta),
    buildShareUrl({
      routeId: route.routeId,
      routeName: route.ruta,
      origin,
      destination,
      segmentStartIndex: route.indexA,
      segmentEndIndex: route.indexB,
    }),
  ), [buildShareUrl, destination, origin, share]);

  const shareTransfer = useCallback((transfer: TransferOption) => share(
    `${formatRouteLabel(transfer.routeAName)} → ${formatRouteLabel(transfer.routeBName)}`,
    buildShareUrl({
      routeName: `${transfer.routeAName} → ${transfer.routeBName}`,
      origin,
      destination,
      transfer,
    }),
  ), [buildShareUrl, destination, origin, share]);

  const shareActiveSelection = useCallback((
    route: ProductionRoute | null,
    suggestion: RouteOption | null,
  ) => {
    if (selectedTransfer) return shareTransfer(selectedTransfer);

    return share(
      route ? formatRouteLabel(route.name, route.name) : "Teleférico",
      buildShareUrl({
        routeId: route?.id ?? null,
        routeName: route?.name ?? "Teleférico Uruapan",
        origin,
        destination,
        segmentStartIndex: suggestion?.indexA,
        segmentEndIndex: suggestion?.indexB,
        showTeleferico: !route,
      }),
    );
  }, [buildShareUrl, destination, origin, selectedTransfer, share, shareTransfer]);

  return {
    clearSelection,
    hoveredRouteId,
    selectRoute,
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
  };
}
