"use client";

import { useId, useState } from "react";
import {
  BusFront,
  CableCar,
  CircleCheck,
  Footprints,
  LocateFixed,
  MapPin,
  Navigation,
  TriangleAlert,
  WifiOff,
  X,
} from "lucide-react";
import type { TripConfirmation, TripJourney, TripProgress } from "@/lib/trip-mode";
import type { TripAlertSettings } from "@/lib/trip-storage";
import type { LandmarkCue } from "@/lib/landmark-guidance";

type TripLocationStatus = "locating" | "ready" | "unavailable";

type TripModePanelProps = {
  journey: TripJourney;
  progress: TripProgress | null;
  locationStatus: TripLocationStatus;
  landmarkCue?: LandmarkCue | null;
  onStop: () => void;
  awaitingBoarding?: "first" | "second";
  onConfirmStage: (action: TripConfirmation) => void;
  alertSettings: TripAlertSettings;
  alertSupport: TripAlertSettings;
  onAlertSettingsChange: (settings: TripAlertSettings) => void;
  onLocate: () => void;
  onFindAnother: () => void;
  actionBusy: boolean;
  actionError: string | null;
};

type TripCopy = {
  eyebrow: string;
  title: string;
  detail: string;
  milestoneLabel: string;
  tone: "active" | "walking" | "warning" | "done" | "waiting";
};

type PanelIconKind = "bus" | "cable-car" | "check" | "feet" | "locate" | "pin" | "warning" | "wifi-off";

function formatDistance(distanceM: number | null) {
  if (distanceM === null || !Number.isFinite(distanceM)) return "Sin distancia";
  if (distanceM >= 950) return `~${(distanceM / 1000).toFixed(1)} km`;
  return `~${Math.round(distanceM)} m`;
}

function usesTeleferico(name?: string | null) {
  return Boolean(name?.toLowerCase().includes("teleférico"));
}

function getPanelIconKind(journey: TripJourney, progress: TripProgress | null, locationStatus: TripLocationStatus): PanelIconKind {
  if (locationStatus === "unavailable") return "wifi-off";
  if (!progress || locationStatus === "locating") return "locate";
  if (
    (progress.phase === "riding-direct" && usesTeleferico(progress.currentRouteName)) ||
    (progress.phase === "riding-first" && usesTeleferico(progress.currentRouteName)) ||
    (progress.phase === "riding-second" && usesTeleferico(progress.currentRouteName)) ||
    (progress.phase === "walking-transfer" && usesTeleferico(progress.nextRouteName)) ||
    (progress.phase === "boarding" && journey.boardingStopLabel)
  ) {
    return "cable-car";
  }
  if (progress.phase === "boarding") return "pin";
  if (progress.phase === "walking-transfer" || progress.phase === "walking-destination") return "feet";
  if (progress.phase === "off-route") return "warning";
  if (progress.phase === "arrived") return "check";
  return "bus";
}

function getTripCopy(
  journey: TripJourney,
  progress: TripProgress | null,
  locationStatus: TripLocationStatus,
): TripCopy {
  if (locationStatus === "unavailable") {
    return {
      eyebrow: "GPS NO DISPONIBLE",
      title: "Conservamos tu último avance",
      detail: "El seguimiento continuará cuando vuelva la señal.",
      milestoneLabel: "Señal pausada",
      tone: "warning",
    };
  }

  if (!progress) {
    return {
      eyebrow: "CONECTANDO GPS",
      title: "Buscando tu ubicación",
      detail: "El recorrido ya está listo.",
      milestoneLabel: "GPS pendiente",
      tone: "waiting",
    };
  }

  switch (progress.phase) {
    case "boarding":
      if (journey.boardingStopLabel) {
        return {
          eyebrow: "VE A LA ESTACIÓN",
          title: journey.boardingStopLabel,
          detail: progress.remainingMinutes
            ? `A ~${progress.remainingMinutes} min caminando`
            : "Acércate al acceso del Teleférico",
          milestoneLabel: "Hasta subir",
          tone: "walking",
        };
      }
      return {
        eyebrow: "VE AL PUNTO DE SUBIDA",
        title: progress.currentRouteName ?? "Primera ruta",
        detail: progress.remainingMinutes
          ? `A ~${progress.remainingMinutes} min caminando`
          : "Acércate al inicio del recorrido",
        milestoneLabel: "Hasta subir",
        tone: "walking",
      };
    case "riding-direct":
      return {
        eyebrow: "EN CAMINO",
        title: progress.currentRouteName ?? "Ruta activa",
        detail: journey.destinationStopLabel
          ? `Baja en la estación ${journey.destinationStopLabel} · ~${progress.remainingMinutes ?? 0} min`
          : `Bajada en ~${progress.remainingMinutes ?? 0} min`,
        milestoneLabel: "Hasta bajar",
        tone: "active",
      };
    case "riding-first":
      return {
        eyebrow: "PRIMER TRAMO",
        title: progress.currentRouteName ?? (journey.kind === "transfer" ? journey.routeAName : "Ruta activa"),
        detail: journey.kind === "transfer" && journey.transferArrivalStopLabel
          ? `Baja en la estación ${journey.transferArrivalStopLabel} · ~${progress.remainingMinutes ?? 0} min`
          : `Transbordo en ~${progress.remainingMinutes ?? 0} min`,
        milestoneLabel: "Hasta cambiar",
        tone: "active",
      };
    case "walking-transfer":
      if (journey.kind === "transfer" && journey.transferBoardingStopLabel) {
        return {
          eyebrow: "VE A LA ESTACIÓN",
          title: journey.transferBoardingStopLabel,
          detail: `Para tomar ${progress.nextRouteName ?? "el Teleférico"} · ~${Math.round(progress.distanceToMilestoneM ?? 0)} m`,
          milestoneLabel: "Hasta abordar",
          tone: "walking",
        };
      }
      return {
        eyebrow: "TRANSBORDO",
        title: `Cambia a ${progress.nextRouteName ?? "la segunda ruta"}`,
        detail: `Punto de subida a ~${Math.round(progress.distanceToMilestoneM ?? 0)} m`,
        milestoneLabel: "Hasta subir",
        tone: "walking",
      };
    case "riding-second":
      return {
        eyebrow: "SEGUNDO TRAMO",
        title: progress.currentRouteName ?? "Segunda ruta",
        detail: journey.destinationStopLabel
          ? `Baja en la estación ${journey.destinationStopLabel} · ~${progress.remainingMinutes ?? 0} min`
          : `Bajada en ~${progress.remainingMinutes ?? 0} min`,
        milestoneLabel: "Hasta bajar",
        tone: "active",
      };
    case "walking-destination":
      return {
        eyebrow: "ÚLTIMO TRAMO",
        title: "Camina a tu destino",
        detail: `Faltan ~${Math.round(progress.distanceToMilestoneM ?? 0)} m · ${progress.remainingMinutes ?? 0} min`,
        milestoneLabel: "Hasta destino",
        tone: "walking",
      };
    case "off-route":
      return {
        eyebrow: "FUERA DEL RECORRIDO",
        title: "Vuelve hacia el trazo marcado",
        detail: "Tu viaje sigue activo.",
        milestoneLabel: "Reubícate",
        tone: "warning",
      };
    case "arrived":
      return {
        eyebrow: "DESTINO",
        title: "Llegaste",
        detail: "Viaje completado.",
        milestoneLabel: "Completado",
        tone: "done",
      };
  }
}

function toneClass(tone: TripCopy["tone"]) {
  switch (tone) {
    case "warning":
      return "border-amber-300/35 bg-amber-300/12 text-amber-200";
    case "done":
      return "border-emerald-300/35 bg-emerald-300/12 text-emerald-200";
    case "walking":
      return "border-sky-300/35 bg-sky-300/12 text-sky-100";
    case "waiting":
      return "ov-border ov-text-muted ov-pill";
    case "active":
      return "border-lima/35 bg-lima/12 text-lima";
  }
}

function TripPhaseIcon({ kind }: { kind: PanelIconKind }) {
  const className = "h-5 w-5";
  const strokeWidth = 2.1;
  switch (kind) {
    case "bus":
      return <BusFront className={className} aria-hidden="true" strokeWidth={strokeWidth} />;
    case "cable-car":
      return <CableCar className={className} aria-hidden="true" strokeWidth={strokeWidth} />;
    case "check":
      return <CircleCheck className={className} aria-hidden="true" strokeWidth={strokeWidth} />;
    case "feet":
      return <Footprints className={className} aria-hidden="true" strokeWidth={strokeWidth} />;
    case "locate":
      return <LocateFixed className={className} aria-hidden="true" strokeWidth={strokeWidth} />;
    case "pin":
      return <MapPin className={className} aria-hidden="true" strokeWidth={strokeWidth} />;
    case "warning":
      return <TriangleAlert className={className} aria-hidden="true" strokeWidth={strokeWidth} />;
    case "wifi-off":
      return <WifiOff className={className} aria-hidden="true" strokeWidth={strokeWidth} />;
  }
}

export default function TripModePanel({
  journey,
  progress,
  locationStatus,
  landmarkCue,
  onStop,
  awaitingBoarding, onConfirmStage, alertSettings, alertSupport,
  onAlertSettingsChange, onLocate, onFindAnother, actionBusy, actionError,
}: TripModePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const copy = getTripCopy(journey, progress, locationStatus);
  const canConfirm = locationStatus === "ready" && !!progress;
  const riding = progress?.phase.startsWith("riding") || progress?.phase === "off-route";
  const steps = journey.kind === "transfer"
    ? [journey.routeAName, `Cambia a ${journey.routeBName}`, "Camina a tu destino"]
    : [journey.routeName, "Camina a tu destino"];
  const currentStep = progress?.phase === "walking-destination" || progress?.phase === "arrived"
    ? steps.length - 1 : journey.kind === "transfer" && (awaitingBoarding === "second" || progress?.phase === "riding-second" || progress?.phase === "walking-transfer") ? 1 : 0;
  const percent = Math.round(Math.min(1, Math.max(0, progress?.progressRatio ?? 0)) * 100);
  const iconKind = getPanelIconKind(journey, progress, locationStatus);
  const remainingText = progress ? formatDistance(progress.distanceToMilestoneM) : "Preparando";
  const statusText = locationStatus === "ready"
    ? "GPS activo"
    : locationStatus === "locating"
      ? "Buscando GPS"
      : "Sin GPS";

  return (
    <section
      aria-label="Modo viaje"
      className={`pointer-events-auto overflow-y-auto rounded-2xl ${expanded ? "max-h-[60dvh]" : "max-h-[45dvh]"}`}
    >
      <div className="ov-panel ov-border overflow-hidden rounded-2xl border shadow-[0_12px_40px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="flex items-center gap-3 px-3.5 py-3">
          <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${toneClass(copy.tone)}`}>
            {locationStatus === "locating" ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
            ) : (
              <TripPhaseIcon kind={iconKind} />
            )}
            {locationStatus === "ready" ? (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-900 bg-emerald-400" aria-hidden="true" />
            ) : null}
          </span>

          <div className="min-w-0 flex-1" role="status" aria-live="polite">
            <p className="text-[9px] font-bold tracking-[1.5px] text-lima">{copy.eyebrow}</p>
            <p className="ov-text text-[14px] font-bold leading-5">{copy.title}</p>
            <p className="ov-text-muted text-[11px] leading-4">{copy.detail}</p>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
              <span className={`inline-flex min-h-6 items-center rounded-full border px-2 py-1 text-[10px] font-bold ${toneClass(copy.tone)}`}>
                <Navigation className="mr-1 h-3 w-3" aria-hidden="true" />
                {copy.milestoneLabel}: {remainingText}
              </span>
              <span className="ov-pill ov-border ov-text-muted inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-semibold">
                {statusText}
              </span>
            </div>
            {landmarkCue ? (
              <p className="mt-0.5 truncate text-[11px] font-semibold leading-4 text-lima/90">
                Próxima referencia: {landmarkCue.name} · ~{Math.round(landmarkCue.distanceM)} m
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onStop}
            className="ov-pill ov-border ov-text-muted inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-[11px] font-semibold transition hover:border-red-400/50 hover:text-red-400 active:scale-[0.97]"
            aria-label={progress?.phase === "arrived" ? "Cerrar viaje completado" : "Finalizar viaje"}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2.2} />
            <span className="hidden sm:inline">{progress?.phase === "arrived" ? "Cerrar" : "Finalizar"}</span>
          </button>
        </div>

        <div className="space-y-2 px-3.5 pb-3">
          {journey.kind === "transfer" && currentStep === 0 ? (
            <p className="ov-text-muted text-xs">Después de bajar: toma <strong className="ov-text">{journey.routeBName}</strong>.</p>
          ) : null}
          {awaitingBoarding ? (
            <button type="button" disabled={!canConfirm} onClick={() => onConfirmStage("board")}
              className="min-h-11 w-full rounded-xl bg-lima px-3 text-sm font-bold text-ink-900 disabled:opacity-50">
              Ya subí
            </button>
          ) : riding ? (
            <button type="button" disabled={!canConfirm} onClick={() => onConfirmStage("alight")}
              className="ov-pill ov-border ov-text min-h-11 w-full rounded-xl border px-3 text-sm font-semibold disabled:opacity-50">
              Ya bajé
            </button>
          ) : null}
          {awaitingBoarding ? <p className="ov-text-muted text-[11px]">Confirma cuando estés dentro del vehículo. Acercarte a la ruta no inicia el recorrido.</p> : null}
          <button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded(!expanded)}
            className="ov-text-muted min-h-11 w-full rounded-xl text-xs font-semibold hover:ov-text">
            {expanded ? "Ocultar detalles y avisos ↑" : "Detalles y avisos ↓"}
          </button>
          {expanded ? (
            <div id={detailsId} className="space-y-3 border-t border-white/10 pt-3">
              <ol aria-label="Pasos de tu viaje" className="space-y-2">
                {steps.map((step, index) => (
                  <li key={index} aria-current={index === currentStep ? "step" : undefined}
                    className={`flex items-center gap-2 text-xs ${index === currentStep ? "text-lima" : "ov-text-muted"}`}>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current">{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              {riding && !awaitingBoarding ? <button type="button" disabled={!canConfirm} onClick={() => onConfirmStage("wait")}
                className="ov-pill ov-border ov-text min-h-11 w-full rounded-xl border px-3 text-xs disabled:opacity-50">Todavía no subo</button> : null}
              <fieldset className="ov-border rounded-xl border p-3">
                <legend className="ov-text px-1 text-xs font-semibold">Avisos del viaje</legend>
                {([ ["voice", "Voz"], ["vibration", "Vibración"] ] as const).map(([key, label]) => (
                  <label key={key} className={`flex min-h-11 items-center justify-between gap-3 text-sm ${alertSupport[key] ? "ov-text" : "ov-text-muted"}`}>
                    <span>{label}{!alertSupport[key] ? <span className="block text-[11px]">No disponible en este navegador</span> : null}</span>
                    <input type="checkbox" checked={alertSettings[key]} disabled={!alertSupport[key]}
                      onChange={(event) => onAlertSettingsChange({ ...alertSettings, [key]: event.target.checked })}
                      className="h-5 w-5 accent-lima" />
                  </label>
                ))}
                <p className="ov-text-muted mt-2 text-[11px]">Mantén la app abierta para recibir avisos. Con la pantalla bloqueada dependen del navegador.</p>
              </fieldset>
            </div>
          ) : null}
          {(expanded || progress?.phase === "off-route") && progress?.phase !== "arrived" ? (
            <div className="grid gap-2">
              <button type="button" disabled={locationStatus !== "ready" || actionBusy} onClick={onLocate}
                className="ov-pill ov-border ov-text min-h-11 rounded-xl border px-3 text-xs font-semibold disabled:opacity-50">Ver dónde estoy</button>
              <button type="button" disabled={actionBusy} onClick={onFindAnother}
                className="ov-pill ov-border ov-text min-h-11 rounded-xl border px-3 text-xs font-semibold disabled:opacity-50">
                {actionBusy ? "Actualizando ubicación…" : "Buscar otra opción desde aquí"}
              </button>
            </div>
          ) : null}
          {actionError ? <p role="alert" className="text-xs text-amber-200">{actionError}</p> : null}
        </div>

        <div className="border-t border-white/5 px-3.5 pb-3 pt-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] font-semibold">
            <span className="ov-text-muted">Avance del viaje</span>
            <span className="text-lima">{percent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/25"
            role="progressbar" aria-label="Avance del viaje"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <div
              className="h-full rounded-full bg-lima transition-[width] duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
