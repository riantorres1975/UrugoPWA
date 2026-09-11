"use client";

import type { RouteOption } from "@/lib/route-calculation";
import type { TransferOption } from "@/lib/transfers";
import { getJourneyFareSummary, isTelefericoRouteName } from "@/lib/journey-guidance";
import { formatRouteLabel } from "@/lib/route-names";

export default function JourneyPreview({ route, transfer, pending, onOpen }: {
  route: RouteOption | null;
  transfer: TransferOption | null;
  pending: boolean;
  onOpen: () => void;
}) {
  const names = transfer ? [transfer.routeAName, transfer.routeBName] : route ? [route.ruta] : [];
  const title = transfer ? `${formatRouteLabel(transfer.routeAName)} → ${formatRouteLabel(transfer.routeBName)}` : route ? formatRouteLabel(route.ruta) : "Revisa las opciones de viaje";
  return (
    <button type="button" onClick={onOpen} aria-label="Ver resultado de ruta"
      className="ov-panel ov-border flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-lg backdrop-blur-xl">
      <span className="min-w-0 flex-1">
        <span className="ov-text line-clamp-2 text-sm font-semibold">{pending ? "Buscando tu ruta…" : title}</span>
        <span className="ov-text-muted mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs">
          {names.length > 0 && <>
            <span>{transfer ? "1 transbordo" : isTelefericoRouteName(names[0]) ? "Teleférico" : "1 camión"}</span>
            {route && !transfer && <span>· ~{route.estimatedMinutes} min</span>}
            <span>· ${getJourneyFareSummary(names).totalMxn}{transfer ? " total" : ""}</span>
          </>}
          {!names.length && <span>Toca para ver los detalles</span>}
        </span>
      </span>
      <span className="shrink-0 text-xs font-semibold text-lima">Detalles <span aria-hidden="true">↑</span></span>
    </button>
  );
}
