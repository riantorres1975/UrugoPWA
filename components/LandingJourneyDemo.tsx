"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BusFront,
  CableCar,
  CircleDot,
  Footprints,
  MapPin,
  Pause,
  Play,
} from "lucide-react";



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

const STEP_MS = 2800;

function StepIcon({ kind }: { kind: TripStepKind }) {
  const className = "h-4 w-4";
  if (kind === "walk") return <Footprints className={className} aria-hidden="true" />;
  if (kind === "bus") return <BusFront className={className} aria-hidden="true" />;
  if (kind === "cable") return <CableCar className={className} aria-hidden="true" />;
  if (kind === "transfer") return <CircleDot className={className} aria-hidden="true" />;
  return <MapPin className={className} aria-hidden="true" />;
}

export default function LandingJourneyDemo() {
  const simulatorRef = useRef<HTMLDivElement | null>(null);
  const [activeTripIndex, setActiveTripIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const sync = () => setTabVisible(!document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

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
    if (!isPlaying || !isVisible || reduceMotion || !tabVisible) return;
    const timer = window.setTimeout(() => {
      if (activeStep < PREVIEW_TRIPS[activeTripIndex].steps.length - 1) {
        setActiveStep(activeStep + 1);
      } else {
        setActiveStep(0);
        setActiveTripIndex((index) => (index + 1) % PREVIEW_TRIPS.length);
      }
    }, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [isPlaying, isVisible, reduceMotion, tabVisible, activeStep, activeTripIndex]);

  const trip = PREVIEW_TRIPS[activeTripIndex];
  const mapHref = `/mapa?destino=${encodeURIComponent(trip.destination)}`;
  const journeyImage = `/landing/journeys/${trip.id}-${activeStep}.webp`;
  const step = trip.steps[activeStep];

  const handleTripSelection = (index: number) => {
    setActiveTripIndex(index);
    setActiveStep(0);
    setIsPlaying(false);
  };

  return (
    <div ref={simulatorRef} className="trip-demo journey-preview" data-testid="landing-trip-simulator" data-playing={isPlaying && isVisible && tabVisible && !reduceMotion}>
      <header>
        <div>
          <p className="micro">Recorrido de ejemplo</p>
          <h3>Central de Autobuses → {trip.destination}</h3>
        </div>
        {!reduceMotion && (
          <button
            type="button"
            className="action home-outline play-button"
            aria-label={isPlaying ? "Pausar ejemplos de viaje" : "Reproducir ejemplos de viaje"}
            onClick={() => setIsPlaying((playing) => !playing)}
          >
            {isPlaying ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          </button>
        )}
      </header>
      <div className="trip-destinations">
        <span className="micro">Populares</span>
        <div className="quick" role="group" aria-label="Destinos de ejemplo">
          {PREVIEW_TRIPS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className="pill"
              onClick={() => handleTripSelection(index)}
              aria-pressed={index === activeTripIndex}
            >
              {item.destination}
            </button>
          ))}
        </div>
      </div>
      <p className="trip-facts">{trip.routeLabel} · {trip.duration} · {trip.fare}</p>
      <div className="journey-stops">
        <ol className="steps" aria-label={`Pasos para llegar a ${trip.destination}`}>
          {trip.steps.map((item, index) => (
            <li key={`${trip.id}-${index}`}>
              <button
                type="button"
                aria-current={index === activeStep ? "step" : undefined}
                onClick={() => { setActiveStep(index); setIsPlaying(false); }}
              >
                <span className="step-n"><StepIcon kind={item.kind} /></span>
                <span className="min-w-0"><strong>{item.label}</strong><small>{item.detail}</small></span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <p className="step-caption journey-stage-status"><strong>{step.label}</strong> · {step.detail}</p>
      <details className="trip-image" onToggle={(event) => {
        const open = event.currentTarget.open;
        setShowMap(open);
        if (open) setIsPlaying(false);
      }}>
        <summary>Ver mapa de este paso</summary>
        {showMap && (
          <Image
            src={journeyImage}
            alt={`${step.label}: vista del recorrido desde la Central de Autobuses a ${trip.destination}`}
            className="landing-journey-image"
            width={390}
            height={844}
            sizes="(max-width: 760px) 85vw, 225px"
          />
        )}
      </details>
      <Link href={mapHref} className="text-link">Ver recorrido completo <ArrowRight size={16} aria-hidden="true" /></Link>
    </div>
  );
}
