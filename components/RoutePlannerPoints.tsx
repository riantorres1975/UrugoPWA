"use client";

import type { ActivePoint, FlowStep } from "@/hooks/useRoutePlanner";
import type { GeoStatus } from "@/hooks/useUruapanGeolocation";
import type { Coordinates } from "@/lib/types";

type RoutePlannerPointsProps = {
  originPlaceLabel?: string;
  destinationPlaceLabel?: string;
  abExpanded: boolean;
  activePoint: ActivePoint;
  destinationPoint: Coordinates | null;
  flowStep: FlowStep;
  geoAccuracyWarning: boolean;
  geoStatus: GeoStatus;
  isMobile: boolean;
  isShortScreen: boolean;
  manualOrigin: Coordinates | null;
  originPoint: Coordinates | null;
  requestedDestination: string | null;
  userLocation: Coordinates | null;
  onCollapse: () => void;
  onDismissRequestedDestination: () => void;
  onExpand: () => void;
  onReset: () => void;
  onSelectPoint: (point: Exclude<ActivePoint, null>) => void;
};

export default function RoutePlannerPoints({
  originPlaceLabel,
  destinationPlaceLabel,
  abExpanded,
  activePoint,
  destinationPoint,
  flowStep,
  geoAccuracyWarning,
  geoStatus,
  isMobile,
  isShortScreen,
  manualOrigin,
  originPoint,
  requestedDestination,
  userLocation,
  onCollapse,
  onDismissRequestedDestination,
  onExpand,
  onReset,
  onSelectPoint,
}: RoutePlannerPointsProps) {
  return (
    <>
      {isMobile && isShortScreen && !abExpanded ? (
        <button
          type="button"
          onClick={onExpand}
          className="ov-panel flex w-full items-center gap-2 rounded-2xl border px-3 py-2.5 shadow-soft backdrop-blur-xl transition active:scale-[0.99]"
          aria-expanded={false}
          aria-label="Ajustar origen y destino manualmente"
        >
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className={`h-2.5 w-2.5 rounded-full ${originPoint ? "bg-lima" : "bg-foreground/25"}`} />
            <ArrowIcon className="ov-text-muted h-3 w-3" />
            <span className={`h-2.5 w-2.5 rounded-full ${destinationPoint ? "bg-lima" : "bg-foreground/25"}`} />
          </span>
          <span className="ov-text min-w-0 flex-1 truncate text-left text-[12px] font-semibold">
            {originPoint && destinationPoint
              ? "Origen y destino listos"
              : originPoint
                ? "Ajustar destino manualmente"
                : "Ajustar origen y destino"}
          </span>
          <svg viewBox="0 0 24 24" fill="none" className="ov-text-muted h-4 w-4 shrink-0" aria-hidden="true">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : (
        <div className="ov-panel w-full rounded-2xl border p-1.5 shadow-soft backdrop-blur-xl">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSelectPoint("origin")}
              className={`inline-flex min-h-16 min-w-0 flex-1 items-center gap-1.5 rounded-xl border px-2 py-2 text-left text-[13px] font-semibold transition active:scale-[0.97] ${
                originPoint
                  ? "border-lima/50 bg-lima/15 text-lima"
                  : activePoint === "origin"
                    ? "ring-pulse-active border-lima/60 bg-lima/10 text-lima"
                    : "ov-pill ov-border ov-text-muted"
              }`}
              aria-label={getOriginAriaLabel({ geoAccuracyWarning, geoStatus, manualOrigin, userLocation })}
            >
              <svg viewBox="0 0 24 24" fill="none" className="hidden h-4 w-4 shrink-0 min-[380px]:block" aria-hidden="true">
                <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2" fill="currentColor" />
              </svg>
              <span className="min-w-0 flex-1">
                <span className="block">Origen</span>
                <span className="ov-text-muted mt-0.5 line-clamp-2 break-words text-[10px] font-medium leading-[14px]">
                  {manualOrigin ? originPlaceLabel ?? "Marcado en mapa" : geoStatus === "outside" ? "Elige en Uruapan" : geoAccuracyWarning ? "GPS impreciso" : userLocation ? "Mi ubicación" : "Elige un lugar"}
                </span>
              </span>
              {(geoAccuracyWarning || geoStatus === "outside") && !manualOrigin && (
                <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
              )}
            </button>

            <ArrowIcon className="ov-text-muted h-4 w-4 shrink-0" />

            <button
              type="button"
              onClick={() => onSelectPoint("destination")}
              disabled={!originPoint}
              className={`inline-flex min-h-16 min-w-0 flex-1 items-center gap-1.5 rounded-xl border px-2 py-2 text-left text-[13px] font-semibold transition active:scale-[0.97] disabled:opacity-40 ${
                destinationPoint
                  ? "border-lima/50 bg-lima/15 text-lima"
                  : activePoint === "destination"
                    ? "ring-pulse-active border-lima/60 bg-lima/10 text-lima"
                    : "ov-pill ov-border ov-text-muted"
              }`}
              aria-label={destinationPoint ? "Destino marcado, toca para cambiar" : "Toca el mapa para marcar tu destino"}
            >
              <svg viewBox="0 0 24 24" fill="none" className="hidden h-4 w-4 shrink-0 min-[380px]:block" aria-hidden="true">
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5" />
              </svg>
              <span className="min-w-0 flex-1"><span className="block">Destino</span>
                <span className="ov-text-muted mt-0.5 line-clamp-2 break-words text-[10px] font-medium leading-[14px]">{destinationPoint ? destinationPlaceLabel ?? "Marcado en mapa" : "Elige un lugar"}</span>
              </span>
            </button>

            {(originPoint || destinationPoint) && (
              <button
                type="button"
                onClick={onReset}
                className="ov-pill ov-border ov-text-muted inline-flex h-10 items-center rounded-xl border px-2.5 text-[12px] font-semibold transition hover:border-red-400/40 hover:text-red-400 active:scale-[0.97]"
                aria-label="Reiniciar puntos A y B"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}

            {isMobile && isShortScreen && abExpanded && (
              <button
                type="button"
                onClick={onCollapse}
                className="ov-pill ov-border ov-text-muted inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-xl border transition hover:text-lima active:scale-[0.97]"
                aria-label="Colapsar origen y destino"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {(flowStep === 1 || flowStep === 2 || (flowStep === 3 && activePoint !== null)) && (
        <div className="w-full">
          <div className="ov-panel flex items-center gap-1.5 rounded-2xl border px-3 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.15)] backdrop-blur-xl">
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lima/60 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lima" />
            </span>
            <p className="ov-text flex-1 text-[12px] font-medium leading-snug">
              <PointGuidance activePoint={activePoint} destinationPoint={destinationPoint} flowStep={flowStep} geoStatus={geoStatus} />
            </p>
          </div>
        </div>
      )}

      {requestedDestination && flowStep !== 3 && (
        <div className="ov-panel flex w-full items-start gap-2 rounded-2xl border px-3.5 py-3 text-left shadow-[0_2px_12px_rgba(0,0,0,0.15)] backdrop-blur-xl">
          <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-lima" aria-hidden="true">
            <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2" fill="currentColor" />
          </svg>
          <p className="ov-text-muted min-w-0 flex-1 text-[12px] leading-snug">
            Llegaste buscando <span className="font-bold text-lima">{requestedDestination}</span>.{" "}
            {userLocation
              ? "Usando tu ubicación actual como origen, calculando tu ruta..."
              : geoStatus === "outside"
                ? "Estás fuera de Uruapan. Busca o marca manualmente un origen dentro de la ciudad."
                : destinationPoint
                  ? "Toca el mapa donde estás para marcar tu origen."
                  : "Toca el mapa para marcar tu origen y luego la zona de destino."}
          </p>
          <button
            type="button"
            onClick={onDismissRequestedDestination}
            className="ov-pill ov-text-muted grid h-7 w-7 shrink-0 place-items-center rounded-lg transition hover:opacity-80 active:scale-95"
            aria-label="Quitar destino sugerido"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
function getOriginAriaLabel({
  geoAccuracyWarning,
  geoStatus,
  manualOrigin,
  userLocation,
}: Pick<RoutePlannerPointsProps, "geoAccuracyWarning" | "geoStatus" | "manualOrigin" | "userLocation">) {
  if (manualOrigin) return "Origen ajustado manualmente, toca para cambiar";
  if (geoStatus === "outside") return "Ubicación fuera de Uruapan, toca el mapa para marcar el origen manualmente";
  if (geoAccuracyWarning) return "GPS impreciso, toca el mapa para fijar tu origen manualmente";
  if (userLocation) return "Usando tu ubicación actual, toca para ajustar";
  return "Toca para marcar punto de origen";
}

function PointGuidance({
  activePoint,
  destinationPoint,
  flowStep,
  geoStatus,
}: Pick<RoutePlannerPointsProps, "activePoint" | "destinationPoint" | "flowStep" | "geoStatus">) {
  if (activePoint === "origin" && destinationPoint) {
    return <><span>Toca el mapa para mover tu </span><span className="font-bold text-lima">origen</span></>;
  }
  if (activePoint === "destination" && flowStep === 3) {
    return <><span>Toca el mapa para mover tu </span><span className="font-bold text-lima">destino</span></>;
  }
  if (flowStep !== 1) {
    return <><span>Busca arriba o </span><span className="font-bold text-lima">toca el mapa</span></>;
  }
  if (geoStatus === "locating") return <>Obteniendo tu ubicación...</>;
  if (geoStatus === "outside") return <><span>Estás fuera de Uruapan. Busca tu </span><span className="font-bold text-lima">origen manualmente</span></>;
  if (geoStatus === "inaccurate") return <><span>GPS impreciso. Busca tu </span><span className="font-bold text-lima">origen</span></>;
  if (geoStatus === "error") return <><span>Busca o marca tu </span><span className="font-bold text-lima">origen</span></>;
  return <><span>Usando tu </span><span className="font-bold text-lima">ubicación actual</span></>;
}

function ArrowIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
