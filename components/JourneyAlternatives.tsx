"use client";
import type { RouteOption } from "@/lib/route-calculation";
import type { TransferOption } from "@/lib/transfers";
import { formatRouteLabel } from "@/lib/route-names";
import { getJourneyFareSummary } from "@/lib/journey-guidance";
import JourneyWalkingSummary from "@/components/JourneyWalkingSummary";
export default function JourneyAlternatives({ routes, transfers, activeRoute, activeTransfer, onRoute, onTransfer }: {
  routes: RouteOption[]; transfers: TransferOption[]; activeRoute: RouteOption | null; activeTransfer: TransferOption | null;
  onRoute: (id: number) => void; onTransfer: (transfer: TransferOption) => void;
}) {
  const active = activeTransfer ?? activeRoute;
  const activeWalk = active?.cost ? active.cost.originWalkM + active.cost.destinationWalkM + active.cost.transferWalkM : null;
  const choices = [
    ...routes.filter((route) => route.routeId !== activeRoute?.routeId || activeTransfer).map((route) => ({ key: `r${route.routeId}`, names: [route.ruta], minutes: route.estimatedMinutes, cost: route.cost, walking: route.walking, concern: route.communityConcern, select: () => onRoute(route.routeId), label: `Usar ${formatRouteLabel(route.ruta)} como ruta recomendada` })),
    ...transfers.filter((transfer) => transfer.routeAId !== activeTransfer?.routeAId || transfer.routeBId !== activeTransfer?.routeBId).map((transfer) => ({ key: `t${transfer.routeAId}-${transfer.routeBId}`, names: [transfer.routeAName, transfer.routeBName], minutes: transfer.estimatedMinutes, cost: transfer.cost, walking: transfer.walking, concern: transfer.communityConcern, select: () => onTransfer(transfer), label: `Seleccionar transbordo de ${transfer.routeAName} a ${transfer.routeBName}` })),
  ];
  if (!choices.length) return null;
  return <section className="ov-border border-t px-4 py-3" aria-label="Otras opciones de viaje">
    <details>
    <summary className="ov-text min-h-11 cursor-pointer py-3 text-sm font-semibold">Compara otras opciones ({choices.length})</summary>
    <div className="mt-2 space-y-3">{choices.map((choice) => {
      const walk = choice.cost ? choice.cost.originWalkM + choice.cost.destinationWalkM + choice.cost.transferWalkM : null;
      const savedWalk = activeWalk !== null && walk !== null ? Math.round(activeWalk - walk) : 0;
      const extra = choice.minutes && active?.estimatedMinutes ? choice.minutes - active.estimatedMinutes : null;
      return <article key={choice.key} className="ov-pill ov-border rounded-xl border p-3">
        <p className="ov-text text-sm font-semibold">{choice.names.map((name) => formatRouteLabel(name)).join(" → ")}</p>
        <p className="ov-text-muted mt-1 text-xs">~{choice.minutes} min · {choice.names.length > 1 ? "1 transbordo" : "Sin transbordo"} · ${getJourneyFareSummary(choice.names).totalMxn}</p>
        {savedWalk > 50 && <p className="mt-2 text-xs text-lima">Caminas {savedWalk} m menos{extra !== null && extra > 0 ? ` · ~${extra} min más` : ""}</p>}
        {extra !== null && extra < 0 && <p className="mt-1 text-xs text-lima">~{-extra} min más rápida</p>}
        <JourneyWalkingSummary cost={choice.cost} walking={choice.walking} concern={choice.concern} />
        <button type="button" aria-label={choice.label} onClick={choice.select} className="ov-border ov-text mt-3 min-h-11 w-full rounded-xl border text-xs font-semibold hover:border-lima">Elegir esta opción</button>
      </article>;
    })}</div>
    </details>
  </section>;
}
