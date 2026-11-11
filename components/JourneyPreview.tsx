"use client";

import { ArrowUpRight, BusFront, CableCar, Footprints, Route } from "lucide-react";
import type { RouteOption } from "@/lib/route-calculation";
import type { TransferOption } from "@/lib/transfers";
import { getJourneyFareSummary, isTelefericoRouteName } from "@/lib/journey-guidance";
import { formatRouteLabel } from "@/lib/route-names";
import TransferTradeoff from "@/components/TransferTradeoff";

export default function JourneyPreview({ route, transfer, directAlternative, pending, onOpen }: {
  route: RouteOption | null;
  transfer: TransferOption | null;
  directAlternative?: RouteOption | null;
  pending: boolean;
  onOpen: () => void;
}) {
  const names = transfer ? [transfer.routeAName, transfer.routeBName] : route ? [route.ruta] : [];
  const title = transfer ? `${formatRouteLabel(transfer.routeAName)} → ${formatRouteLabel(transfer.routeBName)}` : route ? formatRouteLabel(route.ruta) : "Revisa las opciones de viaje";
  const cableCar = names.length > 0 && isTelefericoRouteName(names[0]);
  const Icon = transfer || !names.length ? Route : cableCar ? CableCar : BusFront;
  const cost = transfer?.cost ?? route?.cost;
  const walkingM = cost ? Math.round(cost.originWalkM + cost.transferWalkM + cost.destinationWalkM) : null;
  return (
    <button type="button" onClick={onOpen} aria-label="Ver resultado de ruta" aria-haspopup="dialog"
      className="map-ticket flex w-full items-center gap-2.5 rounded-2xl border p-3 text-left transition active:scale-[0.99]">
      <span className="map-ticket-icon grid h-9 w-9 shrink-0 place-items-center rounded-xl" aria-hidden="true">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="map-ticket-label block text-[10px] font-bold uppercase tracking-[.12em]">
          {pending ? "Calculando" : transfer ? "1 transbordo" : cableCar ? "Teleférico" : route ? "1 camión" : "Plan de viaje"}
        </span>
        <span className="line-clamp-2 text-sm font-bold leading-tight">{pending ? "Buscando tu ruta…" : title}</span>
        <span className="map-ticket-meta mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
          {names.length > 0 && <>
            {route && !transfer && <span>~{route.estimatedMinutes} min</span>}
            {transfer?.estimatedMinutes && <span>~{Math.round(transfer.estimatedMinutes)} min</span>}
            <span>${getJourneyFareSummary(names).totalMxn}{transfer ? " total" : ""}</span>
            {walkingM !== null && <span className="inline-flex items-center gap-1"><Footprints className="h-3 w-3" aria-hidden="true" />{walkingM} m a pie</span>}
          </>}
          {!names.length && <span>Toca para ver los detalles</span>}
        </span>
        {!pending && transfer && <TransferTradeoff transfer={transfer} direct={directAlternative} />}
      </span>
      <span className="map-ticket-action grid h-8 w-8 shrink-0 place-items-center rounded-lg" aria-hidden="true"><ArrowUpRight className="h-4 w-4" /></span>
    </button>
  );
}
