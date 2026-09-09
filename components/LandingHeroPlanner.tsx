"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BusFront,
  CableCar,
  CircleDot,
  ChevronDown,
  Footprints,
  MapPin,
  Pause,
  Play,
} from "lucide-react";
import LandingSearch from "@/components/LandingSearch";
import { rememberNearbyRoutesRequest } from "@/lib/nearby-request";

type TripStepKind = "start" | "walk" | "bus" | "transfer" | "cable" | "finish";

type TripStep = {
  kind: TripStepKind;
  label: string;
  detail: string;
};

type PreviewTrip = {
  id: string;
  destination: string;
  routeLabel: string;
  duration: string;
  fare: string;
  color: string;
  steps: TripStep[];
};

const PREVIEW_TRIPS: PreviewTrip[] = [
  {
    id: "centro-historico",
    destination: "Centro Histórico",
    routeLabel: "Viaje directo",
    duration: "~18 min",
    fare: "$12 total",
    color: "#57d6e8",
    steps: [
      { kind: "start", label: "Central de Autobuses", detail: "Punto de partida del ejemplo" },
      { kind: "walk", label: "Camina 2 min", detail: "A la parada más cercana" },
      { kind: "bus", label: "Ruta 11", detail: "Baja cerca del Centro" },
      { kind: "finish", label: "Centro Histórico", detail: "Destino" },
    ],
  },
  {
    id: "mercado-poniente",
    destination: "Mercado Poniente",
    routeLabel: "Camión + Teleférico",
    duration: "~32 min",
    fare: "$24 total",
    color: "#ffd84d",
    steps: [
      { kind: "start", label: "Central de Autobuses", detail: "Punto de partida del ejemplo" },
      { kind: "bus", label: "Ruta 11", detail: "Baja en Presidencia" },
      { kind: "transfer", label: "Transbordo", detail: "Estación Presidencia" },
      { kind: "cable", label: "Teleférico", detail: "Dirección Mercado Poniente" },
      { kind: "finish", label: "Mercado Poniente", detail: "Destino" },
    ],
  },
  {
    id: "hospital-regional",
    destination: "Hospital Regional",
    routeLabel: "Camión + Teleférico",
    duration: "~35 min",
    fare: "$24 total",
    color: "#ffd84d",
    steps: [
      { kind: "start", label: "Central de Autobuses", detail: "Punto de partida del ejemplo" },
      { kind: "bus", label: "Ruta 11", detail: "Baja en Presidencia" },
      { kind: "transfer", label: "Transbordo", detail: "Estación Presidencia" },
      { kind: "cable", label: "Teleférico", detail: "Dirección Hospital Regional" },
      { kind: "finish", label: "Hospital Regional", detail: "Destino" },
    ],
  },
] as const;

const ROTATE_MS = 10_000;

function StepIcon({ kind }: { kind: TripStepKind }) {
  const className = "h-4 w-4";
  if (kind === "walk") return <Footprints className={className} aria-hidden="true" />;
  if (kind === "bus") return <BusFront className={className} aria-hidden="true" />;
  if (kind === "cable") return <CableCar className={className} aria-hidden="true" />;
  if (kind === "transfer") return <CircleDot className={className} aria-hidden="true" />;
  return <MapPin className={className} aria-hidden="true" />;
}

export default function LandingHeroPlanner({ children }: { children?: ReactNode }) {
  const simulatorRef = useRef<HTMLDivElement | null>(null);
  const [activeTripIndex, setActiveTripIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReduceMotion(query.matches);
    syncPreference();
    query.addEventListener("change", syncPreference);
    return () => query.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    const element = simulatorRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.08 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isPlaying || !isVisible || reduceMotion) return;
    const timer = window.setInterval(() => {
      setActiveTripIndex((index) => (index + 1) % PREVIEW_TRIPS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [isPlaying, isVisible, reduceMotion]);

  const trip = PREVIEW_TRIPS[activeTripIndex];
  const mapHref = `/mapa?destino=${encodeURIComponent(trip.destination)}`;
  const isMultimodal = trip.routeLabel.includes("Teleférico");
  const journeyMode = activeTripIndex === 1 ? "walking" : isMultimodal ? "cable" : "bus";
  const journeyImage = journeyMode === "walking"
    ? "/readme/modo-viaje-caminando.webp"
    : journeyMode === "cable"
      ? "/readme/modo-viaje-teleferico.webp"
      : "/readme/modo-viaje.webp";
  const journeyModeLabel = journeyMode === "walking"
    ? "Último tramo a pie"
    : journeyMode === "cable"
      ? "Teleférico Uruapan"
      : "Ruta 11";

  const handleTripSelection = (index: number) => {
    setActiveTripIndex(index);
  };

  return (
    <div className="mt-6 sm:mt-7">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <LandingSearch />
        <Link href="/mapa?cerca=1" onClick={rememberNearbyRoutesRequest} className="inline-flex min-h-[62px] items-center justify-center gap-2 rounded-lg border border-[#b8e840]/50 px-5 text-sm font-bold text-[#d4ef8e] transition hover:bg-[#b8e840]/10">
          <CircleDot className="h-4 w-4 shrink-0" aria-hidden="true" />
          Rutas cerca de mí
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 sm:mt-4 lg:grid-cols-[auto_1fr_auto]" aria-label="Destinos populares">
        <span className="text-xs font-bold text-[#a8b5a1]">Populares</span>
        <div className="order-3 col-span-2 flex flex-wrap gap-x-4 gap-y-1 lg:order-none lg:col-span-1">
          {PREVIEW_TRIPS.map((item, index) => (
            <button key={item.id} type="button" onClick={() => handleTripSelection(index)}
              className="min-h-10 border-b-2 text-xs font-semibold transition hover:text-[#e8f2d8]"
              style={index === activeTripIndex
                ? { borderColor: "#b8e840", color: "#d4ef8e" }
                : { borderColor: "transparent", color: "#b6c1af" }}
              aria-pressed={index === activeTripIndex}>
              {item.destination}
            </button>
          ))}
        </div>
        <a href="#como-funciona" className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-[#b6c1af] hover:text-white">Cómo funciona<ArrowRight className="h-3 w-3" aria-hidden="true" /></a>
      </div>

      {children}

      <div ref={simulatorRef} className="mt-9 sm:mt-12" data-testid="landing-trip-simulator">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-[#a8b5a1]">Modo viaje</p>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Tu recorrido, paso a paso.</h2>
          </div>
          {!reduceMotion ? (
            <button type="button" onClick={() => setIsPlaying((playing) => !playing)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-white/25 text-[#dceaca] transition hover:border-[#b8e840]"
              aria-label={isPlaying ? "Pausar ejemplos de viaje" : "Reproducir ejemplos de viaje"}
              title={isPlaying ? "Pausar" : "Reproducir"}>
              {isPlaying ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
            </button>
          ) : null}
        </div>

        <div id={`trip-panel-${trip.id}`} className="grid border-y border-white/20 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]" role="region" aria-label={`Ejemplo de viaje a ${trip.destination}`}>
          <div className="landing-map-stage relative h-[260px] overflow-hidden bg-[#dfe4d8] sm:h-[360px] lg:h-full lg:min-h-[440px]">
            <Image key={journeyImage} src={journeyImage}
              alt={journeyMode === "walking"
                ? "Modo viaje de UruGo mostrando el último tramo caminando"
                : journeyMode === "cable"
                  ? "Modo viaje de UruGo siguiendo el recorrido del Teleférico"
                  : "Modo viaje de UruGo siguiendo el recorrido de un camión"}
              className="landing-journey-image object-cover" fill sizes="(min-width: 1240px) 650px, (min-width: 1024px) 55vw, 100vw" />
            <span className="absolute left-4 top-4 flex items-center gap-2 rounded bg-[#0c110a] px-3 py-2 text-xs font-bold text-[#eef2ea]">
              <span className="h-2 w-2 rounded-full" style={{background:trip.color}} aria-hidden="true" />
              {journeyModeLabel}
            </span>
          </div>

          <div className="flex flex-col py-6 lg:px-8 lg:py-7">
            <div className="flex items-center gap-2 text-xs font-bold" style={{color:trip.color}}>
              <BusFront className="h-4 w-4" aria-hidden="true" /> {trip.routeLabel}
            </div>
            <div className="mt-5 border-l-2 border-[#b8e840] pl-4">
              <p className="text-xs text-[#a8b5a1]">Desde</p>
              <p className="mt-1 text-sm font-semibold">Central de Autobuses</p>
              <p className="mt-4 text-xs text-[#a8b5a1]">Hasta</p>
              <h3 className="mt-1 min-h-[58px] text-2xl font-bold leading-tight">{trip.destination}</h3>
            </div>
            <dl className="mt-5 grid grid-cols-2 border-y border-white/20 py-4">
              <div>
                <dt className="text-xs text-[#a8b5a1]">Tiempo estimado</dt>
                <dd className="mt-1 text-lg font-bold">{trip.duration}</dd>
              </div>
              <div className="border-l border-white/20 pl-5">
                <dt className="text-xs text-[#a8b5a1]">Tarifa estimada</dt>
                <dd className="mt-1 text-lg font-bold">{trip.fare}</dd>
              </div>
            </dl>
            <Link href={mapHref} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#b8e840] px-4 text-sm font-bold text-[#14200c] transition hover:bg-[#c8f25b]">
              Ver recorrido completo<ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <p className="mt-3 text-xs leading-5 text-[#a8b5a1]">Viaje de ejemplo. En el mapa, el cálculo comienza desde tu origen.</p>
          </div>
        </div>

        <details className="group border-b border-white/20">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            Etapas del recorrido
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden="true" />
          </summary>
          <ol className="grid gap-4 pb-6 sm:grid-cols-2 lg:grid-cols-5" aria-label={`Pasos para llegar a ${trip.destination}`}>
            {trip.steps.map((step) => (
              <li key={`${step.kind}-${step.label}`} className="flex gap-3 border-t border-white/15 pt-4">
                <span className="mt-0.5 text-[#b8e840]"><StepIcon kind={step.kind} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{step.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[#a8b5a1]">{step.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </details>
      </div>
    </div>
  );
}
