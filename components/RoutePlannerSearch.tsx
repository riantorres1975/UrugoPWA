"use client";

import { useRef } from "react";
import { ChevronRight, LocateFixed } from "lucide-react";
import PlaceSearch from "@/components/PlaceSearch";
import type { ActivePoint } from "@/hooks/useRoutePlanner";
import type { PlaceResult } from "@/lib/geocode";
import type { RecentTrip } from "@/lib/recent-trips";

const DESTINATIONS = ["Centro", "Hospital Regional", "Plaza Ágora", "Central"] as const;

type RoutePlannerSearchProps = {
  activePoint: ActivePoint;
  destinationSelected: boolean;
  isMobile: boolean;
  lastTrip: RecentTrip | null;
  usingAutomaticOrigin: boolean;
  onChooseManualOrigin: () => void;
  onDestinationSelect: (destination: string) => void;
  onPlaceSelect: (result: PlaceResult) => void;
  onRepeatTrip: (trip: RecentTrip) => void;
};

export default function RoutePlannerSearch({
  activePoint,
  destinationSelected,
  isMobile,
  lastTrip,
  usingAutomaticOrigin,
  onChooseManualOrigin,
  onDestinationSelect,
  onPlaceSelect,
  onRepeatTrip,
}: RoutePlannerSearchProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const chooseManualOrigin = () => {
    onChooseManualOrigin();
    containerRef.current?.querySelector("input")?.focus();
  };

  return (
    <div ref={containerRef} className="w-full">
      <PlaceSearch
        label={activePoint === "origin" ? "Buscar origen" : "Buscar destino"}
        placeholder={activePoint === "origin"
          ? "¿Desde dónde sales?"
          : "¿A dónde vas?"}
        onSelect={onPlaceSelect}
      />

      {usingAutomaticOrigin && activePoint !== "origin" && !destinationSelected && (
        <div className="mt-0.5 flex min-h-11 w-full items-center gap-2 px-1.5">
          <LocateFixed className="h-4 w-4 shrink-0 text-lima" aria-hidden="true" />
          <span className="ov-text-muted min-w-0 flex-1 truncate text-[12px] font-semibold">
            Origen: mi ubicación
          </span>
          <button
            type="button"
            onClick={chooseManualOrigin}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-1 text-xs font-bold text-lima transition hover:bg-lima/10"
            aria-label="Elegir origen manualmente"
          >
            Cambiar origen
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {activePoint !== "origin" && !destinationSelected && (
        <div
          className={`mt-1 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            isMobile ? "[@media(max-height:740px)]:hidden" : ""
          }`}
          aria-label="Destinos frecuentes"
        >
          {lastTrip && (
            <button
              type="button"
              onClick={() => onRepeatTrip(lastTrip)}
              className="ov-pill inline-flex min-h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-lima/45 px-3 text-xs font-bold text-lima transition hover:border-lima/70 active:scale-[0.97]"
              aria-label={`Repetir tu último viaje a ${lastTrip.destinationLabel ?? "tu destino anterior"}`}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 shrink-0" aria-hidden="true">
                <path d="M3 12a9 9 0 1 1 2.6 6.4M3 12V7m0 5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Repetir: {lastTrip.destinationLabel ?? "último viaje"}
            </button>
          )}

          {DESTINATIONS.map((destination) => (
            <button
              key={destination}
              type="button"
              onClick={() => onDestinationSelect(destination)}
              className="ov-text ov-pill ov-border inline-flex min-h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold transition hover:text-lima active:scale-[0.97]"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 shrink-0 text-lima" aria-hidden="true">
                <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2" fill="currentColor" />
              </svg>
              {destination}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
