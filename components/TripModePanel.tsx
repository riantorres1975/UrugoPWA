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
import type { TripJourney, TripProgress } from "@/lib/trip-mode";
import type { LandmarkCue } from "@/lib/landmark-guidance";

type TripLocationStatus = "locating" | "ready" | "unavailable";

type TripModePanelProps = {
  journey: TripJourney;
  progress: TripProgress | null;
  locationStatus: TripLocationStatus;
  landmarkCue?: LandmarkCue | null;
  onStop: () => void;
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
}: TripModePanelProps) {
  const copy = getTripCopy(journey, progress, locationStatus);
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
      className="pointer-events-auto max-h-[50dvh] overflow-y-auto rounded-2xl"
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
              <span className={`inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-bold ${toneClass(copy.tone)}`}>
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
            className="ov-pill ov-border ov-text-muted inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[11px] font-semibold transition hover:border-red-400/50 hover:text-red-400 active:scale-[0.97]"
            aria-label={progress?.phase === "arrived" ? "Cerrar viaje completado" : "Finalizar viaje"}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2.2} />
            {progress?.phase === "arrived" ? "Cerrar" : "Finalizar"}
          </button>
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
