"use client";

import type { ReactNode } from "react";
import { getJourneyFareSummary } from "@/lib/journey-guidance";
import type { RouteOption } from "@/lib/route-calculation";
import { formatRouteLabel } from "@/lib/route-names";
import type { TransferOption } from "@/lib/transfers";

type DirectRouteResultProps = {
  alternatives: RouteOption[];
  showTitle?: boolean;
  isTripActive: boolean;
  route: RouteOption;
  routeEta: number | null;
  onEditDestination: () => void;
  onEditOrigin: () => void;
  onPromote: (routeId: number) => void;
  onShare: () => void;
  onToggleTrip: () => void;
  onViewMap: () => void;
};

export function DirectRouteResult({
  alternatives,
  showTitle = true,
  isTripActive,
  route,
  routeEta,
  onEditDestination,
  onEditOrigin,
  onPromote,
  onShare,
  onToggleTrip,
  onViewMap,
}: DirectRouteResultProps) {
  return (
    <div className="px-4 py-3">
      <p className="ov-text-muted text-[10px] font-bold tracking-[2px]">RUTA RECOMENDADA</p>
      {showTitle && <p className="ov-text mt-1 font-display text-[17px] font-bold leading-tight">
        {formatRouteLabel(route.ruta)}
      </p>}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-lg border ov-border ov-pill ov-text px-2.5 py-1 text-[12px] font-semibold">
          <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {routeEta !== null ? `~${routeEta} min en ruta` : "Tiempo por confirmar"}
        </span>
        {routeEta !== null && (
          <span className="ov-pill ov-border ov-text-muted inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[12px] font-medium">
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
              <path d="M13 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM9.5 22l1.5-5-2-2 1-6 3.5-1.5L16 10l3 1M9 9l-3 1.5L5 14m5.5 3L8 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            ~{route.estimatedMinutes} min puerta a puerta
          </span>
        )}
        <span className="ov-pill ov-border ov-text-muted inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[12px] font-medium">
          {getJourneyFareSummary([route.ruta]).badge}
        </span>

      </div>

      <TripToggleButton
        active={isTripActive}
        label={`Iniciar viaje en ${formatRouteLabel(route.ruta)}`}
        onClick={onToggleTrip}
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onEditOrigin}
          className="ov-pill ov-border ov-text-muted inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border text-[12px] font-semibold transition active:scale-[0.97]"
          aria-label="Cambiar punto de origen"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
            <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2" fill="currentColor" />
          </svg>
          Origen
        </button>
        <button
          type="button"
          onClick={onEditDestination}
          className="ov-pill ov-border ov-text-muted inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border text-[12px] font-semibold transition active:scale-[0.97]"
          aria-label="Cambiar destino"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5" />
          </svg>
          Destino
        </button>
        <button
          type="button"
          onClick={onShare}
          className="ov-pill ov-border ov-text inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border text-[12px] font-semibold transition active:scale-[0.97]"
          aria-label={`Compartir ruta ${formatRouteLabel(route.ruta)}`}
        >
          <ShareIcon /> Compartir
        </button>
        <button
          type="button"
          onClick={onViewMap}
          className="ov-pill ov-border ov-text border inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-[12px] font-semibold transition active:scale-[0.97]"
          aria-label={`Ver ${formatRouteLabel(route.ruta)} en el mapa`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13V7m0 13 6-3M9 7l6-3m6 17V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Ver en mapa
        </button>
      </div>


      {alternatives.length > 0 && (
        <details className="ov-border mt-3 border-t" key={route.routeId}>
          <summary className="ov-text-muted min-h-11 cursor-pointer py-3 text-[12px] font-semibold marker:text-lima">Ver {alternatives.length} alternativa{alternatives.length > 1 ? "s" : ""}</summary>
          <div className="space-y-2">
          {alternatives.map((alternative) => {
            const alternativeWalk = Math.round(alternative.distanciaA + alternative.distanciaB);
            const routeWalk = Math.round(route.distanciaA + route.distanciaB);
            const lessWalk = alternativeWalk < routeWalk;
            const faster = alternative.estimatedMinutes < route.estimatedMinutes;

            return (
              <button
                key={alternative.routeId}
                type="button"
                onClick={() => onPromote(alternative.routeId)}
                className="ov-pill ov-border flex w-full flex-wrap items-center gap-2 rounded-xl border px-3 py-3 text-left transition active:scale-[0.99] hover:border-lima/40"
                aria-label={`Usar ${formatRouteLabel(alternative.ruta)} como ruta recomendada`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: alternative.routeColor ?? "#6aab48" }} aria-hidden="true" />
                <span className="ov-text min-w-0 flex-1 text-[12px] font-semibold leading-5">
                  {formatRouteLabel(alternative.ruta)}
                </span>
                <span className="ov-text-muted flex w-full flex-wrap items-center gap-2 pl-4 text-[11px]">
                  <span>~{alternative.estimatedMinutes} min · {alternativeWalk} m a pie · ${getJourneyFareSummary([alternative.ruta]).totalMxn}</span>
                  <span>Sin transbordo</span>
                  {lessWalk && <ComparisonBadge variant="walk">Menos caminata</ComparisonBadge>}
                  {faster && <ComparisonBadge variant="fast">Más rápida</ComparisonBadge>}
                </span>
              </button>
            );
          })}
          </div>
        </details>
      )}


    </div>
  );
}

type SelectedTransferResultProps = {
  isTripActive: boolean;
  transfer: TransferOption;
  transferLandmark: string | null;
  transferWalkMinutes: number;
  onViewTransfer: () => void;
  onClear: () => void;
  onShare: () => void;
  onToggleTrip: () => void;
};

export function SelectedTransferResult({
  isTripActive,
  transfer,
  transferLandmark,
  transferWalkMinutes,
  onViewTransfer,
  onClear,
  onShare,
  onToggleTrip,
}: SelectedTransferResultProps) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-bold tracking-[2px] text-avocado-400">TRANSBORDO SELECCIONADO</p>
      <ol className="mt-3" aria-label="Tramos del viaje">
        <li className="flex gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-400 text-xs font-bold text-ink-900" aria-hidden="true">1</span>
          <div><p className="text-[11px] text-blue-400">Sube a la primera ruta</p><p className="ov-text text-[13px] font-semibold leading-5">{formatRouteLabel(transfer.routeAName)}</p></div>
        </li>
        <li className="ml-3.5 border-l-2 border-dashed border-cream-100/30 py-3 pl-6">
          <p className="ov-text text-xs leading-5">Baja de <span className="font-semibold text-blue-400">{formatRouteLabel(transfer.routeAName)}</span></p>
          <p className="ov-text mt-1 text-[13px] font-medium">Camina ~{Math.round(transfer.walkMeters)} m · {transferWalkMinutes} min</p>
          <p className="ov-text-muted mt-1 text-xs leading-5">{transferLandmark ? `Cambia cerca de ${transferLandmark}` : "Ubica el enlace a pie aproximado en el mapa"}</p>
        </li>
        <li className="flex gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-400 text-xs font-bold text-ink-900" aria-hidden="true">2</span>
          <div><p className="text-[11px] text-emerald-400">Sube a la segunda ruta</p><p className="ov-text text-[13px] font-semibold leading-5">{formatRouteLabel(transfer.routeBName)}</p></div>
        </li>
      </ol>
      <p className="ov-text mt-3 text-[13px] font-semibold">{getJourneyFareSummary([transfer.routeAName, transfer.routeBName]).badge}</p>
      <TripToggleButton active={isTripActive} className="mt-3" label="Iniciar viaje con transbordo" onClick={onToggleTrip} />
      <button type="button" onClick={onViewTransfer} className="ov-pill ov-border ov-text mt-2 min-h-11 w-full rounded-xl border px-3 text-[13px] font-semibold">Ver dónde cambiar</button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onClear}
          className="ov-pill ov-border ov-text min-h-11 rounded-xl border px-3 text-[12px] font-semibold transition active:scale-[0.97]"
          aria-label="Limpiar ruta seleccionada"
        >
          Cambiar rutas
        </button>
        <button
          type="button"
          onClick={onShare}
          className="ov-pill ov-border ov-text inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border text-[12px] font-semibold transition active:scale-[0.97]"
          aria-label="Compartir transbordo"
        >
          <ShareIcon /> Compartir
        </button>
      </div>
    </div>
  );
}

export function TransferOptionsResult({
  transfers,
  onMoveDestination,
  onSelect,
}: {
  transfers: TransferOption[];
  onMoveDestination: () => void;
  onSelect: (transfer: TransferOption) => void;
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-bold tracking-[2px] text-avocado-400">CON TRANSBORDO</p>
      <p className="ov-text-muted mt-0.5 text-[12px]">No hay ruta directa. Opciones con cambio de ruta:</p>
      <ul className="mt-2 max-h-[200px] space-y-1.5 overflow-y-auto">
        {transfers.map((transfer) => (
          <li key={`${transfer.routeAId}-${transfer.routeBId}`}>
            <button
              type="button"
              onClick={() => onSelect(transfer)}
              aria-label={`Seleccionar transbordo de ${transfer.routeAName} a ${transfer.routeBName}`}
              className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-avocado-400/20 bg-avocado-400/8 px-3 py-3 text-left transition active:scale-[0.99] hover:bg-avocado-400/12"
            >
              <TransferIcon />
              <span className="min-w-0 flex-1">
                <span className="ov-text block text-[12px] font-semibold">{formatRouteLabel(transfer.routeAName)}</span>
                <span className="ov-text-muted block text-[11px]">→ {formatRouteLabel(transfer.routeBName)}</span>
              </span>
              <span className="shrink-0 rounded-full bg-avocado-400/15 px-2 py-0.5 text-[10px] font-semibold text-avocado-600">
                ~{Math.round(transfer.walkMeters)} m a pie
              </span>
              <span className="ov-text-muted flex w-full flex-wrap gap-2 pl-6 text-[11px]">
                <span>1 transbordo · ${getJourneyFareSummary([transfer.routeAName, transfer.routeBName]).totalMxn} total</span>
                {transfer.walkMeters === Math.min(...transfers.map((option) => option.walkMeters)) && transfers.some((option) => option.walkMeters > transfer.walkMeters) && <span className="text-avocado-400">Menos caminata en el cambio</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <MoveDestinationButton onClick={onMoveDestination} />
    </div>
  );
}

export function EmptyRouteResult({ onMoveDestination }: { onMoveDestination: () => void }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-avocado-400/15">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-avocado-400" aria-hidden="true">
            <path d="M12 8v4m0 4h.01M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <div className="flex-1">
          <p className="ov-text text-[13px] font-semibold">Sin ruta directa</p>
          <p className="ov-text-muted mt-0.5 text-[12px] leading-snug">Ajusta alguno de los puntos e intenta de nuevo.</p>
        </div>
      </div>
      <MoveDestinationButton onClick={onMoveDestination} />
    </div>
  );
}

function ComparisonBadge({ children, variant }: { children: ReactNode; variant: "walk" | "fast" }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
      variant === "walk" ? "bg-emerald-500/10 text-emerald-400" : "bg-sky-500/10 text-sky-400"
    }`}>
      {children}
    </span>
  );
}

function MoveDestinationButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ov-pill ov-border ov-text-muted mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl border text-[12px] font-semibold transition active:scale-[0.97]"
      aria-label="Mover destino para buscar otra ruta"
    >
      Mover destino
    </button>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M8.59 13.51l6.83 3.98m-.01-10.98-6.82 3.98M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm0 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM3 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TransferIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-avocado-400" aria-hidden="true">
      <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M12 8v8M9 11l3-3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TripToggleButton({
  active,
  className = "mt-2",
  label,
  onClick,
}: {
  active: boolean;
  className?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${className} inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[12px] font-bold transition active:scale-[0.98] ${active ? "ov-pill ov-border ov-text border" : "bg-lima text-ink-900 shadow-[0_4px_16px_rgba(181,239,48,0.22)]"}`}
      aria-label={active ? "Finalizar viaje" : label}
    >
      {active ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path d="m9 7 8 5-8 5V7Z" fill="currentColor" />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )}
      {active ? "Finalizar viaje" : "Iniciar viaje"}
    </button>
  );
}
